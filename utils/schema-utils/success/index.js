/**
 * Схема успешного ответа
 * @param schema {Object|Any}
 * @param headers
 * @returns {{description: string, content: {'application/json': {schema: {type: string, properties: {result: {type: string}}}}}}}
 */
module.exports = function ({schema, headers}){
  let def = {
    description: 'Success',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            result: {
              type: 'object'
            }
          }
        }
      }
    }
  };
  const link = def.content['application/json'].schema;
  if (schema) {
    if (typeof schema === 'object') {
      if ('$ref' in schema || ('type' in schema)) {
        link.properties.result = schema;
      } else {
        link.properties.result.properties = schema;
      }
    } else {
      link.properties.result = {
        type: typeof schema,
        const: schema
      };
    }
  }
  if (headers) {
    def.headers = headers;
  }
  return def;
};
