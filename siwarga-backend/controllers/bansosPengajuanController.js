const crypto = require('crypto');
const db = require('../db');
const { insertNotifikasi } = require('../services/notificationService');

// Helper CSPRNG untuk Token Kriptografis
const generateSecureQrToken = () => 'QR-BNS-' + crypto.randomBytes(16).toString('hex').toUpperCase();
const generateSecureTicketCode = (idPenerima) => 'TK-BNS-' + (idPenerima || crypto.randomBytes(8).toString('hex').toUpperCase());

/**
 * Helper Validasi Format Gambar Base64 (MIME-Type & Anti-XSS SVG Check)
 * Menolak berkas berisiko seperti SVG script, HTML, atau executable script.
 */
const isValidBase64Image = (base64Str) => {
  if (!base64Str || typeof base64Str !== 'string') return true; // Null/empty diperbolehkan
  if (!base64Str.startsWith('data:image/')) return false; // Wajib format data URI image

  const mimeMatch = base64Str.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,/);
  if (!mimeMatch) return false;

  const mimeType = mimeMatch[1].toLowerCase();
  
  // Hanya izinkan gambar bitmap murni. Tolak SVG untuk mencegah Stored XSS.
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(mimeType)) {
    return false;
  }

  return true;
};

// GET /api/bansos-pengajuan (Ambil Semua Usulan Mandiri Warga)
const getAllPengajuan = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM bansos_pengajuan ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/bansos-pengajuan (Warga Ajukan Usulan Mandiri Bansos)
const createPengajuan = async (req, res) => {
  const {
    id_desa,
    nik_pengaju,
    nama_pengaju,
    email_pengaju,
    no_hp_pengaju,
    nomor_rt,
    nomor_rw,
    dusun,
    alamat_lengkap,
    jumlah_tanggungan,
    pekerjaan,
    estimasi_penghasilan,
    kondisi_rumah,
    kepemilikan_rumah,
    luas_bangunan,
    sumber_air,
    daya_listrik,
    jenis_bansos_diajukan,
    alasan_pengajuan,
    foto_ktp,
    foto_kk,
    foto_rumah_depan,
    foto_rumah_dalam,
    foto_sktm,
    foto_rumah,
    foto_pendukung
  } = req.body;

  // Fallback sinkronisasi foto ke 3 kolom asli MySQL (foto_ktp, foto_rumah, foto_pendukung)
  const ktpImg = foto_ktp || null;
  const rumahImg = foto_rumah_depan || foto_rumah || null;
  const pendukungImg = foto_sktm || foto_rumah_dalam || foto_kk || foto_pendukung || null;

  // 🛡️ SANITASI KEAMANAN: Validasi Format Berkas Unggahan Base64 (Anti-Stored XSS)
  if (!isValidBase64Image(ktpImg) || !isValidBase64Image(rumahImg) || !isValidBase64Image(pendukungImg)) {
    return res.status(400).json({
      success: false,
      message: 'Format berkas foto tidak valid atau berisiko keamanan! Hanya berkas gambar (JPG, PNG, WEBP) yang diperbolehkan. Berkas SVG / script ditolak.'
    });
  }

  const id_pengajuan = 'PBNSO-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const desaId = id_desa || 'DESA-001';

  try {
    await db.query(
      `INSERT INTO bansos_pengajuan (
        id_pengajuan, id_desa, nik_pengaju, nama_pengaju, email_pengaju, no_hp_pengaju,
        nomor_rt, nomor_rw, dusun, alamat_lengkap, jumlah_tanggungan, pekerjaan,
        estimasi_penghasilan, kondisi_rumah, kepemilikan_rumah, luas_bangunan, sumber_air,
        daya_listrik, jenis_bansos_diajukan, alasan_pengajuan, 
        foto_ktp, foto_rumah, foto_pendukung, status_verifikasi, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu', NOW())`,
      [
        id_pengajuan,
        desaId,
        nik_pengaju,
        nama_pengaju,
        email_pengaju || null,
        no_hp_pengaju || null,
        nomor_rt || null,
        nomor_rw || null,
        dusun || null,
        alamat_lengkap || null,
        Number(jumlah_tanggungan) || 0,
        pekerjaan || null,
        Number(estimasi_penghasilan) || 0,
        kondisi_rumah || null,
        kepemilikan_rumah || null,
        luas_bangunan || null,
        sumber_air || null,
        daya_listrik || null,
        jenis_bansos_diajukan || 'BLT-DD',
        alasan_pengajuan || null,
        ktpImg,
        rumahImg,
        pendukungImg
      ]
    );

    // Trigger Notifikasi Lonceng ke Admin Desa (Async / Non-Blocking)
    (async () => {
      try {
        await insertNotifikasi({
          id_desa: desaId,
          tipe: 'USER',
          judul: 'Pengajuan Bansos Baru',
          pesan: `Permohonan usulan bansos baru dari ${nama_pengaju} (NIK: ${nik_pengaju}) memerlukan verifikasi petugas.`,
          target_cakupan: 'ADMIN_DESA',
          link_url: 'bansos'
        });
      } catch (notifErr) {
        console.error('[Pengajuan Bansos Notif Error]:', notifErr.message);
      }
    })();

    res.json({ success: true, message: 'Usulan mandiri bansos berhasil dikirimkan!', id_pengajuan });
  } catch (err) {
    console.error('[Create Pengajuan DB Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/bansos-pengajuan/:id/verifikasi (Admin Setujui/Tolak Usulan Warga)
const updateStatusVerifikasi = async (req, res) => {
  const { id } = req.params;
  const { status_verifikasi, catatan_verifikasi, diverifikasi_oleh } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM bansos_pengajuan WHERE id_pengajuan = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data pengajuan bansos tidak ditemukan.' });
    }

    const pengajuan = rows[0];

    await db.query(
      `UPDATE bansos_pengajuan SET 
        status_verifikasi = ?, 
        catatan_verifikasi = ?, 
        diverifikasi_oleh = ?, 
        tanggal_verifikasi = NOW(),
        updated_at = NOW()
       WHERE id_pengajuan = ?`,
      [status_verifikasi, catatan_verifikasi || null, diverifikasi_oleh || 'Admin Desa', id]
    );

    // Jika Disetujui, Otomatis Masukkan ke Tabel bansos_penerima (Direct READY_CLAIM)
    if ((status_verifikasi || '').toLowerCase() === 'disetujui') {
      const id_penerima = 'BNS-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      const qr_token = generateSecureQrToken();
      const kode_tiket = generateSecureTicketCode(id_penerima);

      await db.query(
        `INSERT INTO bansos_penerima (
          id_penerima, id_desa, nik, nama_lengkap, alamat_lengkap, nomor_rt, nomor_rw,
          dusun, no_hp, jenis_bansos, sumber_data, periode, tahun_anggaran, nominal_bantuan,
          status_pencairan, status_batch, qr_token, kode_tiket, status_dtks, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Musdes', 'Semester 1', ?, 300000, 'Belum', 'READY_CLAIM', ?, ?, 'Diusulkan', ?, NOW())
        ON DUPLICATE KEY UPDATE status_batch = 'READY_CLAIM'`,
        [
          id_penerima,
          pengajuan.id_desa || 'DESA-001',
          pengajuan.nik_pengaju,
          pengajuan.nama_pengaju,
          pengajuan.alamat_lengkap,
          pengajuan.nomor_rt,
          pengajuan.nomor_rw,
          pengajuan.dusun,
          pengajuan.no_hp_pengaju,
          pengajuan.jenis_bansos_diajukan || 'BLT-DD',
          new Date().getFullYear(),
          qr_token,
          kode_tiket,
          diverifikasi_oleh || 'Admin Desa'
        ]
      );
    }

    // Trigger Notifikasi Lonceng Hasil Verifikasi ke Warga
    (async () => {
      try {
        if (pengajuan.nik_pengaju) {
          const isApproved = (status_verifikasi || '').toLowerCase() === 'disetujui';
          await insertNotifikasi({
            nik: pengajuan.nik_pengaju,
            id_desa: pengajuan.id_desa || 'DESA-001',
            tipe: 'USER',
            judul: `Status Usulan Bansos: ${status_verifikasi.toUpperCase()}`,
            pesan: isApproved
              ? `Selamat! Usulan bansos Anda telah disetujui oleh Admin Desa. E-Tiket QR Code sudah aktif!`
              : `Mohon maaf, usulan bansos Anda ditolak. Catatan: ${catatan_verifikasi || '-'}`,
            target_cakupan: 'PERSONAL',
            link_url: 'profil'
          });
        }
      } catch (notifErr) {
        console.error('[Verifikasi Bansos Notif Error]:', notifErr.message);
      }
    })();

    res.json({ success: true, message: `Status pengajuan bansos berhasil diubah menjadi ${status_verifikasi}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/bansos-pengajuan/:id (Hapus Data Pengajuan)
const deletePengajuan = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM bansos_pengajuan WHERE id_pengajuan = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data pengajuan bansos tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Data pengajuan bansos berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAllPengajuan,
  createPengajuan,
  updateStatusVerifikasi,
  deletePengajuan
};