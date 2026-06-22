const timestamp = () => new Date().toISOString();

const logger = {
  request(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `[${timestamp()}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`
      );
    });
    next();
  },

  info(message, data) {
    if (data !== undefined) {
      console.log(`[${timestamp()}] INFO ${message}`, data);
    } else {
      console.log(`[${timestamp()}] INFO ${message}`);
    }
  },

  warn(message, data) {
    if (data !== undefined) {
      console.warn(`[${timestamp()}] WARN ${message}`, data);
    } else {
      console.warn(`[${timestamp()}] WARN ${message}`);
    }
  },

  error(err, context) {
    console.error(`[${timestamp()}] ERROR ${err.message}`, context ?? '');
    if (err.stack) console.error(err.stack);
  },
};

export default logger;
