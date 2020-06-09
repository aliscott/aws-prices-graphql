const _ = require('lodash');
const { ApolloServer, gql } = require('apollo-server');
const { MongoClient } = require('mongodb');
const config = require('./config');
const apolloLogger = require('./utils/apolloLogger');

const rowLimit = 1000;

const typeDefs = gql`
  type PricePerUnit {
    USD: String
  }

  type PriceDimension {
    rateCode: String
    description: String
    beginRange: String
    endRange: String
    unit: String
    pricePerUnit: PricePerUnit
    appliesTo: [String]
  }

  type Pricing {
    offerTermCode: String
    sku: String
    effectiveDate: String
    termAttributes: String
    priceDimensions: [PriceDimension]
  }

  type Attribute {
    key: String!
    value: String
  }

  type Product {
    sku: String!
    productFamily: String
    attributes: [Attribute]
    onDemandPricing: [Pricing]
    reservedPricing: [Pricing]
  }

  input AttributeFilter {
    key: String!
    value: String
  }

  input ProductFilter {
    attributes: [AttributeFilter]
  }

  type Query {
    products(filter: ProductFilter!): [Product]
  }
`;

function transformFilter(productFilter) {
  return Object.fromEntries(productFilter.attributes.map((a) => [a.key, a.value]));
}

function transformProduct(product) {
  const commonFields = ['_id', 'sku', 'productFamily', 'onDemandPricing', 'reservedPricing'];
  return {
    ..._.pick(product, commonFields),
    attributes: Object.entries(_.omit(product, commonFields)).map(
      (f) => ({ key: f[0], value: f[1] }),
    ),
  };
}

const resolvers = {
  Query: {
    products: async (_parent, args) => {
      const mongoClient = await MongoClient.connect(config.mongoDbUri, { useUnifiedTopology: true });
      const db = mongoClient.db();

      const products = await db.collection('products').find(
        transformFilter(args.filter),
      ).limit(rowLimit).toArray();

      return products.map((p) => transformProduct(p));
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
  plugins: [
    apolloLogger,
  ],
});

server.listen(config.port, '0.0.0.0').then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
