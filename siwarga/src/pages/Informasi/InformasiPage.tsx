import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Megaphone,
  BookOpen,
  Info,
  MessageSquareWarning,
  SearchCheck,
  ArrowRight,
  ShieldCheck,
  Bot,
  FileText,
  QrCode,
} from 'lucide-react';
import Navbar from '../../components/navbar/Navbar';
import Footer from '../../layouts/Footer';
import kecamatanData from '../../data/kecamatanData.json';

export const InformasiPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const isPengaduan = path.includes('pengaduan');
  const isPanduan = path.includes('panduan');
  const isTentang = path.includes('tentang');

  const pengumumanList: any[] = Array.isArray((kecamatanData as any).pengumuman)
    ? (kecamatanData as any).pengumuman
    : [];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 font-['Product_Sans',sans-serif]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-16 md:py-24 space-y-14">
        {/* NAVIGASI TAB CEPAT */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Berita & Pengumuman', to: '/informasi/berita', Icon: Megaphone },
            { label: 'Panduan Warga', to: '/informasi/panduan', Icon: BookOpen },
            { label: 'Pengaduan & Status', to: '/layanan/pengaduan', Icon: MessageSquareWarning },
            { label: 'Tentang SVARA', to: '/informasi/tentang', Icon: Info },
          ].map(({ label, to, Icon }) => {
            const active =
              path === to ||
              (to === '/layanan/pengaduan' && path.includes('pengaduan'));
            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white border border-black/10 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* KONTEN 1: PENGADUAN & CEK STATUS */}
        {isPengaduan && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-xs space-y-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">
                <MessageSquareWarning className="h-3.5 w-3.5" />
                Aspirasi & Aduan Warga
              </span>
              <h1 className="text-2xl font-semibold text-neutral-900">
                Sampaikan Pengaduan Masyarakat
              </h1>
              <p className="text-xs leading-relaxed text-neutral-500">
                Demi validitas laporan dan keamanan data pelapor, penyampaian aspirasi maupun pelaporan fasilitas desa dilakukan melalui akun warga terverifikasi atau langsung lewat Asisten SVARA AI.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-medium text-white hover:bg-neutral-800 cursor-pointer"
                >
                  <span>Masuk untuk Lapor</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="rounded-full border border-black/15 px-5 py-2.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 cursor-pointer"
                >
                  Daftar Akun Warga
                </button>
              </div>
            </div>

            <div className="rounded-[28px] bg-neutral-950 p-8 text-white shadow-lg space-y-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                <SearchCheck className="h-3.5 w-3.5" />
                Pelacakan Real-Time
              </span>
              <h2 className="text-2xl font-semibold">
                Cek Status Pengaduan & Surat
              </h2>
              <p className="text-xs leading-relaxed text-neutral-400">
                Seluruh riwayat tiket pengaduan dan status persetujuan surat Anda dapat dipantau secara langsung melalui dashboard warga atau dengan menanyakannya ke SVARA AI.
              </p>
              <button
                onClick={() => navigate('/chat-ai')}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 cursor-pointer"
              >
                <Bot className="h-4 w-4" />
                <span>Cek via Asisten SVARA</span>
              </button>
            </div>
          </section>
        )}

        {/* KONTEN 2: PANDUAN WARGA */}
        {isPanduan && (
          <section className="space-y-8">
            <div className="max-w-2xl space-y-2">
              <h1 className="text-3xl font-medium text-neutral-900">
                Panduan Layanan Mandiri Warga
              </h1>
              <p className="text-xs text-neutral-500">
                Ikuti 3 langkah ringkas untuk menggunakan seluruh layanan digital SIWARGA / SVARA.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  title: 'Registrasi & Verifikasi NIK',
                  desc: 'Buat akun menggunakan NIK dan email aktif, lalu tunggu persetujuan verifikasi dari Admin Desa.',
                  Icon: ShieldCheck,
                },
                {
                  step: '02',
                  title: 'Ajukan Surat atau Tanya AI',
                  desc: 'Pilih jenis surat pada katalog layanan atau konsultasikan syarat administrasi melalui SVARA AI.',
                  Icon: FileText,
                },
                {
                  step: '03',
                  title: 'Unduh Dokumen / Klaim QR',
                  desc: 'Terima surat resmi .docx melalui email atau tunjukkan E-Tiket QR Code saat pencairan bansos.',
                  Icon: QrCode,
                },
              ].map(({ step, title, desc, Icon }) => (
                <div
                  key={step}
                  className="rounded-[28px] border border-black/10 bg-white p-7 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-neutral-400">
                      LANGKAH {step}
                    </span>
                    <Icon className="h-5 w-5 text-neutral-900" />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
                  <p className="text-xs leading-relaxed text-neutral-500">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* KONTEN 3: TENTANG PLATFORM */}
        {isTentang && (
          <section className="rounded-[28px] border border-black/10 bg-white p-8 md:p-12 shadow-xs space-y-6 max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3.5 py-1 text-[11px] font-medium text-white">
              TENTANG PLATFORM
            </span>
            <h1 className="text-3xl font-medium text-neutral-900">
              SIWARGA & SVARA (Smart Village Virtual Assistant)
            </h1>
            <p className="text-sm leading-relaxed text-neutral-600">
              SIWARGA / SVARA adalah platform digitalisasi administrasi tingkat desa yang dirancang untuk mempercepat penerbitan surat keterangan resmi, menjaga transparansi distribusi bantuan sosial berbasis QR Code, serta menyediakan asisten virtual publik berbasis kecerdasan buatan (Google Gemini) dengan perlindungan privasi berbasis peran (RBAC).
            </p>
          </section>
        )}

        {/* KONTEN DEFAULT (BERITA & PENGUMUMAN DESA) */}
        {!isPengaduan && !isPanduan && !isTentang && (
          <section className="space-y-8">
            <div className="max-w-2xl space-y-2">
              <h1 className="text-3xl font-medium text-neutral-900">
                Warta & Pengumuman Desa
              </h1>
              <p className="text-xs text-neutral-500">
                Informasi agenda pelayanan keliling, jadwal penyaluran bantuan sosial, dan pengumuman resmi pemerintah desa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pengumumanList.length > 0 ? (
                pengumumanList.map((info: any, idx: number) => (
                  <div
                    key={info.id || idx}
                    className="rounded-[28px] border border-black/10 bg-white p-7 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                        {info.kategori || 'Pengumuman Resmi'}
                      </span>
                      <span className="text-neutral-400">{info.tanggal || 'Terbaru'}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-neutral-900">
                      {info.judul || 'Agenda Pelayanan Desa'}
                    </h2>
                    <p className="text-xs leading-relaxed text-neutral-500">
                      {info.isi || info.deskripsi || 'Informasi layanan administrasi publik desa.'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[28px] border border-black/10 bg-white p-8 text-xs text-neutral-500">
                  Belum ada pengumuman terbaru. Silakan masuk ke portal warga untuk melihat pembaruan real-time.
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default InformasiPage;