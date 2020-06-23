require('dotenv').config();
const pino = require('pino');

const logger = pino({
  prettyPrint: process.env.NODE_ENV !== 'production',
});

module.exports = {
  logger,
  port: process.env.PORT || 4000,
  mongoDbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/awsPricing',
};
