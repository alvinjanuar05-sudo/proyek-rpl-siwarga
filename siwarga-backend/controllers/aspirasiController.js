const db = require('../db');
const { sendEmail } = require('../utils/mailer');
const { buildEmailTemplate } = require('../services/emailTemplateService');
const { insertNotifikasi } = require('../services/notificationService');

// GET /api/aspirasi
const getAllAspirasi = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM aspirasi_warga ORDER BY tanggal DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/aspirasi
const createAspirasi = async (req, res) => {
  const { id_desa, nama_warga, nik_warga, email_warga, no_hp_warga, nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap, kategori, judul, isi, lokasi } = req.body;
  const id_aspirasi = 'ASP-' + Date.now();
  const desaId = id_desa || 'DESA-001';

  try {
    await db.query(
      `INSERT INTO aspirasi_warga (id_aspirasi, id_desa, nama_warga, nik_warga, email_warga, no_hp_warga, nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap, kategori, judul, isi, lokasi, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu')`,
      [id_aspirasi, desaId, nama_warga, nik_warga, email_warga, no_hp_warga, nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap, kategori, judul, isi, lokasi]
    );

    // --- TRIGGER AUTOMATIS NOTIFIKASI LONCENG & EMAIL (ASYNC / NON-BLOCKING) ---
    (async () => {
      try {
        // 1. Catat Notifikasi Lonceng untuk Warga Pemohon
        if (nik_warga) {
          await insertNotifikasi({
            nik: nik_warga,
            id_desa: desaId,
            tipe: 'ASPIRASI',
            judul: `Aspirasi Berhasil Disampaikan`,
            pesan: `Aspirasi Anda mengenai "${judul}" berhasil dikirim ke Desa (${id_aspirasi}) dan sedang berstatus Menunggu.`,
            target_cakupan: 'PERSONAL',
            link_url: `ASPIRASI: ${id_aspirasi}`
          });
        }

        // 2. Catat Notifikasi Lonceng untuk Admin Desa
        await insertNotifikasi({
          id_desa: desaId,
          tipe: 'ASPIRASI',
          judul: `Aspirasi/Aduan Baru: ${kategori || 'Warga'}`,
          pesan: `Aduan baru mengenai "${judul}" disampaikan oleh ${nama_warga || 'Warga'} (${nik_warga || '-'}).`,
          target_cakupan: 'ADMIN_DESA',
          link_url: 'aspirasi'
        });

        // 3. Ambil email resmi desa dari DB
        let emailResmiDesa = process.env.SMTP_USER;
        const [desaRows] = await db.query('SELECT email_resmi, nama_desa_kelurahan FROM desa WHERE id_desa = ? LIMIT 1', [desaId]);
        if (desaRows.length > 0 && desaRows[0].email_resmi) {
          emailResmiDesa = desaRows[0].email_resmi;
        }

        // 4. Kirim Email Konfirmasi ke Warga Pemohon
        let emailTargetWarga = email_warga;
        if (!emailTargetWarga && nik_warga) {
          const [uRows] = await db.query('SELECT email FROM users WHERE nik = ? LIMIT 1', [nik_warga]);
          if (uRows.length > 0) emailTargetWarga = uRows[0].email;
        }

        if (emailTargetWarga) {
          const emailSubject = `[ASPIRASI DITERIMA] ${judul}`;
          const emailContent = `
            <p>Halo <strong>${nama_warga || 'Warga'}</strong>,</p>
            <p>Terima kasih telah menyampaikan aspirasi atau aduan Anda ke Pemerintah Desa. Laporan Anda telah berhasil terdaftar dengan rincian:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 120px;">Kode Tiket</td>
                  <td style="padding: 6px 0; font-weight: 600; font-family: monospace; color: #0f172a;">${id_aspirasi}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Kategori</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${kategori}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Judul</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${judul}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Lokasi</td>
                  <td style="padding: 6px 0; color: #0f172a;">${lokasi || rt_rw || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Status</td>
                  <td style="padding: 6px 0;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; background-color: #fef3c7; color: #b45309;">
                      Menunggu Peninjauan
                    </span>
                  </td>
                </tr>
              </table>
            </div>
            <p>Laporan Anda akan ditinjau oleh tim aparatur desa. Anda akan menerima pembaruan email saat laporan ditindaklanjuti.</p>
          `;
          const htmlWarga = buildEmailTemplate({
            title: `Aspirasi Berhasil Disampaikan`,
            badge: 'LAYANAN ASPIRASI',
            contentHtml: emailContent,
            footerNote: `Kode Tiket: ${id_aspirasi} • Desa: ${desaId}`
          });
          await sendEmail(emailTargetWarga, emailSubject, htmlWarga);
        }

        // 5. Kirim Email Alert ke Kantor Desa
        if (emailResmiDesa) {
          const emailAdminSubject = `[ADUAN WARGA BARU] [${kategori || 'UMUM'}] ${judul}`;
          const emailAdminContent = `
            <p>Yth. Tim Aparatur / Pengelola Aspirasi Desa,</p>
            <p>Terdapat aduan / aspirasi baru dari warga yang memerlukan peninjauan dan tindak lanjut Anda:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 120px;">Kode Tiket</td>
                  <td style="padding: 4px 0; font-weight: 700; font-family: monospace;">${id_aspirasi}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Pelapor</td>
                  <td style="padding: 4px 0; font-weight: 600;">${nama_warga || 'Warga'} (NIK: ${nik_warga || '-'})</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">No. HP / WhatsApp</td>
                  <td style="padding: 4px 0;">${no_hp_warga || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Lokasi Laporan</td>
                  <td style="padding: 4px 0;">${lokasi || alamat_lengkap || rt_rw || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Kategori & Perihal</td>
                  <td style="padding: 4px 0; font-weight: 600; color: #0369a1;">[${kategori}] ${judul}</td>
                </tr>
              </table>
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px stroke #e2e8f0; font-size: 13px; color: #334155; white-space: pre-line;">
                <strong>Isi Laporan:</strong><br/>
                ${isi}
              </div>
            </div>
            <p>Silakan merespon atau meneruskan aduan ini melalui menu Aspirasi & Aduan di dashboard admin SVARA.</p>
          `;
          const htmlAdmin = buildEmailTemplate({
            title: `Laporan Aduan Warga Baru`,
            badge: 'ADUAN WARGA',
            contentHtml: emailAdminContent,
            footerNote: `Kode Tiket: ${id_aspirasi}`
          });
          await sendEmail(emailResmiDesa, emailAdminSubject, htmlAdmin);
        }
      } catch (asyncErr) {
        console.error('[Aspirasi Async Error]:', asyncErr.message);
      }
    })();

    res.json({ success: true, message: 'Aspirasi berhasil disampaikan!', id_aspirasi });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/aspirasi/:id/status
const updateStatusAspirasi = async (req, res) => {
  const { status, tanggapan, catatan_desa, diteruskan_ke } = req.body;
  const { id } = req.params;
  const notes = catatan_desa !== undefined ? catatan_desa : (tanggapan || null);

  try {
    await db.query(
      'UPDATE aspirasi_warga SET status = ?, catatan_desa = ?, diteruskan_ke = COALESCE(?, diteruskan_ke) WHERE id_aspirasi = ?',
      [status, notes, diteruskan_ke || null, id]
    );

    // --- TRIGGER AUTOMATIS NOTIFIKASI ASPIRASI ---
    const [aspRows] = await db.query(
      'SELECT id_desa, nik_warga, nama_warga, email_warga, judul FROM aspirasi_warga WHERE id_aspirasi = ?',
      [id]
    );

    if (aspRows.length > 0) {
      const asp = aspRows[0];
      let pesanText = `Aspirasi Anda mengenai "${asp.judul}" telah diupdate menjadi status: ${status}.`;
      if (notes) {
        pesanText += ` Catatan Desa: ${notes}`;
      }

      // 1. Simpan ke Lonceng Notifikasi Web Warga
      await insertNotifikasi({
        nik: asp.nik_warga,
        id_desa: asp.id_desa || 'DESA-001',
        tipe: 'ASPIRASI',
        judul: `Tanggapan Aspirasi: ${asp.judul}`,
        pesan: pesanText,
        target_cakupan: 'PERSONAL',
        link_url: `ASPIRASI: ${id}`
      });

      // 2. Kirim Notifikasi Email Otomatis ke Warga (Async / Non-blocking)
      (async () => {
        try {
          let emailTarget = asp.email_warga;
          if (!emailTarget && asp.nik_warga) {
            const [uRows] = await db.query('SELECT email FROM users WHERE nik = ? LIMIT 1', [asp.nik_warga]);
            if (uRows.length > 0) emailTarget = uRows[0].email;
          }

          if (emailTarget) {
            const statusLabel = status ? status.toUpperCase() : 'DIPROSES';
            const isDone = status === 'Selesai';
            const emailSubject = `[STATUS ASPIRASI: ${statusLabel}] ${asp.judul}`;
            const emailContent = `
              <p>Halo <strong>${asp.nama_warga || 'Warga'}</strong>,</p>
              <p>Tindak lanjut atas aspirasi/aduan yang Anda sampaikan telah diperbarui oleh pihak Desa:</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 120px;">Kode Tiket</td>
                    <td style="padding: 6px 0; font-weight: 600; font-family: monospace; color: #0f172a;">${id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Perihal</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${asp.judul}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Status Terkini</td>
                    <td style="padding: 6px 0;">
                      <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; background-color: ${isDone ? '#dcfce7; color: #15803d;' : '#e0f2fe; color: #0369a1;'}">
                        ${status}
                      </span>
                    </td>
                  </tr>
                  ${notes ? `
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Catatan / Respon</td>
                      <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">${notes}</td>
                    </tr>
                  ` : ''}
                  ${diteruskan_ke && diteruskan_ke !== '-' ? `
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;">Eskalasi Wilayah</td>
                      <td style="padding: 6px 0; color: #0f172a;">Diteruskan ke: ${diteruskan_ke}</td>
                    </tr>
                  ` : ''}
                </table>
              </div>
              <p>Terima kasih telah berkontribusi memberikan masukan untuk kemajuan wilayah desa kita.</p>
            `;
            const htmlBody = buildEmailTemplate({
              title: `Pembaruan Tindak Lanjut Aspirasi`,
              badge: `STATUS: ${statusLabel}`,
              contentHtml: emailContent,
              footerNote: `Kode Tiket: ${id}`
            });

            await sendEmail(emailTarget, emailSubject, htmlBody);
          }
        } catch (mailErr) {
          console.error('[Mailer] Gagal kirim email status aspirasi:', mailErr.message);
        }
      })();
    }

    res.json({ success: true, message: 'Status aspirasi berhasil diperbarui!' });
  } catch (err) {
    console.error('Error update status aspirasi:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/aspirasi/:id
const deleteAspirasi = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM aspirasi_warga WHERE id_aspirasi = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data aspirasi tidak ditemukan' });
    }

    res.json({ success: true, message: 'Aspirasi berhasil dihapus permanen dari MySQL!' });
  } catch (err) {
    console.error('Error delete aspirasi:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAllAspirasi,
  createAspirasi,
  updateStatusAspirasi,
  deleteAspirasi
};