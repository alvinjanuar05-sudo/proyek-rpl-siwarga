import React from 'react';

export interface StatusDetailData {
  type: 'surat' | 'aspirasi';
  id_tiket: string;
  nama_layanan: string;
  kategori?: string;
  status: string;
  tanggal_pengajuan?: string;
  email_warga?: string;
  posisi_antrean?: number;
  total_antrean?: number;
  estimasi_selesai?: string;
  catatan_desa?: string;
  nama_desa: string;
}

interface StatusCardProps {
  data: StatusDetailData;
  onAction?: (actionText: string) => void;
}

export const StatusCard: React.FC<StatusCardProps> = ({ data, onAction }) => {
  const isSurat = data.type === 'surat';
  const isKosong = data.status === 'KOSONG' || data.id_tiket === 'KOSONG';

  // Format Warna Badge Status
  const statusUpper = (data.status || '').toUpperCase();
  let badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
  let statusLabel = data.status || 'PENDING';

  if (isKosong) {
    badgeStyle = 'bg-gray-100 text-gray-600 border-gray-300';
    statusLabel = 'BELUM ADA RIWAYAT';
  } else if (statusUpper === 'APPROVED' || statusUpper === 'SELESAI') {
    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    statusLabel = 'SELESAI / DISETUJUI';
  } else if (statusUpper === 'REJECTED' || statusUpper === 'DITOLAK') {
    badgeStyle = 'bg-red-50 text-red-700 border-red-200';
    statusLabel = 'DITOLAK';
  } else if (statusUpper === 'PENDING' || statusUpper === 'MENUNGGU') {
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
    statusLabel = 'MENUNGGU VERIFIKASI';
  } else if (statusUpper === 'DIPROSES') {
    badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
    statusLabel = 'SEDANG DIPROSES';
  }

  // TAMPILAN KHUSUS JIKA BELUM ADA RIWAYAT PENGAJUAN / ASPIRASI
  if (isKosong) {
    return (
      <div className="w-full mt-3 bg-white border border-black/10 rounded-2xl p-4 shadow-xs font-['Product_Sans',sans-serif] space-y-3 select-none">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-md uppercase tracking-wider">
            📄 Informasi Layanan
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeStyle}`}>
            {statusLabel}
          </span>
        </div>

        <div className="text-center py-3 space-y-1">
          <h4 className="font-bold text-sm text-black">{data.nama_layanan}</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            {data.catatan_desa}
          </p>
        </div>

        {onAction && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => onAction('Menu Utama')}
              className="flex-1 py-2 px-3 bg-neutral-900 hover:bg-black rounded-xl text-xs font-bold text-white transition-colors text-center cursor-pointer shadow-2xs"
            >
              Ajukan Layanan Sekarang
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full mt-3 bg-white border border-black/10 rounded-2xl p-4 shadow-xs font-['Product_Sans',sans-serif] space-y-3 select-none">
      {/* HEADER CARD: BADGE KATEGORI & STATUS */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-md uppercase tracking-wider">
            {isSurat ? '📄 Layanan Surat' : '📢 Aspirasi Warga'}
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeStyle}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* BODY CARD: NAMA LAYANAN & NOMOR TIKET */}
      <div>
        <h4 className="font-bold text-sm text-black leading-tight">
          {data.nama_layanan}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-gray-500">No. Tiket:</span>
          <code className="text-[11px] font-mono font-bold bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-gray-200">
            #{data.id_tiket}
          </code>
        </div>
      </div>

      {/* INFORMASI DETAIL (METADATA) */}
      <div className="bg-neutral-50 rounded-xl p-3 border border-gray-100 space-y-1.5 text-xs">
        {data.kategori && (
          <div className="flex justify-between items-start text-gray-600">
            <span className="text-gray-400 shrink-0">Kategori</span>
            <span className="font-medium text-right text-black">{data.kategori}</span>
          </div>
        )}

        {isSurat && data.email_warga && (
          <div className="flex justify-between items-start text-gray-600">
            <span className="text-gray-400 shrink-0">Email Tujuan</span>
            <span className="font-mono text-[11px] text-right text-black">{data.email_warga}</span>
          </div>
        )}

        {data.tanggal_pengajuan && (
          <div className="flex justify-between items-start text-gray-600">
            <span className="text-gray-400 shrink-0">Tanggal Layanan</span>
            <span className="font-medium text-right text-black">{data.tanggal_pengajuan}</span>
          </div>
        )}

        <div className="flex justify-between items-start text-gray-600">
          <span className="text-gray-400 shrink-0">Lokasi Kantor</span>
          <span className="font-medium text-right text-black">Desa {data.nama_desa}</span>
        </div>
      </div>

      {/* POSISI ANTREAN (JIKA SURAT PENDING) */}
      {isSurat && (statusUpper === 'PENDING' || statusUpper === 'MENUNGGU' || statusUpper === 'DIPROSES') && data.posisi_antrean && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-xs space-y-1">
          <div className="flex items-center justify-between text-amber-900 font-semibold">
            <span>Posisi Antrean Berkasku</span>
            <span className="text-xs bg-amber-200/60 px-2 py-0.5 rounded-md font-mono">
              Urutan ke-{data.posisi_antrean} {data.total_antrean ? `dari ${data.total_antrean}` : ''}
            </span>
          </div>
          {data.estimasi_selesai && (
            <p className="text-[11px] text-amber-700">
              Estimasi Selesai: <span className="font-medium">{data.estimasi_selesai}</span>
            </p>
          )}
        </div>
      )}

      {/* TANGGAPAN / CATATAN DESA */}
      {data.catatan_desa && data.catatan_desa.trim() !== '' && (
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs space-y-1">
          <span className="text-[10.5px] font-bold text-blue-900 uppercase tracking-wider block">
            💬 Tanggapan Admin Desa
          </span>
          <p className="text-blue-900 italic font-medium leading-relaxed">
            "{data.catatan_desa}"
          </p>
        </div>
      )}

      {/* FOOTER QUICK ACTIONS (3 TOMBOL) */}
      {onAction && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => onAction('Menu Utama')}
            className="flex-1 min-w-[90px] py-1.5 px-2 bg-neutral-800 hover:bg-neutral-900 border border-neutral-800 rounded-full text-[10.5px] font-medium text-white transition-colors shadow-2xs text-center cursor-pointer"
          >
            Menu Utama
          </button>
          <button
            type="button"
            onClick={() => onAction('Informasi Status & Antrean Surat')}
            className="flex-1 min-w-[90px] py-1.5 px-2 bg-white hover:bg-neutral-100 border border-gray-300 rounded-full text-[10.5px] font-medium text-neutral-800 transition-colors shadow-2xs text-center cursor-pointer"
          >
            Cek Tiket Lain
          </button>
          <button
            type="button"
            onClick={() => onAction('batal')}
            className="flex-1 min-w-[80px] py-1.5 px-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full text-[10.5px] font-medium text-red-700 transition-colors shadow-2xs text-center cursor-pointer"
          >
            Reset Chat
          </button>
        </div>
      )}
    </div>
  );
};

export default StatusCard;