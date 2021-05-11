const express = require('express');
const pathToSwaggerUi = require('swagger-ui-dist').absolutePath()

module.exports = async (router, services, baseUrl) => {

  let spec = await services.getSpec();

  // swagger.html
  router.origin.get(/docs$/, (req, res) => {
    res.redirect(baseUrl + '/docs/');
  });
  router.origin.get('/docs/index.html', (req, res) => {
    res.redirect(baseUrl + '/docs/');
  });
  router.origin.get(/docs\/$/, (req, res) => {
    res.sendFile(__dirname + '/swagger.html');
  });

  // Спецификация для swagger ui
  router.origin.get('/docs/source.json', (req, res) => {
    res.json(spec.getSchemaOpenApi({host: `//${req.headers.host}`}));
  });

  // Скрипты, картинки, стили swagger ui
  router.use('/docs', express.static(pathToSwaggerUi));
};