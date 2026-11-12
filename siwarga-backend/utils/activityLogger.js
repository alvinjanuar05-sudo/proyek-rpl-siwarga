const db = require('../db');

/**
 * Catat log aktivitas pengguna ke tabel activity_logs
 * @param {Object} params
 * @param {string} params.id_user - ID User
 * @param {string} [params.nik] - NIK Warga
 * @param {string} [params.id_desa] - ID Desa
 * @param {string} params.tipe_aktivitas - 'LOGIN' | 'LOGOUT' | 'UPDATE_PROFIL' | 'PENGAJUAN_SURAT' | 'ASPIRASI' | 'UBAH_SANDI' | 'VERIFIKASI_AKUN'
 * @param {string} params.deskripsi - Penjelasan ringkas aktivitas
 * @param {string} [params.ip_address] - IP Address klien
 */
const insertActivityLog = async ({
  id_user,
  nik = null,
  id_desa = 'DESA-001',
  tipe_aktivitas,
  deskripsi,
  ip_address = '127.0.0.1'
}) => {
  if (!id_user || !tipe_aktivitas || !deskripsi) return;

  try {
    const id_log = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await db.query(
      `INSERT INTO activity_logs (id_log, id_user, nik, id_desa, tipe_aktivitas, deskripsi, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id_log, id_user, nik, id_desa, tipe_aktivitas, deskripsi, ip_address]
    );
  } catch (err) {
    console.error('[ActivityLogger Error]:', err.message);
  }
};

module.exports = { insertActivityLog };