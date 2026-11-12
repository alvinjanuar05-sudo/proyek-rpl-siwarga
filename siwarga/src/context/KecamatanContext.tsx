import React, { createContext, useContext, useState, useEffect } from 'react';

// Key LocalStorage disamakan secara global
const STORAGE_KEY = 'svara_kecamatan_data';

// Tipe data pengajuan surat warga untuk antrean verifikasi
export interface PengajuanSurat {
  id_pengajuan: string;
  id_template: string;
  nama_surat: string;
  kode_surat: string;
  tanggal_pengajuan: string;
  email_warga: string;
  nama_desa: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  catatan_admin?: string;
  data_isian: any;
}

const initialDataKecamatan = {
  nama_kecamatan: 'Astanajapura',
  nama_kabupaten: 'Kabupaten Cirebon',
  provinsi: 'Jawa Barat',
  logo_kabupaten: '',
  
  // Data Desa Utama (Fokus 1 Desa)
  desa_kelurahan: [
    {
      id_desa: 'DESA-001',
      nama_desa_kelurahan: 'Sukamaju',
      nama_kepala_desa_lurah: 'H. Ahmad Subagja, S.Sos',
      foto_kades: '',
      nama_sekdes: 'Dedi Kurniawan, S.IP',
      foto_sekdes: '',
      nomor_kontak: '0813-9876-5432',
      alamat_kantor: 'Jl. Raya Desa Sukamaju No. 10',
      email_resmi: 'desa.sukamaju@cirebonkab.go.id',
      aparatur_lain: [], // Tempat menampung Kaur, Kasi, Kadus, Bendahara dari Panel Admin
      rw: [],
      daftar_pengajuan: [],
    },
  ],
  pengumuman_desa: [],
  pending_verifikasi: [],
};

interface KecamatanContextType {
  dataKecamatan: any;
  setDataKecamatan: React.Dispatch<React.SetStateAction<any>>;
}

const KecamatanContext = createContext<KecamatanContextType | undefined>(undefined);

export const KecamatanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataKecamatan, setDataKecamatan] = useState<any>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('kecamatan_app_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.desa_kelurahan && Array.isArray(parsed.desa_kelurahan)) {
          parsed.desa_kelurahan = parsed.desa_kelurahan.map((d: any) => ({
            ...d,
            foto_kades: (d.foto_kades || '').includes('placehold') ? '' : (d.foto_kades || ''),
            foto_sekdes: (d.foto_sekdes || '').includes('placehold') ? '' : (d.foto_sekdes || ''),
            aparatur_lain: d.aparatur_lain || [],
            daftar_pengajuan: d.daftar_pengajuan || [],
            rw: d.rw || [],
          }));
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse storage:', e);
      }
    }
    return initialDataKecamatan;
  });

  // Simpan otomatis ke LocalStorage tiap ada perubahan data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataKecamatan));
  }, [dataKecamatan]);

  return (
    <KecamatanContext.Provider value={{ dataKecamatan, setDataKecamatan }}>
      {children}
    </KecamatanContext.Provider>
  );
};

export const useKecamatan = () => {
  const context = useContext(KecamatanContext);
  if (!context) {
    throw new Error('useKecamatan must be used within a KecamatanProvider');
  }
  return context;
};