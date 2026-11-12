import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Home, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  Camera, 
  X, 
  ShieldAlert, 
  Phone, 
  UserCheck, 
  Users 
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export interface RTItem {
  nomor: string;
  ketua: string;
  kontak: string;
  foto: string;
}

export interface RWItem {
  nomor: string;
  ketua: string;
  kontak: string;
  foto: string;
  rt: RTItem[];
}

export interface DesaItem {
  id_desa?: string;
  nama_desa_kelurahan: string;
  rw?: RWItem[];
  [key: string]: any;
}

interface TabRwRtDesaProps {
  currentDesa: DesaItem;
  dataKecamatan: { desa_kelurahan?: DesaItem[]; [key: string]: any };
  setDataKecamatan: React.Dispatch<React.SetStateAction<any>>;
}

export const TabRwRtDesa: React.FC<TabRwRtDesaProps> = ({
  currentDesa,
  dataKecamatan,
  setDataKecamatan,
}) => {
  const { showToast, confirm } = useToast();
  const isEmergencyLocked = localStorage.getItem('svara_emergency_lock') === 'true';

  // LOCAL STATE DAFTAR RW & RT
  const [daftarRW, setDaftarRW] = useState<RWItem[]>(() => currentDesa?.rw || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync state lokal ketika prop currentDesa berubah
  useEffect(() => {
    if (currentDesa?.rw) {
      setDaftarRW(currentDesa.rw);
    }
  }, [currentDesa]);

  // STATE FORM REGISTRASI
  const [formRW, setFormRW] = useState({ nomor: '', ketua: '', kontak: '', foto: 'https://placehold.co/100' });
  const [formRT, setFormRT] = useState({ rwInduk: '', nomor: '', ketua: '', kontak: '', foto: 'https://placehold.co/100' });

  // STATE MODAL EDIT
  const [editModal, setEditModal] = useState<{
    open: boolean;
    type: 'RW' | 'RT';
    rwNomor: string;
    rtNomor?: string;
    ketua: string;
    kontak: string;
    foto: string;
  }>({
    open: false,
    type: 'RW',
    rwNomor: '',
    ketua: '',
    kontak: '',
    foto: ''
  });

  // FUNGSI REFRESH DATA STRUKTUR
  const fetchStrukturData = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getStrukturRTRW();
      if (res && res.success && Array.isArray(res.data)) {
        const targetDesa = res.data.find(
          (d: any) =>
            (d.id_desa && d.id_desa === currentDesa.id_desa) ||
            (d.nama_desa && d.nama_desa.toLowerCase() === (currentDesa.nama_desa_kelurahan || '').toLowerCase())
        );
        if (targetDesa && targetDesa.rw) {
          setDaftarRW(targetDesa.rw);
        }
      }
    } catch (err) {
      console.error('Gagal menyegarkan data RT/RW:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // SINKRONISASI GLOBAL (DENGAN LOCALSTORAGE & MYSQL BACKEND VIA API SERVICE)
  const syncToGlobal = async (updatedRWList: RWItem[], logMsg: string) => {
    if (isEmergencyLocked) {
      showToast('Sistem dalam Modus Darurat! Super Admin membekukan perubahan data.', 'warning');
      return;
    }

    setDaftarRW(updatedRWList);

    const desaList = dataKecamatan?.desa_kelurahan || [currentDesa];
    const updatedDesa = desaList.map((d: DesaItem) => {
      if (
        (d.id_desa && d.id_desa === currentDesa.id_desa) ||
        d.nama_desa_kelurahan === currentDesa.nama_desa_kelurahan
      ) {
        return { ...d, rw: updatedRWList };
      }
      return d;
    });

    const newState = {
      ...(dataKecamatan || {}),
      desa_kelurahan: updatedDesa
    };

    // 1. UPDATE LOCALSTORAGE AGAR PERSISTEN PADA FRONTEND
    localStorage.setItem('svara_kecamatan_data', JSON.stringify(newState));
    localStorage.setItem('kecamatan_app_data', JSON.stringify(newState));

    // 2. KIRIM DATA RT/RW KE MYSQL VIA API SERVICE
    try {
      await apiService.updateStrukturRTRW({
        id_desa: currentDesa?.id_desa || 'DESA-001',
        nama_desa: currentDesa?.nama_desa_kelurahan || 'Sukamaju',
        nama_kecamatan: dataKecamatan?.nama_kecamatan || 'Astanajapura',
        rw: updatedRWList
      });
    } catch (err) {
      console.warn('Gagal menyimpan data RT/RW ke database MySQL:', err);
    }

    // 3. UPDATE STATE REACT CONTEXT
    if (setDataKecamatan) {
      setDataKecamatan(newState);
    }

    // 4. INJEKSI AUDIT LOG
    const currentAuditLogs = JSON.parse(localStorage.getItem('svara_audit_logs') || '[]');
    const newAudit = {
      id: Date.now().toString(),
      waktu: new Date().toLocaleString('id-ID'),
      aktor: 'ADMIN_DESA',
      aksi: logMsg
    };
    localStorage.setItem('svara_audit_logs', JSON.stringify([newAudit, ...currentAuditLogs]));
  };

  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran foto terlalu besar! Maksimal 2MB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // TAMBAH RW
  const handleTambahRW = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRW.nomor || !formRW.ketua) return;

    const formattedNo = formRW.nomor.padStart(2, '0');
    if (daftarRW.some(rw => rw.nomor === formattedNo)) {
      showToast(`RW ${formattedNo} sudah terdaftar! Gunakan tombol Edit untuk memperbarui data.`, 'warning');
      return;
    }

    const newRWItem: RWItem = {
      nomor: formattedNo,
      ketua: formRW.ketua.trim(),
      kontak: formRW.kontak.trim() || '-',
      foto: formRW.foto,
      rt: []
    };
    const nextList = [...daftarRW, newRWItem];
    syncToGlobal(nextList, `Menambahkan RW ${newRWItem.nomor} (${newRWItem.ketua})`);
    setFormRW({ nomor: '', ketua: '', kontak: '', foto: 'https://placehold.co/100' });
    showToast(`RW ${newRWItem.nomor} Berhasil Didaftarkan ke Database!`, 'success');
  };

  // TAMBAH RT
  const handleTambahRT = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRT.rwInduk || !formRT.nomor || !formRT.ketua) return;

    const formattedNo = formRT.nomor.padStart(2, '0');
    const targetRwIndex = daftarRW.findIndex(rw => rw.nomor === formRT.rwInduk);
    if (targetRwIndex === -1) return;

    const targetRW = daftarRW[targetRwIndex];
    if ((targetRW.rt || []).some((rt) => rt.nomor === formattedNo)) {
      showToast(`RT ${formattedNo} sudah terdaftar di RW ${formRT.rwInduk}! Gunakan tombol Edit untuk memperbarui data.`, 'warning');
      return;
    }

    const newRTItem: RTItem = {
      nomor: formattedNo,
      ketua: formRT.ketua.trim(),
      kontak: formRT.kontak.trim() || '-',
      foto: formRT.foto
    };
    const updatedRW = { ...targetRW, rt: [...(targetRW.rt || []), newRTItem] };
    const nextList = [...daftarRW];
    nextList[targetRwIndex] = updatedRW;

    syncToGlobal(nextList, `Menambahkan RT ${newRTItem.nomor} di bawah RW ${targetRW.nomor}`);
    setFormRT({ rwInduk: '', nomor: '', ketua: '', kontak: '', foto: 'https://placehold.co/100' });
    showToast(`RT ${newRTItem.nomor} berhasil didaftarkan di RW ${targetRW.nomor}!`, 'success');
  };

  // EDIT RW / RT
  const handleSaveEdit = () => {
    if (!editModal.ketua || editModal.ketua.trim() === '') {
      showToast('Gagal: Nama Ketua tidak boleh dikosongkan!', 'warning');
      return;
    }

    if (editModal.type === 'RW') {
      const nextList = daftarRW.map(rw => {
        if (rw.nomor === editModal.rwNomor) {
          return { 
            ...rw, 
            ketua: editModal.ketua.trim(), 
            kontak: editModal.kontak.trim() || '-', 
            foto: editModal.foto 
          };
        }
        return rw;
      });
      syncToGlobal(nextList, `Memperbarui Data Pengurus RW ${editModal.rwNomor} (${editModal.ketua})`);
    } else {
      const nextList = daftarRW.map(rw => {
        if (rw.nomor === editModal.rwNomor) {
          const updatedRT = (rw.rt || []).map((rt) => {
            if (rt.nomor === editModal.rtNomor) {
              return { 
                ...rt, 
                ketua: editModal.ketua.trim(), 
                kontak: editModal.kontak.trim() || '-', 
                foto: editModal.foto 
              };
            }
            return rt;
          });
          return { ...rw, rt: updatedRT };
        }
        return rw;
      });
      syncToGlobal(nextList, `Memperbarui Data Pengurus RT ${editModal.rtNomor} di bawah RW ${editModal.rwNomor}`);
    }

    setEditModal({ ...editModal, open: false });
    showToast('Data pengurus berhasil diperbarui di database!', 'success');
  };

  // HAPUS RW
  const handleHapusRW = async (rwNomor: string) => {
    const isConfirmed = await confirm({
      title: 'Hapus Wilayah RW',
      message: `Apakah Anda yakin ingin menghapus RW ${rwNomor} beserta seluruh RT di dalamnya?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (isConfirmed) {
      const nextList = daftarRW.filter(rw => rw.nomor !== rwNomor);
      syncToGlobal(nextList, `Menghapus Wilayah RW ${rwNomor}`);
      showToast(`Wilayah RW ${rwNomor} berhasil dihapus!`, 'success');
    }
  };

  // HAPUS RT
  const handleHapusRT = async (rwNomor: string, rtNomor: string) => {
    const isConfirmed = await confirm({
      title: 'Hapus Wilayah RT',
      message: `Apakah Anda yakin ingin menghapus RT ${rtNomor} dari RW ${rwNomor}?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (isConfirmed) {
      const nextList = daftarRW.map(rw => {
        if (rw.nomor === rwNomor) {
          return { ...rw, rt: (rw.rt || []).filter((rt) => rt.nomor !== rtNomor) };
        }
        return rw;
      });
      syncToGlobal(nextList, `Menghapus Wilayah RT ${rtNomor} dari RW ${rwNomor}`);
      showToast(`Wilayah RT ${rtNomor} (RW ${rwNomor}) berhasil dihapus!`, 'success');
    }
  };

  return (
    <div className="bg-white border-b border-black/10 p-6 md:p-8 space-y-8 select-none font-['Product_Sans',sans-serif] text-black">
      
      {/* HEADER TAMPILAN */}
      <div className="border-b border-black/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-black" />
            <h2 className="text-base font-medium text-black">
              Pengelolaan Wilayah Rukun Warga (RW) & Rukun Tetangga (RT)
            </h2>
          </div>
          <p className="text-xs text-black/50 mt-0.5">
            Kelola data pengurus, nomor kontak, dan pasfoto resmi pejabat wilayah desa. Datanya otomatis sinkron ke MySQL & AI Chatbot.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-slate-100 border border-black/10 text-black/70 font-medium text-xs self-start sm:self-auto shrink-0 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-black" />
          Wilayah {currentDesa?.nama_desa_kelurahan || 'Sukamaju'}
        </span>
      </div>

      {/* EMBARGO WARNING BANNER */}
      {isEmergencyLocked && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Sistem dalam Modus Darurat (Emergency Lock Active). Pembekuan aksi aktif oleh Super Admin.</span>
        </div>
      )}

      {/* FORM 1: REGISTRASI RW */}
      <div className="border border-black/10 rounded-2xl bg-neutral-50/50 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-black/10 pb-2.5">
          <PlusCircle className="w-4 h-4 text-black" />
          <h3 className="text-xs font-semibold text-black uppercase tracking-wider">
            1. Form Registrasi Rukun Warga (RW)
          </h3>
        </div>

        <form onSubmit={handleTambahRW} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-3 md:col-span-1">
            <img src={formRW.foto} alt="Foto RW" className="w-12 h-12 rounded-full border border-black/10 object-cover shrink-0 bg-white" />
            <div className="relative">
              <input type="file" accept="image/*" onChange={(e) => handleUploadFoto(e, (b) => setFormRW({ ...formRW, foto: b }))} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" disabled={isEmergencyLocked} />
              <button type="button" className="px-3 py-1.5 rounded-full border border-black/20 bg-white font-medium text-[11px] text-black hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer">
                <Camera className="w-3.5 h-3.5 text-black/70" />
                Foto RW
              </button>
            </div>
          </div>
          <div>
            <label className="block font-medium text-black/70 mb-1">Nomor RW</label>
            <input type="text" placeholder="Contoh: 01" value={formRW.nomor} onChange={(e) => setFormRW({ ...formRW, nomor: e.target.value })} className="w-full rounded-xl border border-black/20 p-2.5 bg-white font-medium outline-none focus:border-black" required disabled={isEmergencyLocked} />
          </div>
          <div>
            <label className="block font-medium text-black/70 mb-1">Nama Ketua RW</label>
            <input type="text" placeholder="Nama Lengkap Ketua RW" value={formRW.ketua} onChange={(e) => setFormRW({ ...formRW, ketua: e.target.value })} className="w-full rounded-xl border border-black/20 p-2.5 bg-white font-medium outline-none focus:border-black" required disabled={isEmergencyLocked} />
          </div>
          <div>
            <label className="block font-medium text-black/70 mb-1">No. HP / WA RW</label>
            <input type="text" placeholder="08xxxxxxxxxx" value={formRW.kontak} onChange={(e) => setFormRW({ ...formRW, kontak: e.target.value })} className="w-full rounded-xl border border-black/20 p-2.5 bg-white font-medium outline-none focus:border-black" disabled={isEmergencyLocked} />
          </div>
          <div className="md:col-span-4 flex justify-end pt-1">
            <button 
              type="submit" 
              disabled={isEmergencyLocked} 
              className={`rounded-3xl px-5 py-2.5 text-xs font-medium text-white transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                isEmergencyLocked 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-neutral-800 shadow-[inset_0px_-3px_5px_0px_rgba(255,255,255,0.2),inset_0px_3px_5px_0px_rgba(0,0,0,0.4)] hover:bg-neutral-900'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Simpan RW Baru
            </button>
          </div>
        </form>
      </div>

      {/* FORM 2: REGISTRASI RT */}
      <div className="border border-black/10 rounded-2xl bg-neutral-50/50 p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-black/10 pb-2.5">
          <PlusCircle className="w-4 h-4 text-black" />
          <h3 className="text-xs font-semibold text-black uppercase tracking-wider">
            2. Form Registrasi Rukun Tetangga (RT)
          </h3>
        </div>

        <form onSubmit={handleTambahRT} className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="block font-medium text-black/70 mb-1">Pilih RW Induk</label>
            <select value={formRT.rwInduk} onChange={(e) => setFormRT({ ...formRT, rwInduk: e.target.value })} className="w-full rounded-xl border border-black/20 p-2.5 bg-white font-medium outline-none focus:border-black cursor-pointer" required disabled={isEmergencyLocked}>
              <option value="">-- Pilih RW --</option>
              {daftarRW.map((rw, idx) => (
                <option key={idx} value={rw.nomor}>RW {rw.nomor} ({rw.ketua})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <img src={formRT.foto} alt="Foto RT" className="w-10 h-10 rounded-full border border-black/10 object-cover shrink-0 bg-white" />
            <div className="relative">
              <input type="file" accept="image/*" onChange={(e) => handleUploadFoto(e, (b) => setFormRT({ ...formRT, foto: b }))} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" disabled={isEmergencyLocked} />
              <button type="button" className="px-2.5 py-1.5 rounded-full border border-black/20 bg-white font-medium text-[11px] text-black hover:bg-slate-50 flex items-center gap-1 transition-colors cursor-pointer">
                <Camera className="w-3.5 h-3.5 text-black/70" />
                Foto RT
              </button>
            </div>
          </div>
          <div>
            <label className="block font-medium text-black/70 mb-1">Nomor RT</label>
            <input type="text" placeholder="Contoh: 01" value={formRT.nomor} onChange={(e) => setFormRT({ ...formRT, nomor: e.target.value })} className="w-full rounded-xl border border-black/20 p-2.5 bg-white font-medium outline-none focus:border-black" required disabled={isEmergencyLocked} />
          </div>
          <div>
            <label className="block font-medium text-black/70 mb-1">Nama Ketua RT</label>
            <input type="text" placeholder="Nama Lengkap Ketua RT" value={formRT.ketua} onChange={(e) => setFormRT({ ...formRT, ketua: e.target.value })} className="w-full rounded-xl border border-black/20 p-2.5 bg-white font-medium outline-none focus:border-black" required disabled={isEmergencyLocked} />
          </div>
          <div>
            <label className="block font-medium text-black/70 mb-1">No. HP / WA RT</label>
            <input type="text" placeholder="08xxxxxxxxxx" value={formRT.kontak} onChange={(e) => setFormRT({ ...formRT, kontak: e.target.value })} className="w-full rounded-xl border border-black/20 p-2.5 bg-white font-medium outline-none focus:border-black" disabled={isEmergencyLocked} />
          </div>
          <div className="md:col-span-5 flex justify-end pt-1">
            <button 
              type="submit" 
              disabled={isEmergencyLocked} 
              className={`rounded-3xl px-5 py-2.5 text-xs font-medium text-white transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                isEmergencyLocked 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-neutral-800 shadow-[inset_0px_-3px_5px_0px_rgba(255,255,255,0.2),inset_0px_3px_5px_0px_rgba(0,0,0,0.4)] hover:bg-neutral-900'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Simpan RT Baru
            </button>
          </div>
        </form>
      </div>

      {/* STRUKTUR TERDAFTAR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-black/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-black" />
            <h3 className="font-medium text-black text-xs uppercase tracking-wider">
              Struktur & Hirarki Wilayah Terdaftar ({daftarRW.length} RW)
            </h3>
          </div>

          {/* TOMBOL REFRESH STANDAR SSOT */}
          <button
            onClick={fetchStrukturData}
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

        {daftarRW.length === 0 ? (
          <div className="p-8 text-center text-black/40 text-xs font-normal">
            Belum ada Rukun Warga (RW) yang didaftarkan di wilayah desa ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {daftarRW.map((rw, idx) => (
              <div key={idx} className="border border-black/10 rounded-2xl p-5 bg-white space-y-4 relative hover:border-black/20 transition-all">
                <div className="flex items-center justify-between border-b border-black/10 pb-3">
                  <div className="flex items-center gap-3">
                    <img src={rw.foto || 'https://placehold.co/100'} alt="RW" className="w-10 h-10 rounded-full object-cover border border-black/10 shrink-0 bg-slate-100" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-black" />
                        <h4 className="font-semibold text-black text-sm">RW {rw.nomor}</h4>
                      </div>
                      <p className="text-xs text-black/70">Ketua: <span className="font-medium text-black">{rw.ketua}</span></p>
                      <p className="text-[10px] text-black/40 flex items-center gap-1 font-mono mt-0.5">
                        <Phone className="w-3 h-3 text-black/40" />
                        {rw.kontak}
                      </p>
                    </div>
                  </div>

                  {/* TOMBOL EDIT & HAPUS RW */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditModal({ open: true, type: 'RW', rwNomor: rw.nomor, ketua: rw.ketua, kontak: rw.kontak, foto: rw.foto })}
                      className="p-1.5 rounded-full border border-black/20 hover:border-black text-black text-xs cursor-pointer transition-colors"
                      title="Edit Data RW"
                      disabled={isEmergencyLocked}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleHapusRW(rw.nomor)}
                      className="p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs cursor-pointer transition-colors disabled:opacity-50"
                      title="Hapus RW"
                      disabled={isEmergencyLocked}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* LIST RT */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-black/50 uppercase tracking-wider flex items-center gap-1">
                    <Home className="w-3 h-3 text-black/40" />
                    Daftar RT Dalam RW {rw.nomor} ({rw.rt?.length || 0}):
                  </p>
                  {rw.rt && rw.rt.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rw.rt.map((rt, rtIdx) => (
                        <div key={rtIdx} className="p-2.5 rounded-xl bg-slate-50 border border-black/10 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={rt.foto || 'https://placehold.co/100'} alt="RT" className="w-8 h-8 rounded-full object-cover border border-black/10 shrink-0 bg-white" />
                            <div className="min-w-0">
                              <p className="font-semibold text-black truncate">RT {rt.nomor}</p>
                              <p className="text-[10px] text-black/60 truncate">{rt.ketua}</p>
                              <p className="text-[9px] text-black/40 font-mono truncate">{rt.kontak}</p>
                            </div>
                          </div>

                          {/* TOMBOL EDIT & HAPUS RT */}
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <button
                              onClick={() => setEditModal({ open: true, type: 'RT', rwNomor: rw.nomor, rtNomor: rt.nomor, ketua: rt.ketua, kontak: rt.kontak, foto: rt.foto })}
                              className="p-1 rounded-full border border-black/20 hover:border-black text-black cursor-pointer transition-colors"
                              disabled={isEmergencyLocked}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleHapusRT(rw.nomor, rt.nomor)}
                              className="p-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer transition-colors disabled:opacity-50"
                              disabled={isEmergencyLocked}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-black/40 bg-slate-50 p-3 rounded-xl border border-black/10 text-center font-normal">
                      Belum ada RT yang didaftarkan di RW ini.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL EDIT DATA PENGURUS */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4 border border-black/10 font-['Product_Sans'] my-auto">
            <div className="border-b border-black/10 pb-3 flex justify-between items-center">
              <h3 className="text-sm font-bold text-black flex items-center gap-2">
                <Pencil className="w-4 h-4 text-black" />
                Edit Data Pengurus {editModal.type} {editModal.type === 'RW' ? editModal.rwNomor : `${editModal.rtNomor} (RW ${editModal.rwNomor})`}
              </h3>
              <button 
                onClick={() => setEditModal({ ...editModal, open: false })} 
                className="w-8 h-8 rounded-full bg-slate-100 text-black hover:bg-slate-200 font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <img src={editModal.foto} alt="Foto" className="w-12 h-12 rounded-full border border-black/10 object-cover bg-slate-100 shrink-0" />
                <div className="relative">
                  <input type="file" accept="image/*" onChange={(e) => handleUploadFoto(e, (b) => setEditModal({ ...editModal, foto: b }))} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  <button type="button" className="px-3 py-1.5 rounded-full border border-black/20 bg-white font-medium text-[11px] text-black hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer">
                    <Camera className="w-3.5 h-3.5 text-black/70" />
                    Ganti Foto
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-black/70 mb-1">Nama Ketua Baru</label>
                <input type="text" value={editModal.ketua} onChange={(e) => setEditModal({ ...editModal, ketua: e.target.value })} className="w-full rounded-xl border border-black/20 p-2.5 outline-none font-medium focus:border-black bg-neutral-50" />
              </div>

              <div>
                <label className="block font-medium text-black/70 mb-1">Nomor WhatsApp / HP Baru</label>
                <input type="text" value={editModal.kontak} onChange={(e) => setEditModal({ ...editModal, kontak: e.target.value })} className="w-full rounded-xl border border-black/20 p-2.5 outline-none font-medium focus:border-black bg-neutral-50" />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  onClick={() => setEditModal({ ...editModal, open: false })} 
                  className="px-4 py-2 rounded-full border border-black/20 text-black hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveEdit} 
                  className="px-5 py-2 rounded-full bg-black text-white hover:bg-neutral-800 font-medium cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TabRwRtDesa;