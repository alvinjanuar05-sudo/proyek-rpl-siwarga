import React, { useState, useEffect } from 'react';
import { useKecamatan } from '../../context/KecamatanContext';
import { apiService } from '../../services/api';

interface AparaturLain {
  id: string;
  nama: string;
  jabatan: string;
  kontak: string;
  tupoksi: string;
  foto?: string;
}

interface AparaturCardProps {
  currentDesa: any;
  mode?: 'aparatur' | 'rtrw';
  targetPejabatId?: string;
  alamatWarga?: {
    nomor_rt?: string;
    nomor_rw?: string;
    rt_rw?: string;
    [key: string]: any;
  };
}

export const AparaturCard: React.FC<AparaturCardProps> = ({
  currentDesa,
  mode = 'aparatur',
  targetPejabatId = 'all',
  alamatWarga,
}) => {
  const { dataKecamatan } = useKecamatan();

  const namaDesa = currentDesa?.nama_desa_kelurahan || currentDesa?.nama || 'Sukamaju';
  const namaKecamatan = dataKecamatan?.nama_kecamatan || currentDesa?.nama_kecamatan || 'Astanajapura';
  const namaKabupaten = currentDesa?.nama_kabupaten || dataKecamatan?.nama_kabupaten || 'Kabupaten Cirebon';

  const kadesName = currentDesa?.nama_kepala_desa_lurah || currentDesa?.kades || 'H. Ahmad Subagja, S.Sos';
  const fotoKades = currentDesa?.foto_kades || currentDesa?.foto_kepala_desa || '';

  const sekdesName = currentDesa?.nama_sekdes || 'Dedi Kurniawan, S.IP';
  const fotoSekdes = currentDesa?.foto_sekdes || '';

  // 1. Ambil list aparatur dengan normalisasi nama field foto & id fleksibel
  const rawAparaturLain = currentDesa?.aparatur_lain || currentDesa?.aparatur || [];
  const listAparaturLain: AparaturLain[] = Array.isArray(rawAparaturLain)
    ? rawAparaturLain.map((item: any) => ({
        id: String(item.id || item.id_aparatur || item.id_desa_aparatur || ''),
        nama: item.nama || item.nama_aparatur || 'Aparatur Desa',
        jabatan: item.jabatan || item.jabatan_aparatur || 'Perangkat Desa',
        kontak: item.kontak || item.no_hp || item.telepon || '-',
        tupoksi: item.tupoksi || item.keterangan || '',
        // AMBIL FOTO DARI SEGALA KEMUNGKINAN FIELD API MYSQL
        foto: item.foto || item.foto_url || item.avatar || item.foto_aparatur || '',
      }))
    : [];

  const alamatKantor = currentDesa?.alamat_kantor || `Jl. Raya Desa ${namaDesa} No. 10`;
  const jamOperasional = currentDesa?.jam_operasional || 'Senin - Jumat (08:00 - 15:00 WIB)';
  const kontakKantor = currentDesa?.nomor_kontak || '0813-9876-5432';

  // 1. AMBIL DATA PROFILE WARGA (DARI PROPS ATAU LOCALSTORAGE USER)
  const userProfile = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  let rawUserRT = alamatWarga?.nomor_rt || userProfile?.nomor_rt || userProfile?.rt || userProfile?.alamat?.nomor_rt || '';
  let rawUserRW = alamatWarga?.nomor_rw || userProfile?.nomor_rw || userProfile?.rw || userProfile?.alamat?.nomor_rw || '';

  if (!rawUserRT || !rawUserRW) {
    const combinedStr = alamatWarga?.rt_rw || userProfile?.rt_rw || userProfile?.alamat_lengkap || '';
    if (combinedStr) {
      const rtMatch = combinedStr.match(/rt[\s.:]*(\d+)/i);
      const rwMatch = combinedStr.match(/rw[\s.:]*(\d+)/i);
      if (!rawUserRT && rtMatch) rawUserRT = rtMatch[1];
      if (!rawUserRW && rwMatch) rawUserRW = rwMatch[1];
    }
  }

  const targetRTDigits = String(rawUserRT || currentDesa?.nomor_rt || '01').replace(/\D/g, '');
  const targetRWDigits = String(rawUserRW || currentDesa?.nomor_rw || '01').replace(/\D/g, '');

  const displayRT = targetRTDigits ? targetRTDigits.padStart(2, '0') : '01';
  const displayRW = targetRWDigits ? targetRWDigits.padStart(2, '0') : '01';

  const rtNumPlain = String(parseInt(targetRTDigits || '1', 10));
  const rwNumPlain = String(parseInt(targetRWDigits || '1', 10));

  // 2. KONEKSI DATA KE TabRwRtDesa (LOCALSTORAGE, CONTEXT, & MYSQL API)
  const getDaftarRW = () => {
    if (Array.isArray(currentDesa?.rw) && currentDesa.rw.length > 0) {
      return currentDesa.rw;
    }
    if (Array.isArray(currentDesa?.daftar_rw) && currentDesa.daftar_rw.length > 0) {
      return currentDesa.daftar_rw;
    }
    try {
      const stored = JSON.parse(localStorage.getItem('svara_kecamatan_data') || 'null') ||
                     JSON.parse(localStorage.getItem('kecamatan_app_data') || 'null');
      const desaFound = stored?.desa_kelurahan?.find((d: any) => 
        (d.id_desa && d.id_desa === currentDesa?.id_desa) || 
        d.nama_desa_kelurahan === currentDesa?.nama_desa_kelurahan
      ) || stored?.desa_kelurahan?.[0];

      if (Array.isArray(desaFound?.rw) && desaFound.rw.length > 0) {
        return desaFound.rw;
      }
    } catch (e) {}

    const ctxDesa = dataKecamatan?.desa_kelurahan?.find((d: any) => 
      (d.id_desa && d.id_desa === currentDesa?.id_desa) || 
      d.nama_desa_kelurahan === currentDesa?.nama_desa_kelurahan
    ) || dataKecamatan?.desa_kelurahan?.[0];

    if (Array.isArray(ctxDesa?.rw) && ctxDesa.rw.length > 0) {
      return ctxDesa.rw;
    }

    return [];
  };

  const [listRW, setListRW] = useState<any[]>(() => getDaftarRW());

  useEffect(() => {
    const localData = getDaftarRW();
    if (localData.length > 0) {
      setListRW(localData);
    }

    // Sinkronisasi data terkini dari backend MySQL (yang diatur di TabRwRtDesa)
    let isMounted = true;
    apiService.getStrukturRTRW().then((res) => {
      if (isMounted && res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setListRW(res.data);
      }
    }).catch(() => {});

    return () => { isMounted = false; };
  }, [currentDesa, dataKecamatan]);

  // 3. FILTER PERSIS SESUAI PROFIL RT & RW WARGA
  const matchedRWObj = listRW.find((r: any) => {
    const rwField = String(r.nomor || r.nomor_rw || r.rw || r.nama_rw || r.nama || '');
    const rwDigits = rwField.replace(/\D/g, '');
    const rwPlain = String(parseInt(rwDigits || '0', 10));
    return (
      rwDigits === displayRW ||
      rwDigits === targetRWDigits ||
      rwPlain === rwNumPlain ||
      rwField.toLowerCase().includes(`rw ${displayRW}`) ||
      rwField.toLowerCase().includes(`rw ${rwNumPlain}`)
    );
  });

  const ketuaRW = matchedRWObj?.ketua || matchedRWObj?.nama_ketua || matchedRWObj?.nama || currentDesa?.ketua_rw || (matchedRWObj ? `Bpk. Ketua RW ${displayRW}` : 'Belum terdaftar di sistem');
  const kontakRW = matchedRWObj?.kontak || matchedRWObj?.no_hp || matchedRWObj?.kontak_rw || currentDesa?.kontak_rw || '-';
  const fotoRW = matchedRWObj?.foto || matchedRWObj?.foto_rw || '';

  const listRT = Array.isArray(matchedRWObj?.rt) ? matchedRWObj.rt : 
                 Array.isArray(matchedRWObj?.daftar_rt) ? matchedRWObj.daftar_rt : 
                 Array.isArray(matchedRWObj?.rt_list) ? matchedRWObj.rt_list : 
                 (Array.isArray(currentDesa?.daftar_rt) ? currentDesa.daftar_rt : []);

  const matchedRTObj = listRT.find((r: any) => {
    const rtField = String(r.nomor || r.nomor_rt || r.rt || r.nama_rt || r.nama || '');
    const rtDigits = rtField.replace(/\D/g, '');
    const rtPlain = String(parseInt(rtDigits || '0', 10));
    return (
      rtDigits === displayRT ||
      rtDigits === targetRTDigits ||
      rtPlain === rtNumPlain ||
      rtField.toLowerCase().includes(`rt ${displayRT}`) ||
      rtField.toLowerCase().includes(`rt ${rtNumPlain}`)
    );
  });

  const ketuaRT = matchedRTObj?.ketua || matchedRTObj?.nama_ketua || matchedRTObj?.nama || currentDesa?.ketua_rt || (matchedRTObj ? `Bpk. Ketua RT ${displayRT}` : 'Belum terdaftar di sistem');
  const kontakRT = matchedRTObj?.kontak || matchedRTObj?.no_hp || matchedRTObj?.kontak_rt || currentDesa?.kontak_rt || '-';
  const fotoRT = matchedRTObj?.foto || matchedRTObj?.foto_rt || '';

  const renderPejabatDetail = () => {
    if (targetPejabatId === 'kades') {
      return (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-neutral-50/80 border border-black/10">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-100 border border-black/20 flex-shrink-0 flex items-center justify-center">
            {fotoKades ? (
              <img src={fotoKades} alt="Foto Kades" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-black/40 text-center font-['Product_Sans']">Foto Kades</span>
            )}
          </div>
          <div className="space-y-1 text-center sm:text-left w-full border-b sm:border-b-0 border-black/10 pb-2 sm:pb-0">
            <span className="text-[9.5px] uppercase tracking-wider font-semibold text-black/70 bg-white px-2 py-0.5 rounded border border-black/10 font-['Product_Sans']">
              Kepala Desa / Lurah
            </span>
            <h4 className="text-sm font-bold text-black pt-1 font-['Product_Sans']">{kadesName}</h4>
            <p className="text-xs text-black/60 font-['Product_Sans']">Pemerintah Desa {namaDesa}</p>
            <p className="text-[11px] text-black/50 pt-1 font-['Product_Sans']">
              Kontak Kantor: <span className="font-medium text-black">{kontakKantor}</span>
            </p>
          </div>
        </div>
      );
    }

    if (targetPejabatId === 'sekdes') {
      return (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-neutral-50/80 border border-black/10">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-100 border border-black/20 flex-shrink-0 flex items-center justify-center">
            {fotoSekdes ? (
              <img src={fotoSekdes} alt="Foto Sekdes" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-black/40 text-center font-['Product_Sans']">Foto Sekdes</span>
            )}
          </div>
          <div className="space-y-1 text-center sm:text-left w-full border-b sm:border-b-0 border-black/10 pb-2 sm:pb-0">
            <span className="text-[9.5px] uppercase tracking-wider font-semibold text-black/70 bg-white px-2 py-0.5 rounded border border-black/10 font-['Product_Sans']">
              Sekretaris Desa (Sekdes)
            </span>
            <h4 className="text-sm font-bold text-black pt-1 font-['Product_Sans']">{sekdesName}</h4>
            <p className="text-xs text-black/60 font-['Product_Sans']">Pemerintah Desa {namaDesa}</p>
            <p className="text-[11px] text-black/50 pt-1 font-['Product_Sans']">
              Kontak Kantor: <span className="font-medium text-black">{kontakKantor}</span>
            </p>
          </div>
        </div>
      );
    }

    
    const selectedAparatur = listAparaturLain.find(
      (item) => String(item.id) === String(targetPejabatId)
    );

    if (selectedAparatur) {
      return (
        <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-neutral-50/80 border border-black/10">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-100 border border-black/20 flex-shrink-0 flex items-center justify-center mx-auto sm:mx-0">
            {selectedAparatur.foto ? (
              <img src={selectedAparatur.foto} alt={selectedAparatur.nama} className="w-full h-full object-cover" />
            ) : (
              <div className="text-neutral-500 font-bold text-sm">
                {selectedAparatur.nama.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="space-y-1.5 text-center sm:text-left w-full min-w-0">
            <span className="text-[9.5px] uppercase tracking-wider font-semibold text-black/70 bg-white px-2 py-0.5 rounded border border-black/10 font-['Product_Sans']">
              {selectedAparatur.jabatan}
            </span>
            <h4 className="text-sm font-bold text-black font-['Product_Sans']">{selectedAparatur.nama}</h4>
            <p className="text-xs text-black/60 font-['Product_Sans']">
              Kontak / WA: <span className="font-medium text-black">{selectedAparatur.kontak || '-'}</span>
            </p>
            {selectedAparatur.tupoksi && (
              <div className="mt-2 p-2.5 bg-white rounded-lg border border-black/10 text-[11px] text-black/70 leading-relaxed text-left">
                <span className="font-bold text-black block mb-0.5">Tugas Pokok & Fungsi (Tupoksi):</span>
                {selectedAparatur.tupoksi}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4 p-3 rounded-xl bg-white border border-black/10">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-100 border border-black/20 flex-shrink-0 flex items-center justify-center">
            {fotoKades ? (
              <img src={fotoKades} alt="Foto Kades" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] text-black/40 text-center font-['Product_Sans']">Foto Kades</span>
            )}
          </div>
          <div className="space-y-0.5 w-full border-b border-black/80 pb-2">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-black/60 bg-neutral-100 px-2 py-0.5 rounded border border-black/5 font-['Product_Sans']">
              Kepala Desa / Lurah
            </span>
            <h4 className="text-xs font-bold text-black pt-0.5 font-['Product_Sans']">{kadesName}</h4>
            <p className="text-[11px] text-black/50 font-['Product_Sans']">Pemerintah Desa {namaDesa}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 rounded-xl bg-white border border-black/10">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-100 border border-black/20 flex-shrink-0 flex items-center justify-center">
            {fotoSekdes ? (
              <img src={fotoSekdes} alt="Foto Sekdes" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] text-black/40 text-center font-['Product_Sans']">Foto Sekdes</span>
            )}
          </div>
          <div className="space-y-0.5 w-full border-b border-black/80 pb-2">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-black/60 bg-neutral-100 px-2 py-0.5 rounded border border-black/5 font-['Product_Sans']">
              Sekretaris Desa (Sekdes)
            </span>
            <h4 className="text-xs font-bold text-black pt-0.5 font-['Product_Sans']">{sekdesName}</h4>
            <p className="text-[11px] text-black/50 font-['Product_Sans']">Pemerintah Desa {namaDesa}</p>
          </div>
        </div>

        {listAparaturLain.length > 0 && (
          <div className="pt-2 border-t border-black/10 space-y-2">
            <p className="text-[10.5px] font-semibold text-black/60 uppercase tracking-wider">
              Perangkat Desa Lainnya:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {listAparaturLain.map((item) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-neutral-50 border border-black/10 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-neutral-200 border border-black/10 flex items-center justify-center font-bold text-xs text-black/60 shrink-0 overflow-hidden">
                    {item.foto ? (
                      <img src={item.foto} alt={item.nama} className="w-full h-full object-cover" />
                    ) : (
                      item.nama.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-black truncate">{item.nama}</p>
                    <p className="text-[10px] text-black/60 font-medium truncate">{item.jabatan}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-black/10 shadow-xs overflow-hidden my-3 font-['Product_Sans',sans-serif] text-black select-none">
      <div className="bg-white px-5 py-3.5 border-b border-black/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={dataKecamatan?.logo_kabupaten || 'https://placehold.co/43x45'}
            alt="Logo Kabupaten"
            className="h-8 w-8 object-contain p-0.5 border border-black/10 rounded"
          />
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-black uppercase font-['Product_Sans']">
              Pemerintah Desa {namaDesa}
            </h3>
            <p className="text-[10px] text-black/50 font-['Product_Sans']">
              Kec. {namaKecamatan} • {namaKabupaten}
            </p>
          </div>
        </div>
      </div>

      {mode === 'aparatur' && (
        <div className="p-4 space-y-4">
          {renderPejabatDetail()}

          <div className="p-3.5 rounded-xl bg-neutral-50 border border-black/5 text-xs space-y-1 font-['Product_Sans']">
            <div className="flex items-center gap-1.5 font-bold text-black mb-1">
              <svg className="w-4 h-4 text-black/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Informasi Pelayanan Kantor:</span>
            </div>
            <p className="text-black/70">• Alamat: {alamatKantor}</p>
            <p className="text-black/70">• Jam Operasional: {jamOperasional}</p>
            <p className="text-black/70">• Email Resmi: {currentDesa?.email_resmi || `desa.${namaDesa.toLowerCase()}@cirebonkab.go.id`}</p>
          </div>
        </div>
      )}

      {mode === 'rtrw' && (
        <div className="p-4 space-y-3">
          <div className="border-b border-black/10 pb-2">
            <h4 className="text-xs font-bold text-black">
              Pengurus Wilayah RT {displayRT} / RW {displayRW}
            </h4>
            <p className="text-[10.5px] text-black/50">
              Sesuai dengan domisili alamat warga tercatat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-black/10 flex flex-col items-center text-center space-y-2">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-100 border border-black/20 flex items-center justify-center shrink-0">
                {fotoRT ? (
                  <img src={fotoRT} alt="Foto RT" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-black/40 font-bold font-['Product_Sans']">RT {displayRT}</span>
                )}
              </div>
              <div className="w-full border-b border-black/80 pb-2">
                <span className="text-[9px] font-semibold text-black/60 uppercase bg-neutral-100 px-2 py-0.5 rounded border border-black/5 font-['Product_Sans']">
                  Ketua RT {displayRT}
                </span>
                <h4 className="text-xs font-bold text-black mt-1 font-['Product_Sans'] truncate">{ketuaRT}</h4>
                <p className="text-[11px] text-black/50 mt-0.5 font-['Product_Sans']">WA: {kontakRT}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-black/10 flex flex-col items-center text-center space-y-2">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-100 border border-black/20 flex items-center justify-center shrink-0">
                {fotoRW ? (
                  <img src={fotoRW} alt="Foto RW" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-black/40 font-bold font-['Product_Sans']">RW {displayRW}</span>
                )}
              </div>
              <div className="w-full border-b border-black/80 pb-2">
                <span className="text-[9px] font-semibold text-black/60 uppercase bg-neutral-100 px-2 py-0.5 rounded border border-black/5 font-['Product_Sans']">
                  Ketua RW {displayRW}
                </span>
                <h4 className="text-xs font-bold text-black mt-1 font-['Product_Sans'] truncate">{ketuaRW}</h4>
                <p className="text-[11px] text-black/50 mt-0.5 font-['Product_Sans']">WA: {kontakRW}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-neutral-50 px-4 py-2 border-t border-black/10 text-center">
        <p className="text-[10px] text-black/50 font-normal font-['Product_Sans']">
          Portal Informasi & Administrasi Resmi • Desa {namaDesa}
        </p>
      </div>
    </div>
  );
};

export default AparaturCard;