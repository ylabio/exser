const {query, schema} = require('../../../utils');

module.exports = async (router, services) => {

  const spec = await services.getSpec();
  const tags = spec.setTags({name: 'Tests', description: 'Тестовая модель'});
  const access = await services.getAccess();
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
  }), async (req, res) => {
    res.status(201);
    const result = await tests.createOne({
      body: req.body,
      session: req.session,
      fields: query.parseFields(req.query.fields)
    });
    return query.loadByFields({
      object: result,
      fields: req.query.fields,
      action: req.def.action/// @todo??
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
    // Фильтр для выборки
    const filter = query.makeFilter(req.query.search, {
      query: {cond: 'like', fields: ['name', 'status']},
      access: () => access.makeFilterQuery({action: req.def.action, session: req.session}),
    });
    // Выборка с фильтром
    const result = {
      items: await tests.findMany({
        filter,
        sort: query.parseSort(req.query.sort),
        limit: req.query.limit,
        skip: req.query.skip,
        session: req.session,
      }),
      count: query.inFields(req.query.fields, 'items.count')
        ? await tests.getCount({filter, session: req.session})
        : undefined
    };
    // Результат с учётом запрашиваемых полей
    return result;
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
    const result = await tests.findOne({
      filter: query.makeFilter({_id: req.params.id}, {
        _id: {cond: 'eq', type: 'ObjectId'}
      }),
      session: req.session,
    });
    return query.loadByFields({
      object: result,
      fields: req.query.fields,
      action: req.def.action/// @todo??
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
    const result = await tests.updateOne({
      id: req.params.id,
      body: req.body,
      session: req.session,
    });
    return query.loadByFields({
      object: result,
      fields: req.query.fields,
      action: req.def.action/// @todo??
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
  //     //fields: query.parseFields(req.query.fields)
  //   });
  //   return await tests.view({object: result, session, fields: query.parseFields(req.query.fields)})
  // });
};
