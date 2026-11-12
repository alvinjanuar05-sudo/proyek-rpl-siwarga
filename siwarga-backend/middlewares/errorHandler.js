/**
 * Central Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);

  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.',
    // 🛡️ SANITASI KEAMANAN: Sembunyikan detail error SQL internal di mode Production
    ...(isProduction ? {} : { error: err.message || err })
  });
};

module.exports = {
  errorHandler
};