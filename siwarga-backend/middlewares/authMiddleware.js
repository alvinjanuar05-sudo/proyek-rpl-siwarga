const db = require('../db');

/**
 * Middleware untuk memverifikasi apakah request membawa identitas user yang valid.
 * Memeriksa header 'x-user-id' atau 'authorization' dari request frontend.
 */
const verifyAuth = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || req.headers['authorization'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak! Identitas otentikasi (User ID/Token) tidak ditemukan.'
      });
    }

    // Ambil data user terkini dari database
    const [rows] = await db.query(
      'SELECT id_user, nik, nama, email, role, id_desa, status FROM users WHERE id_user = ? LIMIT 1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Sesi tidak valid atau pengguna tidak ditemukan.'
      });
    }

    const user = rows[0];
    const statusUpper = (user.status || '').toUpperCase();

    if (statusUpper === 'SUSPENDED' || statusUpper === 'DITOLAK' || statusUpper === 'REJECTED') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak! Akun Anda sedang dibekukan atau ditolak oleh Admin Desa.'
      });
    }

    // Sematkan data user ke objek request agar bisa diakses oleh controller
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Kesalahan server pada proses verifikasi otentikasi.',
      error: err.message
    });
  }
};

/**
 * Middleware Otorisasi Khusus Admin Desa & Super Admin.
 * Memastikan hanya user dengan role 'ADMIN_DESA', 'ADMIN', atau 'SUPER_ADMIN' yang bisa mengakses endpoint sensitif.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak! Otentikasi diperlukan.'
    });
  }

  const roleUpper = (req.user.role || '').toUpperCase();
  if (
    roleUpper !== 'ADMIN_DESA' &&
    roleUpper !== 'ADMIN' &&
    roleUpper !== 'SUPER_ADMIN' &&
    roleUpper !== 'SUPER-ADMIN'
  ) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak! Fitur ini hanya dapat diakses oleh Admin Desa.'
    });
  }

  next();
};

/**
 * Middleware Otorisasi Khusus Super Admin Pusat.
 * Memastikan hanya user dengan role 'SUPER_ADMIN' yang bisa mengakses konfigurasi tingkat tinggi.
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak! Otentikasi diperlukan.'
    });
  }

  const roleUpper = (req.user.role || '').toUpperCase();
  if (roleUpper !== 'SUPER_ADMIN' && roleUpper !== 'SUPER-ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak! Area ini khusus Super Administrator.'
    });
  }

  next();
};

module.exports = {
  verifyAuth,
  requireAdmin,
  requireSuperAdmin
};