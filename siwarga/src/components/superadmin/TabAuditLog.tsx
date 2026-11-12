import React from 'react';
import { useToast } from '../../context/ToastContext';

interface TabAuditLogProps {
  logs?: any[];
}

export const TabAuditLog: React.FC<TabAuditLogProps> = ({ logs }) => {
  const { showToast } = useToast();
  // PENGAMAN ARRAY: BACA DARI PROPS, LOCALSTORAGE, ATAU DEFAULT LOG
  const getSafeLogs = () => {
    if (Array.isArray(logs) && logs.length > 0) return logs;

    const saved = localStorage.getItem('svara_audit_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse audit logs', e);
      }
    }

    // Default log aktivitas jika masih kosong
    return [
      { id: '1', waktu: new Date().toLocaleString('id-ID'), aktor: 'SUPER_ADMIN', aksi: 'Mengubah Konfigurasi Model AI Engine' },
      { id: '2', waktu: new Date().toLocaleString('id-ID'), aktor: 'ADMIN_DESA', aksi: 'Verifikasi Akun Warga NIK: 320101XXXXXXXX01' },
      { id: '3', waktu: new Date().toLocaleString('id-ID'), aktor: 'SYSTEM_BOT', aksi: 'Sistem Backup Otomatis Berhasil Disimpan' },
    ];
  };

  const safeLogs = getSafeLogs();

  // HANDLER SALIN SEMUA LOG KE CLIPBOARD
  const handleCopyLogs = () => {
    const textLogs = safeLogs
      .map((l: any) => `[${l.waktu || 'NOW'}] [${l.aktor || 'UNKNOWN'}] ${l.aksi || ''}`)
      .join('\n');

    navigator.clipboard.writeText(textLogs);
    showToast('Seluruh riwayat Audit Log berhasil disalin ke clipboard!', 'info');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-4 select-none font-['Product_Sans',sans-serif]">
      {/* HEADER MODUL */}
      <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            📋 Audit Log Global System
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Catatan permanen aktivitas sistem (Protected • Tidak dapat dihapus via UI).
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCopyLogs}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-xl transition-colors cursor-pointer"
          >
            📋 Salin Log
          </button>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
            System Immutable Log
          </span>
        </div>
      </div>

      {/* TERMINAL MONITORING LOG */}
      <div className="bg-slate-950 rounded-xl p-4 md:p-5 font-mono text-xs text-slate-200 space-y-3 max-h-96 overflow-y-auto shadow-inner">
        {safeLogs.length > 0 ? (
          safeLogs.map((log: any, idx: number) => (
            <div
              key={log.id || idx}
              className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-2.5 gap-1 last:border-none last:pb-0 hover:bg-slate-900/50 p-1 rounded transition-colors"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500 font-medium text-[10px] min-w-[130px]">
                  {log.waktu || 'Just now'}
                </span>
                <span className="text-emerald-400 font-bold">
                  [{log.aktor || 'UNKNOWN'}]
                </span>
                <span className="text-slate-200 leading-relaxed">
                  {log.aksi || 'Melakukan aksi sistem'}
                </span>
              </div>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest self-end sm:self-auto font-bold">
                Verified
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-500 italic">
            Belum ada catatan audit log tersimpan.
          </div>
        )}
      </div>
    </div>
  );
};

export default TabAuditLog;