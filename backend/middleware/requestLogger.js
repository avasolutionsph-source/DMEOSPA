import logger from '../utils/logger.js';

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info(`Incoming request: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    query: req.query,
    params: req.params
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log API response
    logger.api(
      req.method,
      req.path,
      res.statusCode,
      responseTime,
      {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    // Log errors separately
    if (res.statusCode >= 400) {
      logger.error(`Request failed: ${req.method} ${req.path}`, null, {
        statusCode: res.statusCode,
        responseTime,
        ip: req.ip,
        requestBody: req.body,
        response: data
      });
    }

    originalSend.call(this, data);
  };

  next();
};

export default requestLogger;