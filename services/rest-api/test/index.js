const {errors, objectUtils, queryUtils} = require('../../../utils');

module.exports = async (router, services) => {

  const spec = await services.getSpec();
  const storage = await services.getStorage();
  /** @type {Test} */
  const tests = storage.get('test');

  /**
   * Создание
   */
  router.post('/tests', {
    operationId: 'tests.create',
    summary: 'Создание',
    description: 'Создание объекта',
    session: spec.generate('session.user.role', ['admin']),
    tags: ['Tests'],
    requestBody: {
      content: {
        'application/json': {schema: {$ref: '#/components/schemas/test.create'}}
      }
    },
    parameters: [
      {$ref: '#/components/parameters/lang'},
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '*'
      }
    ],
    responses: {
      200: spec.generate('success', {$ref: '#/components/schemas/test.view'})
    }
  }, async (req) => {
    return await tests.createOne({
      body: req.body,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   * Выбор списка
   */
  router.get('/tests', {
    operationId: 'tests.list',
    summary: 'Выбор списка (поиск)',
    description: 'Список объектов с фильтром',
    tags: ['Tests'],
    //session: spec.generate('session.user.role', ['user']),
    parameters: [
      {
        in: 'query',
        name: 'search[query]',
        description: 'Общий поиск по совпадению строке',
        schema: {type: 'string'},
        required: false
      },
      {$ref: '#/components/parameters/lang'},
      {$ref: '#/components/parameters/sort'},
      {$ref: '#/components/parameters/limit'},
      {$ref: '#/components/parameters/skip'},
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '*'
      },
    ],
    responses: {
      200: spec.generate('success', {$ref: '#/components/schemas/test.viewList'})
    }
  }, async (req) => {
    const filter = queryUtils.makeFilter(req.query.search, {
      query: {cond: 'like', fields: ['name', 'status']},
    });
    return tests.getList({
      filter,
      sort: queryUtils.formattingSort(req.query.sort),
      limit: req.query.limit,
      skip: req.query.skip,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   * Выбор одного
   */
  router.get('/tests/:id', {
    operationId: 'tests.one',
    summary: 'Выбор одного',
    description: 'Объекта по идентификатору',
    tags: ['Tests'],
    //session: spec.generate('session.user.role', ['user']),
    parameters: [
      {
        in: 'path',
        name: 'id',
        schema: {type: 'string'},
        description: 'Идентификатор объекта'
      },
      {$ref: '#/components/parameters/lang'},
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'}, example: '*'
      }
    ],
    responses: {
      200: spec.generate('success', {$ref: '#/components/schemas/test.view'}),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req/*, res*/) => {

    return await tests.getOne({
      filter: queryUtils.makeFilter({_id: req.params.id}, {
        _id: {cond: 'eq', type: 'ObjectId'}
      }),
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   * Редактирование
   */
  router.put('/tests/:id', {
    operationId: 'tests.update',
    summary: 'Редактирование',
    description: 'Изменение объекта',
    tags: ['Tests'],
    session: spec.generate('session.user.role', ['admin']),
    requestBody: {
      content: {
        'application/json': {schema: {$ref: '#/components/schemas/test.update'}}
      }
    },
    parameters: [
      {
        in: 'path',
        name: 'id',
        description: 'id объекта',
        schema: {type: 'string'}
      },
      {$ref: '#/components/parameters/lang'},
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '*'
      }
    ],
    responses: {
      200: spec.generate('success', {$ref: '#/components/schemas/test.view'}),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req) => {

    return await tests.updateOne({
      id: req.params.id,
      body: req.body,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   * Удаление
   */
  router.delete('/tests/:id', {
    operationId: 'tests.delete',
    summary: 'Удаление',
    description: 'Удаление объекта',
    session: spec.generate('session.user.role', ['admin']),
    tags: ['Tests'],
    parameters: [
      {
        in: 'path',
        name: 'id',
        description: 'Идентификатор объекта',
        schema: {type: 'string'}
      },
      {$ref: '#/components/parameters/lang'},
      {
        in: 'query',
        name: 'fields',
        description: 'Выбираемые поля',
        schema: {type: 'string'},
        example: '_id'
      }
    ],
    responses: {
      200: spec.generate('success', true),
      404: spec.generate('error', 'Not Found', 404)
    }
  }, async (req) => {

    return await tests.deleteOne({
      id: req.params.id,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });
};
