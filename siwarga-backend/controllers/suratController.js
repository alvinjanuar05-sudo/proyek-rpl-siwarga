const path = require('path');
const fs = require('fs');
const db = require('../db');
const { sendEmail } = require('../utils/mailer');
const { generateDocument } = require('../utils/documentGenerator');
const { buildEmailTemplate } = require('../services/emailTemplateService');
const { insertNotifikasi } = require('../services/notificationService');

// Ambil semua pengajuan surat
const getAllPengajuan = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pengajuan_surat ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Pengajuan surat baru dari warga
const createPengajuan = async (req, res) => {
  const { id_template, nama_surat, kode_surat, id_desa, email_warga, nik_warga, nama_warga, nomor_rt, nomor_rw, data_isian } = req.body;
  const id_pengajuan = 'SRT-' + Date.now();
  const desaId = id_desa || 'DESA-001';

  try {
    await db.query(
      `INSERT INTO pengajuan_surat (id_pengajuan, id_template, nama_surat, kode_surat, id_desa, email_warga, nik_warga, nama_warga, nomor_rt, nomor_rw, data_isian, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [id_pengajuan, id_template, nama_surat, kode_surat, desaId, email_warga, nik_warga, nama_warga, nomor_rt, nomor_rw, JSON.stringify(data_isian)]
    );

    // --- TRIGGER NOTIFIKASI LONCENG & EMAIL (ASYNC / NON-BLOCKING) ---
    (async () => {
      try {
        // 1. Notifikasi Lonceng ke Admin Desa
        await insertNotifikasi({
          id_desa: desaId,
          tipe: 'SURAT',
          judul: `Pengajuan Surat Baru: ${nama_surat}`,
          pesan: `Pengajuan surat baru dari ${nama_warga || 'Warga'} (NIK: ${nik_warga || '-'}) dengan No. Tiket ${id_pengajuan} membutuhkan verifikasi.`,
          target_cakupan: 'ADMIN_DESA',
          link_url: 'surat'
        });

        // 2. Ambil email resmi desa untuk pemberitahuan ke Kantor Desa
        let emailResmiDesa = process.env.SMTP_USER;
        const [desaRows] = await db.query('SELECT email_resmi, nama_desa_kelurahan FROM desa WHERE id_desa = ? LIMIT 1', [desaId]);
        if (desaRows.length > 0 && desaRows[0].email_resmi) {
          emailResmiDesa = desaRows[0].email_resmi;
        }

        // 3. Email Tanda Terima ke Warga
        if (email_warga) {
          const contentWarga = `
            <p>Halo <strong>${nama_warga || 'Warga'}</strong>,</p>
            <p>Pengajuan surat resmi Anda telah berhasil diterima oleh sistem SVARA Layanan Desa:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 130px;">Nomor Tiket</td>
                  <td style="padding: 4px 0; font-weight: 700; font-family: monospace; color: #0f172a;">${id_pengajuan}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Jenis Surat</td>
                  <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${nama_surat}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Status Saat Ini</td>
                  <td style="padding: 4px 0; font-weight: 700; color: #d97706;">MENUNGGU VERIFIKASI (PENDING)</td>
                </tr>
              </table>
            </div>
            <p>Berkas Anda akan diperiksa oleh petugas administrasi desa. Anda dapat memantau perkembangan status surat melalui portal web SVARA.</p>
          `;
          const htmlWarga = buildEmailTemplate({
            title: `Tanda Terima Pengajuan Surat`,
            badge: `STATUS: PENDING`,
            contentHtml: contentWarga,
            footerNote: `No. Tiket: ${id_pengajuan} • Desa ID: ${desaId}`
          });
          await sendEmail(email_warga, `[PENGAJUAN SURAT DITERIMA] ${nama_surat} - Tiket #${id_pengajuan}`, htmlWarga);
        }

        // 4. Email Alert ke Kantor Desa
        if (emailResmiDesa) {
          const contentAdmin = `
            <p>Yth. Aparatur / Admin Desa,</p>
            <p>Terdapat permohonan pengajuan surat baru yang membutuhkan tindakan verifikasi Anda:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 130px;">No. Tiket</td>
                  <td style="padding: 4px 0; font-weight: 700; font-family: monospace;">${id_pengajuan}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Nama Pemohon</td>
                  <td style="padding: 4px 0; font-weight: 600;">${nama_warga || '-'} (${nik_warga || '-'})</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Wilayah RT / RW</td>
                  <td style="padding: 4px 0;">RT ${nomor_rt || '01'} / RW ${nomor_rw || '01'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Jenis Surat</td>
                  <td style="padding: 4px 0; font-weight: 600; color: #0369a1;">${nama_surat}</td>
                </tr>
              </table>
            </div>
            <p>Silakan buka dashboard admin SVARA pada menu Layanan Surat untuk memproses pengajuan ini.</p>
          `;
          const htmlAdmin = buildEmailTemplate({
            title: `Permohonan Surat Baru Masuk`,
            badge: `PERLU VERIFIKASI`,
            contentHtml: contentAdmin,
            footerNote: `No. Tiket: ${id_pengajuan}`
          });
          await sendEmail(emailResmiDesa, `[PERMOHONAN SURAT BARU] ${nama_surat} - ${nama_warga || 'Warga'}`, htmlAdmin);
        }
      } catch (notifErr) {
        console.error('[Pengajuan Surat Notif Error]:', notifErr.message);
      }
    })();

    res.json({ success: true, message: 'Pengajuan surat berhasil dikirim!', id_pengajuan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Handler inti untuk pembaruan status dan otomatisasi generator surat Word (.docx)
const handleUpdateStatusPengajuan = async (req, res) => {
  const { status, catatan_admin } = req.body;
  const { id } = req.params;

  console.log(`\n==================================================`);
  console.log(`[APPROVAL] Request diterima untuk ID: ${id} | Status: ${status}`);

  try {
    // 1. Ambil data pengajuan dari DB
    const [suratRows] = await db.query(
      'SELECT * FROM pengajuan_surat WHERE id_pengajuan = ?',
      [id]
    );

    if (suratRows.length === 0) {
      console.warn(`[APPROVAL] Data pengajuan surat dengan ID ${id} tidak ditemukan.`);
      return res.status(404).json({ success: false, message: 'Data pengajuan surat tidak ditemukan!' });
    }

    const surat = suratRows[0];
    const rawStatus = (status || '').toUpperCase().trim();
    const isApproved = rawStatus === 'APPROVED' || rawStatus === 'SELESAI';
    const isRejected = rawStatus === 'REJECTED' || rawStatus === 'DITOLAK';
    const isProcessing = rawStatus === 'DIPROSES' || rawStatus === 'PROSES';

    let nomorSuratResmi = surat.nomor_surat_resmi || null;
    let fileOutputName = surat.file_output || null;
    let fileOutputPath = null;

    // JIKA STATUS DISETUJUI (APPROVED) -> GENERATE WORD SECARA OTOMATIS
    if (isApproved) {
      console.log(`[APPROVAL] Surat: "${surat.nama_surat}" | Pemohon: "${surat.nama_warga}" | Email: "${surat.email_warga}"`);

      // a. Ambil file_template dari tabel template_surat
      let fileTemplate = null;
      if (surat.id_template) {
        const [tplRows] = await db.query(
          'SELECT file_template, nama_surat FROM template_surat WHERE id_template = ? LIMIT 1',
          [surat.id_template]
        );
        if (tplRows.length > 0 && tplRows[0].file_template) {
          fileTemplate = tplRows[0].file_template;
          console.log(`[APPROVAL] Template ditemukan dari DB via id_template (${surat.id_template}): "${fileTemplate}"`);
        }
      }

      // Fallback pencarian via nama_surat
      if (!fileTemplate && surat.nama_surat) {
        const [tplByName] = await db.query(
          'SELECT file_template FROM template_surat WHERE LOWER(nama_surat) = LOWER(?) LIMIT 1',
          [surat.nama_surat]
        );
        if (tplByName.length > 0 && tplByName[0].file_template) {
          fileTemplate = tplByName[0].file_template;
          console.log(`[APPROVAL] Template ditemukan dari DB via nama_surat: "${fileTemplate}"`);
        }
      }

      // Fallback cerdas jika DB belum mencatat nama file
      if (!fileTemplate) {
        const namaLower = (surat.nama_surat || '').toLowerCase();
        if (namaLower.includes('sktm') || namaLower.includes('tidak mampu')) {
          fileTemplate = 'SKTM_Template.docx';
        } else if (namaLower.includes('sku') || namaLower.includes('usaha')) {
          fileTemplate = 'SKU_Template.docx';
        } else if (namaLower.includes('domisili')) {
          fileTemplate = 'DOMISILI_Template.docx';
        }
        console.log(`[APPROVAL] Template ditentukan via fallback kata kunci: "${fileTemplate}"`);
      }

      // Pastikan berkas template benar-benar ada di folder templates/
      const templatesDir = path.join(__dirname, '..', 'templates');
      const templateFullPath = path.join(templatesDir, fileTemplate || '');
      const isTemplateFileFound = fileTemplate && fs.existsSync(templateFullPath);

      if (!isTemplateFileFound) {
        console.error(`[APPROVAL ERROR] File template Word "${fileTemplate}" TIDAK DITEMUKAN di: ${templateFullPath}`);
        return res.status(500).json({
          success: false,
          message: `Berkas template Word "${fileTemplate}" tidak ditemukan di folder templates! Mohon periksa keberadaan file.`
        });
      }
      console.log(`[APPROVAL] Verifikasi berkas template Word: ADA (${templateFullPath})`);

      // b. Buat Nomor Surat Resmi Unik jika belum ada
      if (!nomorSuratResmi) {
        const randomNum = Math.floor(100 + Math.random() * 900);
        const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
        const currentMonthRoman = romanMonths[new Date().getMonth()];
        const currentYear = new Date().getFullYear();
        const cleanKode = (surat.kode_surat || 'SK').replace(/\s+/g, '');
        nomorSuratResmi = `${randomNum}/${cleanKode}/${currentMonthRoman}/${currentYear}`;
      }
      console.log(`[APPROVAL] Nomor Surat Resmi: ${nomorSuratResmi}`);

      // c. Ambil data profil desa dan kepala desa aktif
      let namaDesa = 'Mertapada Wetan';
      let namaKades = 'H. Ahmadi, S.sos';
      try {
        const [desaRows] = await db.query('SELECT nama_desa_kelurahan, nama_kepala_desa_lurah FROM desa WHERE id_desa = ? LIMIT 1', [surat.id_desa || 'DESA-001']);
        if (desaRows.length > 0) {
          if (desaRows[0].nama_desa_kelurahan) namaDesa = desaRows[0].nama_desa_kelurahan;
          if (desaRows[0].nama_kepala_desa_lurah) namaKades = desaRows[0].nama_kepala_desa_lurah;
        }
      } catch (e) {
        console.warn('[APPROVAL] Catatan metadata desa/kades:', e.message);
      }

      // d. Parse data_isian pemohon
      let isianObj = {};
      if (typeof surat.data_isian === 'string') {
        try {
          isianObj = JSON.parse(surat.data_isian);
        } catch (e) {
          console.warn('[APPROVAL] Gagal parse JSON data_isian string:', e.message);
          isianObj = {};
        }
      } else if (typeof surat.data_isian === 'object' && surat.data_isian !== null) {
        isianObj = surat.data_isian;
      }

      // Ekstraksi Regex Cerdas untuk RT dan RW jika warga menulis alamat lengkap di satu string
      const rawAlamatStr = isianObj.alamat_warga || isianObj.alamat_lengkap || isianObj.alamat || '';
      let extractedRt = isianObj.nomor_rt || isianObj.rt;
      let extractedRw = isianObj.nomor_rw || isianObj.rw;

      if (!extractedRt && rawAlamatStr) {
        const matchRt = rawAlamatStr.match(/RT\s*[:.]?\s*(\d+)/i);
        if (matchRt) extractedRt = matchRt[1].padStart(2, '0');
      }
      if (!extractedRw && rawAlamatStr) {
        const matchRw = rawAlamatStr.match(/RW\s*[:.]?\s*(\d+)/i);
        if (matchRw) extractedRw = matchRw[1].padStart(2, '0');
      }

      const finalRt = extractedRt || surat.nomor_rt || '01';
      const finalRw = extractedRw || surat.nomor_rw || '01';
      const finalAlamat = rawAlamatStr || surat.alamat_warga || '-';

      // e. Gabungkan data dengan MENGUTAMAKAN isian form warga (isianObj)
      const dataPayload = {
        // Fallback dasar
        nama_desa: namaDesa,
        nama_penandatangan: namaKades,
        nama_kades: namaKades,
        tanggal_surat: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        nomor_surat: nomorSuratResmi,
        nomor_surat_resmi: nomorSuratResmi,
        nama_warga: surat.nama_warga || '-',
        nik_warga: surat.nik_warga || '-',

        // PRIORITAS UTAMA: Seluruh isian form warga
        ...isianObj,

        // Penyetelan Eksplisit untuk Tag Template Word {{alamat}}, {{rt}}, {{rw}}
        alamat: finalAlamat,
        alamat_warga: finalAlamat,
        dusun: isianObj.dusun || surat.dusun || '-',
        rt: finalRt,
        rw: finalRw,
        nomor_rt: finalRt,
        nomor_rw: finalRw,
        rt_rw_warga: isianObj.rt_rw_warga || isianObj.rt_rw || `RT ${finalRt} / RW ${finalRw}`
      };

      // f. Eksekusi render docx di dalam try-catch
      const safeSuratName = (surat.nama_surat || 'SURAT').replace(/[^a-zA-Z0-9]/g, '_');
      const outputName = `${id}_${safeSuratName}.docx`;

      console.log(`[APPROVAL] Generating docx menggunakan template: ${fileTemplate}...`);
      try {
        const genResult = generateDocument(fileTemplate, dataPayload, outputName);
        fileOutputName = genResult.filename;
        fileOutputPath = genResult.filePath;
        console.log(`[APPROVAL] File generated: ${outputName} di ${fileOutputPath}`);
      } catch (genErr) {
        console.error('[APPROVAL ERROR] Gagal me-render dokumen Word:', genErr);
        return res.status(500).json({
          success: false,
          message: `Gagal me-render berkas surat Word (.docx): ${genErr.message}`
        });
      }

      // g. Simpan status APPROVED, nomor_surat_resmi, dan file_output ke DB
      await db.query(
        'UPDATE pengajuan_surat SET status = ?, catatan_admin = ?, nomor_surat_resmi = ?, file_output = ? WHERE id_pengajuan = ?',
        [status, catatan_admin || null, nomorSuratResmi, fileOutputName, id]
      );
      console.log(`[APPROVAL] Database pengajuan_surat berhasil diperbarui (status: APPROVED, file_output: ${fileOutputName})`);
    } else {
      // Status REJECTED, DIPROSES, atau status lainnya
      await db.query(
        'UPDATE pengajuan_surat SET status = ?, catatan_admin = ? WHERE id_pengajuan = ?',
        [status, catatan_admin || null, id]
      );
      console.log(`[APPROVAL] Database pengajuan_surat diperbarui dengan status: ${status}`);
    }

    // --- TRIGGER AUTOMATIS NOTIFIKASI SURAT & EMAIL (TERMASUK STATUS DIPROSES) ---
    if (isApproved || isRejected || isProcessing) {
      const statusText = isApproved ? 'DISETUJUI' : isRejected ? 'DITOLAK' : 'SEDANG DIPROSES';
      let pesanText = `Pengajuan Surat ${surat.nama_surat} dengan No. Tiket ${id} telah diperbarui menjadi status ${statusText} oleh Admin Desa.`;
      
      if (isApproved && nomorSuratResmi) {
        pesanText += ` No. Surat Resmi: ${nomorSuratResmi}. Dokumen Word telah selesai dibuat.`;
      }
      if (catatan_admin) {
        pesanText += ` Catatan Petugas: ${catatan_admin}`;
      }

      // 1. Simpan ke Lonceng Notifikasi Web Warga
      await insertNotifikasi({
        nik: surat.nik_warga,
        id_desa: surat.id_desa || 'DESA-001',
        tipe: 'SURAT',
        judul: `Status Surat: ${statusText}`,
        pesan: pesanText,
        target_cakupan: 'PERSONAL',
        link_url: `TIKET: ${id}`
      });

      // 2. Kirim Notifikasi Email Otomatis ke Warga
      (async () => {
        try {
          let emailTarget = surat.email_warga;
          if (!emailTarget && surat.nik_warga) {
            const [uRows] = await db.query('SELECT email FROM users WHERE nik = ? LIMIT 1', [surat.nik_warga]);
            if (uRows.length > 0) emailTarget = uRows[0].email;
          }

          if (emailTarget) {
            const emailSubject = `[STATUS PENGAJUAN SURAT: ${statusText}] ${surat.nama_surat}`;
            const emailContent = `
              <p>Halo <strong>${surat.nama_warga || 'Warga'}</strong>,</p>
              <p>Permohonan surat Anda telah diperbarui oleh petugas administrasi desa dengan status terbaru:</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 130px;">Nomor Tiket</td>
                    <td style="padding: 6px 0; font-weight: 600; font-family: monospace; color: #0f172a;">${id}</td>
                  </tr>
                  ${nomorSuratResmi ? `
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">No. Surat Resmi</td>
                    <td style="padding: 6px 0; font-weight: 700; font-family: monospace; color: #166534;">${nomorSuratResmi}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Jenis Surat</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${surat.nama_surat}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Status Terbaru</td>
                    <td style="padding: 6px 0;">
                      <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; background-color: ${isApproved ? '#dcfce7; color: #15803d;' : isRejected ? '#fee2e2; color: #b91c1c;' : '#fef3c7; color: #b45309;'}">
                        ${statusText}
                      </span>
                    </td>
                  </tr>
                  ${catatan_admin ? `
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Catatan Petugas</td>
                      <td style="padding: 6px 0; color: #334155; font-weight: 500;">${catatan_admin}</td>
                    </tr>
                  ` : ''}
                </table>
              </div>
              ${isApproved && fileOutputName ? `
                <div style="margin: 16px 0; padding: 14px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size: 13px;">
                  📄 <strong>Dokumen Resmi Word (.docx):</strong> Berkas surat resmi Anda (<strong>${fileOutputName}</strong>) telah dilampirkan langsung pada email ini untuk dapat Anda unduh dan cetak.
                </div>
              ` : isProcessing ? `
                <p style="font-size: 13px; color: #475569;">Berkas permohonan Anda saat ini sedang disiapkan dan diteliti oleh aparatur desa. Anda akan menerima pemberitahuan lanjutan saat dokumen selesai diterbitkan.</p>
              ` : ''}
              <p>Silakan login ke portal web <strong>SVARA</strong> untuk mengecek riwayat atau perkembangan layanan surat Anda.</p>
            `;
            const htmlBody = buildEmailTemplate({
              title: `Pembaruan Status Layanan Surat`,
              badge: `STATUS: ${statusText}`,
              contentHtml: emailContent,
              footerNote: `ID Pengajuan: ${id} • Wilayah: ${surat.id_desa || 'DESA-001'}`
            });

            const attachments = [];
            const finalAttachmentPath = fileOutputPath || (fileOutputName ? path.join(__dirname, '..', 'generated_docs', fileOutputName) : null);
            if (isApproved && finalAttachmentPath && fs.existsSync(finalAttachmentPath)) {
              console.log(`[APPROVAL] Sending email with attachment: ${finalAttachmentPath}`);
              attachments.push({
                filename: fileOutputName,
                path: finalAttachmentPath
              });
            }

            console.log(`[APPROVAL] Mengirim email status surat (${statusText}) ke ${emailTarget}...`);
            const sendRes = await sendEmail(emailTarget, emailSubject, htmlBody, attachments);
            console.log(`[APPROVAL] Hasil pengiriman email ke ${emailTarget}: ${sendRes ? 'BERHASIL TERKIRIM ✅' : 'GAGAL TERKIRIM ❌'}`);
          }
        } catch (mailErr) {
          console.error('[APPROVAL ERROR] Gagal kirim email status surat:', mailErr.message);
        }
      })();
    }

    res.json({
      success: true,
      message: 'Status pengajuan surat berhasil diperbarui!',
      nomor_surat_resmi: nomorSuratResmi,
      file_output: fileOutputName
    });
  } catch (err) {
    console.error('[APPROVAL FATAL ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Endpoint alias khusus persetujuan
const approvePengajuan = (req, res) => {
  req.body.status = 'APPROVED';
  return handleUpdateStatusPengajuan(req, res);
};

// Endpoint DELETE untuk menghapus pengajuan surat dan berkas fisik terlampir
const deletePengajuan = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Cek keberadaan data & ambil nama berkas fisik jika ada
    const [rows] = await db.query(
      'SELECT id_pengajuan, file_output FROM pengajuan_surat WHERE id_pengajuan = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengajuan surat tidak ditemukan!' });
    }

    const fileOutput = rows[0].file_output;

    // 2. Hapus berkas fisik .docx dari direktori generated_docs jika ada
    if (fileOutput) {
      const filePath = path.join(__dirname, '..', 'generated_docs', fileOutput);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`[DELETE] Berkas fisik "${fileOutput}" berhasil dihapus dari generated_docs/`);
        } catch (unlinkErr) {
          console.warn(`[DELETE WARNING] Gagal menghapus berkas fisik "${fileOutput}":`, unlinkErr.message);
        }
      }
    }

    // 3. Hapus entri dari database MySQL
    await db.query('DELETE FROM pengajuan_surat WHERE id_pengajuan = ?', [id]);

    res.json({ success: true, message: 'Data pengajuan surat dan berkas terkait berhasil dihapus permanen!' });
  } catch (err) {
    console.error('[DELETE ERROR]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Endpoint GET untuk mengunduh berkas Word (.docx) hasil generate
const downloadSurat = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT id_pengajuan, nama_surat, file_output, status FROM pengajuan_surat WHERE id_pengajuan = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengajuan surat tidak ditemukan!' });
    }

    const surat = rows[0];

    if (!surat.file_output) {
      return res.status(404).json({
        success: false,
        message: 'Berkas surat belum diterbitkan. Surat harus disetujui (Approved) terlebih dahulu oleh Admin.'
      });
    }

    const filePath = path.join(__dirname, '..', 'generated_docs', surat.file_output);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: `Berkas dokumen "${surat.file_output}" tidak ditemukan di server penyimpanan.`
      });
    }

    res.download(filePath, surat.file_output, (err) => {
      if (err) {
        console.error('[Download Error]:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Gagal mengunduh berkas surat.' });
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAllPengajuan,
  createPengajuan,
  handleUpdateStatusPengajuan,
  approvePengajuan,
  deletePengajuan,
  downloadSurat
};