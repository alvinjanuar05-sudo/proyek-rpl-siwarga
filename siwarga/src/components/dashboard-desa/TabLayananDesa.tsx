import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, 
  Zap, 
  Users, 
  User, 
  FileCheck2, 
  FileText, 
  Layers, 
  Inbox
} from 'lucide-react';
import { apiService } from '../../services/api';

interface TabLayananDesaProps {
  currentDesa: any;
}

export const TabLayananDesa: React.FC<TabLayananDesaProps> = ({ currentDesa }) => {
  // Ambil daftar template surat secara real-time dari tabel template_surat di MySQL
  const [listSurat, setListSurat] = useState<any[]>(currentDesa?.template_surat || []);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        const res = await apiService.getTemplateSurat(currentDesa?.id_desa);
        if (isMounted && res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setListSurat(res.data);
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi katalog surat dari API MySQL:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTemplates();
    return () => { isMounted = false; };
  }, [currentDesa?.id_desa, currentDesa?.template_surat]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6 select-none font-['Product_Sans',sans-serif]">
      
      {/* HEADER SECTION */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-slate-800" />
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Katalog Layanan Surat & Administrasi Desa ({listSurat.length})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar otomatis layanan resmi yang aktif di Desa {currentDesa?.nama_desa_kelurahan || currentDesa?.nama || 'Sukamaju'}. Persyaratan ini menjadi rujukan utama AI Chatbot Warga.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300 self-start sm:self-auto shrink-0 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
          Terhubung Otomatis dengan Kelola Form Surat
        </span>
      </div>

      {/* GRID DAFTAR LAYANAN AKTIF (MEMBACA LANGSUNG DARI TEMPLATE SURAT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && listSurat.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <p>Menghubungkan ke database MySQL & memuat template surat...</p>
          </div>
        ) : listSurat.length > 0 ? (
          listSurat.map((surat, idx) => {
            // Ekstrak berkas / persyaratan tambahan dari custom_fields yang diset admin
            const berkasTambahan = (surat.custom_fields || [])
              .map((cf: any) => cf.label)
              .join(', ');

            return (
              <div 
                key={surat.id_template || idx} 
                className="border border-slate-200 p-5 rounded-2xl bg-slate-50/80 hover:bg-white hover:border-slate-300 transition-all space-y-3 shadow-2xs"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block font-bold">
                      KODE: {surat.kode_surat}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-0.5 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-700 shrink-0" />
                      {surat.nama_surat}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-bold text-[9px] shrink-0">
                    Layanan Aktif
                  </span>
                </div>

                {/* SKEMA STRUKTUR BLOK FORM */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                    {surat.tipe_struktur === 'multi_ortu_anak' ? (
                      <><Users className="w-3 h-3 text-slate-600" /> Form 2 Blok (Ortu + Pemohon)</>
                    ) : (
                      <><User className="w-3 h-3 text-slate-600" /> Form 1 Blok (Pemohon)</>
                    )}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-600" />
                    {(surat.field_warga?.length || 0) + (surat.field_ortu?.length || 0)} Kolom Standard
                  </span>
                </div>

                {/* PERSYARATAN BERKAS SINKRON DARI INPUTAN DESA */}
                <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="font-bold text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-700" />
                    Persyaratan Dokumen & Data Wajib:
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-700">
                    Surat Pengantar RT/RW, Fotokopi KTP & KK Pemohon
                    {berkasTambahan ? `, ${berkasTambahan}` : ''}.
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <Inbox className="w-8 h-8 mx-auto text-slate-300" />
            <p>Belum ada template surat yang dikonfigurasi di tab 'Kelola Form Surat'.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default TabLayananDesa;