# 🏛️ SIWARGA — SVARA (Smart Village Virtual Assistant)

**Sistem Informasi Pelayanan Administrasi Desa Terpadu & Asisten Virtual Publik Berbasis AI**

[![CI/CD Pipeline](https://github.com/alvinjanuar05/proyek-rpl-siwarga/actions/workflows/ci.yml/badge.svg)](https://github.com/alvinjanuar05/proyek-rpl-siwarga/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-5.2-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-AI%20Agent-8E75B2?logo=googlegemini&logoColor=white)

---

## 👨‍💻 Identitas Mahasiswa & Informasi Akademik

| Keterangan | Detail |
| :--- | :--- |
| **Nama Mahasiswa** | Muhammad Alvin Januar |
| **NIM** | 41257125 |
| **Program Studi** | Teknik Informatika — STMIK IKMI Cirebon |
| **Mata Kuliah** | Rekayasa Perangkat Lunak (`TIKB2503021`) |
| **Jenis Tugas** | Proyek Akhir Mandiri (Berbasis Rubrik OBE) |
| **Tema Proyek** | *Smart Government & E-Village Public Service Automation* |
| **Lokasi Studi Kasus** | Pemerintah Desa Mertapada Wetan, Kec. Astanajapura, Kab. Cirebon |

---

## 🎥 Video Presentasi & Demonstrasi Proyek

Sesuai ketentuan rubrik penilaian Proyek Akhir Mandiri Rekayasa Perangkat Lunak, berikut adalah dokumentasi video lengkap pengembangan dan pengujian aplikasi:

1. **Video 1 — Analisis Kebutuhan, Perancangan Sistem & Arsitektur Perangkat Lunak:**  
   🔗 *[Tautan Video 1 — Belum Diunggah / Placeholder Link YouTube atau Google Drive]*
2. **Video 2 — Implementasi Kode (Clean Code & SOLID), Integrasi SVARA AI & Keamanan RBAC:**  
   🔗 *[Tautan Video 2 — Belum Diunggah / Placeholder Link YouTube atau Google Drive]*
3. **Video 3 — Pengujian Otomatis (Unit Testing), CI/CD GitHub Actions & Live Demo End-to-End:**  
   🔗 *[Tautan Video 3 — Belum Diunggah / Placeholder Link YouTube atau Google Drive]*

---

## 📖 Deskripsi Aplikasi

**SIWARGA** (Sistem Informasi Warga) yang terintegrasi dengan **SVARA** (*Smart Village Virtual Assistant*) adalah platform layanan pemerintahan desa digital berbasis web yang dirancang untuk memangkas birokrasi pelayanan publik tingkat desa. Aplikasi ini menghubungkan warga, perangkat desa, dan administrator kecamatan dalam satu ekosistem terpadu yang mencakup penerbitan surat otomatis berbasis templat `.docx`, penyaluran Bantuan Sosial (Bansos/DTKS) tervalidasi QR Code, penyampaian aspirasi masyarakat, serta layanan informasi 24/7 melalui agen percakapan cerdas.

### ✨ Fitur Utama Berdasarkan Peran (Role-Based Access Control)

#### 1. Publik / Tamu (`GUEST`)
- **Portal Informasi Desa:** Menampilkan profil pemerintahan desa, struktur kelembagaan, visi-misi, serta warta pengumuman publik.
- **Pengecekan Status Bansos Terbuka:** Pengecekan kepesertaan DTKS dan jadwal gelombang pencairan secara mandiri menggunakan NIK melalui widget SVARA.
- **Registrasi Mandiri:** Pendaftaran akun kependudukan warga baru dengan validasi verifikasi berjenjang oleh Admin Desa.

#### 2. Warga Desa (`WARGA`)
- **Asisten Virtual SVARA AI 24/7:** Konsultasi syarat administrasi, prosedur pelayanan desa, dan pelacakan status tiket secara interaktif.
- **Pengajuan Surat Online Dinamis:** Pemilihan lebih dari 24 jenis templat surat resmi dilengkapi tanda terima tiket otomatis dan notifikasi email.
- **Layanan Aspirasi & Pengaduan:** Penyampaian laporan keluhan infrastruktur/lingkungan beserta pemantauan status tindak lanjut.
- **Klaim E-Tiket QR & Usulan Mandiri Bansos:** Unduh tiket QR pencairan bantuan sosial serta pengajuan usulan DTKS mandiri dengan unggah dokumen terkompresi.
- **Manajemen Keamanan Akun:** Pembaruan profil kependudukan, ganti kata sandi terenkripsi (`bcryptjs`), pemantauan sesi perangkat aktif, dan *global logout*.

#### 3. Admin Desa (`ADMIN_DESA`)
- **Verifikasi Kependudukan & Surat:** Persetujuan akun warga baru serta penerbitan otomatis dokumen resmi berformat Microsoft Word (`.docx`) lengkap dengan nomor registrasi desa.
- **Manajemen Bansos & Scanner QR Lapangan:** Pengelolaan data penerima (manual & impor CSV), penjadwalan kuota gelombang harian (*FIFO batching* + *email blast*), dan pemindaian QR Code pencairan bantuan secara *real-time*.
- **Tata Kelola Wilayah & Pamong:** Pengelolaan struktur hierarki RW/RT, data aparatur desa, templat surat dinamis, serta publikasi pengumuman desa.
- **Asisten AI Mode Operator:** Pencarian cepat rekapitulasi data operasional dan statistik layanan desa berbasis konteks database.

#### 4. Super Admin Pusat (`SUPER_ADMIN`)
- **Kontrol Lintas Wilayah:** Pemantauan statistik agregat pelayanan administrasi seluruh desa di tingkat kecamatan.
- **Manajemen Konfigurasi AI Terpusat:** Pengaturan kunci API Google Gemini dan pemilihan model LLM default secara aman dari sisi server.
- **Otoritas Keamanan & Audit Log:** Pembekuan/aktivasi akun pengguna, reset kata sandi terenkripsi (`bcryptjs`), serta pemantauan log aktivitas sistem.

---

## 🤖 Arsitektur & Integrasi SVARA AI

Fitur kecerdasan buatan pada aplikasi ini ditenagai oleh **Google Gemini API** (`gemini-2.0-flash` dengan mekanisme *multi-model fallback* dan *error handling* terisolasi) yang diterapkan melalui pendekatan *Role-Aware Retrieval-Augmented Generation (RAG)*:

1. **Strict Domain Guardrails (`constants/aiGuardrails.js`):**  
   Agen AI dibatasi secara ketat hanya untuk melayani topik administrasi dan pelayanan publik desa. Pertanyaan di luar konteks layanan desa (seperti pemrograman, tugas akademik, atau topik umum) secara otomatis ditolak menggunakan protokol respons resmi.
2. **Isolasi Konteks Data Berbasis Role (`controllers/aiController.js`):**  
   Identitas dan peran pengguna diverifikasi langsung melalui database MySQL (`verifyAuth` middleware) sebelum menyusun konteks prompt:
   - **Mode Warga (*Restricted Access*):** Hanya menerima informasi publik desa dan riwayat transaksi milik akun warga yang bersangkutan; dilarang keras mengakses NIK atau data warga lain.
   - **Mode Admin (*Full Access*):** Menerima ringkasan statistik surat, aspirasi, struktur pengurus RT/RW, dan data operasional desa untuk membantu pengambilan keputusan cepat.

---

## 🛠️ Tech Stack & Arsitektur Sistem

Proyek ini dibangun menggunakan arsitektur **Decoupled Monorepo** yang memisahkan lapisan presentasi klien (*Single Page Application*) dan layanan logika bisnis (*RESTful API*):

| Lapisan | Teknologi & Pustaka Utama |
| :--- | :--- |
| **Frontend Client** | React 19.2, TypeScript 6.0, Vite 8.2, Tailwind CSS 4.3, React Router DOM v7, Lucide Icons, `html5-qrcode`, `qrcode`, `xlsx` |
| **Backend Server** | Node.js, Express.js 5.2, REST API Modular (Routes, Controllers, Services, Middlewares, Utils) |
| **Basis Data** | MySQL 8.0 / MariaDB (`mysql2` dengan *Prepared Statements* untuk pencegahan SQL Injection) |
| **Kecerdasan Buatan** | Google Gemini API (`@google/generative-ai` / REST GenerateContent dengan *Failover Queue*) |
| **Keamanan & Utilitas** | `bcryptjs` (Password Hashing), Role-Based Access Control (RBAC), `express-rate-limit`, `nodemailer` (SMTP), `docxtemplater` & `pizzip` |
| **Testing & DevOps** | Node.js Test Runner / Jest + Supertest, GitHub Actions CI/CD Pipeline |

---

## 📂 Struktur Direktori Proyek

```text
proyek-rpl-siwarga/
├── .github/
│   └── workflows/
│       └── ci.yml                  # Pipeline CI/CD GitHub Actions otomatis
├── tests/                          # Skrip Unit Testing & Integrasi AI otomatis
├── siwarga/                        # Frontend SPA (React + TypeScript + Vite)
│   ├── public/                     # Aset statis publik
│   ├── src/
│   │   ├── assets/                 # Ikon SVG, logo instansi, dan font
│   │   ├── components/             # Komponen modular (chat, dashboard-desa, superadmin, navbar)
│   │   ├── context/                # Manajemen state global (KecamatanContext, ToastContext)
│   │   ├── pages/                  # Halaman utama (Home, Login, Register, ChatAI, Dashboard)
│   │   ├── services/               # Klien komunikasi HTTP REST API (api.ts)
│   │   ├── App.tsx                 # Definisi rute & proteksi akses halaman
│   │   └── main.tsx                # Entry point aplikasi React
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── siwarga-backend/                # Backend REST API (Node.js + Express)
│   ├── constants/                  # Aturan guardrails domain AI (aiGuardrails.js)
│   ├── controllers/                # Logika bisnis & eksekusi query database (11 controller)
│   ├── middlewares/                # Autentikasi sesi, RBAC guard, dan error handler terpusat
│   ├── routes/                     # Definisi endpoint API modular (12 router)
│   ├── services/                   # Layanan notifikasi internal & templat email HTML
│   ├── utils/                      # Generator dokumen .docx, mailer SMTP, & activity logger
│   ├── db.js                       # Konfigurasi connection pool MySQL
│   ├── server.js                   # Entry point server Express & rate limiter
│   └── package.json
├── .gitignore                      # Pengecualian berkas sensitif (.env, node_modules, dll)
└── README.md                       # Dokumentasi utama proyek