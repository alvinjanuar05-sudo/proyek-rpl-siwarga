const db = require('../db');
const { sendEmail } = require('../utils/mailer');
const { sanitizeDate } = require('../utils/dateHelper');
const { buildEmailTemplate } = require('../services/emailTemplateService');
const { insertNotifikasi } = require('../services/notificationService');

// GET /api/pengumuman
const getAllPengumuman = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pengumuman_desa ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/pengumuman
const createPengumuman = async (req, res) => {
  const { 
    id_desa, judul, kategori, target_cakupan, target_wilayah, target_rw, target_rt, 
    mode_waktu, tanggal_info, jam_info, tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, 
    tanggal_rilis, lokasi, isi, foto 
  } = req.body;

  // 1. Penanganan Primary Key (id_pengumuman)
  const id_pengumuman = req.body.id_pengumuman || `PGM-${Date.now()}`;

  // 2. Sanitasi Tipe Data DATE (tanggal_mulai, tanggal_selesai, tanggal_rilis)
  const sanitizedTanggalMulai = sanitizeDate(tanggal_mulai);
  const sanitizedTanggalSelesai = sanitizeDate(tanggal_selesai);
  const sanitizedTanggalRilis = sanitizeDate(tanggal_rilis) || new Date().toISOString().split('T')[0];

  // 3. Sanitasi Tipe Data ENUM
  // - target_cakupan: hanya boleh 'GLOBAL', 'RW', atau 'RTRW'
  let sanitizedCakupan = 'GLOBAL';
  const rawCakupan = String(target_cakupan || target_wilayah || '').toUpperCase().trim();
  if (rawCakupan === 'RTRW' || (rawCakupan.includes('RT') && rawCakupan.includes('RW'))) {
    sanitizedCakupan = 'RTRW';
  } else if (rawCakupan === 'RW' || rawCakupan.includes('RW')) {
    sanitizedCakupan = 'RW';
  } else {
    sanitizedCakupan = 'GLOBAL';
  }

  // - mode_waktu: hanya boleh 'spesifik' atau 'tanpa_batas'
  let sanitizedModeWaktu = 'spesifik';
  const rawMode = String(mode_waktu || '').toLowerCase().trim();
  if (rawMode === 'tanpa_batas' || rawMode === 'tanpa_waktu') {
    sanitizedModeWaktu = 'tanpa_batas';
  } else {
    sanitizedModeWaktu = 'spesifik';
  }

  // 4. Insert ke database
  try {
    await db.query(
      `INSERT INTO pengumuman_desa (
        id_pengumuman, id_desa, judul, kategori, target_cakupan, target_rw, target_rt, 
        mode_waktu, tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, 
        tanggal_info, jam_info, lokasi, isi, foto, tanggal_rilis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_pengumuman,
        id_desa || 'DESA-001',
        (judul || '').trim(),
        kategori || 'Kegiatan Warga',
        sanitizedCakupan,
        target_rw ? String(target_rw).padStart(2, '0') : '01',
        target_rt ? String(target_rt).padStart(2, '0') : '01',
        sanitizedModeWaktu,
        sanitizedTanggalMulai,
        sanitizedTanggalSelesai,
        jam_mulai || null,
        jam_selesai || null,
        tanggal_info || null,
        jam_info || null,
        lokasi || null,
        (isi || '').trim(),
        foto || null,
        sanitizedTanggalRilis
      ]
    );

    // --- TRIGGER AUTOMATIS NOTIFIKASI PENGUMUMAN (BROADCAST) ---
    const cakupanNotif = sanitizedCakupan;

    // 1. Simpan ke Lonceng Notifikasi Web
    await insertNotifikasi({
      id_desa: id_desa || 'DESA-001',
      tipe: 'PENGUMUMAN',
      judul: `Pengumuman Desa: ${judul}`,
      pesan: isi || `Pengumuman resmi baru diterbitkan oleh Kantor Desa.`,
      target_cakupan: cakupanNotif,
      target_rw: target_rw || null,
      target_rt: target_rt || null,
      link_url: 'pengumuman'
    });

    // 2. Kirim Email Notifikasi Otomatis ke Seluruh Warga Sesuai Target Wilayah (Async / Non-blocking)
    (async () => {
      try {
        const rawCakupanEmail = sanitizedCakupan;
        const desaId = id_desa || 'DESA-001';
        const rwVal = target_rw || req.body.nomor_rw || '01';
        const rtVal = target_rt || req.body.nomor_rt || '01';

        const rwClean = String(parseInt(rwVal, 10) || rwVal);
        const rtClean = String(parseInt(rtVal, 10) || rtVal);

        let emailQuery = '';
        let queryParams = [];

        if (rawCakupanEmail === 'RTRW') {
          emailQuery = `
            SELECT DISTINCT email FROM users 
            WHERE (id_desa = ? OR ? IS NULL) 
              AND (
                CAST(nomor_rw AS UNSIGNED) = CAST(? AS UNSIGNED) 
                OR TRIM(LEADING '0' FROM nomor_rw) = ? 
                OR nomor_rw = ?
              )
              AND (
                CAST(nomor_rt AS UNSIGNED) = CAST(? AS UNSIGNED) 
                OR TRIM(LEADING '0' FROM nomor_rt) = ? 
                OR nomor_rt = ?
              )
              AND email IS NOT NULL AND email != ''
          `;
          queryParams = [desaId, desaId, rwVal, rwClean, String(rwVal), rtVal, rtClean, String(rtVal)];
        } else if (rawCakupanEmail === 'RW') {
          emailQuery = `
            SELECT DISTINCT email FROM users 
            WHERE (id_desa = ? OR ? IS NULL) 
              AND (
                CAST(nomor_rw AS UNSIGNED) = CAST(? AS UNSIGNED) 
                OR TRIM(LEADING '0' FROM nomor_rw) = ? 
                OR nomor_rw = ?
              )
              AND email IS NOT NULL AND email != ''
          `;
          queryParams = [desaId, desaId, rwVal, rwClean, String(rwVal)];
        } else {
          emailQuery = `
            SELECT DISTINCT email FROM users 
            WHERE (id_desa = ? OR ? IS NULL) 
              AND email IS NOT NULL AND email != ''
          `;
          queryParams = [desaId, desaId];
        }

        const [wargaList] = await db.query(emailQuery, queryParams);
        const recipientEmails = wargaList.map(w => w.email).filter(Boolean);

        if (recipientEmails.length > 0) {
          const emailSubject = `[PENGUMUMAN DESA] ${judul}`;
          const targetDesc = rawCakupanEmail === 'RTRW' 
            ? `Khusus RT ${rtVal} / RW ${rwVal}` 
            : rawCakupanEmail === 'RW' 
            ? `Khusus RW ${rwVal}` 
            : 'Seluruh Warga Desa';

          const emailContent = `
            <p>Yth. Bapak/Ibu Warga Desa,</p>
            <p>Pemerintah Desa telah menerbitkan pengumuman resmi terbaru:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 16px 0;">
              <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a;">${judul}</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 110px;">Kategori</td>
                  <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${kategori || 'Informasi Warga'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Target Wilayah</td>
                  <td style="padding: 4px 0; font-weight: 600; color: #0369a1;">${targetDesc}</td>
                </tr>
                ${tanggal_info ? `
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Tanggal</td>
                    <td style="padding: 4px 0; color: #0f172a;">${tanggal_info}</td>
                  </tr>
                ` : ''}
                ${jam_info ? `
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Waktu</td>
                    <td style="padding: 4px 0; color: #0f172a;">${jam_info}</td>
                  </tr>
                ` : ''}
                ${lokasi ? `
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Lokasi</td>
                    <td style="padding: 4px 0; color: #0f172a;">${lokasi}</td>
                  </tr>
                ` : ''}
              </table>
              <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 13.5px; line-height: 1.6; color: #334155; white-space: pre-line;">
                ${isi}
              </div>
            </div>
            <p style="font-size: 13px; color: #64748b;">Silakan kunjungi portal web <strong>SVARA</strong> untuk detail layanan atau menghubungi pengurus RT/RW setempat jika ada pertanyaan.</p>
          `;

          const htmlBody = buildEmailTemplate({
            title: `Pengumuman Resmi Desa`,
            badge: kategori || 'PENGUMUMAN RESMI',
            contentHtml: emailContent,
            footerNote: `Wilayah Target: ${targetDesc} • Kantor Desa ${desaId}`
          });

          await sendEmail(recipientEmails, emailSubject, htmlBody);
          console.log(`[Mailer] Berhasil mengirim email pengumuman ke ${recipientEmails.length} warga (${targetDesc}).`);
        } else {
          console.warn(`[Mailer] Warning: Tidak ditemukan warga dengan email valid untuk target ${rawCakupanEmail} (RW: ${rwVal}, RT: ${rtVal}). Email tidak dikirim.`);
        }
      } catch (mailErr) {
        console.error('[Mailer] Gagal kirim email broadcast pengumuman:', mailErr.message);
      }
    })();

    return res.json({ 
      success: true, 
      message: 'Pengumuman berhasil diterbitkan!', 
      id_pengumuman 
    });
  } catch (err) {
    console.error('❌ [API POST /api/pengumuman Database Error]:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal menerbitkan pengumuman ke database!', 
      error: err.message 
    });
  }
};

// DELETE /api/pengumuman/:id
const deletePengumuman = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: 'ID pengumuman tidak boleh kosong!' });
  }

  try {
    const [result] = await db.query(
      'DELETE FROM pengumuman_desa WHERE id_pengumuman = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data pengumuman tidak ditemukan di database!'
      });
    }

    return res.json({
      success: true,
      message: 'Pengumuman berhasil dihapus!',
      affectedRows: result.affectedRows
    });
  } catch (err) {
    console.error('❌ [API DELETE /api/pengumuman Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAllPengumuman,
  createPengumuman,
  deletePengumuman
};