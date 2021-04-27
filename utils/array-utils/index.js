const arrayUtils = {

  random(items) {
    return items[Math.floor(Math.random() * items.length)];
  },

  parseCommands(items, defaultCommand = '') {
    let result = [];
    let cursor;
    const convertType = (value) => {
      if (value === 'false') {
        return false;
      }
      if (value === 'true') {
        return true;
      }
      if (value === 'null') {
        return null;
      }
      // if (value.length >= 2 && value.match(/^[\[{].*[\]}]$/)){
      //   console.log(value);
      //   return JSON.parse(value);
      // }
      return typeof value !== 'undefined' ? (Number(value) || value) : true;
    }
    for (const item of items) {
      const match = item.match(/^(--?)?([^=\[\]]+)(\[])?(=)?(.+)?$/);
      if (match) {
        let name = match[2];
        let value = match[5];

        if (match[1] || match[4] || match[3]) {
          //params
          if (match[3]) {
            //[]
            value = typeof value === 'string' ? value.split(',').map(item => convertType(item)) : [];
          } else {
            value = convertType(value);
          }
          if (!cursor) {
            result.push({name: defaultCommand, params: {}});
            cursor = result[result.length - 1].params;
          }
          cursor[name] = value;
        } else {
          // group
          result.push({name, params: {}});
          cursor = result[result.length - 1].params;
        }
      }
    }
    if (defaultCommand && result.length === 0){
      result.push({name: defaultCommand, params: {}});
    }

    return result;
  },

  /**
   * Заполнить элементы массива, индексы которых указаны битовой маской
   * @param list {Array} Массив, чьи элементы нужно заполнить
   * @param fill {*} Какие элементы заполнить. Определяются индексом единиц в бинарном числе, например mask = 5 => 101
   * @param mask {Number} Целое положительное число
   * @returns {*[]}
   */
  fillByBinaryMask(list, fill, mask){
    let result = [];
    for (let b = 0; b < list.length; b++){
      const sign = Math.pow(2, list.length-b-1); // ... 16, 8, 4, 2, 1 ... для битового сравнения
      if (mask & sign) {
        result.push(fill);
      } else {
        result.push(list[b]);
      }
    }
    return result;
  }

};

module.exports = arrayUtils;
