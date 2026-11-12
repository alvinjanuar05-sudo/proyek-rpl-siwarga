import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  PlusCircle, 
  Trash2, 
  Pencil, 
  ArrowLeft, 
  User, 
  Users, 
  CheckSquare, 
  Plus, 
  Save, 
  MapPin, 
  Layers,
  FilePlus,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

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
  status?: string;
}

interface TabTemplateSuratDesaProps {
  currentDesa: any;
  dataKecamatan?: any;
  setDataKecamatan: React.Dispatch<React.SetStateAction<any>>;
}

export const TabTemplateSuratDesa: React.FC<TabTemplateSuratDesaProps> = ({
  currentDesa,
  dataKecamatan: _dataKecamatan,
  setDataKecamatan,
}) => {
  const { showToast, confirm } = useToast();
  const defaultTemplates: TemplateSurat[] = currentDesa.template_surat || [
    {
      id_template: 'TPL-001',
      nama_surat: 'Surat Keterangan Tidak Mampu (SKTM)',
      kode_surat: '475 / SKTM / IX / 2026',
      tipe_struktur: 'multi_ortu_anak',
      field_ortu: ['nama_ortu', 'nik_ortu', 'no_kk_ortu', 'pekerjaan_ortu', 'penghasilan_ortu', 'alamat_ortu'],
      field_warga: ['nama_warga', 'nik_warga', 'no_kk_warga', 'tempat_tgl_lahir', 'sekolah_univ', 'keperluan'],
      custom_fields: [
        { id: 'cf-1', label: 'Upload Slip Gaji / Keterangan RT', type: 'file', section: 'lampiran', required: false },
        { id: 'cf-2', label: 'Jumlah Tanggungan Anak', type: 'number', section: 'orang_tua', required: true, placeholder: 'Contoh: 3' },
      ],
    },
    {
      id_template: 'TPL-002',
      nama_surat: 'Surat Keterangan Usaha (SKU)',
      kode_surat: '503 / SKU / IX / 2026',
      tipe_struktur: 'single',
      field_ortu: [],
      field_warga: ['nama_warga', 'nik_warga', 'no_hp', 'tempat_tgl_lahir', 'pekerjaan', 'alamat_warga', 'keperluan'],
      custom_fields: [
        { id: 'cf-sku-1', label: 'Nama Usaha / Toko', type: 'text', section: 'warga', required: true, placeholder: 'Contoh: Toko Kelontong Berkah' },
        { id: 'cf-sku-2', label: 'Alamat Tempat Usaha', type: 'text', section: 'warga', required: true },
      ],
    }
  ];

  const [templates, setTemplates] = useState<TemplateSurat[]>(defaultTemplates);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // STATE MODE TAMPILAN ('list' = KATALOG CARD, 'edit' = FORM EDITOR)
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  const [formTemplate, setFormTemplate] = useState<TemplateSurat>({
    id_template: '',
    nama_surat: '',
    kode_surat: '',
    tipe_struktur: 'single',
    field_ortu: [],
    field_warga: [],
    custom_fields: []
  });

  const [newCustomField, setNewCustomField] = useState<CustomField>({
    id: '',
    label: '',
    type: 'text',
    section: 'warga',
    required: true,
    placeholder: '',
  });

  // Ambil daftar template surat real-time dari tabel template_surat MySQL
  const fetchTemplatesFromApi = async () => {
    try {
      setIsLoading(true);
      const res = await apiService.getTemplateSurat(currentDesa?.id_desa);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setTemplates(res.data);

        // Sinkronkan ke Context Kecamatan
        if (setDataKecamatan) {
          setDataKecamatan((prev: any) => {
            const updatedDesaList = (prev?.desa_kelurahan || []).map((d: any) => {
              if (d.id_desa === currentDesa?.id_desa || d.nama_desa_kelurahan === currentDesa?.nama_desa_kelurahan) {
                return { ...d, template_surat: res.data };
              }
              return d;
            });
            return { ...prev, desa_kelurahan: updatedDesaList };
          });
        }
      }
    } catch (err) {
      console.warn('Gagal memuat template surat dari API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplatesFromApi();
  }, [currentDesa?.id_desa]);

  const availableFieldsOrtu = [
    { key: 'nama_ortu', label: 'Nama Orang Tua / Wali' },
    { key: 'nik_ortu', label: 'NIK Orang Tua' },
    { key: 'no_kk_ortu', label: 'Nomor Kartu Keluarga (KK)' },
    { key: 'no_hp_ortu', label: 'No. HP / WhatsApp Ortu' },
    { key: 'pekerjaan_ortu', label: 'Pekerjaan Orang Tua' },
    { key: 'penghasilan_ortu', label: 'Penghasilan / Bulan (Rp)' },
    { key: 'alamat_ortu', label: 'Alamat Lengkap Ortu' },
    { key: 'rt_rw_ortu', label: 'RT / RW Ortu' },
  ];

  const availableFieldsWarga = [
    { key: 'nama_warga', label: 'Nama Lengkap Pemohon' },
    { key: 'nik_warga', label: 'NIK Pemohon' },
    { key: 'no_kk_warga', label: 'Nomor Kartu Keluarga (KK)' },
    { key: 'no_hp', label: 'No. HP / WhatsApp (Aktif)' },
    { key: 'email_warga', label: 'Email Pemohon' },
    { key: 'tempat_tgl_lahir', label: 'Tempat & Tgl Lahir' },
    { key: 'jenis_kelamin', label: 'Jenis Kelamin' },
    { key: 'agama', label: 'Agama' },
    { key: 'status_perkawinan', label: 'Status Perkawinan' },
    { key: 'kewarganegaraan', label: 'Kewarganegaraan (WNI/WNA)' },
    { key: 'pendidikan_terakhir', label: 'Pendidikan Terakhir' },
    { key: 'pekerjaan', label: 'Pekerjaan Pemohon' },
    { key: 'penghasilan_pemohon', label: 'Penghasilan Pemohon (Rp)' },
    { key: 'sekolah_univ', label: 'Sekolah / Perguruan Tinggi' },
    { key: 'alamat_warga', label: 'Alamat Domisili' },
    { key: 'rt_rw_warga', label: 'RT / RW Domisili' },
    { key: 'dusun', label: 'Dusun / Blok' },
    { key: 'keperluan', label: 'Tujuan / Keperluan Surat' },
  ];

  // BUKA EDITOR UNTUK EDIT SURAT TERPILIH
  const handleOpenEdit = (tpl: TemplateSurat) => {
    setIsCreatingNew(false);
    setFormTemplate({
      ...tpl,
      field_ortu: tpl.field_ortu || [],
      field_warga: tpl.field_warga || [],
      custom_fields: tpl.custom_fields || [],
    });
    setViewMode('edit');
  };

  // BUKA EDITOR UNTUK SURAT BARU
  const handleCreateNew = () => {
    const newId = `TPL-${Date.now().toString().slice(-4)}`;
    const newTpl: TemplateSurat = {
      id_template: newId,
      nama_surat: 'Form Layanan Surat Baru',
      kode_surat: '470 / SK / IX / 2026',
      tipe_struktur: 'single',
      field_ortu: [],
      field_warga: ['nama_warga', 'nik_warga', 'no_kk_warga', 'no_hp', 'alamat_warga', 'keperluan'],
      custom_fields: [],
    };
    setFormTemplate(newTpl);
    setIsCreatingNew(true);
    setViewMode('edit');
  };

  // HAPUS TEMPLATE DARI DATABASE MYSQL
  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (templates.length <= 1) {
      showToast('Minimal harus ada 1 form layanan surat di desa!', 'warning');
      return;
    }
    const isConfirmed = await confirm({
      title: 'Hapus Form Layanan Surat',
      message: 'Apakah Anda yakin ingin menghapus form layanan ini dari database MySQL?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      setIsSaving(true);
      const res = await apiService.deleteTemplateSurat(id);
      if (res && res.success) {
        const filtered = templates.filter((t) => t.id_template !== id);
        setTemplates(filtered);

        if (setDataKecamatan) {
          setDataKecamatan((prev: any) => {
            const updatedDesaList = (prev?.desa_kelurahan || []).map((d: any) => {
              if (d.id_desa === currentDesa.id_desa || d.nama_desa_kelurahan === currentDesa.nama_desa_kelurahan) {
                return { ...d, template_surat: filtered };
              }
              return d;
            });
            return { ...prev, desa_kelurahan: updatedDesaList };
          });
        }
        showToast('Template surat berhasil dihapus dari database MySQL!', 'success');
      } else {
        showToast('Gagal menghapus template: ' + (res?.message || 'Terjadi kesalahan'), 'error');
      }
    } catch (err: any) {
      showToast('Gagal menghubungi backend MySQL: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStandardFieldWarga = (key: string) => {
    const current = formTemplate.field_warga || [];
    const updated = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setFormTemplate({ ...formTemplate, field_warga: updated });
  };

  const toggleStandardFieldOrtu = (key: string) => {
    const current = formTemplate.field_ortu || [];
    const updated = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setFormTemplate({ ...formTemplate, field_ortu: updated });
  };

  const handleAddCustomField = () => {
    if (!newCustomField.label.trim()) return;
    const fieldToAdd: CustomField = {
      ...newCustomField,
      id: `cf-${Date.now().toString().slice(-4)}`,
    };
    setFormTemplate({
      ...formTemplate,
      custom_fields: [...(formTemplate.custom_fields || []), fieldToAdd],
    });
    setNewCustomField({ id: '', label: '', type: 'text', section: 'warga', required: true, placeholder: '' });
  };

  const handleRemoveCustomField = (id: string) => {
    setFormTemplate({
      ...formTemplate,
      custom_fields: (formTemplate.custom_fields || []).filter((f) => f.id !== id),
    });
  };

  // SIMPAN ATAU UPDATE FORM SURAT KE DATABASE MYSQL
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (isCreatingNew) {
        const payload = {
          ...formTemplate,
          id_desa: currentDesa?.id_desa || 'DESA-001',
          status: 'Aktif'
        };

        const res = await apiService.createTemplateSurat(payload);
        if (res && res.success) {
          await fetchTemplatesFromApi();
          showToast(`Konfigurasi Form "${formTemplate.nama_surat}" Berhasil Disimpan ke Database MySQL!`, 'success');
          setViewMode('list');
        } else {
          showToast('Gagal menyimpan template baru: ' + (res?.message || 'Terjadi kesalahan'), 'error');
        }
      } else {
        const res = await apiService.updateTemplateSurat(formTemplate.id_template, formTemplate);
        if (res && res.success) {
          await fetchTemplatesFromApi();
          showToast(`Konfigurasi Form "${formTemplate.nama_surat}" Berhasil Diperbarui di Database MySQL!`, 'success');
          setViewMode('list');
        } else {
          showToast('Gagal mengupdate template: ' + (res?.message || 'Terjadi kesalahan'), 'error');
        }
      }
    } catch (err: any) {
      showToast('Gagal menghubungi backend MySQL: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-['Product_Sans',sans-serif] max-w-5xl mx-auto select-none">
      
      {/* ================= VIEW 1: KATALOG CARD JENIS SURAT ================= */}
      {viewMode === 'list' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-800" />
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  Daftar Form Isian Surat Desa ({templates.length})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik salah satu kartu surat di bawah ini untuk mengedit atau menambahkan kolom input data diri warga.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateNew}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              Buat Jenis Surat Baru
            </button>
          </div>

          {/* GRID CARD SURAT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading && templates.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs italic flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                <span>Memuat data template surat dari database MySQL...</span>
              </div>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id_template}
                  className="relative p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-2xs group"
                >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-slate-900 text-white">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                      {tpl.kode_surat.split('/')[0]}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteTemplate(tpl.id_template, e)}
                    title="Hapus Form"
                    className="text-xs px-2 py-1 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                    {tpl.nama_surat}
                  </h3>
                  <p className="text-xs mt-1 font-mono text-slate-500 truncate">
                    {tpl.kode_surat}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500 text-[11px] flex items-center gap-1">
                    {tpl.tipe_struktur === 'multi_ortu_anak' ? (
                      <><Users className="w-3.5 h-3.5 text-slate-600" /> 2 Blok (Ortu + Anak)</>
                    ) : (
                      <><User className="w-3.5 h-3.5 text-slate-600" /> 1 Blok Pemohon</>
                    )}
                  </span>
                  <button
                    onClick={() => handleOpenEdit(tpl)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    Atur Form <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: PANEL CONFIGURATOR EDITOR ================= */}
      {viewMode === 'edit' && (
        <form onSubmit={handleSaveTemplate} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 text-xs">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Daftar Form
              </button>
              <div>
                <span className="font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-slate-700" />
                  Edit Konfigurasi Form: <span className="text-blue-600">{formTemplate.nama_surat}</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">Atur kolom apa saja yang wajib diisi warga saat mengajukan surat ini.</p>
              </div>
            </div>
            {isCreatingNew && (
              <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-[11px] border border-emerald-200">
                Mode Buat Baru
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nama Jenis Surat / Layanan</label>
              <input
                type="text"
                value={formTemplate.nama_surat}
                onChange={(e) => setFormTemplate({ ...formTemplate, nama_surat: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-3 font-medium focus:border-slate-800 outline-none"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Kode / Nomor Klasifikasi Surat</label>
              <input
                type="text"
                value={formTemplate.kode_surat}
                onChange={(e) => setFormTemplate({ ...formTemplate, kode_surat: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-3 font-medium focus:border-slate-800 outline-none"
                required
              />
            </div>
          </div>

          {/* STRUKTUR MODEL FORM */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-700" />
              Struktur Blok Isian Form Warga
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setFormTemplate({ ...formTemplate, tipe_struktur: 'single' })}
                className={`p-3 rounded-xl border text-left cursor-pointer text-xs transition-all flex items-center gap-2 ${
                  formTemplate.tipe_struktur === 'single'
                    ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>1 Blok (Data Pemohon Saja)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormTemplate({ ...formTemplate, tipe_struktur: 'multi_ortu_anak' })}
                className={`p-3 rounded-xl border text-left cursor-pointer text-xs transition-all flex items-center gap-2 ${
                  formTemplate.tipe_struktur === 'multi_ortu_anak'
                    ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>2 Blok (Data Orang Tua + Data Anak/Pemohon)</span>
              </button>
            </div>
          </div>

          {/* FIELD STANDAR ORANG TUA */}
          {formTemplate.tipe_struktur === 'multi_ortu_anak' && (
            <div className="space-y-2">
              <label className="font-bold text-slate-800 block flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-slate-700" />
                1A. Centang Data Orang Tua / Wali yang Harus Diisi Warga
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {availableFieldsOrtu.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-white p-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formTemplate.field_ortu?.includes(f.key)}
                      onChange={() => toggleStandardFieldOrtu(f.key)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                    />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* FIELD STANDAR PEMOHON */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-slate-700" />
              {formTemplate.tipe_struktur === 'multi_ortu_anak' ? '1B. Centang Data Pemohon / Anak yang Harus Diisi Warga' : '1. Centang Data Pemohon yang Harus Diisi Warga'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {availableFieldsWarga.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-white p-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formTemplate.field_warga?.includes(f.key)}
                    onChange={() => toggleStandardFieldWarga(f.key)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                  />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CUSTOM FIELDS DESA */}
          <div className="space-y-3 pt-2">
            <div className="border-l-4 border-slate-900 pl-3">
              <label className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                <FilePlus className="w-4 h-4 text-slate-800" />
                2. Tambah Kolom Pertanyaan Fleksibel Tambahan (Upload Berkas, Foto Usaha, Keterangan RT, dll)
              </label>
            </div>

            {formTemplate.custom_fields?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {formTemplate.custom_fields.map((cf) => (
                  <div key={cf.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800">
                    <div>
                      <span className="font-bold text-xs">{cf.label}</span>
                      <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 mt-1">
                        <span className="bg-white px-2 py-0.5 rounded border font-semibold text-slate-700">Blok: {cf.section}</span>
                        <span className="bg-white px-2 py-0.5 rounded border">Tipe: {cf.type}</span>
                        <span className="bg-white px-2 py-0.5 rounded border">{cf.required ? 'Wajib' : 'Opsional'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(cf.id)}
                      className="text-rose-600 font-bold hover:bg-rose-50 rounded-lg text-xs cursor-pointer px-2 py-1 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* RACIK FIELD KHUSUS BARU */}
            <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 space-y-3">
              <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-slate-700" /> Tambah Pertanyaan / Field Input Custom Baru
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">Nama Kolom / Label Input</span>
                  <input
                    type="text"
                    placeholder="Contoh: No. Surat Pengantar RT / Luas Tanah Usaha"
                    value={newCustomField.label}
                    onChange={(e) => setNewCustomField({ ...newCustomField, label: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2.5 bg-white outline-none text-xs focus:border-slate-800"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">Tipe Input</span>
                  <select
                    value={newCustomField.type}
                    onChange={(e) => setNewCustomField({ ...newCustomField, type: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-300 p-2.5 bg-white outline-none text-xs font-medium focus:border-slate-800"
                  >
                    <option value="text">Teks Pendek</option>
                    <option value="number">Angka / Nominal (Rp)</option>
                    <option value="file">Upload Berkas / Foto</option>
                    <option value="textarea">Teks Paragraf Panjang</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" /> Penempatan Blok Form
                  </span>
                  <select
                    value={newCustomField.section}
                    onChange={(e) => setNewCustomField({ ...newCustomField, section: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-300 p-2.5 bg-white outline-none text-xs font-medium focus:border-slate-800"
                  >
                    <option value="orang_tua">Blok Data Orang Tua / Wali</option>
                    <option value="warga">Blok Data Pemohon / Anak</option>
                    <option value="lampiran">Lampiran / Upload Dokumen</option>
                  </select>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer pb-2.5">
                    <input
                      type="checkbox"
                      checked={newCustomField.required}
                      onChange={(e) => setNewCustomField({ ...newCustomField, required: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                    />
                    Wajib Diisi Warga
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Field Custom
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setViewMode('list')}
              className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan ke MySQL...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan Pengaturan Form Ini
                </>
              )}
            </button>
          </div>
        </form>
      )}

    </div>
  );
};

export default TabTemplateSuratDesa;