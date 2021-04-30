module.exports = async (router, services, url) => {

  /** @type {Sessions} */
  const sessions = await services.getSessions();

  /**
   * Инициализация сессии запроса
   */
  router.use('', async (req, res, next) => {
    req.session = sessions.create();
    // Локаль по параметрам запроса
    req.session.lang = (req.query.lang || req.get('X-Lang') || req.get('Accept-Language') || 'ru').split('-')[0];
    next();
  });
};