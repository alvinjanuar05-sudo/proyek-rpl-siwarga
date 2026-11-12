export interface SubOption {
  label: string;
  value: string;
}

export interface KeperluanCategory {
  id: string;
  category: string;
  icon: string;
  options: SubOption[];
}

export const LIST_KEPERLUAN_SKTM: KeperluanCategory[] = [
  {
    id: 'pendidikan',
    category: 'Pendidikan',
    icon: '🎓',
    options: [
      { label: 'Pengajuan Beasiswa', value: 'Pengajuan Beasiswa' },
      { label: 'KIP / KIP Kuliah', value: 'Pengajuan KIP / KIP Kuliah' },
      { label: 'Keringanan Biaya Pendidikan', value: 'Keringanan Biaya Pendidikan' },
      { label: 'Pembebasan Biaya Sekolah / Kuliah', value: 'Pembebasan Biaya Sekolah / Kuliah' },
      { label: 'Bantuan Pendidikan', value: 'Bantuan Pendidikan' },
      { label: 'Administrasi Sekolah / Kampus', value: 'Administrasi Sekolah / Kampus' },
    ],
  },
  {
    id: 'kesehatan',
    category: 'Kesehatan',
    icon: '🏥',
    options: [
      { label: 'Pengajuan Bantuan Biaya Pengobatan', value: 'Pengajuan Bantuan Biaya Pengobatan' },
      { label: 'Keringanan Biaya Rumah Sakit', value: 'Keringanan Biaya Rumah Sakit' },
      { label: 'Pengajuan Bantuan Kesehatan', value: 'Pengajuan Bantuan Kesehatan' },
      { label: 'Administrasi BPJS / Kesehatan', value: 'Administrasi BPJS / Kesehatan' },
    ],
  },
  {
    id: 'sosial',
    category: 'Bantuan Sosial',
    icon: '🤝',
    options: [
      { label: 'Pengajuan Bantuan Sosial', value: 'Pengajuan Bantuan Sosial' },
      { label: 'Pengajuan Bantuan Sembako', value: 'Pengajuan Bantuan Sembako' },
      { label: 'Pengajuan Bantuan Pemerintah', value: 'Pengajuan Bantuan Pemerintah' },
      { label: 'Pendataan / Pengusulan Penerima Bantuan', value: 'Pendataan / Pengusulan Penerima Bantuan' },
    ],
  },
  {
    id: 'ekonomi',
    category: 'Ekonomi & Usaha',
    icon: '💼',
    options: [
      { label: 'Pengajuan Bantuan Usaha', value: 'Pengajuan Bantuan Usaha' },
      { label: 'Bantuan Modal Usaha', value: 'Bantuan Modal Usaha' },
      { label: 'Program Pemberdayaan Masyarakat', value: 'Program Pemberdayaan Masyarakat' },
      { label: 'Pengajuan Keringanan Biaya Pertanian / Usaha', value: 'Pengajuan Keringanan Biaya Pertanian / Usaha' },
    ],
  },
  {
    id: 'administrasi',
    category: 'Administrasi Pemerintahan',
    icon: '🏛️',
    options: [
      { label: 'Persyaratan Pengajuan Bantuan Pemerintah', value: 'Persyaratan Pengajuan Bantuan Pemerintah' },
      { label: 'Persyaratan Program Kesejahteraan Sosial', value: 'Persyaratan Program Kesejahteraan Sosial' },
      { label: 'Persyaratan Administrasi Instansi Pemerintah', value: 'Persyaratan Administrasi Instansi Pemerintah' },
    ],
  },
  {
    id: 'hukum',
    category: 'Bantuan Hukum',
    icon: '⚖️',
    options: [
      { label: 'Pengajuan Bantuan Hukum', value: 'Pengajuan Bantuan Hukum' },
      { label: 'Persyaratan Perkara di Pengadilan', value: 'Persyaratan Perkara di Pengadilan' },
      { label: 'Pembebasan Biaya Perkara (Prodeo)', value: 'Pengajuan Pembebasan Biaya Perkara (Prodeo)' },
    ],
  },
  {
    id: 'lainnya',
    category: 'Lainnya',
    icon: '📝',
    options: [
      { label: 'Keperluan Administrasi Lainnya', value: 'Keperluan Administrasi Lainnya' },
      { label: 'Lainnya (Tulis Keperluan Manual)', value: 'CUSTOM_INPUT' },
    ],
  },
];