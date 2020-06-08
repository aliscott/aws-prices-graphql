require('dotenv').config();
const _ = require('lodash');
const { ApolloServer, gql } = require('apollo-server');
const { MongoClient } = require('mongodb');

const rowLimit = 20;

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
    attributeFilters: [AttributeFilter]
  }

  type Query {
    products(filter: ProductFilter!): [Product]
  }
`;

function transformFilter(productFilter) {
  return Object.fromEntries(productFilter.attributeFilters.map(a => [a.key, a.value]));
}

function transformProduct(product) {
  const commonFields = ['_id', 'sku', 'productFamily', 'onDemandPricing', 'reservedPricing'];
  return {
    ..._.pick(product, commonFields),
    attributes: Object.entries(_.omit(product, commonFields)).map(
      f => ({ key: f[0], value: f[1] }),
    ),
  };
}

const resolvers = {
  Query: {
    products: async (parent, args, context, info) => {
      const mongoClient = await MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true });
      const db = mongoClient.db();
      console.log(transformFilter(args.filter));

      const products = await db.collection('products').find(
        transformFilter(args.filter)
      ).toArray();

      console.log('LENGTH');
      console.log(products.length);

      return products.map(p => transformProduct(p));
    },
  },
};

const apolloLogger = {
  requestDidStart(requestContext) {
    if (requestContext.request.query.startsWith('query IntrospectionQuery')) {
      return {};
    }
    console.log(`GraphQL request started:\n${requestContext.request.query}\nvariables:\n${JSON.stringify(requestContext.request.variables, null, 2)}`);

    return {
      didEncounterErrors(requestContext) {
        console.log(`GraphQL encountered errors:\n${JSON.stringify(requestContext.errors)}`);
      },
      willSendResponse(requestContext) {
        console.log(`GraphQL request completed:\n${JSON.stringify(requestContext.response.data, null, 2)}`);
      },
    };
  }
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
const port = process.env.PORT || 4000;

server.listen(port, '0.0.0.0').then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});