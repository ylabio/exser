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
    let testValue =  typeof value === 'string' && trim ? value.trim() : value;
    type = types.shift();
    let result;
    try {
      switch (type.toLowerCase()) {
        case 'number':
          if (typeof value === 'string'){
            result = Number(testValue.replace(/\s/g,'').replace(/,/g,'.'));
          }else {
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
      }

      // Функция не завершена, значит тип не подходит
      if (types.length) {
        return this.type(value, types, trim);
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
    if (fieldsString && typeof fieldsString === 'object'){
      return fieldsString;
    }
    if (!fieldsString || typeof fieldsString !== 'string') {
      return null;
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
            if (propertyTypes[key].field){
              propertyTypes[key].fields = propertyTypes[key].field;
            }
            if (!propertyTypes[key].fields || !propertyTypes[key].fields.length) {
              propertyTypes[key].fields = [key];
            }
            if (!Array.isArray(propertyTypes[key].fields)){
              propertyTypes[key].fields = [propertyTypes[key].fields];
            }

            if (propertyTypes[key].type){
              propertyTypes[key].types = propertyTypes[key].type;
            }
            if (propertyTypes[key].cond){
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
  formattingSimpleSearch(searchValue, options = {kind: 'regex', fields: ['title'], exists: false}) {
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
                $in.push(this.type(value, 'ObjectId'));
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
                  $gte: this.type(values[0]),
                  $lte: this.type(values[1])
                }
              );
            } else {
              $in.push({$eq: this.type(values[0])});
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
              const greaterThan = values[0];
              const lessThan = values[1];
              $in.push({
                ...greaterThan ? {$gte: greaterThan} : {},
                ...lessThan ? {$lte: lessThan} : {},
              });
            } else {
              $in.push({
                $eq: values[0]
              });
            }
            break;
          case 'range-date':
          case 'range-dates':
            values = value.split(';');
            if (values.length === 2) {
              const greaterThan = moment(values[0]).toDate();
              const lessThan = moment(values[1]).toDate();
              $in.push({
                ...greaterThan ? {$gte: greaterThan} : {},
                ...lessThan ? {$lte: lessThan} : {},
              });
            } else {
              $in.push({
                $eq: values[0]
              });
            }
            break;
          case 'gt':
            $in.push({$gt: this.type(value)});
            break;
          case 'lt':
            $in.push({$lt: this.type(value)});
            break;
          case 'gte':
            $in.push({$gte: this.type(value)});
            break;
          case 'lte':
            $in.push({$lte: this.type(value)});
            break;
          case 'const':
          case 'eq':
            if (value !== '') {
              if (value === 'null') {
                $exists = false;
              } else {
                $in.push(this.type(value));
              }
            }
            break;
          default:
            $in.push({[options.kind]: this.type(value, options.types, options.trim)});
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
  }
};

module.exports = queryUtils;
