/* eslint no-shadow: ["error", { "allow": ["requestContext"] }] */

const config = require('../config');

module.exports = {
  requestDidStart(requestContext) {
    if (requestContext.request.query.startsWith('query IntrospectionQuery')) {
      return {};
    }
    config.logger.info(`GraphQL request started:\n${requestContext.request.query}\nvariables:\n${JSON.stringify(requestContext.request.variables, null, 2)}`);

    return {
      didEncounterErrors(requestContext) {
        config.logger.error(`GraphQL encountered errors:\n${JSON.stringify(requestContext.errors)}`);
      },
      willSendResponse(requestContext) {
        config.logger.info(`GraphQL request completed:\n${JSON.stringify(requestContext.response.data, null, 2)}`);
      },
    };
  },
};
