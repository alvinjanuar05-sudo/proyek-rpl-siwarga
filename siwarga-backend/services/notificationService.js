const db = require('../db');

/**
 * Helper internal untuk mencatat notifikasi baru ke database
 */
const insertNotifikasi = async ({
  id_user = null,
  nik = null,
  id_desa = 'DESA-001',
  tipe,
  judul,
  pesan,
  target_cakupan = 'PERSONAL',
  target_rw = null,
  target_rt = null,
  link_url = null
}) => {
  const id_notifikasi = 'NTF-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  try {
    await db.query(
      `INSERT INTO notifikasi (
        id_notifikasi, id_user, nik, id_desa, tipe, judul, pesan, 
        target_cakupan, target_rw, target_rt, is_read, link_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        id_notifikasi, id_user, nik, id_desa, tipe, judul, pesan,
        target_cakupan, target_rw, target_rt, link_url
      ]
    );
  } catch (err) {
    console.warn('Gagal menyimpan notifikasi:', err.message);
  }
};

module.exports = {
  insertNotifikasi
};
