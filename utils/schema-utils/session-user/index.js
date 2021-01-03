/**
 * Контроль сессии по совпадению имен пользователя
 * @param names {Array|undefined} Разрешенные имена. Если не указан, то авторизация не требется. Если пустой массив, то любой авторизованный пользователь
 * @returns {Object}
 */
module.exports = function(names) {
  let def = {
    description: 'Check user of session',
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          _type: {type: 'string', errors: {pattern: 'Недоступно текущей ролью'}}
        },
        additionalProperties: true,
        errors: {required: 'Требуется авторизация'}
      }
    },
    additionalProperties: true,
    required: [],
  };
  if (names) {
    if (names.length) {
      def.properties.user.properties._type.pattern = `^(${names.join('|')})($|-)`;
      def.required.push('user');
      if (names.length === 1 && names[0]==='user'){
        def.properties.user.summary = 'Access: authorized';
      } else {
        def.properties.user.summary = `Access: "${names.join('", "')}"`;
      }
      def.needSecurirty = true;
    } else {
      def.properties.user.summary = 'Access: any';
    }
  }
  return def;
};
