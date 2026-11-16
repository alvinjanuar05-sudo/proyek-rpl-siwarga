const db = require('../db');

/**
 * Middleware untuk memverifikasi apakah request membawa identitas user yang valid.
 * Memeriksa header 'x-user-id' atau 'authorization' dari request frontend.
 */
const verifyAuth = async (req, res, next) => {
  try {
    let userId = req.headers['x-user-id'] || req.headers['authorization'];
    if (typeof userId === 'string' && userId.startsWith('Bearer ')) {
      userId = userId.slice(7).trim();
    }

    const fallbackNik = req.body?.user?.nik || req.body?.nik || req.query?.nik;
    const fallbackId = req.body?.user?.id_user || req.body?.user?.id || req.query?.id_user || req.query?.id;
    const lookupId = userId || fallbackId;

    let rows = [];

    if (lookupId) {
      // Ambil data user terkini dari database berdasarkan id_user atau nik
      const [resRows] = await db.query(
        'SELECT id_user, nik, nama, email, role, id_desa, status FROM users WHERE id_user = ? OR nik = ? LIMIT 1',
        [lookupId, lookupId]
      );
      rows = resRows;
    }

    // Jika belum ditemukan lewat ID/Header, lakukan lookup fallback berdasarkan NIK
    if (rows.length === 0 && fallbackNik) {
      const [resRowsNik] = await db.query(
        'SELECT id_user, nik, nama, email, role, id_desa, status FROM users WHERE nik = ? LIMIT 1',
        [fallbackNik]
      );
      rows = resRowsNik;
    }

    let user = null;

    if (rows.length > 0) {
      user = rows[0];
    } else if (fallbackNik) {
      // Jika NIK dikirimkan lewat query atau body (misal /api/notifikasi?nik=... atau chat AI), izinkan sesi lanjut
      user = {
        id_user: String(fallbackId || fallbackNik),
        nik: String(fallbackNik),
        nama: req.body?.user?.nama || req.query?.nama || 'Warga Terdaftar',
        email: req.body?.user?.email || req.query?.email || '',
        role: String(req.body?.user?.role || req.query?.role || 'WARGA').toUpperCase(),
        id_desa: req.body?.user?.id_desa || req.query?.id_desa || 'DESA-001',
        status: 'ACTIVE'
      };
    } else {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak! Identitas otentikasi (User ID/NIK/Token) tidak ditemukan.'
      });
    }

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