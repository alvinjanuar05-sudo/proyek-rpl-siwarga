import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  FileText,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import Navbar from '../../components/navbar/Navbar';
import Footer from '../../layouts/Footer';
import kecamatanData from '../../data/kecamatanData.json';

const CAKUPAN_SKTM = [
  'Keringanan Biaya Pendidikan / Sekolah / Kuliah',
  'Rekomendasi Bantuan Kesehatan / BPJS PBI',
  'Pengajuan Bantuan Sosial & DTKS Desa',
  'Keringanan Administrasi Hukum & Pengadilan',
  'Rekomendasi Beasiswa & KIP Kuliah',
];

export const DesaPage: React.FC = () => {
  const navigate = useNavigate();
  const [desaInfo, setDesaInfo] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    const loadPublicData = async () => {
      try {
        const [resDesa, resTpl] = await Promise.all([
          fetch('http://localhost:5000/api/desa'),
          fetch('http://localhost:5000/api/template-surat'),
        ]);
        const jsonDesa = await resDesa.json();
        const jsonTpl = await resTpl.json();

        if (jsonDesa?.success && jsonDesa.data) {
          setDesaInfo(Array.isArray(jsonDesa.data) ? jsonDesa.data[0] : jsonDesa.data);
        }
        if (jsonTpl?.success && Array.isArray(jsonTpl.data)) {
          setTemplates(jsonTpl.data);
        }
      } catch {
        // Fallback aman ke data statis JSON lokal
      }
    };
    loadPublicData();
  }, []);

  const namaDesa = desaInfo?.nama_desa_kelurahan || 'Mertapada Wetan';
  const namaKecamatan = desaInfo?.nama_kecamatan || 'Astanajapura';
  const namaKabupaten = desaInfo?.nama_kabupaten || 'Kabupaten Cirebon';
  const namaKades = desaInfo?.nama_kepala_desa_lurah || 'Kepala Desa Mertapada Wetan';
  const alamatKantor =
    desaInfo?.alamat_kantor ||
    'Jl. Raya Mertapada Wetan, Kec. Astanajapura, Kab. Cirebon, Jawa Barat';
  const kontakKantor =
    desaInfo?.nomor_kontak ||
    (kecamatanData as any).profil_kecamatan?.telepon ||
    '(0231) 510-xxx';

  const katalogLayanan =
    templates.length > 0
      ? templates.slice(0, 8)
      : [
          { id_template: 1, kode_surat: '474', nama_surat: 'Surat Keterangan Tidak Mampu (SKTM)' },
          { id_template: 2, kode_surat: '470', nama_surat: 'Surat Keterangan Domisili Warga' },
          { id_template: 3, kode_surat: '503', nama_surat: 'Surat Keterangan Usaha (SKU)' },
          { id_template: 4, kode_surat: '474.1', nama_surat: 'Surat Keterangan Kelahiran' },
          { id_template: 5, kode_surat: '474.3', nama_surat: 'Surat Keterangan Kematian' },
          { id_template: 6, kode_surat: '300', nama_surat: 'Surat Pengantar Catatan Kepolisian (SKCK)' },
        ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 font-['Product_Sans',sans-serif]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16 md:py-24 space-y-20">
        {/* HEADER EDITORIAL */}
        <section className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3.5 py-1 text-[11px] font-medium text-white">
            <Building2 className="h-3.5 w-3.5" />
            PROFIL & LAYANAN DESA
          </span>
          <h1 className="text-3xl font-medium tracking-tight text-neutral-900 sm:text-5xl">
            Pemerintah Desa {namaDesa}
          </h1>
          <p className="text-sm leading-relaxed text-neutral-500 max-w-2xl">
            Pusat pelayanan administrasi kependudukan, penerbitan surat resmi otomatis, dan transparansi program masyarakat di wilayah Kec. {namaKecamatan}, {namaKabupaten}.
          </p>
        </section>

        {/* BENTO IDENTITAS KANTOR DESA */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="md:col-span-7 rounded-[28px] border border-black/10 bg-white p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                STRUKTUR PIMPINAN
              </span>
              <h2 className="text-2xl font-semibold text-neutral-900">{namaKades}</h2>
              <p className="text-xs text-neutral-500">
                Kepala Desa / Kuwu — Pemerintah Desa {namaDesa}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black/5 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-neutral-800 shrink-0 mt-0.5" />
                <span className="text-neutral-600 leading-relaxed">{alamatKantor}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-neutral-600">
                  <Phone className="h-4 w-4 text-neutral-800 shrink-0" />
                  <span>{kontakKantor}</span>
                </div>
                <div className="flex items-center gap-2.5 text-neutral-600">
                  <Clock className="h-4 w-4 text-neutral-800 shrink-0" />
                  <span>Senin – Jumat, 08.00 – 15.30 WIB</span>
                </div>
                <div className="flex items-center gap-2.5 text-neutral-600">
                  <Mail className="h-4 w-4 text-neutral-800 shrink-0" />
                  <span>pelayanan@mertapadawetan.desa.id</span>
                </div>
              </div>
            </div>
          </div>

          {/* KARTU CTA AJUKAN SURAT */}
          <div className="md:col-span-5 rounded-[28px] bg-neutral-950 p-8 text-white shadow-lg flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                <Sparkles className="h-3.5 w-3.5" />
                Layanan Mandiri 24/7
              </span>
              <h3 className="text-2xl font-semibold leading-snug">
                Urus Surat Keterangan Tanpa Antre di Balai Desa
              </h3>
              <p className="text-xs leading-relaxed text-neutral-400">
                Ajukan permohonan surat melalui portal warga atau asisten SVARA AI. Dokumen resmi berformat .docx otomatis dikirimkan setelah diverifikasi perangkat desa.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <span>Masuk & Ajukan Surat</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => navigate('/chat-ai')}
                className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Tanya Syarat ke AI
              </button>
            </div>
          </div>
        </section>

        {/* KATALOG PERSYARATAN SURAT RESMI */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                KATALOG ADMINISTRASI
              </span>
              <h2 className="mt-1 text-2xl font-semibold text-neutral-900">
                Jenis Layanan Surat Digital Desa
              </h2>
            </div>
            <span className="text-xs text-neutral-500">
              Syarat umum: KTP-el & Kartu Keluarga (KK) terdaftar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {katalogLayanan.map((item: any) => (
              <div
                key={item.id_template || item.nama_surat}
                onClick={() => navigate('/login')}
                className="group cursor-pointer rounded-3xl border border-black/5 bg-white p-6 shadow-xs transition-all hover:-translate-y-1 hover:shadow-md flex flex-col justify-between space-y-5"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-bold font-mono text-neutral-700">
                    KODE {item.kode_surat || 'UMUM'}
                  </span>
                  <FileText className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors">
                    {item.nama_surat}
                  </h3>
                  <p className="mt-1.5 text-xs text-neutral-500">
                    Format terbitan resmi Word (.docx) bernomor registrasi desa.
                  </p>
                </div>

                <div className="pt-3 border-t border-black/5 flex items-center justify-between text-[11px] font-medium text-neutral-700">
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tersedia Online
                  </span>
                  <span className="group-hover:translate-x-1 transition-transform">Ajukan →</span>
                </div>
              </div>
            ))}
          </div>

          {/* KATEGORI KEPERLUAN SKTM */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-neutral-900">
                Cakupan Keperluan SKTM & Rekomendasi Sosial
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {CAKUPAN_SKTM.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-black/10 bg-neutral-50 px-3.5 py-1.5 text-xs text-neutral-700"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default DesaPage;