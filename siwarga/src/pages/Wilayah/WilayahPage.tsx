import React, { useState } from 'react';
import { MapPin, Users, Phone, Search, Building } from 'lucide-react';
import Navbar from '../../components/navbar/Navbar';
import Footer from '../../layouts/Footer';
import kecamatanData from '../../data/kecamatanData.json';

export const WilayahPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Ambil daftar desa/kelurahan dari kecamatanData.json
  const daftarDesa: any[] = Array.isArray((kecamatanData as any).desa_kelurahan)
    ? (kecamatanData as any).desa_kelurahan
    : [];

  const [selectedDesaIndex, setSelectedDesaIndex] = useState(0);
  const activeDesa = daftarDesa[selectedDesaIndex] || daftarDesa[0] || {};
  const daftarRw: any[] = Array.isArray(activeDesa.rw) ? activeDesa.rw : [];

  const filteredRw = daftarRw.filter((rw) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchRw =
      String(rw.nomor_rw || '').toLowerCase().includes(q) ||
      String(rw.ketua_rw || '').toLowerCase().includes(q);
    const matchRt = Array.isArray(rw.rt)
      ? rw.rt.some(
          (rt: any) =>
            String(rt.nomor_rt || '').toLowerCase().includes(q) ||
            String(rt.ketua_rt || '').toLowerCase().includes(q)
        )
      : false;
    return matchRw || matchRt;
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 font-['Product_Sans',sans-serif]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16 md:py-24 space-y-14">
        {/* HEADER */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3.5 py-1 text-[11px] font-medium text-white">
              <MapPin className="h-3.5 w-3.5" />
              DIREKTORI WILAYAH & PAMONG
            </span>
            <h1 className="text-3xl font-medium tracking-tight text-neutral-900 sm:text-5xl">
              Struktur Rukun Warga & Rukun Tetangga
            </h1>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Direktori pengurus RT dan RW beserta kontak resmi layanan kewilayahan untuk memudahkan koordinasi warga di tingkat lingkungan.
            </p>
          </div>

          {/* Search Ketua RT/RW */}
          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari RT, RW, atau nama ketua..."
              className="w-full rounded-2xl border border-black/15 bg-white pl-10 pr-4 py-2.5 text-xs outline-none focus:border-neutral-900"
            />
          </div>
        </section>

        {/* PILL SELECTOR DESA */}
        {daftarDesa.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {daftarDesa.map((desa: any, idx: number) => (
              <button
                key={desa.id_desa || desa.nama_desa || idx}
                onClick={() => setSelectedDesaIndex(idx)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  selectedDesaIndex === idx
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white border border-black/10 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <Building className="h-3.5 w-3.5" />
                <span>{desa.nama_desa || `Desa ${idx + 1}`}</span>
              </button>
            ))}
          </div>
        )}

        {/* DAFTAR HIERARKI RW & RT */}
        <section className="space-y-8">
          {filteredRw.length > 0 ? (
            filteredRw.map((rw: any, idx: number) => (
              <div
                key={rw.nomor_rw || idx}
                className="rounded-[28px] border border-black/10 bg-white p-6 md:p-8 shadow-xs space-y-6"
              >
                {/* Header RW */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white font-bold text-sm">
                      {rw.nomor_rw || `RW 0${idx + 1}`}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        KETUA RUKUN WARGA
                      </span>
                      <h2 className="text-lg font-semibold text-neutral-900">
                        {rw.ketua_rw || 'Pengurus RW'}
                      </h2>
                    </div>
                  </div>

                  {rw.kontak && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{rw.kontak}</span>
                    </span>
                  )}
                </div>

                {/* Grid Kartu RT di bawah RW tersebut */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.isArray(rw.rt) && rw.rt.length > 0 ? (
                    rw.rt.map((rt: any, rtIdx: number) => (
                      <div
                        key={rt.nomor_rt || rtIdx}
                        className="rounded-2xl border border-black/5 bg-neutral-50 p-4 flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <span className="inline-block rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-neutral-700 border border-black/5">
                            {rt.nomor_rt || `RT 0${rtIdx + 1}`}
                          </span>
                          <p className="text-sm font-semibold text-neutral-900">
                            {rt.ketua_rt || 'Ketua RT'}
                          </p>
                          <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{rt.kontak || '-'}</span>
                          </p>
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-700 border border-black/5">
                          <Users className="h-4 w-4" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-neutral-400 italic">
                      Belum ada sub-data RT pada RW ini.
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-black/10 bg-white p-12 text-center text-xs text-neutral-500">
              Data pengurus RT/RW untuk wilayah tersebut tidak ditemukan.
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default WilayahPage;