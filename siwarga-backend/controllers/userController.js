const bcrypt = require('bcryptjs');
const db = require('../db');
const { sendEmail } = require('../utils/mailer');
const { buildEmailTemplate } = require('../services/emailTemplateService');
const { insertNotifikasi } = require('../services/notificationService');
const { insertActivityLog } = require('../utils/activityLogger');

// Helper daftar kolom aman (Tanpa kolom password)
const SAFE_USER_COLUMNS = `
  id_user, id_desa, nik, nama, email, no_hp, telepon, 
  dusun, nomor_rt, nomor_rw, alamat_lengkap, 
  role, status, catatan_admin, created_at, updated_at
`;

// GET /api/users/all-system (Khusus Super Admin: Ambil Seluruh User termasuk Admin Desa & Super Admin)
const getAllSystemUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ${SAFE_USER_COLUMNS} FROM users ORDER BY FIELD(UPPER(role), 'SUPER_ADMIN', 'ADMIN_DESA', 'ADMIN', 'WARGA'), created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/users/:id/reset-password (Khusus Super Admin: Reset Password dengan Bcrypt Hash + Invalidasi Sesi)
const adminResetPassword = async (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;

  if (!new_password || new_password.trim().length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Kata sandi baru minimal 6 karakter!'
    });
  }

  try {
    const [rows] = await db.query(
      'SELECT id_user, nik, nama, email, role, id_desa FROM users WHERE id_user = ? OR email = ? LIMIT 1',
      [id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Akun pengguna tidak ditemukan di database!' });
    }

    const targetUser = rows[0];
    const hashedPassword = await bcrypt.hash(new_password.trim(), 10);

    await db.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id_user = ?',
      [hashedPassword, targetUser.id_user]
    );

    // Invalidasi seluruh sesi aktif lama milik user yang di-reset
    await db.query('UPDATE user_sessions SET is_active = 0 WHERE id_user = ?', [targetUser.id_user]);

    // Catat ke Activity Log
    insertActivityLog({
      id_user: req.user?.id_user || targetUser.id_user,
      nik: targetUser.nik,
      id_desa: targetUser.id_desa || 'DESA-001',
      tipe_aktivitas: 'ADMIN_RESET_PASSWORD',
      deskripsi: `Super Admin melakukan reset password untuk akun ${targetUser.nama} (${targetUser.email}).`,
      ip_address: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      message: `Kata sandi untuk ${targetUser.nama} berhasil diperbarui dan dienkripsi Bcrypt!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/users
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ${SAFE_USER_COLUMNS} FROM users WHERE LOWER(role) = 'warga' OR role IS NULL ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/users/:id/status
const updateUserStatus = async (req, res) => {
  const { status, catatan_admin, catatan } = req.body;
  const { id } = req.params;
  const notesAdmin = catatan_admin !== undefined ? catatan_admin : (catatan || null);

  try {
    const [userRows] = await db.query(
      'SELECT id_user, nik, nama, email, id_desa FROM users WHERE id_user = ? OR nik = ? LIMIT 1',
      [id, id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data user tidak ditemukan!' });
    }

    const user = userRows[0];

    try {
      await db.query(
        'UPDATE users SET status = ?, catatan_admin = ? WHERE id_user = ?',
        [status, notesAdmin, user.id_user]
      );
    } catch (colErr) {
      await db.query(
        'UPDATE users SET status = ? WHERE id_user = ?',
        [status, user.id_user]
      );
    }

    (async () => {
      try {
        const rawStatus = (status || '').toUpperCase().trim();
        const isApproved = rawStatus === 'ACTIVE' || rawStatus === 'APPROVED' || rawStatus === 'AKTIF';
        const isRejected = rawStatus === 'DITOLAK' || rawStatus === 'REJECTED';
        const isSuspended = rawStatus === 'SUSPENDED' || rawStatus === 'DIBEKUKAN';

        const statusLabel = isApproved ? 'DISETUJUI' : isRejected ? 'DITOLAK' : isSuspended ? 'DIBEKUKAN' : status.toUpperCase();

        let pesanText = `Status akun Anda telah diperbarui menjadi: ${statusLabel} oleh Admin Desa.`;
        if (isApproved) {
          pesanText = `Selamat! Akun Anda telah diverifikasi dan disetujui oleh Admin Desa. Anda kini dapat menggunakan seluruh layanan surat dan aspirasi.`;
        } else if (isRejected) {
          pesanText = `Mohon maaf, permohonan verifikasi akun Anda ditolak oleh Admin Desa.`;
          if (notesAdmin) pesanText += ` Alasan: ${notesAdmin}`;
        }

        if (user.nik) {
          await insertNotifikasi({
            nik: user.nik,
            id_desa: user.id_desa || 'DESA-001',
            tipe: 'USER',
            judul: `Status Verifikasi Akun: ${statusLabel}`,
            pesan: pesanText,
            target_cakupan: 'PERSONAL',
            link_url: 'profil'
          });
        }

        if (user.email) {
          const emailSubject = `[STATUS AKUN: ${statusLabel}] Verifikasi Akun SVARA Layanan Desa`;
          const emailContent = `
            <p>Halo <strong>${user.nama || 'Warga'}</strong>,</p>
            <p>Pemberitahuan resmi mengenai status permohonan verifikasi akun Anda di portal layanan digital SVARA:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; width: 120px;">NIK Terdaftar</td>
                  <td style="padding: 4px 0; font-weight: 700; font-family: monospace; color: #0f172a;">${user.nik || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Nama Pemilik</td>
                  <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${user.nama || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Status Terbaru</td>
                  <td style="padding: 4px 0;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; background-color: ${isApproved ? '#dcfce7; color: #15803d;' : isRejected ? '#fee2e2; color: #b91c1c;' : '#fef3c7; color: #b45309;'}">
                      ${statusLabel}
                    </span>
                  </td>
                </tr>
                ${notesAdmin ? `
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Catatan Petugas</td>
                    <td style="padding: 6px 0; color: #b91c1c; font-weight: 500;">${notesAdmin}</td>
                  </tr>
                ` : ''}
              </table>
            </div>
            ${isApproved ? `
              <p style="font-size: 13px; color: #166534;">Akun Anda sekarang telah aktif sepenuhnya! Anda dapat melakukan login ke portal web SVARA dan menggunakan layanan pengajuan surat serta penyampaian aspirasi warga.</p>
            ` : isRejected ? `
              <p style="font-size: 13px; color: #991b1b;">Jika Anda merasa terdapat kekeliruan data, silakan periksa kembali berkas identitas Anda atau datang langsung ke kantor desa untuk proses verifikasi manual.</p>
            ` : ''}
          `;
          const htmlBody = buildEmailTemplate({
            title: `Pembaruan Status Verifikasi Akun`,
            badge: `STATUS: ${statusLabel}`,
            contentHtml: emailContent,
            footerNote: `NIK: ${user.nik || '-'} • Desa: ${user.id_desa || 'DESA-001'}`
          });

          await sendEmail(user.email, emailSubject, htmlBody);
        }
      } catch (asyncErr) {
        console.error('[Update Status User Async Error]:', asyncErr.message);
      }
    })();

    res.json({ success: true, message: 'Status user berhasil diperbarui!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM users WHERE id_user = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data user tidak ditemukan!' });
    }

    res.json({ success: true, message: 'Data user berhasil dihapus secara permanen!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/users/:id/profile
const updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const { email, no_hp, dusun, alamat_lengkap } = req.body;

  try {
    const [rows] = await db.query(
      'SELECT id_user, nik, id_desa FROM users WHERE id_user = ? OR id_user = ? OR nik = ? LIMIT 1',
      [id, req.body.id_user || id, req.body.nik || id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const user = rows[0];

    await db.query(
      `UPDATE users 
       SET email = ?, no_hp = ?, telepon = ?, dusun = ?, alamat_lengkap = ?, updated_at = NOW() 
       WHERE id_user = ?`,
      [email, no_hp, no_hp, dusun, alamat_lengkap, user.id_user]
    );

    insertActivityLog({
      id_user: user.id_user,
      nik: user.nik,
      id_desa: user.id_desa || 'DESA-001',
      tipe_aktivitas: 'UPDATE_PROFIL',
      deskripsi: 'Memperbarui data profil kependudukan dan kontak.',
      ip_address: req.ip || '127.0.0.1'
    });

    const [updatedRows] = await db.query(
      `SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id_user = ?`,
      [user.id_user]
    );
    res.json({ success: true, message: 'Profil berhasil diperbarui.', data: updatedRows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/users/:id/preferences
const updateNotificationPreferences = async (req, res) => {
  const { id } = req.params;
  const { notif_email_surat, notif_pengumuman } = req.body;

  try {
    const [rows] = await db.query(
      'SELECT id_user, nik, id_desa FROM users WHERE id_user = ? OR nik = ? LIMIT 1',
      [id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const user = rows[0];

    await db.query(
      `UPDATE users 
       SET notif_email_surat = ?, notif_pengumuman = ? 
       WHERE id_user = ?`,
      [notif_email_surat ? 1 : 0, notif_pengumuman ? 1 : 0, user.id_user]
    );

    res.json({
      success: true,
      message: 'Preferensi notifikasi berhasil disimpan.',
      data: {
        notif_email_surat: Boolean(notif_email_surat),
        notif_pengumuman: Boolean(notif_pengumuman)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/users/:id/activity
const getActivityLog = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT * FROM activity_logs 
       WHERE id_user = ? OR nik = ? 
       ORDER BY created_at DESC LIMIT 50`,
      [id, id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/users/:id/sessions
const getUserSessions = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT * FROM user_sessions 
       WHERE id_user = ? OR id_user = (SELECT id_user FROM users WHERE nik = ? LIMIT 1) 
       ORDER BY login_at DESC LIMIT 10`,
      [id, id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAllSystemUsers,
  adminResetPassword,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  updateUserProfile,
  updateNotificationPreferences,
  getActivityLog,
  getUserSessions
};