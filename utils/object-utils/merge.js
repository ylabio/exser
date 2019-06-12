function isMergeableObject(value) {
  return isNonNullObject(value) && isNotSpecial(value);
}

function isNonNullObject(value) {
  return !!value && typeof value === 'object';
}

function isNotSpecial(value) {
  let stringValue = Object.prototype.toString.call(value);

  return stringValue !== '[object RegExp]'
    && stringValue !== '[object Date]';
}

function emptyTarget(val) {
  return Array.isArray(val) ? [] : {};
}

function cloneIfNecessary(value, optionsArgument) {
  let clone = optionsArgument && optionsArgument.clone === true;
  return (clone && isMergeableObject(value))
    ? deepmerge(emptyTarget(value), value, optionsArgument)
    : value;
}

function defaultArrayMerge(target, source, optionsArgument) {
  //return source;
  let destination = [];//target.slice();
  source.forEach(function (e, i) {
    if (typeof destination[i] === 'undefined') {
      destination[i] = cloneIfNecessary(e, optionsArgument);
    } else if (isMergeableObject(e)) {
      destination[i] = deepmerge(target[i], e, optionsArgument);
    } else if (target.indexOf(e) === -1) {
      destination.push(cloneIfNecessary(e, optionsArgument));
    }
  });
  return destination;
}

function mergeObject(target, source, optionsArgument) {
  const objectUtils = require('./index.js');
  let result = {};
  let keys = Object.keys(source);
  let destination = {};
  // keys.forEach(function (key) {
  //   destination[key] = undefined;
  // });
  if (isMergeableObject(target)) {
    Object.keys(target).forEach(function (key) {
      destination[key] = cloneIfNecessary(target[key], optionsArgument);
    });
  }
  if (keys.length || !optionsArgument.replaceEmpty) {
    keys.forEach(function (key) {
      if (!isMergeableObject(source[key]) || !target[key]) {
        destination[key] = cloneIfNecessary(source[key], optionsArgument);
      } else {
        destination[key] = deepmerge(target[key], source[key], optionsArgument);
      }
    });
    result = destination;
  }
  if (result.$unset) {
    for (let path of result.$unset) {
      objectUtils.unset(result, path);
    }
    delete result.$unset;
  }
  if (result.$set) {
    const keys = Object.keys(result.$set);
    for (let path of keys) {
      objectUtils.set(result, path, result.$set[path]);
    }
    delete result.$set;
  }
  if (result.$leave) {
    result = objectUtils.leave(result, result.$leave);
    delete result.$leave;
  }
  if (result.$push) {
    result = objectUtils.push(result, result.$push);
    delete result.$push;
  }
  if (result.$pull) {
    result = objectUtils.pull(result, result.$pull);
    delete result.$pull;
  }
  return result;
}

function deepmerge(target, source, optionsArgument) {
  let sourceIsArray = Array.isArray(source);
  let targetIsArray = Array.isArray(target);
  let options = optionsArgument || {};
  if (!('arrayMerge' in options)) {
    options.arrayMerge = defaultArrayMerge;
  }
  if (!('clone' in options)) {
    options.clone = true;
  }
  let sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
  if (!sourceAndTargetTypesMatch) {
    return cloneIfNecessary(source, options);
  } else if (sourceIsArray) {
    return options.arrayMerge(target, source, options);
  } else {
    return mergeObject(target, source, options);
  }
}

deepmerge.all = function deepmergeAll(array, optionsArgument) {
  if (!Array.isArray(array) || array.length < 2) {
    throw new Error('first argument should be an array with at least two elements');
  }

  // we are sure there are at least 2 values, so it is safe to have no initial value
  return array.reduce(function (prev, next) {
    return deepmerge(prev, next, optionsArgument);
  });
};

module.exports = {
  merge: (...items) => {
    return deepmerge.all(items, {})
  },
  mergeAll: (...items) => {
    return deepmerge.all(items, {
      arrayMerge: (target, source, optionsArgument) => {
        let destination = [...target];
        source.forEach(function (e, i) {
          // Поиск элемента
          const destIndex = destination.findIndex((item => (item === e || (item._id && e._id && item._id === e._id))));
          if (destIndex!==-1){
            if (isMergeableObject(e)) {
              destination[destIndex] = deepmerge(destination[destIndex], e, optionsArgument);
            }else{
              destination[destIndex] = cloneIfNecessary(e, optionsArgument);
            }
          } else {
            destination.push(cloneIfNecessary(e, optionsArgument));
          }


          // if (typeof destination[i] === 'undefined') {
          //   destination[i] = cloneIfNecessary(e, optionsArgument);
          // // } else if (isMergeableObject(e)) {
          // //   destination[i] = deepmerge(target[i], e, optionsArgument);
          // } else if (target.indexOf(e) === -1) {
          //   destination.push(cloneIfNecessary(e, optionsArgument));
          // }
        });
        return destination;
      }
    })
  },
  clone: (value, optionsArgument = {}) => {
    optionsArgument.clone = true;
    return cloneIfNecessary(value, optionsArgument);
  }
};
