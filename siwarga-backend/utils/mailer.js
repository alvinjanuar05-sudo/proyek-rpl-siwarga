const nodemailer = require('nodemailer');
require('dotenv').config();

// Helper sederhana untuk mencabut tag HTML menjadi Plain Text (Fallback Anti-Spam)
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Konfigurasi Transporter Nodemailer (Fleksibel untuk Gmail Relay maupun Custom SMTP Domain)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true untuk port 465, false untuk 587/25
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Helper Universal Pengirim Email Anti-Spam (Mendukung Sending Individual, Fallback Text, & Compliance Headers)
 * @param {string|string[]} to - Email penerima (string tunggal atau array)
 * @param {string} subject - Subjek/Judul Email
 * @param {string} htmlContent - Isi Email dalam format HTML
 * @param {Array<{filename: string, path: string}>} [attachments=[]] - Daftar file lampiran (opsional)
 */
const sendEmail = async (to, subject, htmlContent, attachments = []) => {
  try {
    if (!to || (Array.isArray(to) && to.length === 0)) {
      console.warn('[Mailer] Email tujuan kosong, pengiriman dibatalkan.');
      return false;
    }

    const plainText = stripHtml(htmlContent);
    const senderEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const senderName = process.env.SMTP_FROM_NAME || 'Layanan Desa SiWarga';

    // Format lampiran jika ada
    const formattedAttachments = (attachments && Array.isArray(attachments) && attachments.length > 0)
      ? attachments.map((att) => ({ filename: att.filename, path: att.path }))
      : [];

    // Jika penerima adalah Array (Banyak Warga), kirimkan secara individual (Looping Batch)
    if (Array.isArray(to)) {
      const recipientList = [...new Set(to.map(e => String(e).trim()).filter(Boolean))]; // Deduplikasi
      
      console.log(`[Mailer] Memulai pengiriman email individual ke ${recipientList.length} penerima...`);

      const sendPromises = recipientList.map((singleEmail) => {
        const mailOptions = {
          from: `"${senderName}" <${senderEmail}>`,
          to: singleEmail,
          replyTo: process.env.SMTP_REPLY_TO || senderEmail,
          subject: subject,
          text: plainText,
          html: htmlContent,
          attachments: formattedAttachments,
          headers: {
            'X-Priority': '3',
            'X-MSMail-Priority': 'Normal',
            'Importance': 'Normal',
            'Precedence': 'bulk',
            'List-Unsubscribe': `<mailto:${senderEmail}?subject=unsubscribe>`,
          },
        };
        return transporter.sendMail(mailOptions);
      });

      const results = await Promise.allSettled(sendPromises);
      const successfulCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;

      console.log(`[Mailer] Selesai pengiriman broadcast! Sukses: ${successfulCount}, Gagal: ${failedCount}`);
      return successfulCount > 0;
    }

    // Jika penerima Tunggal (Single Receiver)
    const singleMailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: String(to).trim(),
      replyTo: process.env.SMTP_REPLY_TO || senderEmail,
      subject: subject,
      text: plainText,
      html: htmlContent,
      attachments: formattedAttachments,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal',
        'List-Unsubscribe': `<mailto:${senderEmail}?subject=unsubscribe>`,
      },
    };

    const info = await transporter.sendMail(singleMailOptions);
    console.log('[Mailer] Email tunggal berhasil terkirim ke:', to, '| Message ID:', info.messageId);
    return true;

  } catch (error) {
    console.error('[Mailer] Gagal mengirim email:', error.message);
    return false;
  }
};

module.exports = { sendEmail };