const escapeStringRegexp = require('escape-string-regexp');
const ObjectID = require('mongodb').ObjectID;
const moment = require('moment');
const objectUtils = require('./../object-utils');

const queryUtils = {

  /**
   * Если строка представляет число, то конвертация в целое или действительное
   * @param value
   * @param type
   * @param trim
   */
  type(value, type = 'auto', trim = true) {
    let types = type === 'auto'
      ? ['number', 'boolean', 'null', 'date', 'objectid', 'string']
      : (Array.isArray(type)
          ? type
          : [type]
      );
    let testValue = typeof value === 'string' && trim ? value.trim() : value;
    type = types.shift();
    let result;
    try {
      switch (type.toLowerCase()) {
        case 'number':
          if (typeof value === 'string') {
            result = Number(testValue.replace(/\s/g, '').replace(/,/g, '.'));
          } else {
            result = Number(testValue);
          }
          if (!Number.isNaN(result) && result !== null) {
            return result;
          }
          break;

        case 'boolean':
        case 'bool':
          if (testValue && (testValue.toLowerCase() === 'true' || testValue === '1' || testValue === true)) {
            return true;
          }
          if ((testValue && testValue.toLowerCase() === 'false' || testValue === '0') || testValue === '' || testValue === false) {
            return false;
          }
          break;

        case 'date':
          const date = moment(testValue, [
            'YYYY-MM-DDTHH:mm:ss.SSSZ',
            'YYYY-MM-DDTHH:mm:ssZ',
            'YYYY-MM-DDTHH:mm:ss',
            'YYYY-MM-DD'], true);
          if (date.isValid()) {
            return date.toDate();
          }
          break;

        case 'string':
          if (typeof testValue !== 'string') {
            return testValue.toString();
          }
          return testValue;
        //break;

        case 'null':
          if (testValue === 'null' || testValue === null) {
            return null;
          }
          break;

        case 'regex':
          if (typeof testValue === 'string') {
            const params = testValue.match(/^\/(.*)\/([gimy]*)$/);
            if (params) {
              return new RegExp(params[1], params[2]);
            }
            return new RegExp(testValue);
          }
          if (value instanceof RegExp) {
            return value;
          }
          break;

        case 'objectid':
        case 'object-id':
          if (/^[0-9a-fA-F]{24}$/.test(testValue)) {
            return new ObjectID(testValue);
          }
          break;

        // Возвраст в дату рождения
        case 'age':
          result = Number(testValue);
          if (!Number.isNaN(result) && result !== null) {
            return moment().subtract(result, 'years').toDate()
          }
          break;
      }

      // Функция не завершена, значит тип не подходит
      if (types.length) {
        return queryUtils.type(value, types, trim);
      }
      // Приведение типа не выполнено
      return testValue;

    } catch (e) {
      console.log('bad type');
      return testValue;
    }
  },

  parseFieldIgnore: (object) => {
    if (object && typeof object === 'object') {
      let keys = Object.keys(object);
      let result = {};
      for (let key of keys) {
        if (key.substr(0, 1) === '!') {
          result[key.substr(1)] = 0;
        } else {
          result[key] = queryUtils.parseFieldIgnore(object[key]);
        }
      }
      return result;
    }
    return object;
  },

  /**
   * Парсер форматированной строки, перечисляющей поля для выборки
   * @param fieldsString String
   * @return Object
   */
  parseFields: (fieldsString) => {
    if (fieldsString === 1) {
      return {'*': 1};
    }
    if (fieldsString && typeof fieldsString === 'object') {
      return fieldsString;
    }
    if (!fieldsString || typeof fieldsString !== 'string') {
      return undefined;
    }
    // let formatted = fieldsString.replace(/["'`]?([!:a-z0-9_*-.]+)["'`]?\s*([,$)}])/uig, '"$1":1$2');
    // formatted = formatted.replace(/["'`]?([!:a-z0-9_*-.]+)["'`]?\s*([({])/uig, '"$1":{');
    // formatted = '{' + formatted.replace(/\)/g, '}') + '}';

    let formatted = fieldsString.replace(/["'`]?([^"'`()\s,{}]+)["'`]?\s*(,|$|\)|\})/uig, '"$1":1$2');
    //console.log(formatted);
    formatted = formatted.replace(/["'`]?([^"'`()\s,{}]+)["'`]?\s*(\(|\{)/uig, '"$1":{');
    formatted = '{' + formatted.replace(/\)/g, '}') + '}';
    //console.log(formatted);
    try {
      return queryUtils.parseFieldIgnore(JSON.parse(formatted));
    } catch (e) {
      throw {message: 'Incorrect fields format', name: 'ParseFieldsException'};
    }
  },

  inFields: (fields, prop, strick = false) => {
    const obj = (typeof fields === 'string') ? queryUtils.parseFields(fields) : fields;
    // @todo проверка в *
    return objectUtils.get(obj || {}, prop, false);
  },

  /**
   * Форматирование множественного параметра поиска (объекта фильтра) в mongodb объект фильтра
   * @param searchField String|Object
   * @param propertyTypes Object По ключ свойства параметры сравнения для него
   * {search: {
   *    kind:'regex', //тип сравнения, regex(по умолчанию), const
   *    field
   *    fields:['name','surname'], //В каких полях сравнивать c $or и если отличается от key
   *    },
   *  price: {
   *    kind:'const',
   *  }
   * @returns Object|null
   */
  formattingSearch: (searchField, propertyTypes = {}) => {
    let result = [];
    if (!Array.isArray(searchField) && searchField === Object(searchField)) {
      const keys = Object.keys(searchField);
      for (let key of keys) {
        if (propertyTypes[key] && typeof searchField[key] !== 'undefined') {
          let value = searchField[key];
          if (typeof propertyTypes[key] === 'function') {
            propertyTypes[key] = propertyTypes[key](searchField[key]);
          }
          if ('value' in propertyTypes[key]) {
            value = propertyTypes[key].value;
          }
          if (propertyTypes[key]) {
            if (propertyTypes[key].field) {
              propertyTypes[key].fields = propertyTypes[key].field;
            }
            if (!propertyTypes[key].fields || !propertyTypes[key].fields.length) {
              propertyTypes[key].fields = [key];
            }
            if (!Array.isArray(propertyTypes[key].fields)) {
              propertyTypes[key].fields = [propertyTypes[key].fields];
            }

            if (propertyTypes[key].type) {
              propertyTypes[key].types = propertyTypes[key].type;
            }
            if (propertyTypes[key].cond) {
              propertyTypes[key].kind = propertyTypes[key].cond;
            }
            const cond = queryUtils.formattingSimpleSearch(value, propertyTypes[key]);
            if (cond) {
              if (Array.isArray(cond)) {
                result = result.concat(cond);
              } else {
                result.push(cond);
              }
            }
          }
        }
      }
    }
    return result.length ? {$and: result} : {};
  },

  /**
   * Форматер строки в объект фильтра mongodb
   * @param searchValue Строка фильтра
   * @param options Object Опции сравнения
   * {
   *    kind:'regex', //тип сравнения, regex(по умолчанию), const
   *    fields:['name','surname'], //В каких полях сравнивать c $or или в каком одном
   *    }
   * @returns {Object}
   */
  formattingSimpleSearch(searchValue, options = {
    kind: 'regex',
    fields: ['title'],
    exists: false,
    types: 'auto',
    trim: true
  }) {
    if (!options.kind) {
      options.kind = 'regex';
    }
    let values;
    let $exists = true;
    let $in = [];
    if (typeof searchValue !== 'string') {
      searchValue = [searchValue];
    } else {
      searchValue = searchValue.split('|');
    }

    searchValue.map(value => {
      if (typeof options.kind === 'function') {
        $in.push(options.kind(value, options));
      } else {
        switch (options.kind.toLowerCase()) {
          case 'object-id':
          case 'objectid':
            if (value) {
              if (value === 'null') {
                $exists = false;
              } else {
                $in.push(queryUtils.type(value, 'ObjectId', options.types));
              }
            }
            break;
          case 'is':
            $in.push(new RegExp(`^${escapeStringRegexp(value.trim())}($|-)`, 'i'));
            break;
          case 'regex':
          case 'regexp':
          case 'like':
            $in.push(new RegExp(escapeStringRegexp(value.trim()), 'i'));
            break;
          case 'regex-start':
          case 'regexp-start':
          case 'like-start':
            $in.push(new RegExp('^' + escapeStringRegexp(value.trim()), 'i'));
            break;
          case 'bool':
          case 'boolean':
            if (value === 'null') {
              $exists = false;
            } else {
              $in.push(!(value === 'false' || value === '0' || value === ''));
            }
            break;
          case 'between':
            values = value.split(';');
            if (values.length === 2) {
              $in.push({
                  $gte: queryUtils.type(values[0], options.types),
                  $lte: queryUtils.type(values[1], options.types)
                }
              );
            } else {
              $in.push({$eq: queryUtils.type(values[0], options.types)});
            }
            break;
          case 'between-age':
            values = value.split(';');
            if (values.length === 2) {
              $in.push({
                $gte: moment().subtract(values[1], 'years').toDate(),
                $lte: moment().subtract(values[0], 'years').toDate()
              });
            } else {
              $in.push({
                $gte: moment().subtract(values[0], 'years').toDate(),
                $lte: moment().subtract(values[0] + 1, 'years').toDate()
              });
            }
            break;
          case 'between-date':
            values = value.split(';');
            if (values.length === 2) {
              $in.push({
                $gte: moment(values[0]).toDate(),
                $lte: moment(values[1]).toDate()
              });
            } else {
              $in.push({
                $eq: moment(values[0]).toDate()
              });
            }
            break;
          case 'range':
            values = value.split(';');
            if (values.length === 2) {
              const greaterThan = parseFloat(values[0]);
              const lessThan = parseFloat(values[1]);
              $in.push({
                ...greaterThan ? {$gte: greaterThan} : {},
                ...lessThan ? {$lte: lessThan} : {},
              });
            } else {
              $in.push({
                $eq: parseFloat(values[0])
              });
            }
            break;
          case 'range-date':
          case 'range-dates':
            values = value.split(';');
            if (values.length === 2) {
              const greaterThan = values[0] ? moment(values[0]).toDate() : '';
              const lessThan = values[1] ? moment(values[1]).toDate() : '';
              $in.push({
                ...greaterThan ? {$gte: greaterThan} : {},
                ...lessThan ? {$lte: lessThan} : {},
              });
            } else {
              $in.push({
                $eq: values[0] ? moment(values[0]).toDate() : '',
              });
            }
            break;
          case 'gt':
            $in.push({$gt: queryUtils.type(value, options.types)});
            break;
          case 'lt':
            $in.push({$lt: queryUtils.type(value, options.types)});
            break;
          case 'gte':
            $in.push({$gte: queryUtils.type(value, options.types)});
            break;
          case 'lte':
            $in.push({$lte: queryUtils.type(value, options.types)});
            break;
          case 'const':
          case 'eq':
            if (value !== '') {
              if (value === 'null') {
                $exists = false;
              } else {
                $in.push(queryUtils.type(value, options.types));
              }
            }
            break;
          default:
            $in.push({[options.kind]: queryUtils.type(value, options.types, options.trim)});
        }
      }
    });
    let result;
    if ($in.length > 0 && options.fields && options.fields.length) {
      if ($in.length > 1) {
        result = {$in};
      } else if ($in.length > 0) {
        result = $in[0];
      }
      if (options.fields.length === 1) {
        return [{[options.fields[0]]: result}];
      } else {
        return [{$or: options.fields.map(field => ({[field]: result}))}];
      }
    } else {
      if (options.exists && !$exists && options.fields && options.fields.length === 1) {
        result = [{[options.fields[0]]: {$exists: false}}];
      }
      if (options.empty && !$exists && options.fields && options.fields.length === 1) {
        result = [{[options.fields[0]]: ''}];
      }
      return result;
    }
  },

  /**
   * Форматирование параметра сортировки
   * @param sortField String
   * @returns Object
   */
  formattingSort: (sortField) => {
    if (typeof sortField === 'string') {
      let fields = sortField.split(',').map(field => field.replace(/\s/g, ''));
      let result = {};
      for (let field of fields) {
        if ((!field || field === '-')) {
          //bad sort
        } else if (field.substring(0, 1) === '-') {
          result[field.substring(1)] = -1;
        } else {
          result[field] = 1;
        }
      }
      if (Object.keys(result).length !== 0) {
        return result;
      }
    }
    return null;
  },



  /**
   * Создание условия фильра в монге
   * @param searchFields {Object} Поля со значениями для условия. Значения в строковом типе
   * {
   *   [key]: "value"
   * }
   * @param filterMap {Object} Параметры на поля для создания фильтра
   * {
   * [key]: {
   *   value: "" // предустановленное значение для сверки, замещает searchFields[key]
   *   default: "" // значение, если нет параметра в searchFields
   *   fields: ["name"] // название полей на которые создавать условие, по умолчанию [key]
   *   type: "ObjectId" // тип значения для конвертации из строки, по умолчанию "any" для автоматического определения
   *   cond: "eq" // условие, по умочланию "flex"
   *   join: "and" // если несколько fields, то способ объединения условий на несколько полей, по умочланию "or"
   * },
   * [key]: (value, key, searchFields) => ({fieldName: {$eq: value}})
   * }
   *
   * @returns {*}
   */
  makeFilter: (searchFields, filterMap = {}) => {
    let result = [];
    if (!Array.isArray(searchFields) && searchFields === Object(searchFields)) {
      const keys = Object.keys(filterMap);
      for (let key of keys) {
        // Значение предустановленное, из параметра поиска или по умолчанию если нет параметра
        let value = typeof filterMap[key].value !== 'undefined'
          ? filterMap[key].value
          : (typeof searchFields[key] !== 'undefined'
              ? searchFields[key]
              : filterMap[key].default
          );
        if (typeof filterMap[key] === 'function') {
          result.push(filterMap[key](value, key, searchFields));
        } else if (typeof value !== 'undefined') {
          // Поля, для которых формировать условие на value
          if (filterMap[key].field) {
            filterMap[key].fields = filterMap[key].field;
          }
          // Если не указан fields, то использовать ключ из filterMap
          if (!filterMap[key].fields || !filterMap[key].fields.length) {
            filterMap[key].fields = [key];
          }
          // Нормализация полей в массив
          if (!Array.isArray(filterMap[key].fields)) {
            filterMap[key].fields = [filterMap[key].fields];
          }
          // Тип значения
          if (filterMap[key].type) {
            filterMap[key].types = filterMap[key].type;
          }
          // Формируемое услвоие
          if (filterMap[key].kind) {
            filterMap[key].cond = filterMap[key].kind;
          }
          if (!filterMap[key].cond) {
            filterMap[key].cond = 'flex';
          }
          // Объединение условий на несколько полей
          if (!filterMap[key].join) {
            filterMap[key].join = '$or';
          }
          let fieldCondList = [];
          for (const filed of filterMap[key].fields) {
            const c = queryUtils.makeFilterField(filed, value, filterMap[key]);
            if (c) {
              // Сокращение условия равенства
              if (typeof c[filed] === 'object' && ('$eq' in c[filed]) && Object.keys(c[filed]).length === 1){
                fieldCondList.push({[filed]: c[filed].$eq});
              } else {
                fieldCondList.push(c);
              }
            }
          }
          if (fieldCondList.length > 1) {
            result.push({[filterMap[key].join]: fieldCondList});
          } else {
            result.push(fieldCondList[0]);
          }
        }
      }
    }
    return result.length ? {$and: result} : {};
  },

  /**
   * Условие на поле
   * @param field {String}
   * @param value {String}
   * @param options {{types, trim}}
   * @returns {Object}
   */
  makeFilterField(field, value, options) {
    const type = (value) => queryUtils.type(value, options.types, options.trim);
    let splits;
    switch (options.cond) {
      case 'eq':
        return {[field]: {$eq: type(value)}};
      case 'ne':
        return {[field]: {$ne: type(value)}};
      case 'lt':
        return {[field]: {$lt: type(value)}};
      case 'lte':
        return {[field]: {$lte: type(value)}};
      case 'gt':
        return {[field]: {$gt: type(value)}};
      case 'gte':
        return {[field]: {$gte: type(value)}};
      case 'in':
        // Равенство одному из значению
        splits = value.split('|');
        return {[field]: {$in: splits.map(v => type(v))}};
      case 'range':
        // Попадание в диапазон
        splits = value.split(/[;~]/);
        if (splits.length > 1) {
          // ";20"
          if (!splits[0]) {
            return {[field]: {$lte: type(splits[1])}};
          }
          // "10;"
          if (!splits[1]) {
            return {[field]: {$gte: type(splits[1])}};
          }
          // "10;20"
          return {[field]: {$gte: type(splits[0]), $lte: type(splits[1])}};
        } else {
          // "10"
          return {[field]: {$eq: type(value)}};
        }
      case 'interval':
        // Попадание в интервал
        splits = value.split(/[;~]/);
        if (splits.length > 1) {
          // ";20"
          if (!splits[0]) {
            return {[field]: {$lt: type(splits[1])}};
          }
          // "10;"
          if (!splits[1]) {
            return {[field]: {$gt: type(splits[1])}};
          }
          // "10;20"
          return {[field]: {$gt: type(splits[0]), $lt: type(splits[1])}};
        } else {
          // "10"
          return {[field]: {$gt: type(splits[0]), $lt: type(splits[0])}}; // всегда false
        }
      case 'like-start':
        // Совпадение от начала строки без учета регистра
        return {[field]: new RegExp(escapeStringRegexp(value.trim()), 'i')};
      case 'like':
        // Содержится в строке без учета регистра
        return {[field]: new RegExp('^' + escapeStringRegexp(value.trim()), 'i')};
      case 'fulltext':
        // Полнотекстовый поиск (общее условие без указния поля)
        return {
          $text: {
            $search: value,
            $language: options.lang || 'ru',
          }
        };
      case 'flex':
        // Формирование условия по спецсимволам в значении
        return {[field]: queryUtils.parseConditionFlex(value, options.types, options.trim)};
      default:
        throw new Error('Unsupported cond = "'+options.cond+'"');
    }
  },

  /**
   * Парсер условия сравнения по http://query.rest
   * @param condition {String}
   * @param types (String|Array} Типы значения
   */
  parseConditionFlex: (condition, types, trim) => {
    const type = (value) => queryUtils.type(value, types, trim);
    if (condition.substr(0, 1) === '"') {
      return {$eq: type(condition.substr(1))};
    } else {
      let itemsCond = '$and';
      let items = condition.split('|');
      if (items.length > 1) {
        // OR
        itemsCond = '$or';
      } else {
        // AND
        items = condition.split('&');
        itemsCond = '$and';
      }

      const f = (item) => {
        // Отрицание условия
        const not = (item.substr(0, 1) === '!');
        if (not) {
          item = item.substr(1);
        }
        // Диапазон
        const range = item.split(';', 2);
        if (range.length > 1) {
          return not
            ? {$lt: type(range[0]), $gt: type(range[1])}
            : {$gte: type(range[0]), $lte: type(range[1])}
        }
        // Интервал
        const interval = item.split('~', 2);
        if (interval.length > 1) {
          return not
            ? {$lte: type(interval[0]), $gte: type(interval[1])}
            : {$gt: type(interval[0]), $lt: type(interval[1])}
        }
        // Отсутствие свойства или значения
        if (item === 'null') {
          return {$exists: not}
        }
        // Неравенство
        if (not) {
          return {$ne: type(item)};
        }
        const match = item.match(/^(\*|\^|%|\/|<{1,2}|>{1,2})?(.+)/);
        switch (match[1]) {
          case '*':
            // Вхождение в строку
            return {$regex: new RegExp(escapeStringRegexp(match[2].trim()), 'i')};
          case '^':
            // Вхождение с сначала строки
            return {$regex: new RegExp('^' + escapeStringRegexp(match[2].trim()), 'i')};
          case '>':
            // Больше
            return {$gt: type(match[2])};
          case '>>':
            // Больше или равно
            return {$gte: type(match[2])};
          case '<':
            // Меньше
            return {$lt: type(match[2])};
          case '<<':
            // Меньше или равно
            return {$lte: type(match[2])};
          case '/':
          // Регулярка
          // @todo Отфильтровать на безопасность
          default:
            // Равенство
            return {$eq: type(match[2])};
        }
      };

      for (let i = 0; i < items.length; i++) {
        items[i] = f(items[i]);
      }
      if (items.length > 1) {
        return {[itemsCond]: items};
      } else {
        return items[0];
      }
    }
  },
};

module.exports = queryUtils;
