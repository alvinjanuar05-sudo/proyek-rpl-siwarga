import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  QrCode,
  Bot,
  ShieldCheck,
  Search,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Users,
  Clock,
  Lock,
  Layers,
  Building2,
  Send,
  Plus,
} from 'lucide-react';
import { apiService } from '../../services/api';

export const LandingSections: React.FC = () => {
  const navigate = useNavigate();

  // State untuk Section 3: Cek Bansos Instan (Open NIK)
  const [nikInput, setNikInput] = useState('');
  const [bansosResult, setBansosResult] = useState<any>(null);
  const [bansosLoading, setBansosLoading] = useState(false);
  const [bansosError, setBansosError] = useState('');

  // State untuk Section 4: Folder Tab Switcher ("warga" | "desa")
  const [activeFolderTab, setActiveFolderTab] = useState<'warga' | 'desa'>('warga');

  // State untuk Section 5: Data Desa & Pengumuman Publik
  const [desaProfile, setDesaProfile] = useState<any>(null);

  useEffect(() => {
    const fetchPublicDesa = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/desa');
        const json = await res.json();
        if (json && json.success && json.data) {
          setDesaProfile(Array.isArray(json.data) ? json.data[0] : json.data);
        }
      } catch {
        // Fallback aman jika backend belum dijalankan
      }
    };
    fetchPublicDesa();
  }, []);

  const handleCekBansos = async (e: React.FormEvent) => {
    e.preventDefault();
    setBansosError('');
    setBansosResult(null);

    const cleanNik = nikInput.replace(/\D/g, '');
    if (cleanNik.length !== 16) {
      setBansosError('Masukkan 16 digit NIK yang valid.');
      return;
    }

    setBansosLoading(true);
    try {
      const res = await apiService.cekBansosByNik(cleanNik);
      if (res && res.success && res.data) {
        setBansosResult(res.data);
      } else {
        setBansosError(res?.message || 'NIK tidak terdaftar pada gelombang DTKS aktif.');
      }
    } catch {
      setBansosError('Gagal memeriksa NIK. Pastikan server backend aktif.');
    } finally {
      setBansosLoading(false);
    }
  };

  const namaDesa = desaProfile?.nama_desa_kelurahan || 'Mertapada Wetan';

  return (
    <div className="w-full bg-[#FAFAFA] text-neutral-900 font-['Product_Sans',sans-serif] selection:bg-neutral-900 selection:text-white">
      {/* =====================================================================
          SECTION 2: EDITORIAL MANIFESTO, STACKED CARDS & FLOATING PILLS
          (Terinspirasi Referensi Slide 2)
      ===================================================================== */}
      <section className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        {/* Floating Speech-Bubble Pills */}
        <div className="mb-8 flex items-center justify-between md:px-12">
          <div className="relative inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white shadow-md -rotate-3">
            <span>@warga_desa</span>
            <span className="absolute -bottom-1.5 left-4 h-3 w-3 rotate-45 bg-neutral-900" />
          </div>

          {/* Tumpukan Kartu Visual Mini di Tengah */}
          <div className="relative hidden sm:flex items-center justify-center h-28 w-44">
            <div className="absolute h-24 w-20 -rotate-12 -translate-x-8 rounded-2xl bg-neutral-200 border border-black/5 shadow-sm" />
            <div className="absolute h-24 w-20 -rotate-6 -translate-x-4 rounded-2xl bg-amber-400 shadow-md" />
            <div className="absolute h-24 w-20 rotate-3 translate-x-2 rounded-2xl bg-emerald-500 shadow-md" />
            <div className="relative z-10 flex h-28 w-24 rotate-6 flex-col justify-between rounded-2xl bg-blue-600 p-3 text-white shadow-xl">
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                SVARA AI
              </span>
              <Bot className="h-7 w-7 text-white/95" />
              <span className="text-[10px] font-medium leading-tight">
                Layanan 24/7
              </span>
            </div>
          </div>

          <div className="relative inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-md rotate-3">
            <span>@admin_desa</span>
            <span className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 bg-blue-600" />
          </div>
        </div>

        {/* Pernyataan Tipografi Besar (High-Contrast Editorial Typography) */}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-medium leading-[1.22] tracking-tight text-neutral-900 sm:text-4xl md:text-[44px]">
            Baik mengurus surat{' '}
            <span className="inline-flex align-middle mx-1 rounded-xl bg-neutral-900 p-1.5 text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </span>{' '}
            maupun memantau{' '}
            <span className="text-emerald-500 font-semibold">bansos DTKS</span>{' '}
            <span className="text-neutral-400">
              menghubungkan warga Desa {namaDesa} dengan pelayanan digital{' '}
              <span className="inline-flex align-middle mx-1 rounded-xl bg-orange-500 p-1.5 text-white shadow-xs">
                <Sparkles className="h-5 w-5" />
              </span>{' '}
              tanpa antre.
            </span>
          </h2>

          {/* 3 Ikon Fitur Inti Berdampingan */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/chat-ai')}
              title="Asisten AI SVARA"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-neutral-800 shadow-xs transition-transform hover:-translate-y-1 cursor-pointer"
            >
              <Bot className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              title="Surat Digital Otomatis"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-neutral-800 shadow-xs transition-transform hover:-translate-y-1 cursor-pointer"
            >
              <FileText className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/desa')}
              title="Verifikasi QR & Wilayah"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-neutral-800 shadow-xs transition-transform hover:-translate-y-1 cursor-pointer"
            >
              <QrCode className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: CASCADING DIAGONAL CATALOG & INSTANT NIK BANSOS CHECKER
          (Terinspirasi Referensi Slide 3)
      ===================================================================== */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              LAYANAN PUBLIK TERPADU
            </span>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl">
              Katalog Surat & Cek Bansos Terbuka
            </h3>
          </div>
          <button
            onClick={() => navigate('/chat-ai')}
            className="inline-flex items-center gap-2 self-start rounded-full border border-black/10 bg-white px-5 py-2.5 text-xs font-medium text-neutral-900 shadow-xs transition-all hover:bg-neutral-900 hover:text-white cursor-pointer"
          >
            <span>Buka Katalog 24+ Surat</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Grid: Kiri Deretan Kartu Diagonal, Kanan Widget Cek NIK Bansos */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
          {/* Kiri (7 Kolom): Kartu Berundak Diagonal */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
            {/* Kartu 1 */}
            <div
              onClick={() => navigate('/chat-ai')}
              className="group cursor-pointer rounded-3xl border border-black/5 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  KODE 474
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white">
                  <FileText className="h-3.5 w-3.5" />
                </span>
              </div>
              <h4 className="text-sm font-semibold text-neutral-900">
                Surat Keterangan Tidak Mampu
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                Pengajuan SKTM pendidikan, kesehatan, dan keringanan biaya secara daring.
              </p>
            </div>

            {/* Kartu 2 (Turun sedikit - efek diagonal) */}
            <div
              onClick={() => navigate('/chat-ai')}
              className="group cursor-pointer rounded-3xl bg-neutral-100 border border-black/5 p-5 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl md:mt-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  KODE 470
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Building2 className="h-3.5 w-3.5" />
                </span>
              </div>
              <h4 className="text-sm font-semibold text-neutral-900">
                Surat Keterangan Domisili
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Validasi tempat tinggal resmi warga dan kebutuhan administrasi bank/kerja.
              </p>
            </div>

            {/* Kartu 3 (Turun lebih dalam + Floating Pill Badge) */}
            <div
              onClick={() => navigate('/chat-ai')}
              className="relative group cursor-pointer rounded-3xl bg-amber-400 p-5 text-neutral-950 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl md:mt-12"
            >
              <div className="absolute -top-3.5 right-3 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
                @populer
              </div>
              <div className="mb-6 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-900/70">
                  KODE 503
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              </div>
              <h4 className="text-sm font-bold text-neutral-950">
                Surat Keterangan Usaha (SKU)
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-neutral-900/80">
                Legalitas mikro UMKM desa untuk pengajuan KUR dan perizinan usaha.
              </p>
            </div>

            {/* Kartu 4 (Paling bawah + Biru Elektrik khas Referensi) */}
            <div
              onClick={() => navigate('/chat-ai')}
              className="group cursor-pointer rounded-3xl bg-blue-600 p-5 text-white shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl md:mt-16"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                  AI DRAFT
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-blue-600">
                  <Bot className="h-3.5 w-3.5" />
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">
                Pengantar SKCK & Kependudukan
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-white/80">
                Terbit otomatis dalam format .docx resmi bertanda tangan kepala desa.
              </p>
            </div>
          </div>

          {/* Kanan (5 Kolom): Kartu Cek NIK Bansos Publik */}
          <div className="lg:col-span-5 rounded-3xl border border-black/10 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                <QrCode className="h-3.5 w-3.5" />
                Cek DTKS Terbuka
              </span>
              <span className="text-[11px] text-neutral-400">Tanpa Login</span>
            </div>

            <h4 className="text-lg font-semibold text-neutral-900">
              Cek Status Penerima Bansos
            </h4>
            <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
              Masukkan 16 digit NIK KTP untuk memeriksa status kepesertaan DTKS dan jadwal gelombang pencairan di balai desa.
            </p>

            <form onSubmit={handleCekBansos} className="mt-5 space-y-3">
              <div className="relative">
                <input
                  type="text"
                  maxLength={16}
                  value={nikInput}
                  onChange={(e) => setNikInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 3209xxxxxxxxxxxx"
                  className="w-full rounded-2xl border border-black/15 bg-neutral-50 px-4 py-3 text-xs font-mono text-neutral-900 outline-none focus:border-neutral-900 focus:bg-white transition-colors"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-mono">
                  {nikInput.length}/16
                </span>
              </div>

              <button
                type="submit"
                disabled={bansosLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-xs font-medium text-white shadow-sm hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" />
                <span>{bansosLoading ? 'Memeriksa NIK...' : 'Periksa Status NIK'}</span>
              </button>
            </form>

            {bansosError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {bansosError}
              </div>
            )}

            {bansosResult && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900">
                    {bansosResult.nama_sensor || bansosResult.nama || 'Terdaftar'}
                  </span>
                  <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    {bansosResult.jenis_bansos || 'DTKS AKTIF'}
                  </span>
                </div>
                <p className="text-emerald-800">
                  Status: <strong>{bansosResult.status_pencairan || 'Terjadwal'}</strong>
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-2 inline-flex items-center gap-1 font-semibold text-neutral-900 underline cursor-pointer"
                >
                  Masuk untuk klaim E-Tiket QR Code →
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: VISION, ICON CLUSTER & FOLDER-STYLE DUAL-ROLE SWITCHER
          (Terinspirasi Referensi Slide 4)
      ===================================================================== */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-center">
          {/* Kiri (5 Kolom): Visi + Tombol Pill + Kluster Ikon Bulat */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white shadow-xs">
              <Layers className="h-4 w-4 text-neutral-800" />
            </div>

            <h3 className="text-3xl font-medium leading-tight tracking-tight text-neutral-900 md:text-4xl">
              Visi baru tata kelola layanan digital desa.
            </h3>

            <p className="text-sm leading-relaxed text-neutral-500">
              Setiap pengajuan warga diproses secara transparan. SVARA memadukan kemudahan akses mandiri warga dengan kendali penuh perangkat desa dalam satu platform terpadu.
            </p>

            <div>
              <button
                onClick={() => navigate('/desa')}
                className="rounded-full border border-black/15 bg-white px-6 py-2.5 text-xs font-medium text-neutral-900 shadow-xs hover:bg-neutral-900 hover:text-white transition-colors cursor-pointer"
              >
                Jelajahi Profil Desa
              </button>
            </div>

            {/* Kluster Ikon Bulat Organik (Persis Referensi Kiri Bawah Slide 4) */}
            <div className="pt-4 flex flex-wrap items-center gap-3 max-w-xs">
              {[
                { Icon: Bot, label: 'AI Agent' },
                { Icon: FileText, label: 'Auto Docx' },
                { Icon: QrCode, label: 'QR Bansos' },
                { Icon: ShieldCheck, label: 'Bcrypt RBAC' },
                { Icon: Users, label: 'RT/RW Data' },
                { Icon: Clock, label: 'Real-time' },
              ].map(({ Icon, label }, index) => (
                <div
                  key={label}
                  title={label}
                  className={`flex h-14 w-14 items-center justify-center rounded-full border border-black/5 bg-white text-neutral-800 shadow-sm transition-transform hover:scale-110 ${
                    index % 2 === 1 ? 'translate-y-2' : ''
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              ))}
            </div>
          </div>

          {/* Kanan (7 Kolom): Interactive Folder Tab Container */}
          <div className="lg:col-span-7">
            <div className="rounded-[28px] border border-black/10 bg-white shadow-lg overflow-hidden">
              {/* Header Folder Tab Atas */}
              <div className="flex items-center justify-between bg-white px-6 pt-5 pb-3">
                <button
                  onClick={() => setActiveFolderTab('warga')}
                  className={`text-lg font-medium transition-colors cursor-pointer ${
                    activeFolderTab === 'warga'
                      ? 'text-neutral-900 font-semibold'
                      : 'text-neutral-400 hover:text-neutral-700'
                  }`}
                >
                  Untuk Warga
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Daftar Akun</span>
                </button>
              </div>

              {/* Layer Folder Hitam Bertumpuk (Persis Efek Tab Folder Referensi Slide 4) */}
              <div className="relative">
                <div
                  onClick={() => setActiveFolderTab('desa')}
                  className="flex items-center justify-between rounded-t-3xl bg-neutral-900 px-6 py-4 text-white cursor-pointer"
                >
                  <span className="text-lg font-medium">
                    {activeFolderTab === 'warga'
                      ? 'Mode Layanan Warga Aktif'
                      : 'Mode Operasional Perangkat Desa'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFolderTab(activeFolderTab === 'warga' ? 'desa' : 'warga');
                    }}
                    className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white hover:bg-white/25 transition-colors cursor-pointer"
                  >
                    Ganti ke {activeFolderTab === 'warga' ? 'Perangkat Desa' : 'Warga'}
                  </button>
                </div>

                {/* Isi Kartu Grid di dalam Folder */}
                <div className="bg-white p-6">
                  {activeFolderTab === 'warga' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-2xl bg-neutral-100 p-4 flex flex-col justify-between min-h-[165px]">
                        <Bot className="h-6 w-6 text-neutral-900" />
                        <div>
                          <h5 className="text-xs font-bold text-neutral-900">
                            Tanya SVARA AI
                          </h5>
                          <p className="mt-1 text-[11px] text-neutral-600">
                            Cek syarat berkas & status tiket surat Anda secara instan.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-emerald-600 p-4 text-white flex flex-col justify-between min-h-[165px]">
                        <QrCode className="h-6 w-6 text-white" />
                        <div>
                          <h5 className="text-xs font-bold">
                            E-Tiket QR Bansos
                          </h5>
                          <p className="mt-1 text-[11px] text-white/85">
                            Tunjukkan QR Code terenkripsi saat pencairan di balai desa.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-amber-400 p-4 text-neutral-950 flex flex-col justify-between min-h-[165px]">
                        <FileText className="h-6 w-6 text-neutral-950" />
                        <div>
                          <h5 className="text-xs font-bold">
                            Usulan & Aspirasi
                          </h5>
                          <p className="mt-1 text-[11px] text-neutral-900/80">
                            Kirim aduan fasilitas desa & usulan DTKS mandiri.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-2xl bg-neutral-900 p-4 text-white flex flex-col justify-between min-h-[165px]">
                        <FileText className="h-6 w-6 text-amber-400" />
                        <div>
                          <h5 className="text-xs font-bold">
                            Auto-Generate .DOCX
                          </h5>
                          <p className="mt-1 text-[11px] text-neutral-300">
                            Terbitkan surat resmi bernomor otomatis sekali klik.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-blue-600 p-4 text-white flex flex-col justify-between min-h-[165px]">
                        <QrCode className="h-6 w-6 text-white" />
                        <div>
                          <h5 className="text-xs font-bold">
                            Scanner QR Lapangan
                          </h5>
                          <p className="mt-1 text-[11px] text-white/85">
                            Validasi pencairan anti-ganda langsung dari kamera.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-neutral-100 p-4 text-neutral-900 flex flex-col justify-between min-h-[165px]">
                        <Users className="h-6 w-6 text-neutral-900" />
                        <div>
                          <h5 className="text-xs font-bold">
                            Hierarki RW & RT
                          </h5>
                          <p className="mt-1 text-[11px] text-neutral-600">
                            Kelola kepengurusan wilayah & verifikasi kependudukan.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Bar dalam Folder (Dengan tombol Send hitam bulat seperti referensi) */}
                  <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
                    <span className="text-xs text-neutral-500">
                      {activeFolderTab === 'warga'
                        ? 'Akses penuh layanan mandiri tanpa harus datang ke kantor desa.'
                        : 'Panel terintegrasi untuk Admin Desa & Super Admin Kecamatan.'}
                    </span>
                    <button
                      onClick={() =>
                        navigate(activeFolderTab === 'warga' ? '/chat-ai' : '/login')
                      }
                      aria-label="Buka Layanan"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white shadow-md hover:bg-neutral-800 transition-transform hover:scale-105 cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: ASYMMETRICAL BENTO GRID & IDENTITY SECURITY CARD
          (Terinspirasi Referensi Slide 5 & 6)
      ===================================================================== */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        {/* Eyebrow & Judul Tengah */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400">
            ARSITEKTUR <span className="text-blue-600">CERDAS & AMAN</span>
          </span>
          <h3 className="mt-3 text-3xl font-medium leading-tight tracking-tight text-neutral-900 md:text-5xl">
            Setiap layanan desa punya alur yang pasti
          </h3>
        </div>

        {/* Grid Bento 2 Kolom Asimetris */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-start">
          {/* KOLOM KIRI */}
          <div className="space-y-8">
            {/* Bento Card 1 (Putih Bersih + Floating Badge) */}
            <div className="relative rounded-[28px] border border-black/5 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={() => navigate('/chat-ai')}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3.5 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>Coba Asisten SVARA</span>
                </button>

                <span className="rounded-full bg-blue-600 px-3.5 py-1 text-xs font-medium text-white shadow-sm rotate-3">
                  @svara_rag
                </span>
              </div>

              {/* Visual Alur 3 Langkah Surat Otomatis */}
              <div className="my-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-neutral-50 border border-black/5 p-3.5 text-center">
                  <span className="text-[10px] font-bold text-neutral-400">01</span>
                  <p className="mt-1 text-xs font-semibold text-neutral-900">
                    Isi Form
                  </p>
                </div>
                <div className="rounded-2xl bg-neutral-900 p-3.5 text-center text-white shadow-md -translate-y-1">
                  <span className="text-[10px] font-bold text-amber-400">02</span>
                  <p className="mt-1 text-xs font-semibold">
                    Verifikasi
                  </p>
                </div>
                <div className="rounded-2xl bg-neutral-50 border border-black/5 p-3.5 text-center">
                  <span className="text-[10px] font-bold text-emerald-600">03</span>
                  <p className="mt-1 text-xs font-semibold text-neutral-900">
                    Unduh .DOCX
                  </p>
                </div>
              </div>

              <h4 className="mt-6 text-xl font-semibold text-neutral-900">
                Penerbitan Surat Tanpa Antrean
              </h4>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                Warga mengajukan permohonan dari rumah, perangkat desa memverifikasi berkas, dan dokumen Word resmi langsung terkirim ke email pemohon.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-5 rounded-full border border-black/15 px-5 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors cursor-pointer"
              >
                Cara kerjanya
              </button>
            </div>

            {/* Bento Card 2 (Banner Atas Cerah + Konten Bawah) */}
            <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 p-8 text-white">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                    FIFO BATCHING + QR
                  </span>
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <p className="mt-6 text-2xl font-semibold leading-snug">
                  Penyaluran Bansos Tepat Sasaran & Bebas Klaim Ganda
                </p>
              </div>
              <div className="p-8">
                <h4 className="text-xl font-semibold text-neutral-900">
                  Transparansi Kuota & Jadwal Desa
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                  Setiap penerima gelombang mendapatkan E-Tiket QR unik yang diverifikasi langsung menggunakan pemindai kamera petugas saat pencairan.
                </p>
                <button
                  onClick={() => navigate('/register')}
                  className="mt-5 rounded-full border border-black/15 px-5 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors cursor-pointer"
                >
                  Daftar Sekarang
                </button>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN (Sedikit turun untuk efek asimetris Slide 5 & 6) */}
          <div className="space-y-8 md:mt-16">
            {/* Bento Card 3 (Blok Biru Elektrik + Kartu Bawah) */}
            <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm">
              <div className="flex h-56 items-center justify-center bg-blue-600 p-8 text-white relative overflow-hidden">
                <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
                <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-amber-400/30" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-blue-600 shadow-lg">
                    <Bot className="h-8 w-8" />
                  </div>
                  <span className="mt-3 text-xs font-semibold tracking-wide text-white/90">
                    SVARA Context-Aware Guardrails
                  </span>
                </div>
              </div>
              <div className="p-8 bg-neutral-100/70">
                <h4 className="text-xl font-semibold text-neutral-900">
                  Kecerdasan Buatan Khusus Pelayanan Desa
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                  Dilengkapi pembatasan domain ketat dan isolasi hak akses peran sehingga informasi sensitif kependudukan tetap terlindungi.
                </p>
                <button
                  onClick={() => navigate('/chat-ai')}
                  className="mt-5 rounded-full border border-black/15 bg-white px-5 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors cursor-pointer"
                >
                  Mulai Percakapan
                </button>
              </div>
            </div>

            {/* Bento Card 4 (Kartu Gelap Fokus Identitas & Keamanan - Persis Slide 6 Kanan Bawah) */}
            <div className="relative rounded-[28px] border border-black/5 bg-white p-8 shadow-sm">
              <div className="mb-4 flex justify-end">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white">
                  <Lock className="h-4 w-4" />
                </span>
              </div>

              <div className="mx-auto max-w-xs rounded-[28px] bg-neutral-950 px-6 py-12 text-center text-white shadow-xl">
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-500">
                  KEAMANAN SISTEM
                </span>
                <div className="mt-6 space-y-2.5">
                  <p className="text-sm font-medium text-neutral-600">
                    Bcrypt Password Hashing
                  </p>
                  <p className="text-xl font-bold tracking-tight text-white">
                    Personal Identity
                  </p>
                  <p className="text-sm font-medium text-neutral-500">
                    Role-Based Access Control
                  </p>
                  <p className="text-xs font-medium text-neutral-600">
                    Prepared SQL Statements
                  </p>
                  <p className="text-[11px] font-medium text-neutral-700">
                    Audit Log & Session Guard
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingSections;