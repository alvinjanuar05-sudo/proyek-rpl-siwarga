import React, { useState } from 'react';
import { useKecamatan } from '../../context/KecamatanContext';
import { 
  Globe, 
  Building2, 
  Home, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Clock, 
  MapPin, 
  Pin, 
  Maximize2, 
  X, 
  FileImage,
  Megaphone
} from 'lucide-react';

interface PengumumanCardProps {
  currentDesa: any;
  userRtRw?: { rt?: string; rw?: string };
}

export const PengumumanCard: React.FC<PengumumanCardProps> = ({ currentDesa, userRtRw }) => {
  const { dataKecamatan } = useKecamatan();

  const namaDesa = currentDesa?.nama_desa_kelurahan || currentDesa?.nama || 'Sukamaju';
  const namaKecamatan = dataKecamatan?.nama_kecamatan || currentDesa?.nama_kecamatan || 'Astanajapura';
  const namaKabupaten = currentDesa?.nama_kabupaten || dataKecamatan?.nama_kabupaten || 'Kabupaten Cirebon';

  // FIX UTAMA: TARIK DATA TEPAT DARI 'pengumuman_desa' MILIK dataKecamatan & LOCALSTORAGE
  const storedKec = JSON.parse(localStorage.getItem('svara_kecamatan_data') || 'null') ||
                    JSON.parse(localStorage.getItem('kecamatan_app_data') || '{}');

  const rawList: any[] =
    dataKecamatan?.pengumuman_desa?.length > 0
      ? dataKecamatan.pengumuman_desa
      : storedKec?.pengumuman_desa?.length > 0
      ? storedKec.pengumuman_desa
      : currentDesa?.pengumuman_desa ||
        currentDesa?.pengumuman ||
        [];

  // FILTER PENGUMUMAN BERDASARKAN DESA
  const pengumumanDesaIni = rawList.filter((item: any) => {
    if (!item?.desa) return true;
    const itemDesa = item.desa.toLowerCase().replace(/desa|kelurahan/g, '').trim();
    const targetDesa = namaDesa.toLowerCase().replace(/desa|kelurahan/g, '').trim();
    return itemDesa === '' || itemDesa.includes(targetDesa) || targetDesa.includes(itemDesa);
  });

  // FILTER SCOPING RT/RW (DILONGGARKAN AGAR POSTINGAN SELALU MUNCUL)
  const listPengumuman = pengumumanDesaIni.filter((item: any) => {
    if (!item?.target_cakupan || item.target_cakupan === 'GLOBAL') {
      return true;
    }

    if (!userRtRw) {
      return true;
    }

    const userRtNo = String(userRtRw.rt || '').padStart(2, '0');
    const userRwNo = String(userRtRw.rw || '').padStart(2, '0');
    const targetRwNo = String(item.target_rw || '').padStart(2, '0');
    const targetRtNo = String(item.target_rt || '').padStart(2, '0');

    if (item.target_cakupan === 'RW') {
      return !targetRwNo || userRwNo === targetRwNo;
    }

    if (item.target_cakupan === 'RTRW') {
      return (!targetRwNo || userRwNo === targetRwNo) && (!targetRtNo || userRtNo === targetRtNo);
    }

    return true;
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [modalFoto, setModalFoto] = useState<string | null>(null);

  const toggleAccordion = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-black/10 shadow-xs overflow-hidden my-3 font-['Product_Sans',sans-serif] text-slate-900 select-none">
      {/* HEADER BROSUR PENGUMUMAN FORMAL */}
      <div className="bg-white px-4 py-3 border-b border-black/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={dataKecamatan?.logo_kabupaten || 'https://placehold.co/43x45'}
            alt="Logo Kabupaten"
            className="h-8 w-8 object-contain p-0.5 border border-black/10 rounded-lg"
          />
          <div>
            <h3 className="text-xs font-bold tracking-wide text-slate-900 uppercase">
              Pemerintah Desa {namaDesa}
            </h3>
            <p className="text-[10px] text-slate-500">
              Kec. {namaKecamatan} • {namaKabupaten}
            </p>
          </div>
        </div>

        {/* COUNTER PENGUMUMAN AKTIF */}
        {listPengumuman.length > 0 && (
          <div className="bg-slate-100 px-2.5 py-1 rounded-full border border-black/10 text-[10px] font-mono font-bold text-slate-700 flex items-center gap-1">
            <Megaphone className="w-3 h-3 text-slate-600" />
            {listPengumuman.length} Pengumuman
          </div>
        )}
      </div>

      {/* KONTEN ARTIKEL & POSTER (ACCORDION LIST) */}
      {listPengumuman.length === 0 ? (
        <div className="p-5 text-center py-8 space-y-1">
          <p className="text-xs font-bold text-slate-700">Belum Ada Pengumuman Aktif</p>
          <p className="text-[11px] text-slate-400">
            Pemerintah Desa {namaDesa} belum menerbitkan agenda atau informasi publik baru.
          </p>
        </div>
      ) : (
        <div className="p-3 space-y-2 max-h-[540px] overflow-y-auto">
          {listPengumuman.map((item: any, idx: number) => {
            const isExpanded = expandedIndex === idx;
            const imgPamflet = item.foto || item.gambar || item.pamflet || item.poster || '';
            const tanggalInfo = item.tanggal_info || item.tanggal_kegiatan || item.tanggal || 'Sesuai Jadwal';
            const jamInfo = item.jam_info || item.waktu || 'Jam Operasional Kantor';
            const lokasi = item.lokasi || item.tempat || `Balai Desa ${namaDesa}`;
            const tanggalRilis = item.tanggal_rilis || item.tanggal_publish || '';

            const targetRwFmt = String(item.target_rw || '01').padStart(2, '0');
            const targetRtFmt = String(item.target_rt || '01').padStart(2, '0');

            return (
              <div
                key={item.id_pengumuman || idx}
                className="rounded-xl border border-black/10 overflow-hidden bg-white transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  className={`w-full p-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isExpanded ? 'bg-slate-50 border-b border-black/10' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-slate-900 text-white text-[8.5px] font-bold px-2 py-0.5 rounded-full">
                        {item.kategori || 'Kegiatan Warga'}
                      </span>

                      <span className="bg-emerald-100 text-emerald-900 text-[8.5px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 font-mono flex items-center gap-1">
                        {item.target_cakupan === 'GLOBAL' || !item.target_cakupan ? (
                          <><Globe className="w-2.5 h-2.5 text-emerald-700" /> Desa</>
                        ) : item.target_cakupan === 'RW' ? (
                          <><Building2 className="w-2.5 h-2.5 text-emerald-700" /> RW {targetRwFmt}</>
                        ) : (
                          <><Home className="w-2.5 h-2.5 text-emerald-700" /> RT {targetRtFmt}/RW {targetRwFmt}</>
                        )}
                      </span>

                      {tanggalRilis && (
                        <span className="text-[9px] text-slate-400 font-mono">
                          • {tanggalRilis}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                      {item.judul || item.judul_pengumuman || 'Pengumuman Resmi Desa'}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-slate-600 text-[11px] font-bold bg-white px-2.5 py-1 rounded-lg border border-black/10">
                    <span>{isExpanded ? 'Tutup' : 'Detail'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-3.5 space-y-3 bg-white">
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                      {item.isi || item.deskripsi || item.isi_pengumuman || item.artikel || 'Tidak ada deskripsi rinci.'}
                    </p>

                    <div className="p-2.5 rounded-xl bg-slate-50 text-[10.5px] text-slate-700 space-y-1.5 border border-slate-200/70">
                      {item.mode_waktu === 'spesifik' || item.tanggal_kegiatan || item.tanggal_info ? (
                        <>
                          <p className="flex items-center gap-1.5 truncate">
                            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <strong className="font-semibold text-slate-900">Jadwal:</strong> {tanggalInfo}
                          </p>
                          <p className="flex items-center gap-1.5 truncate">
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <strong className="font-semibold text-slate-900">Waktu:</strong> {jamInfo}
                          </p>
                        </>
                      ) : (
                        <p className="flex items-center gap-1.5 truncate">
                          <Pin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <strong className="font-semibold text-slate-900">Pengumuman:</strong> Tanpa Batas Waktu
                        </p>
                      )}
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <strong className="font-semibold text-slate-900">Lokasi:</strong> {lokasi}
                      </p>
                    </div>

                    {imgPamflet ? (
                      <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-white group mt-2">
                        <img
                          src={imgPamflet}
                          alt="Poster Pengumuman"
                          className="w-full h-auto max-h-[400px] object-cover rounded-xl mx-auto block cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
                          onClick={() => setModalFoto(imgPamflet)}
                        />
                        <button
                          type="button"
                          onClick={() => setModalFoto(imgPamflet)}
                          className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-lg text-[10px] font-bold backdrop-blur-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Maximize2 className="w-3 h-3" /> Perbesar Poster
                        </button>
                      </div>
                    ) : (
                      <div className="w-full py-2.5 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center flex items-center justify-center gap-1.5 text-slate-400">
                        <FileImage className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">
                          Pamflet / Poster tidak dilampirkan
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER BROSUR FORMAL */}
      <div className="bg-white px-4 py-2 border-t border-black/10 text-center">
        <p className="text-[10px] text-slate-400 font-medium">
          Portal Informasi Resmi • Desa {namaDesa}
        </p>
      </div>

      {/* MODAL FULL RESOLUTION IMAGE PREVIEW */}
      {modalFoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs">
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl border border-slate-700">
            <button
              onClick={() => setModalFoto(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={modalFoto} 
              alt="Full Resolution Poster" 
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PengumumanCard;