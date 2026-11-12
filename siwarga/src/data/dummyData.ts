// Definisi tipe data untuk User, Warga, dan Informasi Desa
export interface UserData {
  email: string;
  password: string;
  role: "admin_desa" | "admin_camat" | "super_admin" | "warga";
  nama: string;
  alamat?: {
    desa: string;
    kecamatan: string;
    rt_rw: string;
    dusun: string;
    noRumah: string;
  }
}

export interface WargaData {
  id: number;
  nik: string;
  nama: string;
  rt_rw: string;
  jenisSurat: string;
  status: "Diproses" | "Selesai" | "Ditolak";
  tanggal: string;
}

export interface InformasiDesa {
  id: number;
  judul: string;
  kategori: string;
  tanggal: string;
}

// Data Akun Demo untuk Multi-Role Login (Termasuk Akun Warga)
export const dummyUsers: UserData[] = [
  {
    email: "desa@siwarga.com",
    password: "password123",
    role: "admin_desa",
    nama: "Admin Desa Suka Makmur"
  },
  {
    email: "super@siwarga.com",
    password: "password123",
    role: "super_admin",
    nama: "Super Admin Pusat"
  },
  {
    email: "warga@siwarga.com",
    password: "password123",
    role: "warga",
    nama: "Budi Santoso",
    alamat: {
      desa: "Mertapada Wetan",
      kecamatan: "Astanajapura",
      rt_rw: "RT 03 / RW 04",
      dusun: "Dusun Pon 1",
      noRumah: "No. 44"
    }
  }
];

// Data Dummy Layanan Warga untuk Dashboard Desa
export const initialWargaData: WargaData[] = [
  {
    id: 1,
    nik: "3201123456780001",
    nama: "Budi Santoso",
    rt_rw: "001/002",
    jenisSurat: "Surat Pengantar SKCK",
    status: "Diproses",
    tanggal: "2026-06-01"
  },
  {
    id: 2,
    nik: "3201123456780002",
    nama: "Siti Aminah",
    rt_rw: "002/001",
    jenisSurat: "Surat Keterangan Tidak Mampu (SKTM)",
    status: "Selesai",
    tanggal: "2026-06-02"
  }
];

export const initialInformasiDesa: InformasiDesa[] = [
  {
    id: 1,
    judul: "Jadwal Kerja Bakti Desa Suka Makmur",
    kategori: "Pengumuman",
    tanggal: "2026-06-03"
  }
];