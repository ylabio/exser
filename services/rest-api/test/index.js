const {errors, objectUtils, queryUtils, schemaUtils: schema} = require('../../../utils');

module.exports = async (router, services) => {

  const spec = await services.getSpec();
  const tags = spec.setTags({name: 'Tests', description: 'Тестовая модель'});

  const storage = await services.getStorage();
  /** @type {Test} */
  const tests = storage.get('test');

  /**
   * POST
   */
  router.post('/tests', schema.route({
    summary: 'Создание',
    action: 'tests.create',
    tags: tags,
    requestBody: schema.body({schema: {$ref: '#/components/schemas/storage.test'}}),
    parameters: [
      schema.paramFields({}),
      schema.paramLang({}),
    ],
    responses: {
      201: schema.bodyResult({schema: {$ref: '#/components/schemas/storage.test'}})
    }
  }), async (req) => {
    return await tests.createOne({
      body: req.body,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   * GET
   */
  router.get('/tests', schema.route({
    summary: 'Выбор списка (поиск)',
    action: 'tests.find.many',
    tags: tags,
    parameters: [
      schema.paramSearch({name: 'query', description: 'Общий поиск на совпадение строке'}),
      schema.paramFields({}),
      schema.paramLimit({}),
      schema.paramSkip({}),
      schema.paramSort({}),
      schema.paramLang({}),
    ],
    responses: {
      200: schema.bodyResultList({schema: {$ref: '#/components/schemas/storage.test'}})
    }
  }), async (req) => {
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
   * GET LIST
   */
  router.get('/tests/:id', schema.route({
    summary: 'Выбор одного по идентификатору',
    action: 'tests.find.one',
    tags: tags,
    parameters: [
      schema.param({name: 'id', in: 'path', description: 'Идентификатор объекта'}),
      schema.paramFields({}),
      schema.paramLang({}),
    ],
    responses: {
      200: schema.bodyResult({schema: {$ref: '#/components/schemas/storage.test'}}),
      404: schema.bodyError({description: 'Not Found'})
    }
  }), async (req/*, res*/) => {
    return await tests.getOne({
      filter: queryUtils.makeFilter({_id: req.params.id}, {
        _id: {cond: 'eq', type: 'ObjectId'}
      }),
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   * PUT (PATCH)
   */
  router.put('/tests/:id', schema.route({
    summary: 'Редактирование',
    action: 'tests.update',
    tags: tags,
    requestBody: schema.body({schema: {$ref: '#/components/schemas/storage.test'}}),
    parameters: [
      schema.param({name: 'id', in: 'path', description: 'Идентификатор объекта'}),
      schema.paramFields({}),
      schema.paramLang({}),
    ],
    responses: {
      200: schema.bodyResult({schema: {$ref: '#/components/schemas/storage.test'}}),
      404: schema.bodyError({description: 'Not Found'})
    }
  }), async (req) => {
    return await tests.updateOne({
      id: req.params.id,
      body: req.body,
      session: req.session,
      fields: queryUtils.parseFields(req.query.fields)
    });
  });

  /**
   * POST Upload
   */
  router.post('/files', schema.route({
    summary: 'Загрузка и создание',
    action: 'files.upload',
    description: 'Загрузка файла на сервер. Используется потоковая загрузка с прогрессом загрузки (HTML5)',
    tags: tags,
    requestBody: schema.body({
      description: 'Файл для загрузки',
      mediaType: 'multipart/form-data',
      schema: schema.object({
        properties: {
          file: schema.string({format: 'binary'})
        }
      })
    }),
    parameters: [
      schema.paramFields({}),
    ],
    responses: {
      201: schema.bodyResult({schema: {$ref: '#/components/schemas/storage.test'}}),
      400: schema.bodyError({description: 'Bad Request'})
    }
  }), async (req, res, next) => {
    return true;
  });

  /**
   * DELETE
   */
  // router.delete('/tests/:id', schema.route({
  //   action: 'tests.delete',
  //   summary: 'Удаление',
  //   description: 'Удаление объекта',
  //   tags: ['Tests'],
  //   parameters: {
  //     id: {in: 'path', description: 'Идентификатор объекта', schema: {type: 'string'}},
  //     lang: {$ref: '#/components/parameters/lang'},
  //     fields: {description: 'Выбираемые поля', schema: {type: 'string'}, example: '_id'}
  //   },
  //   responses: {
  //     200: schema.success({schema:{$ref: '#/components/schemas/storage.test'}}),
  //     404: schema.error({description: 'Not Found', status: 404})
  //   }
  // }), async (req) => {
  //
  //   const result = await tests.deleteOne({
  //     id: req.params.id,
  //     session: req.session,
  //     //fields: queryUtils.parseFields(req.query.fields)
  //   });
  //   return await tests.view({object: result, session, fields: queryUtils.parseFields(req.query.fields)})
  // });
};
