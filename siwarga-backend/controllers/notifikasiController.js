const db = require('../db');

// Helper ekstrak identitas terverifikasi dari req.user (verifyAuth)
const getVerifiedIdentity = (req) => {
  const authUser = req.user || {};
  const userRole = String(authUser.role || 'WARGA').toUpperCase().trim();
  const isAdmin =
    userRole === 'ADMIN' ||
    userRole === 'ADMIN_DESA' ||
    userRole === 'PETUGAS_DESA' ||
    userRole === 'SUPER_ADMIN' ||
    userRole === 'SUPER-ADMIN';

  return {
    nik: authUser.nik || null,
    id_desa: authUser.id_desa || req.query.id_desa || req.body?.id_desa || 'DESA-001',
    userRole,
    isAdmin
  };
};

// GET /api/notifikasi
const getNotifikasi = async (req, res) => {
  const { nomor_rt, nomor_rw } = req.query;
  const { nik, id_desa, isAdmin } = getVerifiedIdentity(req);

  const rwTarget = nomor_rw ? String(parseInt(nomor_rw, 10) || nomor_rw) : null;
  const rtTarget = nomor_rt ? String(parseInt(nomor_rt, 10) || nomor_rt) : null;

  try {
    let rows = [];

    if (nik || isAdmin) {
      const query = `
        SELECT * FROM notifikasi
        WHERE (id_desa = ? OR id_desa IS NULL)
          AND (
            (target_cakupan = 'PERSONAL' AND nik = ?)
            OR (target_cakupan = 'GLOBAL')
            OR (target_cakupan = 'ADMIN_DESA' AND ? = TRUE)
            OR (
              target_cakupan = 'RW' 
              AND (
                CAST(target_rw AS UNSIGNED) = CAST(? AS UNSIGNED) 
                OR target_rw = ? 
                OR ? IS NULL
              )
            )
            OR (
              target_cakupan = 'RTRW' 
              AND (
                CAST(target_rw AS UNSIGNED) = CAST(? AS UNSIGNED) 
                OR target_rw = ? 
                OR ? IS NULL
              )
              AND (
                CAST(target_rt AS UNSIGNED) = CAST(? AS UNSIGNED) 
                OR target_rt = ? 
                OR ? IS NULL
              )
            )
          )
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const [result] = await db.query(query, [
        id_desa,
        nik || '',
        isAdmin,
        rwTarget, rwTarget, rwTarget,
        rwTarget, rwTarget, rwTarget,
        rtTarget, rtTarget, rtTarget
      ]);
      rows = result;
    } else {
      // Fallback hanya notifikasi GLOBAL desa setempat (tanpa ADMIN_DESA)
      const query = `
        SELECT * FROM notifikasi
        WHERE (id_desa = ? OR id_desa IS NULL) 
          AND target_cakupan = 'GLOBAL'
        ORDER BY created_at DESC
        LIMIT 30
      `;
      const [result] = await db.query(query, [id_desa]);
      rows = result;
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error get notifikasi:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/notifikasi/:id/read
const markAsRead = async (req, res) => {
  const { id } = req.params;
  const { nik, isAdmin } = getVerifiedIdentity(req);

  try {
    if (isAdmin) {
      await db.query('UPDATE notifikasi SET is_read = 1 WHERE id_notifikasi = ?', [id]);
    } else {
      await db.query(
        `UPDATE notifikasi SET is_read = 1 
         WHERE id_notifikasi = ? AND (nik = ? OR target_cakupan IN ('GLOBAL', 'RW', 'RTRW'))`,
        [id, nik || '']
      );
    }
    res.json({ success: true, message: 'Notifikasi ditandai dibaca' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/notifikasi/read-all
const markAllAsRead = async (req, res) => {
  const { nomor_rt, nomor_rw } = req.body;
  const { nik, id_desa, isAdmin } = getVerifiedIdentity(req);

  const rwTarget = nomor_rw ? String(parseInt(nomor_rw, 10) || nomor_rw) : null;
  const rtTarget = nomor_rt ? String(parseInt(nomor_rt, 10) || nomor_rt) : null;

  try {
    if (nik || isAdmin) {
      const query = `
        UPDATE notifikasi 
        SET is_read = 1 
        WHERE (id_desa = ? OR id_desa IS NULL)
          AND (
            (target_cakupan = 'PERSONAL' AND nik = ?)
            OR (target_cakupan = 'GLOBAL')
            OR (target_cakupan = 'ADMIN_DESA' AND ? = TRUE)
            OR (
              target_cakupan = 'RW' 
              AND (
                CAST(target_rw AS UNSIGNED) = CAST(? AS UNSIGNED) 
                OR target_rw = ? 
                OR ? IS NULL
              )
            )
            OR (
              target_cakupan = 'RTRW' 
              AND (
                CAST(target_rw AS UNSIGNED) = CAST(? AS UNSIGNED) 
                OR target_rw = ? 
                OR ? IS NULL
              )
              AND (
                CAST(target_rt AS UNSIGNED) = CAST(? AS UNSIGNED) 
                OR target_rt = ? 
                OR ? IS NULL
              )
            )
          )
      `;
      await db.query(query, [
        id_desa,
        nik || '',
        isAdmin,
        rwTarget, rwTarget, rwTarget,
        rwTarget, rwTarget, rwTarget,
        rtTarget, rtTarget, rtTarget
      ]);
    } else {
      await db.query(
        'UPDATE notifikasi SET is_read = 1 WHERE id_desa = ? AND target_cakupan = "GLOBAL"',
        [id_desa]
      );
    }
    res.json({ success: true, message: 'Semua notifikasi berhasil ditandai dibaca' });
  } catch (err) {
    console.error('Error markAllAsRead:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/notifikasi/:id
const deleteNotifikasi = async (req, res) => {
  const { id } = req.params;
  const { nik, isAdmin } = getVerifiedIdentity(req);

  try {
    if (isAdmin) {
      await db.query('DELETE FROM notifikasi WHERE id_notifikasi = ?', [id]);
    } else {
      // Warga hanya boleh menghapus notifikasi PERSONAL miliknya sendiri
      await db.query(
        'DELETE FROM notifikasi WHERE id_notifikasi = ? AND nik = ? AND target_cakupan = "PERSONAL"',
        [id, nik || '']
      );
    }
    res.json({ success: true, message: 'Notifikasi berhasil dihapus' });
  } catch (err) {
    console.error('Error deleteNotifikasi:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/notifikasi/clear-all
const clearAllNotifikasi = async (req, res) => {
  const { nik, id_desa, isAdmin } = getVerifiedIdentity(req);

  try {
    if (isAdmin) {
      await db.query(
        'DELETE FROM notifikasi WHERE (id_desa = ? OR id_desa IS NULL) AND target_cakupan = "ADMIN_DESA"',
        [id_desa]
      );
    } else if (nik) {
      await db.query(
        'DELETE FROM notifikasi WHERE nik = ? AND target_cakupan = "PERSONAL"',
        [nik]
      );
    }
    res.json({ success: true, message: 'Riwayat notifikasi berhasil dibersihkan' });
  } catch (err) {
    console.error('Error clearAllNotifikasi:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getNotifikasi,
  markAsRead,
  markAllAsRead,
  deleteNotifikasi,
  clearAllNotifikasi
};