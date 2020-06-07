require('dotenv').config();
const _ = require('lodash');
const fs = require('fs');
const { MongoClient } = require('mongodb');

function flattenProduct(product) {
  return {
    ..._.pick(product, ['sku', 'productFamily']),
    ...product.attributes,
  };
}

function flattenPrice(price) {
  return {
    ..._.pick(price, ['offerTermCode', 'sku', 'effectiveDate', 'termAttributes']),
    priceDimensions: Object.values(price.priceDimensions)
  }
}

async function processFile(file, db) {
  const productData = JSON.parse(fs.readFileSync(`data/${file}`));
  const promises = [];

  Object.values(productData.products).forEach((product) => {
    const flatProduct = flattenProduct(product);

    let onDemandPricing = null;
    let reservedPricing = null;
    
    if (productData.terms.OnDemand && productData.terms.OnDemand[flatProduct.sku]) {
      onDemandPricing = Object.values(productData.terms.OnDemand[flatProduct.sku]).map(p => flattenPrice(p))
    }

    if (productData.terms.Reserved && productData.terms.Reserved[flatProduct.sku]) {
      reservedPricing = Object.values(productData.terms.Reserved[flatProduct.sku]).map(p => flattenPrice(p))
    }

    promises.push(db.collection('products').updateOne(
      {
        sku: flatProduct.sku,
      },
      {
        $set: {
          ...flatProduct,
          onDemandPricing,
          reservedPricing,
        },
      },
      {
        upsert: true,
      },
    ));
  });

  await Promise.all(promises);
}

async function main() {
  const mongoClient = await MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true });
  const db = mongoClient.db();
  db.collection('products').createIndex({ sku: 1 });
  db.collection('products').createIndex({ location: 1 });

  for (file of fs.readdirSync('data')) {
    console.log(`Processing file: ${file}`);
    await processFile(file, db);
  }

  mongoClient.close();
};

main();