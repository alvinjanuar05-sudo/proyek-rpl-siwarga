const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const { sendEmail } = require('./utils/mailer');
const { generateDocument } = require('./utils/documentGenerator');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper Pembuat Template Email HTML Modern & Profesional
const buildEmailTemplate = ({ title, badge, contentHtml, footerNote }) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">SVARA • LAYANAN DESA</h1>
        <p style="color: #94a3b8; font-size: 12px; margin: 6px 0 0 0;">Portal Informasi & Layanan Digital Warga</p>
      </div>
      <div style="padding: 28px 24px;">
        ${badge ? `<div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 14px; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;">${badge}</div>` : ''}
        <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">${title}</h2>
        <div style="font-size: 14px; line-height: 1.6; color: #334155;">
          ${contentHtml}
        </div>
        ${footerNote ? `
          <div style="margin-top: 24px; padding: 12px 16px; background-color: #f8fafc; border-left: 4px solid #0f172a; border-radius: 6px; font-size: 12px; color: #64748b;">
            ${footerNote}
          </div>
        ` : ''}
      </div>
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
        Email ini dikirim secara otomatis oleh Sistem Layanan Desa SVARA.<br/>
        Mohon jangan membalas langsung ke alamat email ini.
      </div>
    </div>
  `;
};

// Helper internal untuk mencatat notifikasi baru
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

// ==========================================
// 1. ENDPOINT AUTENTIKASI (LOGIN & REGISTER)
// ==========================================

// Login User
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND password = ?',
      [email, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email atau kata sandi salah!' });
    }

    const user = rows[0];
    const statusUpper = (user.status || '').toUpperCase();

    if (statusUpper === 'PENDING' || statusUpper === 'PENDING_VERIFICATION' || statusUpper === 'MENUNGGU') {
      return res.status(403).json({ 
        success: false, 
        message: 'Akses ditolak! Akun Anda sedang dalam proses verifikasi oleh Admin Desa. Silakan tunggu persetujuan.' 
      });
    }

    if (statusUpper === 'SUSPENDED' || statusUpper === 'DITOLAK' || statusUpper === 'REJECTED') {
      return res.status(403).json({ 
        success: false, 
        message: 'Akun Anda ditolak atau dibekukan oleh Admin Desa.' 
      });
    }

    res.json({ success: true, message: 'Login berhasil!', user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Registrasi Warga Baru
app.post('/api/auth/register', async (req, res) => {
  const { nik, nama, email, password, no_hp, id_desa, nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap } = req.body;
  const id_user = 'USR-' + Date.now();

  try {
    await db.query(
      `INSERT INTO users (id_user, nik, nama, email, password, no_hp, role, id_desa, nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap, status)
       VALUES (?, ?, ?, ?, ?, ?, 'WARGA', ?, ?, ?, ?, ?, ?, 'Pending')`,
      [id_user, nik, nama, email, password, no_hp, id_desa || 'DESA-001', nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap]
    );

    res.json({ success: true, message: 'Registrasi warga berhasil! Menunggu verifikasi Admin Desa.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. ENDPOINT PENGAJUAN SURAT WARGA & ADMIN
// ==========================================

app.get('/api/pengajuan-surat', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pengajuan_surat ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pengajuan-surat', async (req, res) => {
  const { id_template, nama_surat, kode_surat, id_desa, email_warga, nik_warga, nama_warga, nomor_rt, nomor_rw, data_isian } = req.body;
  const id_pengajuan = 'SRT-' + Date.now();

  try {
    await db.query(
      `INSERT INTO pengajuan_surat (id_pengajuan, id_template, nama_surat, kode_surat, id_desa, email_warga, nik_warga, nama_warga, nomor_rt, nomor_rw, data_isian, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [id_pengajuan, id_template, nama_surat, kode_surat, id_desa || 'DESA-001', email_warga, nik_warga, nama_warga, nomor_rt, nomor_rw, JSON.stringify(data_isian)]
    );

    res.json({ success: true, message: 'Pengajuan surat berhasil dikirim!', id_pengajuan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
    const isApproved = (status || '').toUpperCase() === 'APPROVED' || (status || '').toUpperCase() === 'SELESAI';
    const isRejected = (status || '').toUpperCase() === 'REJECTED' || (status || '').toUpperCase() === 'DITOLAK';

    let nomorSuratResmi = surat.nomor_surat_resmi || null;
    let fileOutputName = surat.file_output || null;
    let fileOutputPath = null;

    // JIKA STATUS DISETUJUI (APPROVED) -> GENERATE WORD SECARA OTOMATIS
    if (isApproved) {
      console.log(`[APPROVAL] Surat: "${surat.nama_surat}" | Pemohon: "${surat.nama_warga}" | Email: "${surat.email_warga}"`);

      // a. Ambil file_template dari tabel template_surat (JOIN / Query berdasarkan id_template atau nama_surat)
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
      const templatesDir = path.join(__dirname, 'templates');
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

      // e. Gabungkan seluruh data pemohon, desa, dan metadata surat ke dataPayload
      const dataPayload = {
        ...isianObj,
        nomor_surat: nomorSuratResmi,
        nomor_surat_resmi: nomorSuratResmi,
        nama_warga: surat.nama_warga || isianObj.nama_warga || '-',
        nik_warga: surat.nik_warga || isianObj.nik_warga || '-',
        rt: surat.nomor_rt || isianObj.nomor_rt || '01',
        rw: surat.nomor_rw || isianObj.nomor_rw || '01',
        nomor_rt: surat.nomor_rt || isianObj.nomor_rt || '01',
        nomor_rw: surat.nomor_rw || isianObj.nomor_rw || '01',
        nama_desa: namaDesa,
        nama_penandatangan: namaKades,
        nama_kades: namaKades,
        tanggal_surat: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
      };

      // f. Eksekusi render docx di dalam try-catch tanpa silence error
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
      // Status REJECTED atau status lainnya
      await db.query(
        'UPDATE pengajuan_surat SET status = ?, catatan_admin = ? WHERE id_pengajuan = ?',
        [status, catatan_admin || null, id]
      );
      console.log(`[APPROVAL] Database pengajuan_surat diperbarui dengan status: ${status}`);
    }

    // --- TRIGGER AUTOMATIS NOTIFIKASI SURAT & EMAIL ---
    if (isApproved || isRejected) {
      const statusText = isApproved ? 'DISETUJUI' : 'DITOLAK';
      let pesanText = `Pengajuan Surat ${surat.nama_surat} dengan No. Tiket ${id} telah ${statusText} oleh Admin Desa.`;
      if (isApproved && nomorSuratResmi) {
        pesanText += ` No. Surat Resmi: ${nomorSuratResmi}. Dokumen Word telah selesai dibuat.`;
      }
      if (isRejected && catatan_admin) {
        pesanText += ` Catatan: ${catatan_admin}`;
      }

      // 1. Simpan ke Lonceng Notifikasi Web
      await insertNotifikasi({
        nik: surat.nik_warga,
        id_desa: surat.id_desa || 'DESA-001',
        tipe: 'SURAT',
        judul: `Status Surat: ${statusText}`,
        pesan: pesanText,
        target_cakupan: 'PERSONAL',
        link_url: `TIKET: ${id}`
      });

      // 2. Kirim Notifikasi Email Otomatis ke Warga beserta attachment .docx
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
              <p>Permohonan surat Anda telah diverifikasi oleh petugas administrasi desa dengan status terbaru:</p>
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
                    <td style="padding: 6px 0; color: #64748b;">Status</td>
                    <td style="padding: 6px 0;">
                      <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; background-color: ${isApproved ? '#dcfce7; color: #15803d;' : '#fee2e2; color: #b91c1c;'}">
                        ${statusText}
                      </span>
                    </td>
                  </tr>
                  ${catatan_admin ? `
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Catatan Petugas</td>
                      <td style="padding: 6px 0; color: #b91c1c; font-weight: 500;">${catatan_admin}</td>
                    </tr>
                  ` : ''}
                </table>
              </div>
              ${isApproved && fileOutputName ? `
                <div style="margin: 16px 0; padding: 14px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size: 13px;">
                  📄 <strong>Dokumen Resmi Word (.docx):</strong> Berkas surat resmi Anda (<strong>${fileOutputName}</strong>) telah dilampirkan langsung pada email ini untuk dapat Anda unduh dan cetak.
                </div>
              ` : ''}
              <p>Silakan login ke portal web <strong>SVARA</strong> untuk mengecek riwayat atau mengunduh kembali dokumen terkait.</p>
            `;
            const htmlBody = buildEmailTemplate({
              title: `Pembaruan Status Layanan Surat`,
              badge: `STATUS: ${statusText}`,
              contentHtml: emailContent,
              footerNote: `ID Pengajuan: ${id} • Wilayah: ${surat.id_desa || 'DESA-001'}`
            });

            // Siapkan lampiran email jika berkas .docx tersedia
            const attachments = [];
            const finalAttachmentPath = fileOutputPath || (fileOutputName ? path.join(__dirname, 'generated_docs', fileOutputName) : null);
            if (isApproved && finalAttachmentPath && fs.existsSync(finalAttachmentPath)) {
              console.log(`[APPROVAL] Sending email with attachment: ${finalAttachmentPath}`);
              attachments.push({
                filename: fileOutputName,
                path: finalAttachmentPath
              });
            } else if (isApproved) {
              console.warn(`[APPROVAL WARNING] Dokumen .docx tidak ditemukan di path: ${finalAttachmentPath}`);
            }

            console.log(`[APPROVAL] Mengirim email status surat ke ${emailTarget}...`);
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

// Endpoint PUT untuk pembaruan status surat aktif
app.put('/api/pengajuan-surat/:id', handleUpdateStatusPengajuan);

// Endpoint alias khusus persetujuan
app.put('/api/pengajuan-surat/:id/approve', (req, res) => {
  req.body.status = 'APPROVED';
  return handleUpdateStatusPengajuan(req, res);
});

// Endpoint GET untuk mengunduh berkas Word (.docx) hasil generate
app.get('/api/pengajuan-surat/:id/download', async (req, res) => {
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

    const filePath = path.join(__dirname, 'generated_docs', surat.file_output);

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
});

// ==========================================
// 2.5. ENDPOINT KELOLA FORM & TEMPLATE SURAT (TABEL template_surat)
// ==========================================

const DEFAULT_TEMPLATES = [
  {
    id_template: 'TPL-001',
    id_desa: 'DESA-001',
    nama_surat: 'Surat Keterangan Tidak Mampu (SKTM)',
    kode_surat: '475 / SKTM / IX / 2026',
    tipe_struktur: 'multi_ortu_anak',
    field_ortu: ['nama_ortu', 'nik_ortu', 'no_kk_ortu', 'pekerjaan_ortu', 'penghasilan_ortu', 'alamat_ortu'],
    field_warga: ['nama_warga', 'nik_warga', 'no_kk_warga', 'tempat_tgl_lahir', 'sekolah_univ', 'keperluan'],
    custom_fields: [
      { id: 'cf-1', label: 'Upload Slip Gaji / Keterangan RT', type: 'file', section: 'lampiran', required: false },
      { id: 'cf-2', label: 'Jumlah Tanggungan Anak', type: 'number', section: 'orang_tua', required: true, placeholder: 'Contoh: 3' },
    ],
    status: 'Aktif'
  },
  {
    id_template: 'TPL-002',
    id_desa: 'DESA-001',
    nama_surat: 'Surat Keterangan Usaha (SKU)',
    kode_surat: '503 / SKU / IX / 2026',
    tipe_struktur: 'single',
    field_ortu: [],
    field_warga: ['nama_warga', 'nik_warga', 'no_hp', 'tempat_tgl_lahir', 'pekerjaan', 'alamat_warga', 'keperluan'],
    custom_fields: [
      { id: 'cf-sku-1', label: 'Nama Usaha / Toko', type: 'text', section: 'warga', required: true, placeholder: 'Contoh: Toko Kelontong Berkah' },
      { id: 'cf-sku-2', label: 'Alamat Tempat Usaha', type: 'text', section: 'warga', required: true },
    ],
    status: 'Aktif'
  }
];

const parseJsonField = (val) => {
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(val) ? val : [];
};

const formatTemplate = (tpl) => ({
  ...tpl,
  field_ortu: parseJsonField(tpl.field_ortu),
  field_warga: parseJsonField(tpl.field_warga),
  custom_fields: parseJsonField(tpl.custom_fields),
});

// GET /api/template-surat
app.get('/api/template-surat', async (req, res) => {
  const { id_desa } = req.query;
  try {
    let query = 'SELECT * FROM template_surat';
    const params = [];
    if (id_desa) {
      query += ' WHERE id_desa = ?';
      params.push(id_desa);
    }
    query += ' ORDER BY id_template ASC';

    let [rows] = await db.query(query, params);

    // Auto-seed template bawaan jika tabel template_surat masih kosong
    if (rows.length === 0 && !id_desa) {
      let defaultDesaId = 'DESA-001';
      try {
        const [desas] = await db.query('SELECT id_desa FROM desa LIMIT 1');
        if (desas.length > 0) defaultDesaId = desas[0].id_desa;
      } catch (e) {}

      for (const tpl of DEFAULT_TEMPLATES) {
        await db.query(
          `INSERT INTO template_surat (id_template, id_desa, nama_surat, kode_surat, tipe_struktur, field_ortu, field_warga, custom_fields, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tpl.id_template,
            defaultDesaId,
            tpl.nama_surat,
            tpl.kode_surat,
            tpl.tipe_struktur,
            JSON.stringify(tpl.field_ortu),
            JSON.stringify(tpl.field_warga),
            JSON.stringify(tpl.custom_fields),
            tpl.status || 'Aktif'
          ]
        );
      }
      const [seededRows] = await db.query('SELECT * FROM template_surat ORDER BY id_template ASC');
      rows = seededRows;
    }

    res.json({ success: true, data: rows.map(formatTemplate) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/template-surat
app.post('/api/template-surat', async (req, res) => {
  let {
    id_template,
    id_desa,
    nama_surat,
    kode_surat,
    tipe_struktur,
    field_ortu,
    field_warga,
    custom_fields,
    status
  } = req.body;

  if (!id_template || !id_template.trim()) {
    id_template = `TPL-${Date.now().toString().slice(-4)}`;
  }

  try {
    let finalDesaId = id_desa || 'DESA-001';
    const [desas] = await db.query('SELECT id_desa FROM desa WHERE id_desa = ?', [finalDesaId]);
    if (desas.length === 0) {
      const [allDesas] = await db.query('SELECT id_desa FROM desa LIMIT 1');
      if (allDesas.length > 0) {
        finalDesaId = allDesas[0].id_desa;
      }
    }

    await db.query(
      `INSERT INTO template_surat (id_template, id_desa, nama_surat, kode_surat, tipe_struktur, field_ortu, field_warga, custom_fields, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_template,
        finalDesaId,
        nama_surat || 'Form Surat Baru',
        kode_surat || '470 / SK / IX / 2026',
        tipe_struktur || 'single',
        JSON.stringify(field_ortu || []),
        JSON.stringify(field_warga || []),
        JSON.stringify(custom_fields || []),
        status || 'Aktif'
      ]
    );

    res.json({
      success: true,
      message: 'Template surat baru berhasil dibuat!',
      id_template,
      data: {
        id_template,
        id_desa: finalDesaId,
        nama_surat,
        kode_surat,
        tipe_struktur: tipe_struktur || 'single',
        field_ortu: field_ortu || [],
        field_warga: field_warga || [],
        custom_fields: custom_fields || [],
        status: status || 'Aktif'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/template-surat/:id
app.put('/api/template-surat/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nama_surat,
    kode_surat,
    tipe_struktur,
    field_ortu,
    field_warga,
    custom_fields,
    status
  } = req.body;

  try {
    const [existing] = await db.query('SELECT * FROM template_surat WHERE id_template = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Template surat tidak ditemukan!' });
    }

    const current = existing[0];
    const newNama = nama_surat !== undefined ? nama_surat : current.nama_surat;
    const newKode = kode_surat !== undefined ? kode_surat : current.kode_surat;
    const newTipe = tipe_struktur !== undefined ? tipe_struktur : current.tipe_struktur;
    const newFieldOrtu = field_ortu !== undefined ? JSON.stringify(field_ortu) : (typeof current.field_ortu === 'string' ? current.field_ortu : JSON.stringify(current.field_ortu || []));
    const newFieldWarga = field_warga !== undefined ? JSON.stringify(field_warga) : (typeof current.field_warga === 'string' ? current.field_warga : JSON.stringify(current.field_warga || []));
    const newCustomFields = custom_fields !== undefined ? JSON.stringify(custom_fields) : (typeof current.custom_fields === 'string' ? current.custom_fields : JSON.stringify(current.custom_fields || []));
    const newStatus = status !== undefined ? status : current.status;

    await db.query(
      `UPDATE template_surat 
       SET nama_surat = ?, kode_surat = ?, tipe_struktur = ?, field_ortu = ?, field_warga = ?, custom_fields = ?, status = ?
       WHERE id_template = ?`,
      [newNama, newKode, newTipe, newFieldOrtu, newFieldWarga, newCustomFields, newStatus, id]
    );

    res.json({
      success: true,
      message: 'Susunan field template surat berhasil diperbarui!',
      id_template: id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/template-surat/:id
app.delete('/api/template-surat/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.query('SELECT * FROM template_surat WHERE id_template = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Template surat tidak ditemukan!' });
    }

    await db.query('DELETE FROM template_surat WHERE id_template = ?', [id]);
    res.json({ success: true, message: 'Template surat berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. ENDPOINT ASPIRASI WARGA & ADMIN
// ==========================================

app.get('/api/aspirasi', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM aspirasi_warga ORDER BY tanggal DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/aspirasi', async (req, res) => {
  const { id_desa, nama_warga, nik_warga, email_warga, no_hp_warga, nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap, kategori, judul, isi, lokasi } = req.body;
  const id_aspirasi = 'ASP-' + Date.now();

  try {
    await db.query(
      `INSERT INTO aspirasi_warga (id_aspirasi, id_desa, nama_warga, nik_warga, email_warga, no_hp_warga, nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap, kategori, judul, isi, lokasi, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu')`,
      [id_aspirasi, id_desa || 'DESA-001', nama_warga, nik_warga, email_warga, no_hp_warga, nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap, kategori, judul, isi, lokasi]
    );

    // Otomatis catat notifikasi terkirim untuk warga pemohon
    if (nik_warga) {
      await insertNotifikasi({
        nik: nik_warga,
        id_desa: id_desa || 'DESA-001',
        tipe: 'ASPIRASI',
        judul: `Aspirasi Berhasil Disampaikan`,
        pesan: `Aspirasi Anda mengenai "${judul}" berhasil dikirim ke Desa (${id_aspirasi}) dan sedang berstatus Menunggu.`,
        target_cakupan: 'PERSONAL',
        link_url: `ASPIRASI: ${id_aspirasi}`
      });
    }

    // --- TRIGGER EMAIL KONFIRMASI ASPIRASI BARU (ASYNC) ---
    (async () => {
      try {
        let emailTarget = email_warga;
        if (!emailTarget && nik_warga) {
          const [uRows] = await db.query('SELECT email FROM users WHERE nik = ? LIMIT 1', [nik_warga]);
          if (uRows.length > 0) emailTarget = uRows[0].email;
        }

        if (emailTarget) {
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
          const htmlBody = buildEmailTemplate({
            title: `Aspirasi Berhasil Disampaikan`,
            badge: 'LAYANAN ASPIRASI',
            contentHtml: emailContent,
            footerNote: `Kode Tiket: ${id_aspirasi} • Desa: ${id_desa || 'DESA-001'}`
          });

          await sendEmail(emailTarget, emailSubject, htmlBody);
        }
      } catch (mailErr) {
        console.error('[Mailer] Gagal kirim email konfirmasi aspirasi:', mailErr.message);
      }
    })();

    res.json({ success: true, message: 'Aspirasi berhasil disampaikan!', id_aspirasi });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/aspirasi/:id/status', async (req, res) => {
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

      // 1. Simpan ke Lonceng Notifikasi Web
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
            const emailSubject = `[STATUS ASPIRASI: ${statusLabel}] ${asp.judul}`;
            const isDone = status === 'Selesai';
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
});

// ==========================================
// 4. ENDPOINT MANAJEMEN USER / WARGA
// ==========================================

app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE LOWER(role) = 'warga' OR role IS NULL ORDER BY created_at DESC"
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/users/:id/status', async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  try {
    await db.query(
      'UPDATE users SET status = ? WHERE id_user = ?',
      [status, id]
    );
    res.json({ success: true, message: 'Status user berhasil diperbarui!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. ENDPOINT PENGUMUMAN DESA
// ==========================================

app.get('/api/pengumuman', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pengumuman_desa ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pengumuman', async (req, res) => {
  const { 
    id_desa, judul, kategori, target_cakupan, target_wilayah, target_rw, target_rt, 
    mode_waktu, tanggal_info, jam_info, tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, 
    tanggal_rilis, lokasi, isi, foto 
  } = req.body;

  // 1. Penanganan Primary Key (id_pengumuman)
  const id_pengumuman = req.body.id_pengumuman || `PGM-${Date.now()}`;

  // Helper Sanitasi Tipe Data DATE (mengembalikan format YYYY-MM-DD atau null jika kosong/tidak valid)
  const sanitizeDate = (val) => {
    if (!val || typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[\/\-]/);
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return null;
  };

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

  // 4. Error Handling: Try-Catch dengan log detail console.error(err)
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

        const rwPadded = String(rwVal).padStart(2, '0');
        const rwRaw = String(parseInt(rwVal, 10) || rwVal);
        const rtPadded = String(rtVal).padStart(2, '0');
        const rtRaw = String(parseInt(rtVal, 10) || rtVal);

        let emailQuery = '';
        let queryParams = [];

        if (rawCakupanEmail === 'RTRW') {
          // Target Khusus RT & RW
          emailQuery = `
            SELECT DISTINCT email FROM users 
            WHERE (id_desa = ? OR ? IS NULL) 
              AND (nomor_rw = ? OR nomor_rw = ?) 
              AND (nomor_rt = ? OR nomor_rt = ?) 
              AND email IS NOT NULL AND email != ''
          `;
          queryParams = [desaId, desaId, rwPadded, rwRaw, rtPadded, rtRaw];
        } else if (rawCakupanEmail === 'RW') {
          // Target Khusus RW
          emailQuery = `
            SELECT DISTINCT email FROM users 
            WHERE (id_desa = ? OR ? IS NULL) 
              AND (nomor_rw = ? OR nomor_rw = ?) 
              AND email IS NOT NULL AND email != ''
          `;
          queryParams = [desaId, desaId, rwPadded, rwRaw];
        } else {
          // Target Seluruh Desa / GLOBAL
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
            ? `Khusus RT ${rtPadded} / RW ${rwPadded}` 
            : rawCakupanEmail === 'RW' 
            ? `Khusus RW ${rwPadded}` 
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
});

app.delete('/api/pengumuman/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM pengumuman_desa WHERE id_pengumuman = ?', [id]);
    res.json({ success: true, message: 'Pengumuman berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5.5. ENDPOINT SISTEM NOTIFIKASI WARGA
// ==========================================

// GET /api/notifikasi -> Mengambil notifikasi warga berdasarkan NIK / Wilayah
app.get('/api/notifikasi', async (req, res) => {
  const { nik, id_desa, nomor_rt, nomor_rw } = req.query;
  const targetDesa = id_desa || 'DESA-001';

  try {
    let sql = `
      SELECT * FROM notifikasi 
      WHERE (
        (nik = ? AND target_cakupan = 'PERSONAL') OR
        (id_desa = ? AND target_cakupan = 'GLOBAL') OR
        (id_desa = ? AND target_cakupan = 'RW' AND target_rw = ?) OR
        (id_desa = ? AND target_cakupan = 'RTRW' AND target_rw = ? AND target_rt = ?)
      )
      ORDER BY created_at DESC
    `;

    const cleanRt = String(nomor_rt || '').padStart(2, '0');
    const cleanRw = String(nomor_rw || '').padStart(2, '0');

    const [rows] = await db.query(sql, [
      nik || '',
      targetDesa,
      targetDesa, cleanRw,
      targetDesa, cleanRw, cleanRt
    ]);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/notifikasi/:id/read -> Tandai 1 notifikasi sudah dibaca
app.put('/api/notifikasi/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE notifikasi SET is_read = 1 WHERE id_notifikasi = ?', [id]);
    res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/notifikasi/read-all -> Tandai semua notifikasi warga sudah dibaca
app.put('/api/notifikasi/read-all', async (req, res) => {
  const { nik, id_desa } = req.body;
  try {
    await db.query(
      `UPDATE notifikasi SET is_read = 1 WHERE (nik = ? OR target_cakupan != 'PERSONAL') AND id_desa = ?`,
      [nik || '', id_desa || 'DESA-001']
    );
    res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. ENDPOINT APARATUR DESA & PROFIL DESA
// ==========================================

// --- APARATUR DESA ---
app.get('/api/aparatur', async (req, res) => {
  try {
    let rows = [];
    try {
      const [data] = await db.query('SELECT * FROM aparatur_desa ORDER BY urutan ASC');
      rows = data;
    } catch (e) {
      const [data] = await db.query('SELECT * FROM aparatur_desa');
      rows = data;
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/aparatur', async (req, res) => {
  const { id_desa, nama, jabatan, no_hp, kontak, email, foto, urutan } = req.body;
  const id_aparatur = 'APR-' + Date.now();
  const phone = no_hp || kontak || null;

  try {
    await db.query(
      `INSERT INTO aparatur_desa (id_aparatur, id_desa, nama, jabatan, no_hp, email, foto, urutan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_aparatur, id_desa || 'DESA-001', nama, jabatan, phone, email || null, foto || null, urutan || 1]
    );

    res.json({ success: true, message: 'Data aparatur berhasil disimpan!', id_aparatur });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/aparatur/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM aparatur_desa WHERE id_aparatur = ?', [id]);
    res.json({ success: true, message: 'Data aparatur berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- PROFIL DESA ---
app.get('/api/desa', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM desa LIMIT 1');
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data profil desa belum ada.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/desa', async (req, res) => {
  const { 
    id_desa, 
    nama_desa_kelurahan, 
    nama_kecamatan, 
    nama_kabupaten, 
    nama_kepala_desa_lurah, 
    nama_sekdes, 
    alamat_kantor, 
    nomor_kontak 
  } = req.body;

  const targetId = id_desa || 'DESA-001';

  try {
    const [existing] = await db.query('SELECT * FROM desa WHERE id_desa = ?', [targetId]);

    if (existing.length === 0) {
      await db.query(
        `INSERT INTO desa (id_desa, nama_desa_kelurahan, nama_kecamatan, nama_kabupaten, nama_kepala_desa_lurah, nama_sekdes, alamat_kantor, nomor_kontak)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          targetId, 
          nama_desa_kelurahan || 'Mertapada Wetan', 
          nama_kecamatan || 'Astanajapura', 
          nama_kabupaten || 'Kabupaten Cirebon', 
          nama_kepala_desa_lurah || '-', 
          nama_sekdes || '-', 
          alamat_kantor || '-', 
          nomor_kontak || '-'
        ]
      );
    } else {
      await db.query(
        `UPDATE desa SET 
          nama_desa_kelurahan = ?, 
          nama_kecamatan = ?, 
          nama_kabupaten = ?, 
          nama_kepala_desa_lurah = ?, 
          nama_sekdes = ?, 
          alamat_kantor = ?, 
          nomor_kontak = ?
         WHERE id_desa = ?`,
        [
          nama_desa_kelurahan, 
          nama_kecamatan, 
          nama_kabupaten, 
          nama_kepala_desa_lurah, 
          nama_sekdes, 
          alamat_kantor, 
          nomor_kontak, 
          targetId
        ]
      );
    }

    res.json({ success: true, message: 'Profil Desa berhasil diperbarui!' });
  } catch (err) {
    console.error('Error update profil desa:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------------------------
// ENDPOINT STRUKTUR WILAYAH (TABEL RW & RT)
// ------------------------------------------

app.get('/api/desa/rw', async (req, res) => {
  try {
    const [rwRows] = await db.query('SELECT * FROM rw ORDER BY nomor_rw ASC');
    const [rtRows] = await db.query('SELECT * FROM rt ORDER BY nomor_rt ASC');

    const structuredData = rwRows.map((rw) => {
      const childRt = rtRows
        .filter((rt) => String(rt.id_rw) === String(rw.id))
        .map((rt) => ({
          nomor: rt.nomor_rt,
          ketua: rt.ketua_rt,
          kontak: rt.kontak,
          foto: rt.foto
        }));

      return {
        id: rw.id,
        nomor: rw.nomor_rw,
        ketua: rw.ketua_rw,
        kontak: rw.kontak,
        foto: rw.foto,
        rt: childRt
      };
    });

    res.json({ success: true, data: structuredData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/desa/rw', async (req, res) => {
  const { id_desa, rw } = req.body;
  const targetIdDesa = id_desa || 'DESA-001';
  const rwList = Array.isArray(rw) ? rw : [];

  try {
    console.log('🔄 Memproses simpan RT/RW ke tabel rw & rt MySQL...');

    await db.query('DELETE FROM rt WHERE id_desa = ?', [targetIdDesa]);
    await db.query('DELETE FROM rw WHERE id_desa = ?', [targetIdDesa]);

    for (const itemRw of rwList) {
      const [resultRw] = await db.query(
        `INSERT INTO rw (id_desa, nomor_rw, ketua_rw, kontak, foto)
         VALUES (?, ?, ?, ?, ?)`,
        [
          targetIdDesa,
          String(itemRw.nomor || ''),
          String(itemRw.ketua || ''),
          String(itemRw.kontak || ''),
          itemRw.foto || null
        ]
      );

      const insertedRwId = resultRw.insertId;

      const rtList = Array.isArray(itemRw.rt) ? itemRw.rt : [];
      for (const itemRt of rtList) {
        await db.query(
          `INSERT INTO rt (id_rw, id_desa, nomor_rt, ketua_rt, kontak, foto)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            insertedRwId,
            targetIdDesa,
            String(itemRt.nomor || ''),
            String(itemRt.ketua || ''),
            String(itemRt.kontak || ''),
            itemRt.foto || null
          ]
        );
      }
    }

    console.log('✅ SUKSES: Data RT/RW tersimpan rapi ke tabel rw dan rt!');
    res.json({ success: true, message: 'Data RT & RW berhasil tersimpan ke database MySQL!' });
  } catch (err) {
    console.error('❌ ERROR SQL SIMPAN RT/RW:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. ENDPOINT CHATBOT AI SVARA (DYNAMIC MODEL FALLBACK & DB CONTEXT)
// ==========================================
app.post('/api/chat', async (req, res) => {
  const { message, user, apiKey } = req.body;

  // =========================================================================
  // 1. PEMBATASAN TOPIK DAN GUARDRAILS (STRICT DOMAIN CONSTRAINT)
  // AI Agent HANYA BISA membantu hal pelayanan publik & informasi Desa Mertapada Wetan.
  // =========================================================================
  const PENOLAKAN_RESMI = "Mohon maaf, sebagai asisten resmi Desa Mertapada Wetan, saya hanya dapat membantu Anda terkait layanan administrasi, pengumuman, aspirasi, dan informasi seputar desa.";

  const offTopicPatterns = [
    /\b(python|javascript|typescript|c\+\+|java|php|ruby|golang|rust|html|css|sql query|nosql|react|vue|angular|node\.?js)\b/i,
    /\b(bikin|buatkan|tuliskan|contoh|ajari|koreksi)\s+(kode|koding|coding|script|fungsi|function|program|algoritma|class|syntax)\b/i,
    /\b(debug|compile|syntax error|regex|npm install|pip install|terminal|cmd|powershell)\b/i,
    /\b(print\(|console\.log|def |public static|void main|import os|import sys)\b/i,
    /\b(hitunglah|kalkulator|integral|turunan|aljabar|trigonometri|pythagoras|logaritma|pecahan|persamaan linier)\b/i,
    /\b(tugas sekolah|pr sekolah|pr matematika|pekerjaan rumah|soal fisika|soal kimia|soal biologi|soal ujian|skripsi|makalah)\b/i,
    /\b(buatkan puisi|buatkan cerpen|cerita dongeng|pantun cinta|lirik lagu|novel|teks drama)\b/i,
    /\b(siapa presiden amerika|presiden rusia|perang dunia|ibukota prancis|sepak bola eropa|liga champions)\b/i,
    /\b(resep masakan|cara memasak kue|ramalan zodiak|horoskop|main game|cheat game)\b/i,
  ];

  if (offTopicPatterns.some((pattern) => pattern.test(message || ''))) {
    return res.json({
      success: true,
      reply: PENOLAKAN_RESMI
    });
  }

  let effectiveApiKey = apiKey && apiKey !== 'DUMMY_KEY' ? apiKey.trim() : null;
  let preferredModel = 'gemini-2.0-flash';

  try {
    const [configRows] = await db.query('SELECT api_key, model_default FROM ai_config LIMIT 1');
    if (configRows.length > 0) {
      if (!effectiveApiKey && configRows[0].api_key && configRows[0].api_key !== 'DUMMY_KEY') {
        effectiveApiKey = configRows[0].api_key.trim();
      }
      if (configRows[0].model_default) {
        preferredModel = configRows[0].model_default.trim();
      }
    }
  } catch (e) {
    console.warn('Gagal membaca ai_config dari DB:', e.message);
  }

  if (!effectiveApiKey) {
    return res.status(400).json({ 
      success: false, 
      message: 'API Key Gemini belum diatur di Super Admin!' 
    });
  }

  try {
    // =========================================================================
    // 2. PEMBATASAN HAK AKSES BERDASARKAN ROLE (ROLE-BASED ACCESS CONTROL)
    // Mode Admin: Full Access ke seluruh data sistem
    // Mode Warga: Restricted Access HANYA data miliknya sendiri & info publik
    // =========================================================================
    const userRole = (user?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'admin_desa' || userRole === 'admin-desa' || userRole === 'super_admin' || userRole === 'super-admin';
    const userNik = (user?.nik || '').trim();
    const userEmail = (user?.email || '').trim().toLowerCase();

    // 1. Fetch Profil Desa
    let desaInfo = {};
    try {
      const [desaRows] = await db.query('SELECT * FROM desa LIMIT 1');
      if (desaRows.length > 0) desaInfo = desaRows[0];
    } catch (e) {}

    const namaDesa = desaInfo.nama_desa_kelurahan || 'Mertapada Wetan';
    const namaKec = desaInfo.nama_kecamatan || 'Astanajapura';
    const namaKab = desaInfo.nama_kabupaten || 'Kabupaten Cirebon';
    const namaKades = desaInfo.nama_kepala_desa_lurah || '-';
    const namaSekdes = desaInfo.nama_sekdes || '-';
    const alamatKantor = desaInfo.alamat_kantor || '-';
    const kontakKantor = desaInfo.nomor_kontak || '-';

    // 2. Fetch Aparatur Desa (Publik)
    let aparaturRows = [];
    try {
      const [rows] = await db.query('SELECT * FROM aparatur_desa ORDER BY urutan ASC');
      aparaturRows = rows;
    } catch (e) {
      aparaturRows = [];
    }

    // 3. Fetch Pengumuman Publik Desa
    let pengumumanRows = [];
    try {
      const [rows] = await db.query('SELECT judul, kategori, tanggal_info, lokasi, isi FROM pengumuman_desa ORDER BY id_pengumuman DESC LIMIT 5');
      pengumumanRows = rows;
    } catch (e) {
      pengumumanRows = [];
    }

    // 4. Fetch Struktur RT & RW (Publik untuk Wilayah)
    let rwRows = [];
    let rtRows = [];
    try {
      const [rws] = await db.query('SELECT * FROM rw ORDER BY nomor_rw ASC');
      rwRows = rws;
    } catch (e) {}

    try {
      const [rts] = await db.query('SELECT * FROM rt ORDER BY nomor_rt ASC');
      rtRows = rts;
    } catch (e) {}

    // 5. Fetch Data Sensitif Sesuai Hak Akses Role
    let wargaRows = [];
    let pengajuanRows = [];
    let aspirasiRows = [];
    let statsSurat = { total: 0, pending: 0, approved: 0, rejected: 0 };
    let statsAspirasi = { total: 0, menunggu: 0, diproses: 0, selesai: 0, ditolak: 0 };

    if (isAdmin) {
      // MODE ADMIN: Akses Penuh
      try {
        const [wargas] = await db.query("SELECT nama, nik, nomor_rt, nomor_rw, status FROM users WHERE LOWER(role) = 'warga' OR role IS NULL LIMIT 100");
        wargaRows = wargas;
      } catch (e) {}

      try {
        const [suratAll] = await db.query(
          'SELECT id_pengajuan, nama_surat, nama_warga, email_warga, status, tanggal_pengajuan FROM pengajuan_surat ORDER BY created_at DESC LIMIT 20'
        );
        pengajuanRows = suratAll;

        const [suratStats] = await db.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN UPPER(status) = 'PENDING' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN UPPER(status) = 'APPROVED' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN UPPER(status) = 'REJECTED' THEN 1 ELSE 0 END) as rejected
          FROM pengajuan_surat
        `);
        if (suratStats.length > 0) {
          statsSurat = {
            total: suratStats[0].total || 0,
            pending: suratStats[0].pending || 0,
            approved: suratStats[0].approved || 0,
            rejected: suratStats[0].rejected || 0,
          };
        }
      } catch (e) {}

      try {
        const [aspAll] = await db.query(
          'SELECT id_aspirasi, nama_warga, kategori, judul, status, lokasi, tanggal FROM aspirasi_warga ORDER BY tanggal DESC LIMIT 20'
        );
        aspirasiRows = aspAll;

        const [aspStats] = await db.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN LOWER(status) = 'menunggu' THEN 1 ELSE 0 END) as menunggu,
            SUM(CASE WHEN LOWER(status) = 'diproses' THEN 1 ELSE 0 END) as diproses,
            SUM(CASE WHEN LOWER(status) = 'selesai' THEN 1 ELSE 0 END) as selesai,
            SUM(CASE WHEN LOWER(status) = 'ditolak' THEN 1 ELSE 0 END) as ditolak
          FROM aspirasi_warga
        `);
        if (aspStats.length > 0) {
          statsAspirasi = {
            total: aspStats[0].total || 0,
            menunggu: aspStats[0].menunggu || 0,
            diproses: aspStats[0].diproses || 0,
            selesai: aspStats[0].selesai || 0,
            ditolak: aspStats[0].ditolak || 0,
          };
        }
      } catch (e) {}
    } else {
      // MODE WARGA: Akses Terbatas HANYA Milik Sendiri (Data Warga Lain Dikosongkan)
      wargaRows = [];

      try {
        if (userNik || userEmail) {
          const [mySurat] = await db.query(
            'SELECT id_pengajuan, nama_surat, status, catatan_admin, tanggal_pengajuan FROM pengajuan_surat WHERE (nik_warga = ? OR email_warga = ?) ORDER BY created_at DESC LIMIT 10',
            [userNik || null, userEmail || null]
          );
          pengajuanRows = mySurat;

          const [myAsp] = await db.query(
            'SELECT id_aspirasi, kategori, judul, status, catatan_desa, tanggal FROM aspirasi_warga WHERE (nik_warga = ? OR email_warga = ?) ORDER BY tanggal DESC LIMIT 10',
            [userNik || null, userEmail || null]
          );
          aspirasiRows = myAsp;
        }
      } catch (e) {}
    }

    // 6. Fetch Template Surat Resmi (Publik untuk informasi layanan surat)
    let templateSuratRows = [];
    try {
      const [tsRows] = await db.query(
        "SELECT id_template, nama_surat, kode_surat, tipe_struktur FROM template_surat WHERE status = 'Aktif' OR status IS NULL"
      );
      templateSuratRows = tsRows;
    } catch (e) {}

    let teksTemplateSurat = templateSuratRows.length > 0
      ? templateSuratRows.map(t => `- [${t.kode_surat}] ${t.nama_surat}`).join('\n')
      : 'Belum ada template surat aktif di database.';

    let teksAparatur = aparaturRows.length > 0 
      ? aparaturRows.map(a => {
          const hp = a.no_hp || a.kontak || a.telepon || '-';
          return `- ${a.nama} (Jabatan: ${a.jabatan}${hp !== '-' ? `, No. HP: ${hp}` : ''})`;
        }).join('\n')
      : 'Belum ada data aparatur desa tambahan.';

    let teksStrukturRTRW = '';
    if (rwRows.length === 0) {
      teksStrukturRTRW = 'Belum ada data pengurus RW/RT yang diinput.';
    } else {
      rwRows.forEach((rw) => {
        const rawRwNo = rw.nomor_rw || rw.nomor || rw.rw || '-';
        const rwClean = String(rawRwNo).replace(/^0+/, '') || '0';
        const ketuaRw = rw.ketua_rw || rw.ketua || '-';
        const kontakRw = rw.kontak || rw.no_hp || '-';

        teksStrukturRTRW += `\n* RW ${rawRwNo} (RW ${rwClean}) | Ketua RW: ${ketuaRw} | Kontak WA: ${kontakRw}\n`;

        const childRt = rtRows.filter((rt) => String(rt.id_rw) === String(rw.id) || String(rt.nomor_rw) === String(rawRwNo));
        childRt.forEach((rt) => {
          const rawRtNo = rt.nomor_rt || rt.nomor || rt.rt || '-';
          const ketuaRt = rt.ketua_rt || rt.ketua || '-';
          const kontakRt = rt.kontak || rt.no_hp || '-';
          teksStrukturRTRW += `  - RT ${rawRtNo} | Ketua RT: ${ketuaRt} | Kontak WA: ${kontakRt}\n`;
        });
      });
    }

    let teksWarga = '';
    if (isAdmin) {
      teksWarga = wargaRows.length > 0 
        ? `Total Warga Terdaftar: ${wargaRows.length} orang\nDetail Akun Warga:\n` + wargaRows.map(w => `- Nama: ${w.nama} | NIK: ${w.nik || '-'} | RT: ${w.nomor_rt} | RW: ${w.nomor_rw} | Status: ${w.status}`).join('\n')
        : 'Belum ada data warga terdaftar.';
    } else {
      teksWarga = 'AKSES DIBATASI: Rekapitulasi kependudukan dan NIK warga lain bersifat rahasia internal desa dan tidak boleh diberikan kepada role Warga.';
    }

    let teksPengajuanSurat = '';
    if (isAdmin) {
      teksPengajuanSurat = `Total Pengajuan Surat: ${statsSurat.total} (Pending: ${statsSurat.pending}, Disetujui: ${statsSurat.approved}, Ditolak: ${statsSurat.rejected})\n`;
      if (pengajuanRows.length > 0) {
        teksPengajuanSurat += 'Daftar Pengajuan Terbaru:\n' + pengajuanRows.map(p => 
          `- ID: ${p.id_pengajuan} | Surat: ${p.nama_surat} | Pemohon: ${p.nama_warga || p.email_warga || '-'} | Status: ${p.status}`
        ).join('\n');
      } else {
        teksPengajuanSurat += 'Belum ada data permohonan surat.';
      }
    } else {
      if (pengajuanRows.length > 0) {
        teksPengajuanSurat = `Riwayat Pengajuan Surat Milik Akun Anda Sendiri (${user?.nama || 'Warga'}):\n` + pengajuanRows.map(p => 
          `- ID Tiket: ${p.id_pengajuan} | Surat: ${p.nama_surat} | Status: ${p.status}${p.catatan_admin ? ` (Catatan Petugas: ${p.catatan_admin})` : ''}`
        ).join('\n');
      } else {
        teksPengajuanSurat = 'Belum ada riwayat pengajuan surat atas nama akun Anda.';
      }
    }

    let teksAspirasi = '';
    if (isAdmin) {
      teksAspirasi = `Total Aspirasi Warga: ${statsAspirasi.total} (Menunggu: ${statsAspirasi.menunggu}, Diproses: ${statsAspirasi.diproses}, Selesai: ${statsAspirasi.selesai})\n`;
      if (aspirasiRows.length > 0) {
        teksAspirasi += 'Daftar Aspirasi Terbaru:\n' + aspirasiRows.map(a => 
          `- ID: ${a.id_aspirasi} | Kategori: ${a.kategori} | Judul: "${a.judul}" | Pelapor: ${a.nama_warga || '-'} | Status: ${a.status}`
        ).join('\n');
      } else {
        teksAspirasi += 'Belum ada data aspirasi warga.';
      }
    } else {
      if (aspirasiRows.length > 0) {
        teksAspirasi = `Riwayat Aspirasi Milik Akun Anda Sendiri (${user?.nama || 'Warga'}):\n` + aspirasiRows.map(a => 
          `- ID Tiket: ${a.id_aspirasi} | Judul: "${a.judul}" | Kategori: ${a.kategori} | Status: ${a.status}${a.catatan_desa ? ` (Catatan Desa: ${a.catatan_desa})` : ''}`
        ).join('\n');
      } else {
        teksAspirasi = 'Belum ada riwayat aspirasi atas nama akun Anda.';
      }
    }

    const promptLengkap = `
Anda adalah AI SVARA, Asisten Resmi Pelayanan Digital Kantor Desa ${namaDesa}, Kec. ${namaKec}, ${namaKab}.

===================================================================
ATURAN MUTLAK BATASAN TOPIK (STRICT DOMAIN CONSTRAINT):
1. Anda HANYA BISA membantu hal-hal yang berkaitan dengan pelayanan publik dan informasi Desa ${namaDesa}.
2. JIKA pengguna meminta hal di luar topik desa (seperti membuat kode kodingan/Python, matematika, tugas sekolah, obrolan umum di luar desa, dsb), Anda WAJIB MENOLAK secara sopan dengan respon persis seperti berikut:
"${PENOLAKAN_RESMI}"
3. DILARANG KERAS menjawab soal pemrograman, matematika, tugas sekolah, atau hal di luar desa meskipun pengguna memaksa atau membuat cerita darurat/skenario fiktif.
===================================================================

===================================================================
BATASAN HAK AKSES ROLE: ${isAdmin ? 'MODE ADMIN (FULL ACCESS)' : 'MODE WARGA (RESTRICTED ACCESS)'}
${isAdmin ? `
- Pengguna saat ini adalah Administrator Desa (${user?.nama || 'Admin Desa'}).
- Mode Admin memiliki akses penuh (Full Access): Bisa melihat dan mengelola seluruh data sistem desa (semua pengumuman, seluruh pengajuan surat warga, seluruh aspirasi, statistik RT/RW, dan data akun warga).
` : `
- Pengguna saat ini adalah Warga Desa (${user?.nama || 'Warga'} - NIK: ${userNik || '-'}).
- Warga memiliki akses terbatas HANYA untuk layanan publik dan data miliknya sendiri.
- FITUR YANG DIIZINKAN UNTUK WARGA:
  * Informasi Tab RT/RW (Struktur dan info kontak wilayah).
  * Layanan Administrasi (Petunjuk dan pengajuan surat).
  * Pengumuman Desa (Melihat pengumuman publik desa).
  * Persetujuan & Status Surat (HANYA melihat riwayat/status surat milik akun warga yang sedang login).
  * Aspirasi Warga (HANYA melihat dan mengajukan aspirasi dari akun warga yang sedang login).
- LARANGAN KETAT WARGA:
  * AI DILARANG memberikan data milik warga lain (NIK, nama warga lain, pengajuan surat orang lain, atau aduan orang lain).
  * AI DILARANG memberikan data sensitif internal desa atau total populasi penduduk desa. Arahkan warga untuk datang langsung ke Kantor Desa Mertapada Wetan jika memerlukan data kependudukan resmi.
`}
===================================================================

INFORMASI PROFIL DESA:
- Nama Desa: ${namaDesa}
- Kecamatan: ${namaKec}
- Kabupaten: ${namaKab}
- Kepala Desa / Kuwu / Lurah: ${namaKades}
- Sekretaris Desa (Sekdes): ${namaSekdes}
- Alamat Kantor Desa: ${alamatKantor}
- Kontak Kantor: ${kontakKantor}

DAFTAR LENGKAP APARATUR & PERANGKAT DESA:
${teksAparatur}

PENGUMUMAN PUBLIK DESA TERBARU:
${pengumumanRows.map(p => `- [${p.kategori || 'Pengumuman'}] ${p.judul}: ${p.isi || ''}`).join('\n') || 'Tidak ada pengumuman.'}

DATA RESMI PENGURUS RT & RW (INFORMASI WILAYAH):
${teksStrukturRTRW}

DAFTAR TEMPLATE & JENIS LAYANAN SURAT RESMI:
${teksTemplateSurat}

DATA KEPENDUDUKAN:
${teksWarga}

DATA PERSETUJUAN & STATUS PENGAJUAN SURAT:
${teksPengajuanSurat}

DATA LAPORAN ASPIRASI & KELUHAN:
${teksAspirasi}

PERTANYAAN PENGGUNA (${user?.nama || 'Pengguna'} - Role: ${user?.role || 'WARGA'}): "${message}"

INSTRUKSI CARA MENJAWAB:
1. Selalu patuhi ATURAN MUTLAK BATASAN TOPIK. Jika di luar topik desa, langsung tolak dengan: "${PENOLAKAN_RESMI}".
2. Selalu patuhi HAK AKSES ROLE. Jika role Warga menanyakan data warga lain atau data internal desa, tolak secara sopan.
3. Jawablah secara singkat, ramah, sopan, dan terstruktur rapi dengan format markdown.
`;

    const candidateModels = Array.from(
      new Set([
        preferredModel || 'gemini-3.7-flash',
        'gemini-3.7-flash',
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-flash-lite-latest'
      ])
    );

    let responseText = null;

    for (const modelName of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${effectiveApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptLengkap }] }]
            })
          }
        );

        const data = await response.json();
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseText = data.candidates[0].content.parts[0].text;
          console.log(`✅ AI Berhasil merespon menggunakan model: ${modelName}`);
          break;
        } else if (data.error) {
          console.warn(`Model ${modelName} error (${data.error.code}): ${data.error.message}`);
        }
      } catch (e) {
        console.warn(`Gagal coba model ${modelName}, mencoba model selanjutnya...`);
      }
    }

    if (!responseText) {
      throw new Error('Semua model Gemini gagal merespon. Pastikan API Key di Super Admin valid.');
    }

    return res.json({ success: true, reply: responseText });

  } catch (err) {
    console.error('❌ Error pada Gemini Chat AI:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal memproses AI Chat.',
      error: err.message 
    });
  }
});

// ==========================================
// 8. ENDPOINT KONFIGURASI AI (TABEL ai_config)
// ==========================================

// Ambil Konfigurasi AI dari Database MySQL
app.get('/api/config/ai', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ai_config ORDER BY id DESC LIMIT 1');
    if (rows.length === 0) {
      return res.json({ 
        success: true, 
        data: { api_key: '', model_default: 'gemini-2.0-flash' } 
      });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simpan / Perbarui Konfigurasi AI ke Database MySQL
app.post('/api/config/ai', async (req, res) => {
  const { api_key, apiKey, model_default, model } = req.body;
  const finalKey = (api_key || apiKey || '').trim();
  const finalModel = (model_default || model || 'gemini-2.0-flash').trim();

  try {
    const [existing] = await db.query('SELECT * FROM ai_config LIMIT 1');
    if (existing.length === 0) {
      await db.query(
        'INSERT INTO ai_config (api_key, model_default) VALUES (?, ?)',
        [finalKey, finalModel]
      );
    } else {
      await db.query(
        'UPDATE ai_config SET api_key = ?, model_default = ? WHERE id = ?',
        [finalKey, finalModel, existing[0].id]
      );
    }

    res.json({ 
      success: true, 
      message: 'Konfigurasi AI berhasil disimpan ke database MySQL!',
      data: { api_key: finalKey, model_default: finalModel }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 9. ENDPOINT SISTEM NOTIFIKASI WARGA
// ==========================================

// Ambil Notifikasi Warga (Personal + Broadcast Wilayah Desa/RW/RT)
app.get('/api/notifikasi', async (req, res) => {
  const { nik, id_desa, nomor_rt, nomor_rw } = req.query;
  const desa = id_desa || 'DESA-001';
  const rwTarget = nomor_rw ? String(nomor_rw).padStart(2, '0') : null;
  const rtTarget = nomor_rt ? String(nomor_rt).padStart(2, '0') : null;

  try {
    let rows = [];
    if (nik) {
      const query = `
        SELECT * FROM notifikasi
        WHERE (id_desa = ? OR id_desa IS NULL)
          AND (
            (target_cakupan = 'PERSONAL' AND nik = ?)
            OR (target_cakupan = 'GLOBAL')
            OR (target_cakupan = 'RW' AND (target_rw = ? OR ? IS NULL))
            OR (target_cakupan = 'RTRW' AND (target_rw = ? OR ? IS NULL) AND (target_rt = ? OR ? IS NULL))
          )
        ORDER BY created_at DESC
        LIMIT 50
      `;
      const [result] = await db.query(query, [
        desa,
        nik,
        rwTarget, rwTarget,
        rwTarget, rwTarget,
        rtTarget, rtTarget
      ]);
      rows = result;
    } else {
      const query = `
        SELECT * FROM notifikasi
        WHERE (id_desa = ? OR id_desa IS NULL) AND target_cakupan = 'GLOBAL'
        ORDER BY created_at DESC
        LIMIT 30
      `;
      const [result] = await db.query(query, [desa]);
      rows = result;
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error get notifikasi:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tandai satu notifikasi sudah dibaca
app.put('/api/notifikasi/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE notifikasi SET is_read = 1 WHERE id_notifikasi = ?', [id]);
    res.json({ success: true, message: 'Notifikasi ditandai dibaca' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tandai semua notifikasi sudah dibaca
app.put('/api/notifikasi/read-all', async (req, res) => {
  const { nik, id_desa } = req.body;
  try {
    if (nik) {
      await db.query('UPDATE notifikasi SET is_read = 1 WHERE nik = ?', [nik]);
    } else if (id_desa) {
      await db.query('UPDATE notifikasi SET is_read = 1 WHERE id_desa = ? AND target_cakupan = "GLOBAL"', [id_desa]);
    } else {
      await db.query('UPDATE notifikasi SET is_read = 1');
    }
    res.json({ success: true, message: 'Semua notifikasi ditandai dibaca' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Jalankan Server Express
app.listen(PORT, () => {
  console.log(`🚀 Server Backend SiWarga berjalan di http://localhost:${PORT}`);
});