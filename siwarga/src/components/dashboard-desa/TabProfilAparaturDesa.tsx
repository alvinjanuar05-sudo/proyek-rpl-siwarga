import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export interface AparaturLain {
  id: string;
  nama: string;
  jabatan: string;
  kontak: string;
  tupoksi: string;
  foto?: string;
}

interface TabProfilAparaturDesaProps {
  currentDesa: any;
  dataKecamatan: any;
  setDataKecamatan: (data: any) => void;
  isEmergencyLocked: boolean;
  currentUser: any;
}

export const TabProfilAparaturDesa: React.FC<TabProfilAparaturDesaProps> = ({
  currentDesa,
  dataKecamatan,
  setDataKecamatan,
  isEmergencyLocked,
  currentUser,
}) => {
  const { showToast, confirm } = useToast();
  const [profilForm, setProfilForm] = useState({
    id_desa: currentDesa?.id_desa || 'DESA-001',
    nama_desa_kelurahan: currentDesa?.nama_desa_kelurahan || currentDesa?.nama || 'Sukamaju',
    nama_kecamatan: dataKecamatan?.nama_kecamatan || 'Astanajapura',
    nama_kabupaten: dataKecamatan?.nama_kabupaten || 'Kabupaten Cirebon',
    nama_kepala_desa_lurah: currentDesa?.nama_kepala_desa_lurah || currentDesa?.kades || '',
    foto_kades: currentDesa?.foto_kades || '',
    nama_sekdes: currentDesa?.nama_sekdes || '',
    foto_sekdes: currentDesa?.foto_sekdes || '',
    nomor_kontak: currentDesa?.nomor_kontak || '',
    alamat_kantor: currentDesa?.alamat_kantor || 'Jl. Raya Desa Sukamaju No. 10',
    email_resmi: currentDesa?.email_resmi || 'desa.sukamaju@siwarga.go.id',
  });

  const [listAparaturLain, setListAparaturLain] = useState<AparaturLain[]>(
    currentDesa?.aparatur_lain || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSavingProfil, setIsSavingProfil] = useState<boolean>(false);
  const [isModalAparaturOpen, setIsModalAparaturOpen] = useState(false);
  const [editingAparaturId, setEditingAparaturId] = useState<string | null>(null);
  const [formAparaturLain, setFormAparaturLain] = useState<AparaturLain>({
    id: '',
    nama: '',
    jabatan: '',
    kontak: '',
    tupoksi: '',
    foto: '',
  });

  // 1. FETCH DATA PROFIL DESA MURNI DARI API MYSQL
  const fetchProfilDesa = async () => {
    try {
      const res = await apiService.getProfilDesa();
      if (res && res.success && res.data) {
        const d = res.data;
        const fetchedData = {
          id_desa: d.id_desa || 'DESA-001',
          nama_desa_kelurahan: d.nama_desa_kelurahan || 'Sukamaju',
          nama_kecamatan: d.nama_kecamatan || 'Astanajapura',
          nama_kabupaten: d.nama_kabupaten || 'Kabupaten Cirebon',
          nama_kepala_desa_lurah: d.nama_kepala_desa_lurah || '',
          foto_kades: d.foto_kades || '',
          nama_sekdes: d.nama_sekdes || '',
          foto_sekdes: d.foto_sekdes || '',
          nomor_kontak: d.nomor_kontak || '',
          alamat_kantor: d.alamat_kantor || '',
          email_resmi: d.email_resmi || '',
        };
        setProfilForm(fetchedData);
        try {
          updateLocalCache(undefined, fetchedData);
        } catch (cacheErr) {
          console.warn('Peringatan: Gagal update cache lokal saat fetch profil desa:', cacheErr);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil profil desa dari REST API:', err);
    }
  };

  // 2. FETCH DATA APARATUR DARI REST API MYSQL
  const fetchAparatur = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getAparatur();
      if (res && res.success && Array.isArray(res.data)) {
        const mappedData: AparaturLain[] = res.data.map((item: any) => ({
          id: item.id || item.id_aparatur,
          nama: item.nama,
          jabatan: item.jabatan,
          kontak: item.kontak || item.no_hp || '',
          tupoksi: item.tupoksi || item.keterangan || item.email || '',
          foto: item.foto || '',
        }));
        setListAparaturLain(mappedData);
        try {
          updateLocalCache(mappedData);
        } catch (cacheErr) {
          console.warn('Peringatan: Gagal update cache lokal saat fetch aparatur:', cacheErr);
        }
      } else {
        setListAparaturLain(currentDesa?.aparatur_lain || []);
      }
    } catch (err) {
      console.error('Gagal mengambil data aparatur dari API:', err);
      setListAparaturLain(currentDesa?.aparatur_lain || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfilDesa();
    fetchAparatur();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran berkas terlalu besar! Maksimal ukuran foto adalah 5 MB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Helper untuk mengosongkan string foto Base64 panjang khusus cache LocalStorage
  const sanitizePhotoForStorage = (photo?: string): string => {
    if (!photo || typeof photo !== 'string') return '';
    if (photo.startsWith('data:image') || photo.length > 500) {
      return '';
    }
    return photo;
  };

  // UPDATE KE LOCAL STORAGE UTK FALLBACK CACHE
  const updateLocalCache = (overrideAparaturLain?: AparaturLain[], overrideProfil?: any) => {
    try {
      const activeProfil = overrideProfil || profilForm;
      const activeAparatur = overrideAparaturLain || listAparaturLain;

      const updatedDesa = {
        ...currentDesa,
        ...activeProfil,
        aparatur_lain: activeAparatur,
      };

      const prevList = dataKecamatan?.desa_kelurahan || [];
      let updatedDesaList = prevList.map((d: any) => {
        if (d.id_desa === activeProfil.id_desa || d.id === activeProfil.id_desa) {
          return {
            ...d,
            ...activeProfil,
            aparatur_lain: activeAparatur,
          };
        }
        return d;
      });

      if (!updatedDesaList.some((d: any) => d.id_desa === activeProfil.id_desa || d.id === activeProfil.id_desa)) {
        updatedDesaList = [updatedDesa, ...prevList];
      }

      const sanitizedDesaList = updatedDesaList.map((d: any) => ({
        ...d,
        foto_kades: sanitizePhotoForStorage(d.foto_kades),
        foto_sekdes: sanitizePhotoForStorage(d.foto_sekdes),
        aparatur_lain: Array.isArray(d.aparatur_lain)
          ? d.aparatur_lain.map((ap: any) => ({
              ...ap,
              foto: sanitizePhotoForStorage(ap.foto),
            }))
          : [],
      }));

      const storagePayload = {
        ...(dataKecamatan || {}),
        logo_kabupaten: sanitizePhotoForStorage(dataKecamatan?.logo_kabupaten),
        nama_kecamatan: activeProfil.nama_kecamatan,
        nama_kabupaten: activeProfil.nama_kabupaten,
        desa_kelurahan: sanitizedDesaList,
      };

      try {
        localStorage.setItem('svara_kecamatan_data', JSON.stringify(storagePayload));
      } catch (storageErr) {
        console.warn('LocalStorage quota warning (svara_kecamatan_data):', storageErr);
      }

      try {
        localStorage.setItem('kecamatan_app_data', JSON.stringify(storagePayload));
      } catch (storageErr) {
        console.warn('LocalStorage quota warning (kecamatan_app_data):', storageErr);
      }

      if (setDataKecamatan) {
        try {
          setDataKecamatan(storagePayload);
        } catch (ctxErr) {
          console.warn('Peringatan: Gagal memperbarui state context kecamatan:', ctxErr);
        }
      }
    } catch (err) {
      console.warn('Peringatan: Gagal memperbarui cache lokal profil desa:', err);
    }
  };

  // 3. SIMPAN PROFIL DESA LANGSUNG KE MYSQL VIA REST API
  const handleSaveProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmergencyLocked) {
      showToast('Sistem dalam Modus Darurat (Locked by Super Admin). Perubahan tidak dapat disimpan!', 'warning');
      return;
    }

    setIsSavingProfil(true);
    try {
      const res = await apiService.updateProfilDesa(profilForm);

      if (res && res.success) {
        const savedData = res.data || profilForm;
        setProfilForm((prev) => ({
          ...prev,
          ...savedData,
        }));

        try {
          updateLocalCache(undefined, savedData);
        } catch (cacheErr) {
          console.warn('Peringatan: Gagal memperbarui cache lokal profil:', cacheErr);
        }

        try {
          const currentLogs = JSON.parse(localStorage.getItem('svara_audit_logs') || '[]');
          const newLog = {
            id: Date.now().toString(),
            waktu: new Date().toLocaleString('id-ID'),
            aktor: currentUser?.nama || 'ADMIN_DESA',
            aksi: `Memperbarui Data Profil Desa ${savedData.nama_desa_kelurahan || profilForm.nama_desa_kelurahan}`,
          };
          localStorage.setItem('svara_audit_logs', JSON.stringify([newLog, ...currentLogs]));
        } catch (logErr) {
          console.warn('Peringatan: Gagal mencatat audit log ke LocalStorage:', logErr);
        }

        showToast('Data Profil & Aparatur Desa Berhasil Disimpan ke Database MySQL!', 'success');
      } else {
        showToast(`Gagal menyimpan ke database: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err: any) {
      console.error('Error simpan profil desa:', err);
      showToast('Error koneksi ke server database saat menyimpan profil desa: ' + (err.message || ''), 'error');
    } finally {
      setIsSavingProfil(false);
    }
  };

  const handleOpenAddAparatur = () => {
    setEditingAparaturId(null);
    setFormAparaturLain({
      id: '',
      nama: '',
      jabatan: '',
      kontak: '',
      tupoksi: '',
      foto: '',
    });
    setIsModalAparaturOpen(true);
  };

  const handleOpenEditAparatur = (item: AparaturLain) => {
    setEditingAparaturId(item.id);
    setFormAparaturLain(item);
    setIsModalAparaturOpen(true);
  };

  const handleDeleteAparatur = async (id: string) => {
    if (isEmergencyLocked) {
      showToast('Sistem dalam Modus Darurat. Perubahan tidak dapat dilakukan!', 'warning');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Hapus Data Aparatur',
      message: 'Apakah Anda yakin ingin menghapus data aparatur ini dari database MySQL?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      const res = await apiService.deleteAparatur(id);
      if (res && res.success) {
        const updatedList = listAparaturLain.filter((item) => item.id !== id);
        setListAparaturLain(updatedList);
        try {
          updateLocalCache(updatedList);
        } catch (cacheErr) {
          console.warn('Peringatan: Gagal sinkronisasi cache setelah hapus aparatur:', cacheErr);
        }
        showToast('Data aparatur berhasil dihapus dari MySQL.', 'success');
      } else {
        showToast(`Gagal menghapus aparatur: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err: any) {
      console.error('Error delete aparatur:', err);
      showToast('Terjadi kesalahan koneksi saat menghapus data aparatur: ' + (err.message || ''), 'error');
    }
  };

  const handleSaveAparaturModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAparaturLain.nama.trim() || !formAparaturLain.jabatan.trim()) {
      showToast('Mohon isi nama lengkap dan jabatan aparatur!', 'warning');
      return;
    }

    const payload = {
      id_desa: profilForm.id_desa || 'DESA-001',
      nama: formAparaturLain.nama.trim(),
      jabatan: formAparaturLain.jabatan.trim(),
      kontak: formAparaturLain.kontak.trim(),
      no_hp: formAparaturLain.kontak.trim(),
      tupoksi: formAparaturLain.tupoksi.trim(),
      keterangan: formAparaturLain.tupoksi.trim(),
      foto: formAparaturLain.foto || null,
      urutan: 1,
    };

    try {
      let res;
      if (editingAparaturId) {
        res = await apiService.updateAparatur(editingAparaturId, payload);
      } else {
        res = await apiService.createAparatur(payload);
      }

      if (res && res.success) {
        setIsModalAparaturOpen(false);

        let updatedList: AparaturLain[] = [];
        if (editingAparaturId) {
          updatedList = listAparaturLain.map((item) =>
            item.id === editingAparaturId
              ? {
                  ...item,
                  nama: payload.nama,
                  jabatan: payload.jabatan,
                  kontak: payload.kontak,
                  tupoksi: payload.tupoksi,
                  foto: payload.foto || item.foto || '',
                }
              : item
          );
        } else {
          const newItem: AparaturLain = {
            id: res.data?.id || res.id || res.id_aparatur || `APR-${Date.now()}`,
            nama: payload.nama,
            jabatan: payload.jabatan,
            kontak: payload.kontak,
            tupoksi: payload.tupoksi,
            foto: payload.foto || '',
          };
          updatedList = [...listAparaturLain, newItem];
        }

        setListAparaturLain(updatedList);
        try {
          updateLocalCache(updatedList);
        } catch (cacheErr) {
          console.warn('Peringatan: Gagal sinkronisasi cache aparatur:', cacheErr);
        }
        fetchAparatur();

        showToast(
          editingAparaturId
            ? 'Data Aparatur Desa Berhasil Diperbarui di MySQL!'
            : 'Data Aparatur Desa Berhasil Disimpan ke MySQL!',
          'success'
        );
      } else {
        showToast(`Gagal menyimpan aparatur: ${res?.message || res?.error || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err: any) {
      console.error('Error saving aparatur:', err);
      showToast('Terjadi kesalahan koneksi saat menyimpan data aparatur: ' + (err.message || ''), 'error');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 py-2">
      <div className="border-b border-black/80 pb-2">
        <h2 className="text-base font-medium text-black font-['Product_Sans']">
          Data Eksekutif & Aparatur Desa
        </h2>
        <p className="text-xs text-black/50 mt-0.5 font-['Product_Sans']">
          Perubahan data profil & aparatur desa akan tersimpan ke MySQL dan otomatis diperbarui pada AI Chat Warga.
        </p>
      </div>

      <form onSubmit={handleSaveProfil} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="border-b border-black/80 pb-3 text-center relative cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, (base64) => setProfilForm((p) => ({ ...p, foto_kades: base64 })))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              disabled={isEmergencyLocked}
            />
            <span className="block text-xs font-medium text-black mb-2 font-['Product_Sans']">Foto Resmi Kepala Desa / Lurah</span>
            {profilForm.foto_kades ? (
              <img
                src={profilForm.foto_kades}
                alt="Foto Kades"
                className="mx-auto h-20 w-20 object-cover rounded-full border border-black/20 mb-2"
              />
            ) : (
              <div className="mx-auto h-20 w-20 rounded-full border border-dashed border-black/30 flex items-center justify-center text-[10px] text-black/40 mb-2">
                Belum Ada Foto
              </div>
            )}
            <p className="text-[11px] font-medium text-black/70 font-['Product_Sans']">Unggah Foto Kades</p>
            <p className="text-[10px] text-black/40 font-['Product_Sans']">Format Resmi Dinas (Maks 2MB)</p>
          </div>

          <div className="border-b border-black/80 pb-3 text-center relative cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, (base64) => setProfilForm((p) => ({ ...p, foto_sekdes: base64 })))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              disabled={isEmergencyLocked}
            />
            <span className="block text-xs font-medium text-black mb-2 font-['Product_Sans']">Foto Sekretaris Desa (Sekdes)</span>
            {profilForm.foto_sekdes ? (
              <img
                src={profilForm.foto_sekdes}
                alt="Foto Sekdes"
                className="mx-auto h-20 w-20 object-cover rounded-full border border-black/20 mb-2"
              />
            ) : (
              <div className="mx-auto h-20 w-20 rounded-full border border-dashed border-black/30 flex items-center justify-center text-[10px] text-black/40 mb-2">
                Belum Ada Foto
              </div>
            )}
            <p className="text-[11px] font-medium text-black/70 font-['Product_Sans']">Unggah Foto Sekdes</p>
            <p className="text-[10px] text-black/40 font-['Product_Sans']">Format Resmi Dinas (Maks 2MB)</p>
          </div>
        </div>

        {/* INPUT WILAYAH DESA, KECAMATAN, KABUPATEN */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative border-b border-black/80 pb-1.5">
            <label className="block text-xs font-medium text-black mb-0.5 font-['Product_Sans']">Nama Desa / Kelurahan</label>
            <input
              type="text"
              value={profilForm.nama_desa_kelurahan}
              onChange={(e) => setProfilForm({ ...profilForm, nama_desa_kelurahan: e.target.value })}
              className="w-full bg-transparent text-xs font-medium text-black outline-none font-['Product_Sans']"
              required
              disabled={isEmergencyLocked}
            />
          </div>
          <div className="relative border-b border-black/80 pb-1.5">
            <label className="block text-xs font-medium text-black mb-0.5 font-['Product_Sans']">Kecamatan</label>
            <input
              type="text"
              value={profilForm.nama_kecamatan}
              onChange={(e) => setProfilForm({ ...profilForm, nama_kecamatan: e.target.value })}
              className="w-full bg-transparent text-xs font-medium text-black outline-none font-['Product_Sans']"
              required
              disabled={isEmergencyLocked}
            />
          </div>
          <div className="relative border-b border-black/80 pb-1.5">
            <label className="block text-xs font-medium text-black mb-0.5 font-['Product_Sans']">Kabupaten / Kota</label>
            <input
              type="text"
              value={profilForm.nama_kabupaten}
              onChange={(e) => setProfilForm({ ...profilForm, nama_kabupaten: e.target.value })}
              className="w-full bg-transparent text-xs font-medium text-black outline-none font-['Product_Sans']"
              required
              disabled={isEmergencyLocked}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative border-b border-black/80 pb-1.5">
            <label className="block text-xs font-medium text-black mb-0.5 font-['Product_Sans']">Nama Kepala Desa / Lurah</label>
            <input
              type="text"
              value={profilForm.nama_kepala_desa_lurah}
              onChange={(e) => setProfilForm({ ...profilForm, nama_kepala_desa_lurah: e.target.value })}
              className="w-full bg-transparent text-xs font-medium text-black outline-none font-['Product_Sans']"
              required
              disabled={isEmergencyLocked}
            />
          </div>
          <div className="relative border-b border-black/80 pb-1.5">
            <label className="block text-xs font-medium text-black mb-0.5 font-['Product_Sans']">Nama Sekretaris Desa (Sekdes)</label>
            <input
              type="text"
              value={profilForm.nama_sekdes}
              onChange={(e) => setProfilForm({ ...profilForm, nama_sekdes: e.target.value })}
              placeholder="Masukkan nama Sekdes"
              className="w-full bg-transparent text-xs font-medium text-black outline-none placeholder:text-black/30 font-['Product_Sans']"
              disabled={isEmergencyLocked}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative border-b border-black/80 pb-1.5">
            <label className="block text-xs font-medium text-black mb-0.5 font-['Product_Sans']">Nomor Kontak Kantor Desa</label>
            <input
              type="text"
              value={profilForm.nomor_kontak}
              onChange={(e) => setProfilForm({ ...profilForm, nomor_kontak: e.target.value })}
              className="w-full bg-transparent text-xs font-medium text-black outline-none font-['Product_Sans']"
              required
              disabled={isEmergencyLocked}
            />
          </div>
          <div className="relative border-b border-black/80 pb-1.5">
            <label className="block text-xs font-medium text-black mb-0.5 font-['Product_Sans']">Email Resmi Kantor Desa</label>
            <input
              type="email"
              value={profilForm.email_resmi}
              onChange={(e) => setProfilForm({ ...profilForm, email_resmi: e.target.value })}
              className="w-full bg-transparent text-xs font-medium text-black outline-none font-['Product_Sans']"
              disabled={isEmergencyLocked}
            />
          </div>
        </div>

        <div className="relative border-b border-black/80 pb-1.5">
          <label className="block text-xs font-medium text-black mb-0.5 font-['Product_Sans']">Alamat Lengkap Kantor Desa</label>
          <input
            type="text"
            value={profilForm.alamat_kantor}
            onChange={(e) => setProfilForm({ ...profilForm, alamat_kantor: e.target.value })}
            className="w-full bg-transparent text-xs font-medium text-black outline-none font-['Product_Sans']"
            disabled={isEmergencyLocked}
          />
        </div>

        <div className="pt-2 flex justify-center">
          <button
            type="submit"
            disabled={isEmergencyLocked || isSavingProfil}
            className={`w-44 h-8 bg-neutral-800 rounded-3xl shadow-[inset_0px_-3px_5px_0px_rgba(255,255,255,0.2),inset_0px_3px_5px_0px_rgba(0,0,0,0.4)] border border-black/10 text-white text-xs font-medium flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors font-['Product_Sans'] ${
              isEmergencyLocked || isSavingProfil ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSavingProfil ? 'Menyimpan...' : isEmergencyLocked ? 'Dikunci' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>

      {/* SEKSI STRUKTUR KEPENGURUSAN & APARATUR DESA LAINNYA */}
      <div className="pt-6 border-t border-black/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-black">
                Struktur Kepengurusan & Aparatur Desa Lainnya
              </h3>
              {/* TOMBOL REFRESH SSOT STANDARIZED */}
              <button
                onClick={fetchAparatur}
                className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 border border-black/5 active:scale-95"
                title="Refresh Data dari MySQL"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-black' : 'text-slate-600'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
            <p className="text-[11px] text-black/50 mt-0.5">
              Tambahkan Kasi, Kaur, Kadus, atau pengurus lainnya agar AI SVARA memberikan informasi presisi.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddAparatur}
            disabled={isEmergencyLocked}
            className="px-3 py-1.5 bg-black text-white rounded-2xl text-xs font-medium flex items-center gap-1.5 hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Tambah Aparatur</span>
          </button>
        </div>

        {/* LIST CARD APARATUR LAINNYA */}
        {isLoading ? (
          <div className="p-4 border border-dashed border-black/20 rounded-xl text-center text-xs text-black/40">
            Memuat data aparatur dari database MySQL...
          </div>
        ) : listAparaturLain.length === 0 ? (
          <div className="p-4 border border-dashed border-black/20 rounded-xl text-center text-xs text-black/40">
            Belum ada struktur aparatur tambahan. Klik tombol di atas untuk menambahkan Kasi/Kaur/Kadus.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {listAparaturLain.map((item) => (
              <div
                key={item.id}
                className="p-3 border border-black/10 rounded-xl bg-neutral-50/50 flex flex-col justify-between gap-2 relative group hover:border-black/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  {item.foto ? (
                    <img
                      src={item.foto}
                      alt={item.nama}
                      className="w-12 h-12 rounded-full object-cover border border-black/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-neutral-200 border border-black/10 flex items-center justify-center text-neutral-500 font-medium text-xs flex-shrink-0">
                      {item.nama ? item.nama.substring(0, 2).toUpperCase() : 'AP'}
                    </div>
                  )}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-xs font-bold text-black truncate">{item.nama}</p>
                    <p className="text-[11px] font-medium text-neutral-600">{item.jabatan}</p>
                    <p className="text-[10px] text-black/50">Kontak: {item.kontak || '-'}</p>
                  </div>
                </div>

                {item.tupoksi && (
                  <div className="p-2 bg-white rounded-lg border border-black/5 text-[10.5px] text-black/70 leading-relaxed line-clamp-2">
                    <span className="font-semibold text-black">Tupoksi: </span>
                    {item.tupoksi}
                  </div>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-black/5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditAparatur(item)}
                    disabled={isEmergencyLocked}
                    className="p-1.5 text-black/60 hover:text-black rounded-md hover:bg-neutral-200/60 transition-colors cursor-pointer"
                    title="Edit Informasi"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAparatur(item.id)}
                    disabled={isEmergencyLocked}
                    className="p-1.5 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                    title="Hapus"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL POP-UP TAMBAH / EDIT APARATUR DESA */}
      {isModalAparaturOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-black/10 shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in fade-in duration-200 font-['Product_Sans'] my-auto">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">
                {editingAparaturId ? 'Edit Data Aparatur Desa' : 'Tambah Struktur Aparatur Desa'}
              </h3>
              <button
                onClick={() => setIsModalAparaturOpen(false)}
                className="text-black/40 hover:text-black cursor-pointer p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveAparaturModal} className="space-y-4 text-xs">
              <div className="flex items-center gap-4 border-b border-black/10 pb-3">
                {formAparaturLain.foto ? (
                  <img
                    src={formAparaturLain.foto}
                    alt="Preview"
                    className="w-14 h-14 rounded-full object-cover border border-black/20"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-neutral-100 border border-dashed border-black/30 flex items-center justify-center text-[10px] text-black/40">
                    No Foto
                  </div>
                )}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageUpload(e, (base64) =>
                        setFormAparaturLain((prev) => ({ ...prev, foto: base64 }))
                      )
                    }
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-neutral-100 border border-black/20 rounded-xl text-xs font-medium text-black hover:bg-neutral-200 transition-colors pointer-events-none"
                  >
                    Unggah Foto Profil
                  </button>
                  <p className="text-[10px] text-black/40 mt-1">Format JPG/PNG (Maks 2MB)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-medium text-black">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    value={formAparaturLain.nama}
                    onChange={(e) =>
                      setFormAparaturLain((prev) => ({ ...prev, nama: e.target.value }))
                    }
                    placeholder="Contoh: Bpk. Budi Santoso, S.AP"
                    className="w-full px-3 py-2 border border-black/20 rounded-xl outline-none focus:border-black font-['Product_Sans']"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-medium text-black">Jabatan / Bagian</label>
                  <input
                    type="text"
                    value={formAparaturLain.jabatan}
                    onChange={(e) =>
                      setFormAparaturLain((prev) => ({ ...prev, jabatan: e.target.value }))
                    }
                    placeholder="Contoh: Kasi Pelayanan / Kaur Keuangan"
                    className="w-full px-3 py-2 border border-black/20 rounded-xl outline-none focus:border-black font-['Product_Sans']"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-black">Nomor WA / Kontak</label>
                <input
                  type="text"
                  value={formAparaturLain.kontak}
                  onChange={(e) =>
                    setFormAparaturLain((prev) => ({ ...prev, kontak: e.target.value }))
                  }
                  placeholder="Contoh: 0812-3456-7890"
                  className="w-full px-3 py-2 border border-black/20 rounded-xl outline-none focus:border-black font-['Product_Sans']"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-black">
                  Tupoksi (Tugas Pokok & Fungsi)
                </label>
                <textarea
                  rows={3}
                  value={formAparaturLain.tupoksi}
                  onChange={(e) =>
                    setFormAparaturLain((prev) => ({ ...prev, tupoksi: e.target.value }))
                  }
                  placeholder="Jelaskan ruang lingkup tugas..."
                  className="w-full px-3 py-2 border border-black/20 rounded-xl outline-none focus:border-black font-['Product_Sans'] resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsModalAparaturOpen(false)}
                  className="px-4 py-2 border border-black/20 rounded-2xl text-black hover:bg-neutral-100 transition-colors font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black text-white rounded-2xl hover:bg-neutral-800 transition-colors font-medium cursor-pointer"
                >
                  Simpan Aparatur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabProfilAparaturDesa;