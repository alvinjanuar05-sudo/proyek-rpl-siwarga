const crypto = require('crypto');
const db = require('../db');

// Helper CSPRNG untuk menghasilkan Token QR & Kode Tiket yang aman dari tebakan
const generateSecureQrToken = () => 'QR-BNS-' + crypto.randomBytes(16).toString('hex').toUpperCase();
const generateSecureTicketCode = (idPenerima) => 'TK-BNS-' + (idPenerima || crypto.randomBytes(8).toString('hex').toUpperCase());

// Impor utilitas mailer dan template email
let mailer, emailTemplateService;
try {
  mailer = require('../utils/mailer');
  emailTemplateService = require('../services/emailTemplateService');
} catch (e) {
  console.warn('[BansosController] Warning: Module mailer / emailTemplateService belum dikonfigurasi penuh. Email notifikasi akan berjalan mode pasif.');
}

// 1. GET /api/bansos (Ambil Semua Data Penerima Bansos)
const getAllPenerima = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM bansos_penerima ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 2. GET /api/bansos/cek/:nik (Cek Status Bansos Warga via NIK)
const getPenerimaByNik = async (req, res) => {
  const cleanNik = (req.params.nik || '').replace(/\D/g, ''); // Sanitasi hanya angka
  try {
    const [rows] = await db.query(
      'SELECT * FROM bansos_penerima WHERE REPLACE(nik, " ", "") = ? ORDER BY created_at DESC',
      [cleanNik]
    );

    // Auto-generate kode_tiket jika belum ada
    if (rows.length > 0) {
      for (let item of rows) {
        if (!item.kode_tiket) {
          const generatedKode = generateSecureTicketCode(item.id_penerima);
          await db.query('UPDATE bansos_penerima SET kode_tiket = ? WHERE id_penerima = ?', [generatedKode, item.id_penerima]);
          item.kode_tiket = generatedKode;
        }
      }
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 3. POST /api/bansos (Tambah Master Data Penerima Manual - Direct READY_CLAIM)
const createPenerima = async (req, res) => {
  const {
    id_desa,
    nik,
    nama_lengkap,
    tempat_lahir,
    tanggal_lahir,
    jenis_kelamin,
    alamat_lengkap,
    nomor_rt,
    nomor_rw,
    dusun,
    no_hp,
    jenis_bansos,
    sumber_data,
    periode,
    tahun_anggaran,
    nominal_bantuan,
    keterangan,
    catatan_admin,
    created_by
  } = req.body;

  const id_penerima = 'BNS-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const qr_token = generateSecureQrToken();
  const kode_tiket = generateSecureTicketCode(id_penerima);

  try {
    await db.query(
      `INSERT INTO bansos_penerima (
        id_penerima, id_desa, nik, nama_lengkap, tempat_lahir, tanggal_lahir,
        jenis_kelamin, alamat_lengkap, nomor_rt, nomor_rw, dusun, no_hp,
        jenis_bansos, sumber_data, periode, tahun_anggaran, nominal_bantuan,
        status_pencairan, status_batch, qr_token, kode_tiket, keterangan, catatan_admin, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Belum', 'READY_CLAIM', ?, ?, ?, ?, ?, NOW())`,
      [
        id_penerima,
        id_desa || 'DESA-001',
        nik,
        nama_lengkap,
        tempat_lahir || null,
        tanggal_lahir || null,
        jenis_kelamin || null,
        alamat_lengkap || null,
        nomor_rt || null,
        nomor_rw || null,
        dusun || null,
        no_hp || null,
        jenis_bansos || 'BLT-DD',
        sumber_data || 'Manual',
        periode || 'Semester 1',
        tahun_anggaran || new Date().getFullYear(),
        nominal_bantuan || 300000,
        qr_token,
        kode_tiket,
        keterangan || null,
        catatan_admin || null,
        created_by || 'Admin'
      ]
    );

    res.json({ success: true, message: 'Data penerima bansos berhasil ditambahkan!', id_penerima, kode_tiket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 4. PUT /api/bansos/:id (Edit / Update Data Penerima Bansos)
const updatePenerima = async (req, res) => {
  const { id } = req.params;
  const {
    nik,
    nama_lengkap,
    alamat_lengkap,
    nomor_rt,
    nomor_rw,
    dusun,
    no_hp,
    jenis_bansos,
    periode,
    tahun_anggaran,
    nominal_bantuan,
    keterangan,
    status_batch,
    status_pencairan
  } = req.body;

  try {
    await db.query(
      `UPDATE bansos_penerima SET
        nik = COALESCE(?, nik),
        nama_lengkap = COALESCE(?, nama_lengkap),
        alamat_lengkap = COALESCE(?, alamat_lengkap),
        nomor_rt = COALESCE(?, nomor_rt),
        nomor_rw = COALESCE(?, nomor_rw),
        dusun = COALESCE(?, dusun),
        no_hp = COALESCE(?, no_hp),
        jenis_bansos = COALESCE(?, jenis_bansos),
        periode = COALESCE(?, periode),
        tahun_anggaran = COALESCE(?, tahun_anggaran),
        nominal_bantuan = COALESCE(?, nominal_bantuan),
        keterangan = COALESCE(?, keterangan),
        status_batch = COALESCE(?, status_batch),
        status_pencairan = COALESCE(?, status_pencairan)
      WHERE id_penerima = ?`,
      [
        nik,
        nama_lengkap,
        alamat_lengkap,
        nomor_rt,
        nomor_rw,
        dusun,
        no_hp,
        jenis_bansos,
        periode,
        tahun_anggaran,
        nominal_bantuan,
        keterangan,
        status_batch,
        status_pencairan,
        id
      ]
    );

    res.json({ success: true, message: 'Data penerima bansos berhasil diperbarui!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 5. POST /api/bansos/batch/create (Admin Buat Gelombang Kuota Harian + Trigger Email Undangan)
const createBatch = async (req, res) => {
  const { nama_gelombang, tanggal_pencairan, lokasi_pencairan, kuota_harian, jenis_bansos } = req.body;

  if (!tanggal_pencairan || !kuota_harian) {
    return res.status(400).json({ success: false, message: 'Tanggal pencairan dan kuota harian wajib diisi!' });
  }

  const id_batch = 'BATCH-' + Date.now();
  const limitKuota = parseInt(kuota_harian, 10);
  const loc = lokasi_pencairan || 'Balai Desa Sukamaju';
  const gel = nama_gelombang || `Gelombang Kuota ${tanggal_pencairan}`;

  try {
    // A. Simpan Record Batch Jadwal Baru
    await db.query(
      `INSERT INTO bansos_batch_jadwal 
        (id_batch, id_desa, nama_gelombang, tanggal_pencairan, lokasi_pencairan, kuota_harian, jenis_bansos, status_batch_global)
       VALUES (?, 'DESA-001', ?, ?, ?, ?, ?, 'ACTIVE')`,
      [id_batch, gel, tanggal_pencairan, loc, limitKuota, jenis_bansos || 'BLT-DD']
    );

    // B. Ambil NIK Teratas (FIFO) yang belum pernah cair dan masih WAITING_QUEUE
    const [eligibleRows] = await db.query(
      `SELECT id_penerima, nik, nama_lengkap FROM bansos_penerima 
       WHERE status_pencairan != 'Sudah Dicairkan' 
         AND (status_batch = 'WAITING_QUEUE' OR status_batch IS NULL)
       ORDER BY created_at ASC 
       LIMIT ?`,
      [limitKuota]
    );

    if (eligibleRows.length > 0) {
      const idsToUpdate = eligibleRows.map(r => r.id_penerima);
      
      // C. Update Status Warga ke READY_CLAIM & kaitkan ke batch_id
      await db.query(
        `UPDATE bansos_penerima 
         SET batch_id = ?, 
             status_batch = 'READY_CLAIM', 
             tanggal_pencairan = ?, 
             lokasi_pencairan = ?
         WHERE id_penerima IN (?)`,
        [id_batch, tanggal_pencairan, loc, idsToUpdate]
      );

      // D. TRIGGER EMAIL NOTIFIKASI UNDANGAN (Async Non-blocking)
      setImmediate(async () => {
        try {
          if (!mailer || !emailTemplateService) return;

          for (const recipient of eligibleRows) {
            const [users] = await db.query(
              'SELECT email FROM users WHERE REPLACE(nik, " ", "") = ? LIMIT 1',
              [recipient.nik]
            );

            const targetEmail = users.length > 0 ? users[0].email : recipient.email;
            if (targetEmail) {
              const contentHtml = `
                <p>Selamat, NIK Anda (<strong>${recipient.nik}</strong>) telah terdaftar masuk ke dalam <strong>${gel}</strong>.</p>
                <div style="background:#f8fafc; padding:12px; border-radius:8px; margin:12px 0;">
                  <p style="margin:4px 0;"><strong>Program:</strong> ${jenis_bansos || 'BLT-DD'}</p>
                  <p style="margin:4px 0;"><strong>Tanggal Pencairan:</strong> ${tanggal_pencairan}</p>
                  <p style="margin:4px 0;"><strong>Lokasi Pengambilan:</strong> ${loc}</p>
                </div>
                <p>Silakan buka portal SIWARGA (Menu 8) untuk mengklaim E-Tiket QR Code Anda.</p>
              `;

              const htmlContent = emailTemplateService.buildEmailTemplate({
                title: 'Jadwal Pencairan Bantuan Sosial Desa',
                badge: 'Gelombang Aktif',
                contentHtml
              });

              await mailer.sendEmail(
                targetEmail,
                `[SIWARGA] Undangan Pencairan Bansos - ${gel}`,
                htmlContent
              );
            }
          }
        } catch (mailErr) {
          console.warn('[Mailer Batch Warning]:', mailErr.message);
        }
      });
    }

    res.json({
      success: true,
      message: `Gelombang pencairan berhasil dibuat! ${eligibleRows.length} warga telah dibuka status READY_CLAIM-nya.`,
      id_batch,
      total_unlocked: eligibleRows.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 6. GET /api/bansos/batch/active (Ambil Info Gelombang Aktif Hari Ini)
const getActiveBatch = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM bansos_batch_jadwal 
       WHERE status_batch_global = 'ACTIVE' 
       ORDER BY created_at DESC LIMIT 1`
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 7. POST /api/bansos/klaim-qr (Proses Klaim QR Token Resmi Warga via Chatbot)
const klaimQr = async (req, res) => {
  const { nik, id_penerima } = req.body;
  const cleanNik = (nik || '').replace(/\D/g, '');

  try {
    const [rows] = await db.query(
      'SELECT * FROM bansos_penerima WHERE (REPLACE(nik, " ", "") = ? OR id_penerima = ?) AND status_pencairan != "Sudah Dicairkan" LIMIT 1',
      [cleanNik, id_penerima || '']
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data penerima tidak ditemukan atau sudah mencairkan bantuan.' });
    }

    const item = rows[0];
    let token = item.qr_token;
    let kode = item.kode_tiket;

    if (!token) {
      token = generateSecureQrToken();
      await db.query('UPDATE bansos_penerima SET qr_token = ? WHERE id_penerima = ?', [token, item.id_penerima]);
    }

    if (!kode) {
      kode = generateSecureTicketCode(item.id_penerima);
      await db.query('UPDATE bansos_penerima SET kode_tiket = ? WHERE id_penerima = ?', [kode, item.id_penerima]);
    }

    res.json({
      success: true,
      message: 'Klaim QR E-Tiket Berhasil!',
      kode_tiket: kode,
      qr_token: token,
      penerima: item
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 8. POST /api/bansos/scan-pencairan (Verify & Cairkan via QR Code Kamera Admin + Trigger Email Kwitansi)
// 🛑 SAFEGUARD: MEMANFAATKAN ATOMIC CONDITIONAL UPDATE UNTUK MENCEGAH RACE CONDITION
const scanPencairan = async (req, res) => {
  const { kode_tiket, petugas_nama } = req.body;

  try {
    let searchTicket = kode_tiket;
    try {
      const parsedPayload = JSON.parse(kode_tiket);
      if (parsedPayload && parsedPayload.tk) {
        searchTicket = parsedPayload.tk;
      }
    } catch (e) {
      // Bukan JSON string
    }

    // A. Cari baris data penerima
    const [rows] = await db.query(
      'SELECT * FROM bansos_penerima WHERE kode_tiket = ? OR qr_token = ? OR id_penerima = ? LIMIT 1',
      [searchTicket, searchTicket, searchTicket]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tiket QR tidak valid atau data penerima tidak ditemukan.' });
    }

    const penerima = rows[0];

    // Cek status awal sebelum transaksi
    if (penerima.status_pencairan === 'Sudah Dicairkan') {
      return res.status(400).json({
        success: false,
        isAlreadyCashed: true,
        message: 'TIKET SUDAH PERNAH DICAIRKAN SEBELUMNYA!',
        penerima
      });
    }

    // B. UPDATE ATOMIK BERSYARAT (Mencegah Double Disbursement akibat Race Condition milidetik)
    const [updateResult] = await db.query(
      `UPDATE bansos_penerima SET 
        status_pencairan = 'Sudah Dicairkan',
        status_batch = 'COMPLETED',
        tanggal_pencairan = NOW(),
        metode_pencairan = 'QR_SCANNER',
        qr_scanned_at = NOW(),
        qr_scanned_by = ?
       WHERE id_penerima = ? AND status_pencairan != 'Sudah Dicairkan'`,
      [petugas_nama || 'Petugas Desa', penerima.id_penerima]
    );

    // Jika affectedRows === 0, artinya request paralel lain baru saja berhasil mencairkannya!
    if (updateResult.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        isAlreadyCashed: true,
        message: 'TIKET SUDAH PERNAH DICAIRKAN SEBELUMNYA (TERDETEKSI TRANSAKSI PARALEL)!',
        penerima
      });
    }

    // C. Insert Log Penyaluran setelah sukses mengunci status atomik
    await db.query(
      `INSERT INTO bansos_penyaluran (id_penerima, kode_tiket, petugas_nama, waktu_penyaluran, metode_verifikasi)
       VALUES (?, ?, ?, NOW(), 'QR_SCANNER')`,
      [penerima.id_penerima, penerima.kode_tiket || searchTicket, petugas_nama || 'Petugas Desa']
    );

    // TRIGGER EMAIL KWITANSI DIGITAL (Async Non-blocking)
    setImmediate(async () => {
      try {
        if (!mailer || !emailTemplateService) return;

        const [users] = await db.query(
          'SELECT email FROM users WHERE REPLACE(nik, " ", "") = ? LIMIT 1',
          [penerima.nik]
        );

        const targetEmail = users.length > 0 ? users[0].email : penerima.email;
        if (targetEmail) {
          const contentHtml = `
            <p>Bantuan sosial Anda sebesar <strong>Rp ${Number(penerima.nominal_bantuan || 300000).toLocaleString('id-ID')}</strong> telah sukses diverifikasi dan diserahkan secara sah di Balai Desa.</p>
            <div style="background:#f8fafc; padding:12px; border-radius:8px; margin:12px 0;">
              <p style="margin:4px 0;"><strong>Kode Tiket:</strong> ${penerima.kode_tiket || searchTicket}</p>
              <p style="margin:4px 0;"><strong>Nominal:</strong> Rp ${Number(penerima.nominal_bantuan || 300000).toLocaleString('id-ID')}</p>
              <p style="margin:4px 0;"><strong>Petugas Verifikator:</strong> ${petugas_nama || 'Petugas Desa'}</p>
              <p style="margin:4px 0;"><strong>Waktu Penyaluran:</strong> ${new Date().toLocaleString('id-ID')}</p>
            </div>
            <p>Terima kasih telah menggunakan platform layanan digital desa SIWARGA.</p>
          `;

          const htmlContent = emailTemplateService.buildEmailTemplate({
            title: 'Kwitansi Digital Penyerahan Bantuan Sosial',
            badge: 'Pencairan Sukses',
            contentHtml
          });

          await mailer.sendEmail(
            targetEmail,
            `[SIWARGA] Kwitansi Digital Penyaluran Bansos - ${penerima.kode_tiket || searchTicket}`,
            htmlContent
          );
        }
      } catch (mailErr) {
        console.warn('[Mailer Scan Warning]:', mailErr.message);
      }
    });

    res.json({
      success: true,
      message: 'PENCAIRAN BANSOS BERHASIL DIKONFIRMASI!',
      penerima: { ...penerima, status_pencairan: 'Sudah Dicairkan', status_batch: 'COMPLETED' }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 9. POST /api/bansos/bulk-import (Batch Insert Massal CSV / Excel)
const bulkImport = async (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ success: false, message: 'Data import tidak boleh kosong!' });
  }

  try {
    let successCount = 0;
    for (let item of data) {
      if (!item.nik || !item.nama_lengkap) continue;

      const cleanNik = String(item.nik).replace(/\D/g, '');
      const id_penerima = 'BNS-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      const qr_token = generateSecureQrToken();
      const kode_tiket = generateSecureTicketCode(id_penerima);

      await db.query(
        `INSERT INTO bansos_penerima (
          id_penerima, id_desa, nik, nama_lengkap, no_hp, alamat_lengkap,
          jenis_bansos, nominal_bantuan, status_pencairan, status_batch, qr_token, kode_tiket, created_by, created_at
        ) VALUES (?, 'DESA-001', ?, ?, ?, ?, ?, ?, 'Belum', 'WAITING_QUEUE', ?, ?, 'Admin Bulk Import', NOW())
        ON DUPLICATE KEY UPDATE nama_lengkap = VALUES(nama_lengkap), jenis_bansos = VALUES(jenis_bansos)`,
        [
          id_penerima,
          cleanNik,
          item.nama_lengkap,
          item.no_hp || null,
          item.alamat_lengkap || null,
          item.jenis_bansos || 'BLT-DD',
          item.nominal_bantuan || 300000,
          qr_token,
          kode_tiket
        ]
      );
      successCount++;
    }

    res.json({ success: true, message: `Berhasil mengimpor ${successCount} data penerima bansos baru.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 10. GET /api/bansos/export-rekap (Export Ringkasan Rekapitulasi Bansos)
const exportRekap = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        jenis_bansos,
        COUNT(*) as total_penerima,
        SUM(CASE WHEN status_pencairan = 'Sudah Dicairkan' THEN 1 ELSE 0 END) as sudah_cair,
        SUM(CASE WHEN status_pencairan != 'Sudah Dicairkan' THEN 1 ELSE 0 END) as belum_cair,
        SUM(nominal_bantuan) as total_nominal
      FROM bansos_penerima
      GROUP BY jenis_bansos
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 11. PUT /api/bansos/:id/pencairan (Update Manual Status Pencairan)
const updateStatusPencairan = async (req, res) => {
  const { id } = req.params;
  const { status_pencairan, metode_pencairan, qr_scanned_by } = req.body;

  try {
    const [updateResult] = await db.query(
      `UPDATE bansos_penerima SET 
        status_pencairan = ?, 
        tanggal_pencairan = NOW(), 
        metode_pencairan = ?, 
        qr_scanned_at = NOW(), 
        qr_scanned_by = ?
       WHERE id_penerima = ? AND status_pencairan != 'Sudah Dicairkan'`,
      [
        status_pencairan || 'Sudah Dicairkan',
        metode_pencairan || 'Tunai',
        qr_scanned_by || 'Petugas Desa',
        id
      ]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Status gagal diperbarui karena bantuan ini sudah pernah dicairkan sebelumnya.'
      });
    }

    res.json({ success: true, message: 'Status pencairan berhasil diperbarui!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 12. DELETE /api/bansos/:id
const deletePenerima = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM bansos_penerima WHERE id_penerima = ?', [id]);
    res.json({ success: true, message: 'Data penerima bansos berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAllPenerima,
  getPenerimaByNik,
  createPenerima,
  updatePenerima,
  createBatch,
  getActiveBatch,
  klaimQr,
  scanPencairan,
  bulkImport,
  exportRekap,
  updateStatusPencairan,
  deletePenerima
};