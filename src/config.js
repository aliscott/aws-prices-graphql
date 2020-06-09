require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  mongoDbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/awsPricing',
};
