const nqlUtils = {

  $and: (cond) => {

  },

  $or: (cond) => {

  },


  // make: (exp, operator) => {
  //   if (!operator){
  //     // оператор неопредлен, значит он должен быть в exp
  //   } else {
  //     // exp
  //   }
  // }

  cond: (key, exp, operator = null) => {
    switch (key) {
      case '$and':
        return '(' + exp.map(item => nqlUtils.buildWhere({filter: item})).join(' AND ') + ')';
      case '$or':
        return '(' + exp.map(item => nqlUtils.buildWhere({filter: item})).join(' OR ') + ')';
      case '$not':
        return 'NOT(' + nqlUtils.buildWhere({filter: exp}) + ')';
      case '$ne':
        return ' != ' + nqlUtils.buildWhere({filter: exp});
      case '$lt':
        return ' < ' + nqlUtils.buildWhere({filter: exp});
      case '$gt':
        return ' > ' + nqlUtils.buildWhere({filter: exp});
      case '$in':
        return ' IN (' + exp.map(item => nqlUtils.buildWhere({filter: item})).join(',') + ')';
      case '$eq':
        return ' = ' + nqlUtils.buildWhere({filter: exp});
      default:
        return '`' + key + '`' + nqlUtils.buildWhere({filter: exp, forFiled: true});
    }
  },


  buildWhere: ({filter, forFiled = false}) => {
    if (filter && typeof filter === 'object') {
      const keys = Object.keys(filter);
      if (keys.length > 1) {
        // превращаение в $and
        const $and = [];
        for (const key of keys) {
          $and.push({[key]: filter[key]});
        }
        return nqlUtils.buildWhere({filter: {$and}});
      } else if (keys.length) {
        return nqlUtils.cond(keys[0], filter[keys[0]]);
      }
    }
    if (forFiled) {
      return nqlUtils.buildWhere({filter: {$eq: filter}});
    }
    if (typeof filter === 'string') {
      return `"${filter}"`;
    }
    if (typeof filter === 'number') {
      return `${filter}`;
    }
    if (typeof filter === 'boolean') {
      return `${filter ? 'TRUE' : 'FALSE'}`;
    }

    return 'TRUE';
  },

  buildNQL: ({bucket, filter, sort, limit, skip}) => {
    let nql = `SELECT * FROM ${bucket}`;

    if (filter) {
      nql += ` WHERE ${nqlUtils.buildWhere({filter})}`;
    }

    //order
    const sortKeys = Object.keys(sort || {});
    let order = [];
    for (const sortKey of sortKeys) {
      order.push((sortKeys[sortKey] ? 'ASC' : 'DESC') + sortKey);
    }
    if (order.length) {
      nql += 'ORDER BY' + order.join(', ');
    }
    // limit, offset
    nql += limit ? ' LIMIT ' + limit : '';
    nql += skip ? ' OFFSET ' + skip : '';

    return nql;
  }
};

module.exports = nqlUtils;
