import React, { useState } from 'react';
import { useKecamatan } from '../../context/KecamatanContext';

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'file' | 'textarea';
  section: 'orang_tua' | 'warga' | 'lampiran';
  required: boolean;
  placeholder?: string;
}

export interface TemplateSurat {
  id_template: string;
  nama_surat: string;
  kode_surat: string;
  tipe_struktur: 'single' | 'multi_ortu_anak';
  field_ortu: string[];
  field_warga: string[];
  custom_fields: CustomField[];
}

interface ChatKatalogOptionsProps {
  showLevel1?: boolean;
  selectedGroup?: string;
  templatesDesa: TemplateSurat[];
  onSelectOption: (text: string) => void;
}

// LOGIKA DILONGGARKAN AGAR SELURUH SURAT DARI PANEL ADMIN DITERIMA
export const getCategorizedTemplates = (templates: TemplateSurat[], groupKey: string) => {
  return templates.filter((tpl) => {
    const nama = (tpl.nama_surat || '').toLowerCase();
    const kode = (tpl.kode_surat || '').toLowerCase();

    const isUsaha =
      nama.includes('sku') ||
      nama.includes('usaha') ||
      nama.includes('izin') ||
      kode.includes('sku') ||
      kode.includes('503');

    // Kategori 2: Perizinan & Keterangan Usaha
    if (groupKey === 'usaha') return isUsaha;

    // Kategori 1: Layanan Kependudukan & Keterangan Umum (Tampilkan semua non-usaha)
    if (groupKey === 'kependudukan') {
      return !isUsaha;
    }

    if (groupKey === 'lainnya') {
      return !isUsaha;
    }

    return true;
  });
};

export const ChatKatalogOptions: React.FC<ChatKatalogOptionsProps> = ({
  showLevel1,
  selectedGroup,
  templatesDesa,
  onSelectOption,
}) => {
  const { dataKecamatan } = useKecamatan();

  // FIX 1: AMBIL DATA DESA DARI CONTEXT ATAU FALLBACK TERBARU LOCALSTORAGE
  const storedKec = JSON.parse(localStorage.getItem('svara_kecamatan_data') || 'null');
  const currentDesa =
    storedKec?.desa_kelurahan?.[0] ||
    dataKecamatan?.desa_kelurahan?.[0] ||
    {};

  const kadesName = currentDesa?.nama_kepala_desa_lurah || currentDesa?.kades || 'Kepala Desa / Lurah';
  const sekdesName = currentDesa?.nama_sekdes || 'Sekretaris Desa';
  const listAparaturLain: Array<{ id: string; nama: string; jabatan: string }> = currentDesa?.aparatur_lain || [];

  const [selectedPejabatChoice, setSelectedPejabatChoice] = useState<string>('default');
  const [selectedSuratChoice, setSelectedSuratChoice] = useState<string>('default');

  const handlePejabatSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPejabatChoice(val);

    if (val === 'default') return;

    if (val === 'all') {
      onSelectOption('Tampilkan Semua Aparatur Desa');
    } else if (val === 'kades') {
      onSelectOption('Informasi Kepala Desa');
    } else if (val === 'sekdes') {
      onSelectOption('Informasi Sekretaris Desa');
    } else {
      const found = listAparaturLain.find((item) => item.id === val);
      if (found) {
        onSelectOption(`PEJABAT_ID:${found.id}`);
      } else {
        onSelectOption('Informasi Pejabat Desa');
      }
    }
  };

  const handleSuratSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedSuratChoice(val);
    if (val !== 'default') {
      onSelectOption(`Ajukan ${val}`);
    }
  };

  // 1. RENDER LEVEL 1: MENU UTAMA KATALOG (PURE CARD / BUTTONS BERSIH)
  if (showLevel1) {
    return (
      <div className="mt-3 space-y-2 font-['Product_Sans',sans-serif]">
        <div className="grid grid-cols-1 gap-2">
          {/* MENU 1 */}
          <button
            type="button"
            onClick={() => onSelectOption('Kategori: Kependudukan & Keterangan')}
            className="w-full text-left p-3.5 rounded-2xl border border-black/10 bg-white hover:bg-neutral-50 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-black text-xs">
                1. Layanan Kependudukan & Surat Keterangan
              </p>
              <p className="text-[11px] text-black/50 mt-0.5 font-normal">
                SKTM, Domisili, dan Surat Keterangan Umum
              </p>
            </div>
            <svg className="w-4 h-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* MENU 2 */}
          <button
            type="button"
            onClick={() => onSelectOption('Kategori: Perizinan Usaha')}
            className="w-full text-left p-3.5 rounded-2xl border border-black/10 bg-white hover:bg-neutral-50 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-black text-xs">
                2. Perizinan & Keterangan Usaha
              </p>
              <p className="text-[11px] text-black/50 mt-0.5 font-normal">
                Surat Keterangan Usaha (SKU), Izin Tempat Usaha, dll.
              </p>
            </div>
            <svg className="w-4 h-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* MENU 3 */}
          <button
            type="button"
            onClick={() => onSelectOption('Pilih Pejabat Desa')}
            className="w-full text-left p-3.5 rounded-2xl border border-black/10 bg-white hover:bg-neutral-50 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-black text-xs">
                3. Informasi Pejabat & Aparatur Desa
              </p>
              <p className="text-[11px] text-black/50 mt-0.5 font-normal">
                Profil Kades, Sekdes, Kasi, Kaur, dan Kadus beserta Tupoksi
              </p>
            </div>
            <svg className="w-4 h-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* MENU 4 */}
          <button
            type="button"
            onClick={() => onSelectOption('Informasi Pengurus RT dan RW')}
            className="w-full text-left p-3.5 rounded-2xl border border-black/10 bg-white hover:bg-neutral-50 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-black text-xs">
                4. Informasi Kontak Pengurus RT & RW
              </p>
              <p className="text-[11px] text-black/50 mt-0.5 font-normal">
                Daftar alamat dan kontak ketua RT / RW di wilayah desa
              </p>
            </div>
            <svg className="w-4 h-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* MENU 5 */}
          <button
            type="button"
            onClick={() => onSelectOption('Informasi Status & Antrean Surat')}
            className="w-full text-left p-3.5 rounded-2xl border border-black/10 bg-white hover:bg-neutral-50 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-black text-xs">
                5. Cek Status Pengajuan & Laporan Warga
              </p>
              <p className="text-[11px] text-black/50 mt-0.5 font-normal">
                Cek posisi antrean permohonan surat dan progres aduan Anda
              </p>
            </div>
            <svg className="w-4 h-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* MENU 6 */}
          <button
            type="button"
            onClick={() => onSelectOption('Pengumuman & Agenda Desa Terbaru')}
            className="w-full text-left p-3.5 rounded-2xl border border-black/10 bg-white hover:bg-neutral-50 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-black text-xs">
                6. Pengumuman & Agenda Desa Terbaru
              </p>
              <p className="text-[11px] text-black/50 mt-0.5 font-normal">
                Poster kegiatan Posyandu, jadwal Bansos, kerja bakti, dll.
              </p>
            </div>
            <svg className="w-4 h-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* MENU 7 */}
          <button
            type="button"
            onClick={() => onSelectOption('Sampaikan Aspirasi Warga')}
            className="w-full text-left p-3.5 rounded-2xl border border-black/10 bg-white hover:bg-neutral-50 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-black text-xs">
                7. Sampaikan Aspirasi & Pengaduan Warga
              </p>
              <p className="text-[11px] text-black/50 mt-0.5 font-normal">
                Kirim saran, kritik, atau keluhan fasilitas publik ke pemerintah desa
              </p>
            </div>
            <svg className="w-4 h-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* MENU 8: BANSOS CEK */}
          <button
            type="button"
            onClick={() => onSelectOption('Cek Status Penerima Bansos & DTKS')}
            className="w-full text-left p-3.5 rounded-2xl border border-black/10 bg-white hover:bg-neutral-50 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-black text-xs">
                8. Cek Status Penerima Bansos & DTKS
              </p>
              <p className="text-[11px] text-black/50 mt-0.5 font-normal">
                Cek kepesertaan BLT Dana Desa, PKH, BPNT, atau Sembako via NIK
              </p>
            </div>
            <svg className="w-4 h-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* MENU 9: BANSOS USULAN MANDIRI */}
          <button
            type="button"
            onClick={() => onSelectOption('Ajukan Usulan Mandiri Bansos')}
            className="w-full text-left p-3.5 rounded-2xl border border-black/10 bg-white hover:bg-neutral-50 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
          >
            <div>
              <p className="font-medium text-black text-xs">
                9. Ajukan Usulan Mandiri Bansos
              </p>
              <p className="text-[11px] text-black/50 mt-0.5 font-normal">
                Formulir pengajuan kelayakan bantuan sosial secara mandiri
              </p>
            </div>
            <svg className="w-4 h-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // 2. RENDER LEVEL 2: SUB-KATALOG DROPDOWN PEJABAT DESA
  if (selectedGroup === 'pejabat_dropdown') {
    return (
      <div className="mt-3 p-3.5 rounded-2xl border border-black/10 bg-white shadow-xs space-y-2 font-['Product_Sans',sans-serif]">
        <label className="block text-xs font-semibold text-black">
          Pilih Pejabat / Perangkat Desa yang ingin Anda lihat:
        </label>
        <div className="relative">
          <select
            value={selectedPejabatChoice}
            onChange={handlePejabatSelectChange}
            className="w-full bg-neutral-50 border border-black/20 rounded-xl px-3 py-2 text-xs font-medium text-black outline-none focus:border-black cursor-pointer font-['Product_Sans'] appearance-none"
          >
            <option value="default" disabled>-- Klik untuk memilih Pejabat --</option>
            <option value="all">Tampilkan Semua Aparatur Desa</option>
            <option value="kades">Kepala Desa / Lurah ({kadesName})</option>
            <option value="sekdes">Sekretaris Desa ({sekdesName})</option>
            {listAparaturLain.map((item) => (
              <option key={item.id} value={item.id}>
                {item.jabatan} - {item.nama}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // 3. RENDER LEVEL 2: SUB-MENU TEMPLATE SURAT
  if (selectedGroup && !showLevel1 && selectedGroup.trim() !== '') {
    const groupKey = selectedGroup.toLowerCase().includes('kependudukan')
      ? 'kependudukan'
      : selectedGroup.toLowerCase().includes('usaha')
      ? 'usaha'
      : 'lainnya';

    const filteredTemplates = getCategorizedTemplates(templatesDesa, groupKey);

    return (
      <div className="mt-3 space-y-3 font-['Product_Sans',sans-serif]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((tpl) => (
              <button
                key={tpl.id_template}
                type="button"
                onClick={() => onSelectOption(`Ajukan ${tpl.nama_surat}`)}
                className="w-full text-left p-3.5 rounded-2xl border border-black/10 bg-white hover:bg-neutral-50 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
              >
                <div className="pr-2">
                  <p className="font-medium text-black text-xs">
                    {tpl.nama_surat}
                  </p>
                  <p className="text-[10px] font-mono text-black/40 mt-0.5">{tpl.kode_surat}</p>
                </div>
                <svg className="w-4 h-4 text-black/40 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          ) : (
            <p className="text-xs text-black/40 italic col-span-2 py-2">
              Belum ada template surat untuk kategori ini di desa Anda.
            </p>
          )}
        </div>

        {/* DROPDOWN FALLBACK JIKA SURAT SUDAH BANYAK */}
        {filteredTemplates.length > 3 && (
          <div className="p-3 rounded-2xl border border-black/10 bg-neutral-50 space-y-1.5">
            <label className="block text-[11px] font-semibold text-black/70">
              Atau pilih surat langsung dari daftar bawah ini:
            </label>
            <div className="relative">
              <select
                value={selectedSuratChoice}
                onChange={handleSuratSelectChange}
                className="w-full bg-white border border-black/15 rounded-xl px-3 py-1.5 text-xs font-medium text-black outline-none focus:border-black cursor-pointer font-['Product_Sans'] appearance-none"
              >
                <option value="default" disabled>-- Pilih jenis surat yang ingin diajukan --</option>
                {filteredTemplates.map((tpl) => (
                  <option key={tpl.id_template} value={tpl.nama_surat}>
                    {tpl.nama_surat} ({tpl.kode_surat})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black/50">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};