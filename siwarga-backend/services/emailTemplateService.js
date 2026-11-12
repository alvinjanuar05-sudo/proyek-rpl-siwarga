/**
 * Helper Pembuat Template Email HTML Modern & Anti-Spam untuk SVARA Layanan Desa
 */
const buildEmailTemplate = ({ title, badge, contentHtml, footerNote, namaDesa, alamatKantor }) => {
  const desaName = namaDesa || 'Pemerintah Desa';
  const alamat = alamatKantor || 'Kantor Desa / Kelurahan Resmi';

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
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">${desaName}</p>
        <p style="margin: 0 0 10px 0; font-size: 10.5px; color: #94a3b8;">${alamat}</p>
        <div style="padding-top: 8px; border-top: 1px stroke #e2e8f0; font-size: 10px; color: #94a3b8;">
          Email ini dikirimkan secara otomatis oleh Sistem SVARA Layanan Desa.<br/>
          Jika tidak ingin menerima notifikasi email lagi, Anda dapat mengatur preferensi melalui portal warga.
        </div>
      </div>
    </div>
  `;
};

module.exports = {
  buildEmailTemplate
};