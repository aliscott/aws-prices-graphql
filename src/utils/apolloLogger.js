/* eslint no-shadow: ["error", { "allow": ["requestContext"] }] */

module.exports = {
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
  },
};
