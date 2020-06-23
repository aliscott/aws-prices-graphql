/* eslint-disable no-await-in-loop */

const _ = require('lodash');
const fs = require('fs');
const glob = require('glob');
const { MongoClient } = require('mongodb');
const config = require('../config');

const batchSize = 1000;

function flattenProduct(product) {
  return {
    ..._.pick(product, ['sku', 'productFamily']),
    ...product.attributes,
  };
}

function flattenPrice(price) {
  return {
    ..._.pick(price, ['offerTermCode', 'sku', 'effectiveDate', 'termAttributes']),
    priceDimensions: Object.values(price.priceDimensions),
  };
}

async function processFile(file, db) {
  try {
    const productData = JSON.parse(fs.readFileSync(file));
    const promises = [];

    let batchUpdates = [];
    Object.values(productData.products).forEach((product) => {
      const flatProduct = flattenProduct(product);

      let onDemandPricing = null;
      let reservedPricing = null;

      if (productData.terms.OnDemand && productData.terms.OnDemand[flatProduct.sku]) {
        onDemandPricing = Object.values(productData.terms.OnDemand[flatProduct.sku]).map((p) => flattenPrice(p));
      }

      if (productData.terms.Reserved && productData.terms.Reserved[flatProduct.sku]) {
        reservedPricing = Object.values(productData.terms.Reserved[flatProduct.sku]).map((p) => flattenPrice(p));
      }

      batchUpdates.push({
        updateOne: {
          filter: {
            sku: flatProduct.sku,
          },
          update: {
            $set: {
              ...flatProduct,
              onDemandPricing,
              reservedPricing,
            },
          },
          upsert: true,
        },
      });

      if (batchUpdates.length >= batchSize) {
        promises.push(db.collection('products').bulkWrite(batchUpdates));
        batchUpdates = [];
      }
    });

    promises.push(db.collection('products').bulkWrite(batchUpdates));
    await Promise.all(promises);
  } catch (e) {
    console.log(`Skipping file ${file} due to error ${e}`);
  }
}

async function main() {
  const mongoClient = await MongoClient.connect(config.mongoDbUri, { useUnifiedTopology: true });
  const db = mongoClient.db();
  db.collection('products').createIndex({ '$**': 1 });

  for (const file of glob.sync('data/*.json')) {
    console.log(`Processing file: ${file}`);
    await processFile(file, db);
  }

  mongoClient.close();
}

main();
