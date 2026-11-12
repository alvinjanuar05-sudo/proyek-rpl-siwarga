import React, { useState } from 'react';
import { useKecamatan } from '../../context/KecamatanContext';

interface TabDashboardGlobalProps {
  adminList?: any[];
}

export const TabDashboardGlobal: React.FC<TabDashboardGlobalProps> = ({ adminList = [] }) => {
  const { dataKecamatan } = useKecamatan();
  const [hoveredDesa, setHoveredDesa] = useState<{ nama: string; total: number } | null>(null);

  const daftarDesa = dataKecamatan?.desa_kelurahan || [];
  const totalDesa = daftarDesa.length;

  let totalRW = 0;
  let totalRT = 0;
  let totalPengajuanSurat = 0;

  // METRIK STATUS SURAT UNTUK CHART DONUT
  let totalPending = 0;
  let totalApproved = 0;
  let totalRejected = 0;

  // DATA UNTUK BAR CHART DESA
  const dataPengajuanPerDesa = daftarDesa.map((desa: any) => {
    const list = desa.daftar_pengajuan && Array.isArray(desa.daftar_pengajuan) ? desa.daftar_pengajuan : [];
    
    list.forEach((item: any) => {
      const st = (item.status || 'PENDING').toUpperCase();
      if (st === 'APPROVED' || st === 'SELESAI') totalApproved++;
      else if (st === 'REJECTED' || st === 'DITOLAK') totalRejected++;
      else totalPending++;
    });

    return {
      nama: desa.nama_desa_kelurahan || desa.nama || 'Desa',
      total: list.length,
    };
  });

  daftarDesa.forEach((desa: any) => {
    if (desa.rw && Array.isArray(desa.rw)) {
      totalRW += desa.rw.length;
      desa.rw.forEach((rwItem: any) => {
        if (rwItem.rt && Array.isArray(rwItem.rt)) {
          totalRT += rwItem.rt.length;
        }
      });
    }
    if (desa.daftar_pengajuan && Array.isArray(desa.daftar_pengajuan)) {
      totalPengajuanSurat += desa.daftar_pengajuan.length;
    }
  });

  // PENGAMAN DENGAN OPTIONAL CHAINING SUPAYA GAK CRASH
  const safeAdminList = Array.isArray(adminList) ? adminList : [];
  const totalAdminDesa = safeAdminList.filter((u) => u?.role === 'ADMIN_DESA' && u?.status === 'Active').length;
  const totalWarga = safeAdminList.filter((u) => u?.role === 'WARGA').length;
  const pendingAdmins = safeAdminList.filter((u) => u?.status === 'Suspended' || u?.status === 'Pending');

  // HITUNG PERSENTASE STATUS UNTUK DONUT CHART
  const safeTotalStatus = totalPengajuanSurat || 1;
  const pctPending = Math.round((totalPending / safeTotalStatus) * 100);
  const pctApproved = Math.round((totalApproved / safeTotalStatus) * 100);
  const pctRejected = 100 - pctPending - pctApproved;

  // MENCARI MAKSIMUM UNTUK SKALA BAR CHART
  const maxPengajuan = Math.max(...dataPengajuanPerDesa.map((d: any) => d.total), 5);

  return (
    <div className="space-y-6 select-none font-['Product_Sans',sans-serif]">
      {/* 4 CARD STATISTIK UTAMA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Struktur Wilayah</span>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">{totalDesa} Desa</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {totalRW > 0 || totalRT > 0 ? `${totalRW} RW • ${totalRT} RT Terdaftar` : 'Belum ada data RT/RW'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Kependudukan</span>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">{totalWarga} Warga</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{totalAdminDesa} Akun Admin Desa Aktif</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pengajuan Surat</span>
          <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">{totalPengajuanSurat} Berkas</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Masuk via Sistem Desa</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition-colors">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Status Node System</span>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-600 mt-1">ONLINE</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Terhubung ke Database Local</p>
        </div>
      </div>

      {/* SECTION GRAFIK INTERAKTIFF MONITORING */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BAR CHART: VOLUME PENGAJUAN PER DESA */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                📊 Volume Pengajuan Surat per Desa
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Monitoring perbandingan aktivitas berkas antar wilayah</p>
            </div>
            {hoveredDesa && (
              <span className="text-xs px-2.5 py-1 bg-neutral-900 text-white font-medium rounded-lg shadow-xs transition-all">
                {hoveredDesa.nama}: <b>{hoveredDesa.total} Berkas</b>
              </span>
            )}
          </div>

          <div className="h-48 flex items-end gap-4 pt-6 pb-2 px-2 border-b border-slate-100 relative">
            {dataPengajuanPerDesa.map((d: any, idx: number) => {
              const heightPct = Math.max((d.total / maxPengajuan) * 100, 8);
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                  onMouseEnter={() => setHoveredDesa(d)}
                  onMouseLeave={() => setHoveredDesa(null)}
                >
                  <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.total}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[48px] bg-neutral-800 group-hover:bg-neutral-900 rounded-t-xl transition-all duration-300 relative shadow-2xs overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 truncate w-full text-center">
                    {d.nama}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* DONUT CHART: DISTRIBUSI STATUS SURAT */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              🍩 Distribusi Status Berkas
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Persentase berkas dalam sistem</p>
          </div>

          <div className="flex items-center justify-center relative my-2">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.8"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* PENDING / MENUNGGU (AMBER) */}
              <path
                className="text-amber-500 transition-all duration-500"
                strokeDasharray={`${pctPending}, 100`}
                strokeWidth="3.8"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-extrabold text-slate-900">{totalPengajuanSurat}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Berkas</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600 font-medium">Menunggu Verifikasi</span>
              </div>
              <span className="font-bold text-slate-900">{totalPending} ({pctPending}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 font-medium">Disetujui / Selesai</span>
              </div>
              <span className="font-bold text-slate-900">{totalApproved} ({pctApproved}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-slate-600 font-medium">Ditolak</span>
              </div>
              <span className="font-bold text-slate-900">{totalRejected} ({pctRejected}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER SECTION: AKTIVITAS PERLU PERHATIAN & STATUS KEAMANAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
            ⚠️ Aktivitas Perlu Perhatian ({pendingAdmins.length})
          </h3>
          <div className="space-y-2 text-xs">
            {pendingAdmins.length > 0 ? (
              pendingAdmins.map((adm: any) => (
                <div key={adm.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <span>Akun {adm.nama} ({adm.desa})</span>
                  <span className="font-bold text-amber-800">Status: {adm.status}</span>
                </div>
              ))
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                Tidak ada permohonan atau akun yang ditangguhkan.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">🛡️ Status Keamanan System</h3>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <span>Penyimpanan LocalStorage & Context</span>
              <span className="font-bold text-emerald-800">Aktif & Sinkron</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span>Sesi Super Admin</span>
              <span className="font-bold text-slate-700">Authenticated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};