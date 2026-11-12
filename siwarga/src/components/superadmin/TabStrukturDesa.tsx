import React, { useState } from 'react';
import { useKecamatan } from '../../context/KecamatanContext';

export const TabStrukturDesa: React.FC = () => {
  const { dataKecamatan } = useKecamatan();
  const daftarDesa = dataKecamatan?.desa_kelurahan || [];
  
  // State untuk memilih desa yang sedang dipantau oleh Super Admin
  const [selectedDesaIndex, setSelectedDesaIndex] = useState<number>(0);

  const desaAktif = daftarDesa[selectedDesaIndex] || {
    nama_desa_kelurahan: 'Desa Sukamaju',
    nama_kepala_desa_lurah: 'H. Ahmad Subagja, S.Sos',
    rw: []
  };

  const daftarRW = desaAktif.rw || [];
  let totalRT = 0;
  daftarRW.forEach((rw: any) => {
    if (rw.rt && Array.isArray(rw.rt)) {
      totalRT += rw.rt.length;
    }
  });

  // Hitung total akumulasi seluruh kecamatan
  const totalDesaCount = daftarDesa.length || 1;
  let totalRWGlobal = 0;
  let totalRTGlobal = 0;

  daftarDesa.forEach((d: any) => {
    const rws = d.rw || [];
    totalRWGlobal += rws.length;
    rws.forEach((rw: any) => {
      if (rw.rt && Array.isArray(rw.rt)) {
        totalRTGlobal += rw.rt.length;
      }
    });
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 select-none font-['Product_Sans',sans-serif]">
      {/* HEADER SECTION */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            🏘️ Monitoring Wilayah Operasional Desa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Peta hirarki rukun warga (RW) & rukun tetangga (RT) terintegrasi sistem SVARA.
          </p>
        </div>

        {/* SELECTOR DESA UNTUK SUPER ADMIN */}
        {daftarDesa.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">Pilih Desa:</label>
            <select
              value={selectedDesaIndex}
              onChange={(e) => setSelectedDesaIndex(Number(e.target.value))}
              className="rounded-xl border border-slate-300 p-2 text-xs font-bold bg-slate-50 outline-none focus:border-slate-800"
            >
              {daftarDesa.map((d: any, idx: number) => (
                <option key={idx} value={idx}>
                  {d.nama_desa_kelurahan || d.nama || `Desa ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* STATISTIK AKUMULASI GLOBAL KECAMATAN */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-0.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Desa Node</span>
          <p className="text-lg font-bold">{totalDesaCount} Desa</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Akumulasi RW</span>
          <p className="text-lg font-bold text-slate-900">{totalRWGlobal} RW</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Akumulasi RT</span>
          <p className="text-lg font-bold text-slate-900">{totalRTGlobal} RT</p>
        </div>
      </div>

      {/* DETAIL RINGKASAN DESA TERPILIH */}
      <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/80 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Wilayah Terpilih
            </span>
            <h3 className="font-bold text-slate-900 text-lg">
              {desaAktif.nama_desa_kelurahan || desaAktif.nama || 'Desa Sukamaju'}
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Kepala Desa:{' '}
              <span className="font-semibold text-slate-900">
                {desaAktif.nama_kepala_desa_lurah || desaAktif.kades || 'Belum Diisi'}
              </span>
            </p>
          </div>
          <div className="text-right text-xs">
            <span className="font-bold text-slate-900 text-sm block">
              {daftarRW.length} RW / {totalRT} RT
            </span>
            <span className="text-slate-400 text-[10px]">Cakupan Desa Ini</span>
          </div>
        </div>
      </div>

      {/* MONITORING DAFTAR RW DAN RT */}
      <div className="space-y-3">
        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
          Hirarki RW & RT Terdaftar
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {daftarRW.length > 0 ? (
            daftarRW.map((rw: any, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={rw.foto || 'https://placehold.co/100'}
                    alt="RW"
                    className="w-9 h-9 rounded-full object-cover border border-slate-300"
                  />
                  <div>
                    <p className="font-bold text-slate-900">
                      RW {rw.nomor || `0${idx + 1}`}
                    </p>
                    <p className="text-slate-600 text-[11px] font-medium">
                      {rw.ketua || 'Belum Diisi'}
                    </p>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Kontak: {rw.kontak || '-'}</span>
                  <span className="font-bold text-slate-700">
                    {rw.rt ? rw.rt.length : 0} RT
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Belum ada data RW & RT terdaftar di desa ini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};