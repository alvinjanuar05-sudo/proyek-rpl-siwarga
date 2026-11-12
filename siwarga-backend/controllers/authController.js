const bcrypt = require('bcryptjs');
const db = require('../db');
const { sendEmail } = require('../utils/mailer');
const { buildEmailTemplate } = require('../services/emailTemplateService');
const { insertNotifikasi } = require('../services/notificationService');
const { insertActivityLog } = require('../utils/activityLogger');

// Helper internal untuk mengecek apakah kata sandi di DB sudah berformat bcrypt hash
const isBcryptHash = (str) => typeof str === 'string' && (str.startsWith('$2a$') || str.startsWith('$2b$'));

// Login User
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Cari user berdasarkan email saja (Prepared Statement)
    const [rows] = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email atau kata sandi salah!' });
    }

    const user = rows[0];

    // Verifikasi kata sandi (Mendukung Bcrypt Hash & Plaintext Lama)
    let isPasswordMatch = false;
    if (isBcryptHash(user.password)) {
      isPasswordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Fallback untuk data lama yang belum ter-hash
      isPasswordMatch = user.password === password;
    }

    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: 'Email atau kata sandi salah!' });
    }

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

    // --- INTEGRASI CATATAN SESI & LOG AKTIVITAS (NON-BLOCKING) ---
    (async () => {
      try {
        const userAgent = req.headers['user-agent'] || 'Web Browser';
        const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
        let browserName = 'Web Browser';
        let deviceType = 'Desktop';

        if (/mobile/i.test(userAgent)) deviceType = 'Mobile';
        if (/tablet/i.test(userAgent)) deviceType = 'Tablet';

        if (/chrome/i.test(userAgent)) browserName = 'Chrome Browser';
        else if (/firefox/i.test(userAgent)) browserName = 'Firefox Browser';
        else if (/safari/i.test(userAgent)) browserName = 'Safari Browser';
        else if (/edg/i.test(userAgent)) browserName = 'Edge Browser';

        const id_session = `SES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Simpan sesi ke tabel user_sessions
        await db.query(
          `INSERT INTO user_sessions (id_session, id_user, device_type, browser, ip_address, user_agent, login_at, last_active, is_active)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)`,
          [id_session, user.id_user, deviceType, browserName, clientIp, userAgent]
        );

        // Simpan riwayat login ke activity_logs
        await insertActivityLog({
          id_user: user.id_user,
          nik: user.nik,
          id_desa: user.id_desa || 'DESA-001',
          tipe_aktivitas: 'LOGIN',
          deskripsi: `Login berhasil melalui ${browserName} (${deviceType}).`,
          ip_address: clientIp
        });
      } catch (logErr) {
        console.error('[Login Session Logger Error]:', logErr.message);
      }
    })();

    // Hapus kata sandi dari objek respons sebelum dikirim ke frontend
    delete user.password;

    res.json({ success: true, message: 'Login berhasil!', user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Registrasi Warga Baru
const register = async (req, res) => {
  const { nik, nama, email, password, no_hp, id_desa, nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap } = req.body;
  const id_user = 'USR-' + Date.now();
  const desaId = id_desa || 'DESA-001';

  try {
    // Hash kata sandi menggunakan bcryptjs (Salt Rounds: 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (id_user, nik, nama, email, password, no_hp, role, id_desa, nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap, status)
       VALUES (?, ?, ?, ?, ?, ?, 'WARGA', ?, ?, ?, ?, ?, ?, 'Pending')`,
      [id_user, nik, nama, email, hashedPassword, no_hp, desaId, nomor_rt, nomor_rw, rt_rw, dusun, alamat_lengkap]
    );

    // --- TRIGGER NOTIFIKASI LONCENG & EMAIL (ASYNC / NON-BLOCKING) ---
    (async () => {
      try {
        // Log Aktivitas Registrasi
        await insertActivityLog({
          id_user: id_user,
          nik: nik,
          id_desa: desaId,
          tipe_aktivitas: 'VERIFIKASI_AKUN',
          deskripsi: 'Pendaftaran akun warga baru berhasil (Menunggu Verifikasi Admin).',
          ip_address: req.ip || '127.0.0.1'
        });

        // 1. Notifikasi Lonceng ke Admin Desa
        await insertNotifikasi({
          id_desa: desaId,
          tipe: 'USER',
          judul: 'Permohonan Akun Warga Baru',
          pesan: `Warga baru atas nama ${nama || 'Warga'} (NIK: ${nik || '-'}) di RT ${nomor_rt || '01'} / RW ${nomor_rw || '01'} mendaftar dan membutuhkan verifikasi.`,
          target_cakupan: 'ADMIN_DESA',
          link_url: 'warga'
        });

        // 2. Ambil email resmi desa dari database
        let emailResmiDesa = process.env.SMTP_USER;
        const [desaRows] = await db.query('SELECT email_resmi, nama_desa_kelurahan FROM desa WHERE id_desa = ? LIMIT 1', [desaId]);
        if (desaRows.length > 0 && desaRows[0].email_resmi) {
          emailResmiDesa = desaRows[0].email_resmi;
        }

        // 3. Email Konfirmasi Pendaftaran ke Warga Pendaftar
        if (email) {
          const contentWarga = `
            <p>Halo <strong>${nama || 'Warga'}</strong>,</p>
            <p>Pendaftaran akun Anda di portal layanan digital SVARA telah berhasil kami terima:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 120px;">NIK</td>
                  <td style="padding: 4px 0; font-weight: 700; font-family: monospace; color: #0f172a;">${nik || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Nama Lengkap</td>
                  <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${nama || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Email Terdaftar</td>
                  <td style="padding: 4px 0; color: #0f172a;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Status Akun</td>
                  <td style="padding: 4px 0; font-weight: 700; color: #d97706;">MENUNGGU VERIFIKASI DESA</td>
                </tr>
              </table>
            </div>
            <p>Petugas administrasi desa akan memverifikasi kesesuaian data identitas Anda. Anda akan menerima pemberitahuan via email setelah akun disetujui (Approved).</p>
          `;
          const htmlWarga = buildEmailTemplate({
            title: `Pendaftaran Akun Berhasil`,
            badge: `STATUS: PENDING VERIFICATION`,
            contentHtml: contentWarga,
            footerNote: `Desa ID: ${desaId}`
          });
          await sendEmail(email, `[SVARA] Pendaftaran Akun Berhasil - Menunggu Verifikasi`, htmlWarga);
        }

        // 4. Email Alert Pendaftaran Baru ke Admin / Kantor Desa
        if (emailResmiDesa) {
          const contentAdmin = `
            <p>Yth. Aparatur / Tim Verifikator Desa,</p>
            <p>Terdapat pendaftaran akun warga baru yang membutuhkan tindakan verifikasi data kependudukan:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 120px;">NIK</td>
                  <td style="padding: 4px 0; font-weight: 700; font-family: monospace;">${nik || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Nama Lengkap</td>
                  <td style="padding: 4px 0; font-weight: 600;">${nama || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Wilayah</td>
                  <td style="padding: 4px 0;">RT ${nomor_rt || '01'} / RW ${nomor_rw || '01'} (${dusun || 'Dusun Utama'})</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">No. HP</td>
                  <td style="padding: 4px 0;">${no_hp || '-'}</td>
                </tr>
              </table>
            </div>
            <p>Silakan tinjau dan aktifkan akun warga ini melalui menu Pengelolaan Warga di dashboard admin SVARA.</p>
          `;
          const htmlAdmin = buildEmailTemplate({
            title: `Pendaftaran Warga Baru`,
            badge: `VERIFIKASI AKUN`,
            contentHtml: contentAdmin,
            footerNote: `NIK: ${nik}`
          });
          await sendEmail(emailResmiDesa, `[VERIFIKASI AKUN] Pendaftaran Warga Baru: ${nama} (${nik})`, htmlAdmin);
        }
      } catch (asyncErr) {
        console.error('[Register Async Error]:', asyncErr.message);
      }
    })();

    res.json({ success: true, message: 'Registrasi warga berhasil! Menunggu verifikasi Admin Desa.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ----------------------------------------------------
// VERIFIKASI KATA SANDI SAAT INI (STEP 1 STEPPER)
// ----------------------------------------------------
const verifyPassword = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan kata sandi saat ini wajib diisi!' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id_user, email, password FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Akun warga tidak ditemukan.' });
    }

    const user = rows[0];

    // Check password (Bcrypt Hash / Plaintext)
    let isPasswordMatch = false;
    if (isBcryptHash(user.password)) {
      isPasswordMatch = await bcrypt.compare(password, user.password);
    } else {
      isPasswordMatch = user.password === password;
    }

    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: 'Kata sandi saat ini tidak sesuai!' });
    }

    res.json({ success: true, message: 'Kata sandi terverifikasi.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ----------------------------------------------------
// PEMBARUAN KATA SANDI BARU (STEP 2 STEPPER)
// ----------------------------------------------------
const changePassword = async (req, res) => {
  const { email, old_password, new_password } = req.body;

  if (!email || !old_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Semua kolom kata sandi wajib diisi!' });
  }

  if (new_password.length < 8) {
    return res.status(400).json({ success: false, message: 'Kata sandi baru minimal 8 karakter!' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id_user, nik, nama, email, id_desa, password FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Akun warga tidak ditemukan.' });
    }

    const user = rows[0];

    // Cek ulang kata sandi lama demi keamanan ganda
    let isOldPasswordMatch = false;
    if (isBcryptHash(user.password)) {
      isOldPasswordMatch = await bcrypt.compare(old_password, user.password);
    } else {
      isOldPasswordMatch = user.password === old_password;
    }

    if (!isOldPasswordMatch) {
      return res.status(401).json({ success: false, message: 'Kata sandi saat ini tidak sesuai!' });
    }

    // Hash kata sandi baru
    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    // Update kata sandi baru di database
    await db.query('UPDATE users SET password = ?, updated_at = NOW() WHERE LOWER(email) = LOWER(?)', [hashedNewPassword, email]);

    // 🛡️ SANITASI KEAMANAN (TAHAP 4): Nonaktifkan seluruh sesi aktif lama di tabel user_sessions
    await db.query('UPDATE user_sessions SET is_active = 0 WHERE id_user = ?', [user.id_user]);

    // Async alert notifikasi & email
    (async () => {
      try {
        // Catat ke Activity Log
        await insertActivityLog({
          id_user: user.id_user,
          nik: user.nik,
          id_desa: user.id_desa || 'DESA-001',
          tipe_aktivitas: 'UBAH_SANDI',
          deskripsi: 'Pembaruan kata sandi akun berhasil dilakukan (Sesi lama diakhiri).',
          ip_address: req.ip || '127.0.0.1'
        });

        // Notifikasi lonceng internal
        if (user.nik) {
          await insertNotifikasi({
            nik: user.nik,
            id_desa: user.id_desa || 'DESA-001',
            tipe: 'USER',
            judul: 'Kata Sandi Diperbarui',
            pesan: 'Kata sandi akun SVARA Anda telah berhasil diperbarui. Seluruh sesi aktif di perangkat lain telah diakhiri.',
            target_cakupan: 'PERSONAL',
            link_url: 'profile'
          });
        }

        // Email konfirmasi keamanan
        const contentEmail = `
          <p>Halo <strong>${user.nama || 'Warga'}</strong>,</p>
          <p>Kata sandi untuk akun portal layanan desa <strong>SVARA</strong> Anda telah berhasil diperbarui pada ${new Date().toLocaleString('id-ID')}.</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px; color: #334155;">
              🔒 <strong>Peringatan Keamanan:</strong> Seluruh sesi login di perangkat lain telah diakhiri otomatis demi keamanan. Jika Anda merasa tidak melakukan perubahan ini, segera hubungi Kantor Desa.
            </p>
          </div>
        `;
        const htmlBody = buildEmailTemplate({
          title: 'Kata Sandi Berhasil Diperbarui',
          badge: 'KEAMANAN AKUN',
          contentHtml: contentEmail,
          footerNote: `Email: ${user.email}`
        });

        await sendEmail(user.email, '[SVARA] Pemberitahuan Perubahan Kata Sandi Akun', htmlBody);
      } catch (asyncErr) {
        console.error('[Change Password Async Alert Error]:', asyncErr.message);
      }
    })();

    res.json({ success: true, message: 'Kata sandi berhasil diperbarui!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ----------------------------------------------------
// DISPATCHER LUPA KATA SANDI (RESET VIA EMAIL)
// ----------------------------------------------------
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email terdaftar wajib diisi!' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id_user, nama, email, id_desa FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Email tidak terdaftar dalam sistem!' });
    }

    const user = rows[0];
    const resetToken = 'RST-' + Date.now() + Math.random().toString(36).substring(2, 8);

    // Tautan reset mengarah ke halaman reset password frontend
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    (async () => {
      try {
        const contentEmail = `
          <p>Halo <strong>${user.nama || 'Warga'}</strong>,</p>
          <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun portal desa SVARA Anda.</p>
          <p>Silakan klik tombol di bawah ini untuk membuat kata sandi baru:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 9999px; font-weight: 600; text-decoration: none; font-size: 13px; display: inline-block;">
              Atur Ulang Kata Sandi Saya
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b;">
            Atau salin dan tempel tautan berikut di browser Anda:<br/>
            <a href="${resetLink}" style="color: #0284c7;">${resetLink}</a>
          </p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
            Abaikan email ini jika Anda tidak pernah meminta pemulihan kata sandi.
          </p>
        `;

        const htmlBody = buildEmailTemplate({
          title: 'Permintaan Pemulihan Kata Sandi',
          badge: 'RESET PASSWORD',
          contentHtml: contentEmail,
          footerNote: `Ref ID: ${resetToken}`
        });

        await sendEmail(user.email, '[SVARA] Petunjuk Pemulihan Kata Sandi Akun', htmlBody);
      } catch (asyncErr) {
        console.error('[Forgot Password Async Error]:', asyncErr.message);
      }
    })();

    res.json({
      success: true,
      message: 'Tautan pemulihan kata sandi telah dikirim ke email terdaftar Anda.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ----------------------------------------------------
// KELUAR DARI SEMUA PERANGKAT (GLOBAL LOGOUT)
// ----------------------------------------------------
const logoutAllDevices = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email wajib diisi!' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id_user, nama, email, nik, id_desa FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Akun warga tidak ditemukan.' });
    }

    const user = rows[0];

    // Pembaruan timestamp aktivitas untuk membatalkan seluruh token/sesi aktif sebelumnya
    await db.query('UPDATE users SET updated_at = NOW() WHERE LOWER(email) = LOWER(?)', [email]);

    // Nonaktifkan seluruh sesi di tabel user_sessions
    await db.query('UPDATE user_sessions SET is_active = 0 WHERE id_user = ?', [user.id_user]);

    // Async alert notifikasi & email pemicu logout global
    (async () => {
      try {
        // Catat ke Activity Log
        await insertActivityLog({
          id_user: user.id_user,
          nik: user.nik,
          id_desa: user.id_desa || 'DESA-001',
          tipe_aktivitas: 'LOGOUT',
          deskripsi: 'Sesi diakhiri secara menyeluruh dari semua perangkat.',
          ip_address: req.ip || '127.0.0.1'
        });

        if (user.nik) {
          await insertNotifikasi({
            nik: user.nik,
            id_desa: user.id_desa || 'DESA-001',
            tipe: 'USER',
            judul: 'Sesi Login Diakhiri',
            pesan: 'Seluruh sesi aktif akun SVARA Anda di perangkat lain telah berhasil diakhiri secara menyeluruh.',
            target_cakupan: 'PERSONAL',
            link_url: 'profile'
          });
        }

        const contentEmail = `
          <p>Halo <strong>${user.nama || 'Warga'}</strong>,</p>
          <p>Kami memberitahukan bahwa permintaan <strong>Keluar dari Semua Perangkat</strong> untuk akun SVARA Anda telah berhasil diproses pada ${new Date().toLocaleString('id-ID')}.</p>
          <p style="font-size: 13px; color: #475569;">
            Seluruh sesi login Anda di HP, Tablet, maupun Browser komputer lain secara otomatis telah diakhiri demi menjaga privasi dan keamanan data kependudukan Anda.
          </p>
        `;

        const htmlBody = buildEmailTemplate({
          title: 'Sesi Seluruh Perangkat Diakhiri',
          badge: 'KEAMANAN SESI',
          contentHtml: contentEmail,
          footerNote: `Email: ${user.email}`
        });

        await sendEmail(user.email, '[SVARA] Pemberitahuan Sesi Login Diakhiri dari Semua Perangkat', htmlBody);
      } catch (asyncErr) {
        console.error('[Logout All Devices Async Alert Error]:', asyncErr.message);
      }
    })();

    res.json({
      success: true,
      message: 'Berhasil keluar dari semua perangkat.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  login,
  register,
  verifyPassword,
  changePassword,
  forgotPassword,
  logoutAllDevices
};