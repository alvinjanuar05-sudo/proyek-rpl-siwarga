const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const apiRoutes = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Pembatas Laju Akses (Rate Limiter) Umum
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 300, // Maksimal 300 request per IP dalam 15 menit
  message: {
    success: false,
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi beberapa saat lagi.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware Global
app.use(cors());
app.use(globalLimiter); // Pasang pembatas request global
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount Seluruh Endpoint API dengan Prefix /api
app.use('/api', apiRoutes);

// Central Error Handler Middleware
app.use(errorHandler);

// Jalankan Server Express
app.listen(PORT, () => {
  console.log(`🚀 Server Backend SiWarga berjalan di http://localhost:${PORT}`);
});