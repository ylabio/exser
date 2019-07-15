const ObjectID = require('mongodb').ObjectID;
const {merge, mergeAll, clone} = require('./merge.js');

const objectUtils = {

  convertForSet: (object, clearUndefined = false) => {
    let keys = Object.keys(object);
    let result = {};
    for (let key of keys) {
      if (
        typeof object[key] === 'object' &&
        object[key] !== null &&
        !Array.isArray(object[key]) &&
        !(object[key] instanceof Date) &&
        !ObjectID.isValid(object[key])
      ) {
        if ('_id' in object[key] && (!object[key]._id || object[key]._id === 'null')) {
          result[`${key}`] = {};
        } else {
          let value = objectUtils.convertForSet(object[key]);
          let valueKeys = Object.keys(value);
          for (let valueKey of valueKeys) {
            result[`${key}.${valueKey}`] = value[valueKey];
          }
        }
      } else {
        if (!clearUndefined || typeof object[key] !== 'undefined') {
          result[key] = object[key];
        }
      }
    }
    return result;
  },

  getAllValues: (object, clear = false) => {
    const set = objectUtils.convertForSet(object);
    const keys = Object.keys(set);
    const result = [];
    for (let i = 0; i < keys.length; i++) {
      if (!clear || (set[keys[i]] !== '' && set[keys[i]] !== null && typeof set[keys[i]] !== 'undefined')) {
        result.push(set[keys[i]]);
      }
    }
    return result;
  },

  unset: (obj, path) => {
    if (typeof path === 'number') {
      path = [path];
    }
    if (obj === null) {
      return obj;
    }
    if (!path) {
      return obj;
    }
    if (typeof path === 'string') {
      return objectUtils.unset(obj, path.split('.'));
    }

    const currentPath = path[0];

    if (path.length === 1) {
      if (Array.isArray(obj)) {
        obj.splice(currentPath, 1);
      } else {
        delete obj[currentPath];
      }
    } else {
      return objectUtils.unset(obj[currentPath], path.slice(1));
    }
    return obj;
  },

  get: (obj, path, defaultValue) => {
    if (typeof path === 'string') {
      path = path.split('.');
    }
    if (typeof path === 'number') {
      path = [path];
    }
    if (typeof obj === 'undefined') {
      return defaultValue;
    }
    if (path.length === 0) {
      return obj;
    }
    return objectUtils.get(obj[path[0]], path.slice(1), defaultValue);
  },

  set: (obj, path, value, doNotReplace) => {
    if (typeof path === 'number') {
      path = [path];
    }
    if (!path || path.length === 0) {
      return obj;
    }
    if (typeof path === 'string') {
      return objectUtils.set(obj, path.split('.'), value, doNotReplace);
    }
    const currentPath = path[0];
    const currentValue = obj[currentPath];
    if (path.length === 1) {
      if (currentValue === void 0 || !doNotReplace) {
        obj[currentPath] = value;
      }
      return currentValue;
    }

    if (currentValue === void 0) {
      //check if we assume an array
      if (typeof path[1] === 'number') {
        obj[currentPath] = [];
      } else {
        obj[currentPath] = {};
      }
    }

    return objectUtils.set(obj[currentPath], path.slice(1), value, doNotReplace);
  },

  leave: (object, paths) => {
    let result = {};
    for (let path of paths) {
      objectUtils.set(result, path, objectUtils.get(object, path));
    }
    return result;
  },

  pull: (object, fields) => {
    const paths = Object.keys(fields);
    for (const path of paths) {
      const cond = fields[path];
      const array = objectUtils.get(object, path, []);
      if (Array.isArray(array)) {
        objectUtils.set(object, path, array.filter(value => {
          return !isEqual(cond, value);
        }));
      } else {
        throw new Error('Cannot pull on not array');
      }
    }
    return object;
  },

  push: (object, fields) => {
    const paths = Object.keys(fields);
    for (const path of paths) {
      const value = fields[path];
      const array = objectUtils.get(object, path, []);
      //console.log(path, array);
      if (Array.isArray(array)) {
        array.push(value);
        objectUtils.set(object, path, array);
      } else {
        throw new Error('Cannot push on not array');
      }
    }
    return object;
  },

  getChanges: (source = {}, compare = {}, ignore = []) => {
    let result = {};
    const obj1 = objectUtils.convertForSet(source);
    const obj2 = objectUtils.convertForSet(compare);
    const keys = Object.keys(obj2);
    for (const key of keys) {
      if (ignore.indexOf(key) === -1) {
        let eq = false;
        if (obj1[key] instanceof ObjectID && obj2[key] instanceof ObjectID) {
          eq = obj2[key].equals(obj1[key]);
        } else if (obj1[key] instanceof Date && obj2[key] instanceof Date) {
          eq = obj1[key].getTime() === obj2[key].getTime();
        } else {
          eq = obj2[key] === obj1[key];
        }
        if (!eq) {
          result[key] = obj2[key];
        }
      }
    }
    return result;
  },

  merge: merge,
  mergeAll: mergeAll,
  clone: clone
};

module.exports = objectUtils;
