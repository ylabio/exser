const express = require('express');
const pathToSwaggerUi = require('swagger-ui-dist').absolutePath()

module.exports = async (router, services, url) => {

  let spec = await services.getSpec();

  // swagger.html
  router.get(/docs$/, (req, res) => {
    res.redirect(url.path + '/docs/');
  });
  router.get('/docs/index.html', (req, res) => {
    res.redirect(url.path + '/docs/');
  });
  router.get(/docs\/$/, {
    // Схема определена ради operationId, на который можно повесить контроль доступа
    path: '/docs',
    operationId: 'swagger.ui',
    summary: 'Документация к АПИ',
    tags: ['Swagger'],
    responses: {
      200: {content: {'application/html': {}}}
    },
    hidden: true
  }, (req, res) => {
    res.sendFile(__dirname + '/swagger.html');
  });

  // Спецификация для swagger ui
  router.get('/docs/source.json', {
    // Схема определена ради operationId, на который можно повесить контроль доступа
    operationId: 'swagger.source',
    summary: 'Исходник документация к АПИ',
    tags: ['Swagger'],
    responses: {
      200: {content: {'application/json': {}}}
    },
    hidden: true
  }, (req, res) => {
    res.json(spec.getSchemaOpenApi({host: `//${req.headers.host}`}));
  });

  // Скрипты, картинки, стили swagger ui
  router.use('/docs', express.static(pathToSwaggerUi));

  console.log(`Swagger doc: ${url.base}${url.path}/docs`);
};