import React from 'react';

interface ChatOptionButtonsProps {
  isLevel1?: boolean;
  subKategori?: string;
  templatesDesa: any[];
  onSelectOption: (text: string) => void;
}

export const ChatOptionButtons: React.FC<ChatOptionButtonsProps> = ({
  isLevel1,
  subKategori,
  templatesDesa,
  onSelectOption,
}) => {
  // LIST KATEGORI LEVEL 1
  const listKategoriUtama = [
    { id: 'kependudukan', label: '🪪 Layanan Kependudukan & Surat Keterangan', desc: 'SKTM, Keterangan Domisili, SKCK, dll.' },
    { id: 'perizinan_usaha', label: '🏪 Perizinan & Keterangan Usaha', desc: 'SKU, Pengantar Izin Tempat Usaha, dll.' },
    { id: 'pertanahan', label: '🏡 Pertanahan & Legalitas Wilayah', desc: 'Pengantar Sertifikat, Beda Nama Tanah, dll.' },
    { id: 'bantuan_sosial', label: '🤲 Informasi Bansos & Bantuan Desa', desc: 'PKH, BLT Desa, BPNT, dan Verifikasi Data' },
  ];

  // RENDER TOMBOL LEVEL 1 (PILIK KELOMPOK LAYANAN)
  if (isLevel1) {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 font-sans">
        {listKategoriUtama.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectOption(`Pilih Kategori: ${item.label}`)}
            className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer shadow-2xs group flex flex-col"
          >
            <span className="font-bold text-slate-800 text-xs group-hover:text-black">
              {item.label}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {item.desc}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // RENDER TOMBOL LEVEL 2 (SUB-KATEGORI SURAT SPESIFIK)
  if (subKategori) {
    const templatesFiltered = templatesDesa.filter((t: any) => {
      const nama = (t.nama_surat || '').toLowerCase();
      const kat = (t.kategori || '').toLowerCase();

      if (subKategori.includes('kependudukan')) {
        return nama.includes('sktm') || nama.includes('domisili') || nama.includes('skck') || kat.includes('kependudukan');
      }
      if (subKategori.includes('usaha')) {
        return nama.includes('sku') || nama.includes('usaha') || kat.includes('usaha');
      }
      return true;
    });

    return (
      <div className="mt-3 space-y-2 font-sans">
        <span className="text-[10.5px] font-bold text-slate-600 block">
          Pilih Dokumen / Layanan Spesifik:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {templatesFiltered.map((t: any) => (
            <button
              key={t.id_template || t.kode_surat}
              onClick={() => onSelectOption(`Ajukan ${t.nama_surat}`)}
              className="w-full text-left p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 transition-all cursor-pointer shadow-2xs flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-blue-950 text-xs">{t.nama_surat}</p>
                <p className="text-[9px] font-mono text-blue-700">{t.kode_surat}</p>
              </div>
              <span className="text-xs">👉</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
};