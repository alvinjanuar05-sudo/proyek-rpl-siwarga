import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Megaphone, 
  Globe, 
  Building2, 
  Home, 
  Calendar, 
  Clock, 
  MapPin, 
  Image as ImageIcon, 
  Trash2, 
 
  Lock, 
  X, 
  Eye, 
  FileText,
  Paperclip
} from 'lucide-react';

interface TabPengumumanDesaProps {
  currentDesa: any;
  dataKecamatan: any;
  setDataKecamatan: React.Dispatch<React.SetStateAction<any>>;
}

export const TabPengumumanDesa: React.FC<TabPengumumanDesaProps> = ({
  currentDesa,
  dataKecamatan,
  setDataKecamatan,
}) => {
  const { showToast, confirm } = useToast();
  const namaDesa = currentDesa?.nama_desa_kelurahan || currentDesa?.nama || 'Sukamaju';

  // STATUS EMBARGO EMERGENCY LOCK DARI SUPER ADMIN
  const isEmergencyLocked = localStorage.getItem('svara_emergency_lock') === 'true';

  // Mode Pilihan Waktu: 'spesifik' | 'tanpa_waktu'
  const [modeWaktu, setModeWaktu] = useState<'spesifik' | 'tanpa_waktu'>('spesifik');

  // Filter & Search State Admin
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterCakupan, setFilterCakupan] = useState('Semua');

  // STATE REST API BACKEND
  const [listPengumumanApi, setListPengumumanApi] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // STATE MODAL DETAIL PENGUMUMAN (POP-UP)
  const [selectedPengumuman, setSelectedPengumuman] = useState<any | null>(null);

  // Form State
  const [newPengumuman, setNewPengumuman] = useState({
    judul: '',
    kategori: 'Kegiatan Warga',
    target_cakupan: 'GLOBAL', // 'GLOBAL' | 'RW' | 'RTRW'
    target_rw: '01',
    target_rt: '01',
    tanggal_mulai: new Date().toISOString().split('T')[0],
    tanggal_selesai: new Date().toISOString().split('T')[0],
    jam_mulai: '08:00',
    jam_selesai: '12:00',
    lokasi: `Balai Desa ${namaDesa}`,
    isi: '',
    foto: '',
  });

  // LOAD DATA PENGUMUMAN DARI REST API MYSQL
  const fetchPengumuman = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getPengumuman();
      if (res && res.success && Array.isArray(res.data)) {
        setListPengumumanApi(res.data);
      } else {
        setListPengumumanApi(dataKecamatan?.pengumuman_desa || []);
      }
    } catch (err) {
      console.error('Gagal memuat pengumuman dari API:', err);
      setListPengumumanApi(dataKecamatan?.pengumuman_desa || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPengumuman();
  }, [namaDesa]);

  const defaultPengumuman = [
    {
      id_pengumuman: 'PGM-DESA-001',
      desa: namaDesa,
      judul: 'Pelayanan Posyandu & Cek Kesehatan Balita',
      kategori: 'Layanan Desa',
      target_cakupan: 'RW',
      target_rw: '02',
      target_rt: '01',
      mode_waktu: 'spesifik',
      tanggal_info: '25/08/2026 s/d 25/08/2026',
      jam_info: '08:00 - 12:00 WIB',
      lokasi: 'Posyandu RW 02',
      isi: 'Pelaksanaan imunisasi dan penimbangan balita rutin gratis. Diharapkan orang tua membawa buku KIA.',
      foto: '',
      tanggal_rilis: '2026-08-22',
    },
  ];

  const listPengumuman = listPengumumanApi.length > 0 
    ? listPengumumanApi 
    : (dataKecamatan?.pengumuman_desa || defaultPengumuman);

  const pengumumanDesaIni = listPengumuman.filter(
    (item: any) => (item.desa || item.nama_desa || namaDesa).toLowerCase() === namaDesa.toLowerCase()
  );

  const filteredPengumuman = pengumumanDesaIni.filter((item: any) => {
    const matchesKategori = filterKategori === 'Semua' || item.kategori === filterKategori;
    const matchesCakupan =
      filterCakupan === 'Semua' ||
      (filterCakupan === 'GLOBAL' && (item.target_cakupan === 'GLOBAL' || !item.target_cakupan)) ||
      item.target_cakupan === filterCakupan;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      (item.judul && item.judul.toLowerCase().includes(searchLower)) ||
      (item.isi && item.isi.toLowerCase().includes(searchLower)) ||
      (item.lokasi && item.lokasi.toLowerCase().includes(searchLower));

    return matchesKategori && matchesCakupan && matchesSearch;
  });

  // FUNGSI CONVERT FOTO POSTER KE BASE64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran gambar terlalu besar! Maksimal 2MB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPengumuman((prev) => ({ ...prev, foto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // FUNGSI INJEKSI AUDIT LOG DARI SUPER ADMIN
  const injectAuditLog = (aksiMsg: string) => {
    const currentAudit = JSON.parse(localStorage.getItem('svara_audit_logs') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const newAudit = {
      id: Date.now().toString(),
      waktu: new Date().toLocaleString('id-ID'),
      aktor: currentUser.nama || `Admin Desa ${namaDesa}`,
      aksi: aksiMsg,
    };
    localStorage.setItem('svara_audit_logs', JSON.stringify([newAudit, ...currentAudit]));
  };

  const handleAddPengumuman = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEmergencyLocked) {
      showToast('Sistem dalam Modus Darurat (Emergency Lock Active)! Tindakan dibekukan oleh Super Admin.', 'warning');
      return;
    }

    if (!newPengumuman.judul.trim() || !newPengumuman.isi.trim()) {
      showToast('Mohon lengkapi judul dan isi pengumuman!', 'warning');
      return;
    }

    let tanggalText = '-';
    let jamText = '-';

    if (modeWaktu === 'spesifik') {
      const tglMulaiFmt = newPengumuman.tanggal_mulai.split('-').reverse().join('/');
      const tglSelesaiFmt = newPengumuman.tanggal_selesai.split('-').reverse().join('/');

      tanggalText =
        newPengumuman.tanggal_mulai === newPengumuman.tanggal_selesai || !newPengumuman.tanggal_selesai
          ? tglMulaiFmt
          : `${tglMulaiFmt} s/d ${tglSelesaiFmt}`;

      jamText =
        newPengumuman.jam_mulai && newPengumuman.jam_selesai
          ? `${newPengumuman.jam_mulai} - ${newPengumuman.jam_selesai} WIB`
          : 'Jam Kerja Operasional';
    }

    const formattedRt = String(newPengumuman.target_rt).padStart(2, '0');
    const formattedRw = String(newPengumuman.target_rw).padStart(2, '0');

    const payload = {
      id_desa: currentDesa?.id_desa || 'DESA-001',
      judul: newPengumuman.judul.trim(),
      kategori: newPengumuman.kategori,
      target_cakupan: newPengumuman.target_cakupan,
      target_rw: formattedRw,
      target_rt: formattedRt,
      mode_waktu: modeWaktu,
      tanggal_mulai: modeWaktu === 'spesifik' ? newPengumuman.tanggal_mulai : null,
      tanggal_selesai: modeWaktu === 'spesifik' ? newPengumuman.tanggal_selesai : null,
      jam_mulai: modeWaktu === 'spesifik' ? newPengumuman.jam_mulai : null,
      jam_selesai: modeWaktu === 'spesifik' ? newPengumuman.jam_selesai : null,
      tanggal_info: tanggalText,
      jam_info: jamText,
      lokasi: newPengumuman.lokasi.trim(),
      isi: newPengumuman.isi.trim(),
      foto: newPengumuman.foto || null,
    };

    try {
      const res = await apiService.createPengumuman(payload);

      if (res && res.success) {
        fetchPengumuman();

        const newItem = {
          id_pengumuman: res.id_pengumuman || `PGM-${Date.now().toString().slice(-5)}`,
          desa: namaDesa,
          ...payload,
          tanggal_rilis: new Date().toISOString().split('T')[0],
        };

        const updatedPengumuman = [newItem, ...(dataKecamatan?.pengumuman_desa || listPengumuman)];
        const newState = { ...dataKecamatan, pengumuman_desa: updatedPengumuman };

        setDataKecamatan(newState);
        localStorage.setItem('svara_kecamatan_data', JSON.stringify(newState));
        localStorage.setItem('kecamatan_app_data', JSON.stringify(newState));

        const logTarget =
          newItem.target_cakupan === 'GLOBAL'
            ? 'Seluruh Desa'
            : newItem.target_cakupan === 'RW'
            ? `Khusus RW ${newItem.target_rw}`
            : `Khusus RT ${newItem.target_rt}/RW ${newItem.target_rw}`;

        injectAuditLog(`Menerbitkan Pengumuman Desa: "${newItem.judul}" (${logTarget})`);

        setNewPengumuman({
          judul: '',
          kategori: 'Kegiatan Warga',
          target_cakupan: 'GLOBAL',
          target_rw: '01',
          target_rt: '01',
          tanggal_mulai: new Date().toISOString().split('T')[0],
          tanggal_selesai: new Date().toISOString().split('T')[0],
          jam_mulai: '08:00',
          jam_selesai: '12:00',
          lokasi: `Balai Desa ${namaDesa}`,
          isi: '',
          foto: '',
        });

        showToast('Pengumuman Desa Berhasil Diterbitkan ke MySQL!', 'success');
      } else {
        showToast(`Gagal menerbitkan pengumuman: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err) {
      console.error('Error create pengumuman:', err);
      showToast('Terjadi kesalahan koneksi saat menyimpan pengumuman.', 'error');
    }
  };

  const handleDeletePengumuman = async (id: string) => {
    if (isEmergencyLocked) {
      showToast('Modus Darurat Aktif! Fitur dibekukan oleh Super Admin.', 'warning');
      return;
    }

    const itemTarget = listPengumuman.find(
      (p: any) => p.id_pengumuman === id || p.id === id
    );

    const targetId = id || itemTarget?.id_pengumuman || itemTarget?.id;

    if (!targetId) {
      showToast('ID Pengumuman tidak valid!', 'error');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Hapus Pengumuman Desa',
      message: `Apakah Anda yakin ingin menghapus pengumuman "${itemTarget?.judul || 'ini'}"?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      const res = await apiService.deletePengumuman(targetId);

      if (res && (res.success || res.status === 'success' || res.affectedRows > 0)) {
        setListPengumumanApi((prev) =>
          prev.filter((p: any) => p.id_pengumuman !== targetId && p.id !== targetId)
        );

        const updated = listPengumuman.filter(
          (p: any) => p.id_pengumuman !== targetId && p.id !== targetId
        );
        const newState = { ...dataKecamatan, pengumuman_desa: updated };

        setDataKecamatan(newState);
        try {
          localStorage.setItem('svara_kecamatan_data', JSON.stringify(newState));
          localStorage.setItem('kecamatan_app_data', JSON.stringify(newState));
        } catch (e) {
          console.warn('LocalStorage quota exceeded on deleting pengumuman');
        }

        injectAuditLog(`Menghapus Pengumuman Desa: "${itemTarget?.judul || targetId}"`);

        if (selectedPengumuman?.id_pengumuman === targetId || selectedPengumuman?.id === targetId) {
          setSelectedPengumuman(null);
        }

        showToast('Pengumuman berhasil dihapus!', 'success');
      } else {
        showToast(`Gagal menghapus: ${res?.message || 'Terjadi kesalahan pada server'}`, 'error');
      }
    } catch (err) {
      console.error('Error delete pengumuman:', err);
      showToast('Terjadi kesalahan koneksi saat menghapus pengumuman.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-['Product_Sans',sans-serif] select-none text-black">
      {/* FORM BUAT PENGUMUMAN */}
      <div className="lg:col-span-1 rounded-2xl border border-black/10 bg-white p-5 h-fit space-y-4">
        <h2 className="text-sm font-semibold text-black border-b border-black/10 pb-3 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-black" />
          Terbitkan Pengumuman Desa
        </h2>

        <form onSubmit={handleAddPengumuman} className="space-y-3.5 text-xs">
          <div>
            <label className="font-medium text-black/70 block mb-1">Judul Pengumuman / Layanan</label>
            <input
              type="text"
              value={newPengumuman.judul}
              onChange={(e) => setNewPengumuman({ ...newPengumuman, judul: e.target.value })}
              placeholder="Contoh: Kerja Bakti Massal / Posyandu RW 02"
              className="w-full rounded-xl border border-black/20 p-2.5 focus:border-black outline-none font-medium bg-neutral-50"
              required
              disabled={isEmergencyLocked}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-medium text-black/70 block mb-1">Kategori</label>
              <select
                value={newPengumuman.kategori}
                onChange={(e) => setNewPengumuman({ ...newPengumuman, kategori: e.target.value })}
                className="w-full rounded-xl border border-black/20 p-2.5 bg-neutral-50 outline-none font-medium focus:border-black cursor-pointer"
                disabled={isEmergencyLocked}
              >
                <option value="Kegiatan Warga">Kegiatan Warga</option>
                <option value="Layanan Desa">Layanan Desa</option>
                <option value="Bantuan Sosial">Bantuan Sosial</option>
                <option value="Keamanan / Imbauan">Keamanan / Imbauan</option>
              </select>
            </div>

            {/* TARGET CAKUPAN WILAYAH */}
            <div>
              <label className="font-medium text-black/70 block mb-1">Target Wilayah</label>
              <select
                value={newPengumuman.target_cakupan}
                onChange={(e) => setNewPengumuman({ ...newPengumuman, target_cakupan: e.target.value })}
                className="w-full rounded-xl border border-black/20 p-2.5 bg-neutral-50 outline-none font-medium focus:border-black cursor-pointer"
                disabled={isEmergencyLocked}
              >
                <option value="GLOBAL">Seluruh Desa</option>
                <option value="RW">Khusus RW</option>
                <option value="RTRW">Khusus RT & RW</option>
              </select>
            </div>
          </div>

          {/* INPUT FORM RT / RW JIKA BUKAN GLOBAL */}
          {newPengumuman.target_cakupan !== 'GLOBAL' && (
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-black/10">
              <div>
                <label className="font-medium text-black/70 block mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-black/60" /> Nomor RW
                </label>
                <input
                  type="text"
                  placeholder="01"
                  maxLength={2}
                  value={newPengumuman.target_rw}
                  onChange={(e) => setNewPengumuman({ ...newPengumuman, target_rw: e.target.value })}
                  className="w-full rounded-lg border border-black/20 p-2 bg-white font-mono outline-none focus:border-black text-center font-medium"
                  required
                />
              </div>

              {newPengumuman.target_cakupan === 'RTRW' && (
                <div>
                  <label className="font-medium text-black/70 block mb-1 flex items-center gap-1">
                    <Home className="w-3 h-3 text-black/60" /> Nomor RT
                  </label>
                  <input
                    type="text"
                    placeholder="01"
                    maxLength={2}
                    value={newPengumuman.target_rt}
                    onChange={(e) => setNewPengumuman({ ...newPengumuman, target_rt: e.target.value })}
                    className="w-full rounded-lg border border-black/20 p-2 bg-white font-mono outline-none focus:border-black text-center font-medium"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* PILIHAN MODE WAKTU */}
          <div className="rounded-xl border border-black/10 bg-slate-50 p-3 space-y-2.5">
            <label className="font-medium text-black block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-black/70" /> Pengaturan Waktu
            </label>
            <div className="flex items-center gap-4 text-black/70">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="modeWaktu"
                  checked={modeWaktu === 'spesifik'}
                  onChange={() => setModeWaktu('spesifik')}
                  className="accent-black cursor-pointer"
                  disabled={isEmergencyLocked}
                />
                Atur Tanggal & Jam
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="modeWaktu"
                  checked={modeWaktu === 'tanpa_waktu'}
                  onChange={() => setModeWaktu('tanpa_waktu')}
                  className="accent-black cursor-pointer"
                  disabled={isEmergencyLocked}
                />
                Tanpa Batas Waktu
              </label>
            </div>

            {/* FORM TANGGAL DAN JAM */}
            {modeWaktu === 'spesifik' && (
              <div className="space-y-2 pt-2 border-t border-black/10">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-black/50 block mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={newPengumuman.tanggal_mulai}
                      onChange={(e) => setNewPengumuman({ ...newPengumuman, tanggal_mulai: e.target.value })}
                      className="w-full rounded-lg border border-black/20 p-1.5 bg-white outline-none text-[11px]"
                      required
                      disabled={isEmergencyLocked}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-black/50 block mb-1">Tanggal Selesai</label>
                    <input
                      type="date"
                      value={newPengumuman.tanggal_selesai}
                      onChange={(e) => setNewPengumuman({ ...newPengumuman, tanggal_selesai: e.target.value })}
                      className="w-full rounded-lg border border-black/20 p-1.5 bg-white outline-none text-[11px]"
                      required
                      disabled={isEmergencyLocked}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-black/50 block mb-1">Jam Mulai</label>
                    <input
                      type="time"
                      value={newPengumuman.jam_mulai}
                      onChange={(e) => setNewPengumuman({ ...newPengumuman, jam_mulai: e.target.value })}
                      className="w-full rounded-lg border border-black/20 p-1.5 bg-white outline-none text-[11px]"
                      disabled={isEmergencyLocked}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-black/50 block mb-1">Jam Selesai</label>
                    <input
                      type="time"
                      value={newPengumuman.jam_selesai}
                      onChange={(e) => setNewPengumuman({ ...newPengumuman, jam_selesai: e.target.value })}
                      className="w-full rounded-lg border border-black/20 p-1.5 bg-white outline-none text-[11px]"
                      disabled={isEmergencyLocked}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="font-medium text-black/70 block mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-black/60" /> Lokasi / Tempat
            </label>
            <input
              type="text"
              value={newPengumuman.lokasi}
              onChange={(e) => setNewPengumuman({ ...newPengumuman, lokasi: e.target.value })}
              placeholder="Contoh: Balai Desa / RW 02"
              className="w-full rounded-xl border border-black/20 p-2.5 outline-none focus:border-black bg-neutral-50"
              disabled={isEmergencyLocked}
            />
          </div>

          <div>
            <label className="font-medium text-black/70 block mb-1">Isi Detail Pengumuman</label>
            <textarea
              rows={3}
              value={newPengumuman.isi}
              onChange={(e) => setNewPengumuman({ ...newPengumuman, isi: e.target.value })}
              placeholder="Tuliskan perincian pengumuman..."
              className="w-full rounded-xl border border-black/20 p-2.5 outline-none focus:border-black font-normal bg-neutral-50"
              required
              disabled={isEmergencyLocked}
            />
          </div>

          {/* UNGGAN POSTER / PAMFLET */}
          <div className="rounded-xl border border-black/10 bg-slate-50 p-3 space-y-2">
            <label className="font-medium text-black block flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-black/70" /> Upload Poster (Opsional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full text-xs text-black/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-black file:text-white hover:file:bg-neutral-800 cursor-pointer"
              disabled={isEmergencyLocked}
            />
            {newPengumuman.foto && (
              <div className="relative w-full rounded-xl overflow-hidden border border-black/10 bg-white mt-2 p-1">
                <img src={newPengumuman.foto} alt="Preview Poster" className="w-full h-auto max-h-48 object-contain rounded-lg mx-auto" />
                <button
                  type="button"
                  onClick={() => setNewPengumuman((prev) => ({ ...prev, foto: '' }))}
                  className="absolute top-2 right-2 bg-rose-600 text-white text-[10px] font-medium px-2 py-1 rounded-full hover:bg-rose-700 shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Hapus
                </button>
              </div>
            )}
          </div>

          {/* SKEUOMORPHIC PRIMARY CTA SSOT BUTTON */}
          <button
            type="submit"
            disabled={isEmergencyLocked}
            className={`w-full rounded-3xl py-2.5 text-xs font-medium text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] ${
              isEmergencyLocked 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-neutral-800 shadow-[inset_0px_-3px_5px_0px_rgba(255,255,255,0.2),inset_0px_3px_5px_0px_rgba(0,0,0,0.4)] hover:bg-neutral-900'
            }`}
          >
            {isEmergencyLocked ? (
              <><Lock className="w-4 h-4" /> Dikunci (Emergency Lock Active)</>
            ) : (
              <><Megaphone className="w-4 h-4" /> Terbitkan Pengumuman Resmi</>
            )}
          </button>
        </form>
      </div>

      {/* LIST PENGUMUMAN TERTERBIT */}
      <div className="lg:col-span-2 bg-white border-b border-black/10 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-black flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-black" />
                Pengumuman & Jadwal Aktif ({filteredPengumuman.length})
              </h2>
              {/* TOMBOL REFRESH STANDAR SSOT */}
              <button
                onClick={fetchPengumuman}
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Cari pengumuman..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-1.5 text-xs bg-neutral-50 border border-black/10 rounded-full outline-none focus:border-black font-['Product_Sans'] w-36 sm:w-44"
            />
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="px-3 py-1.5 text-xs bg-neutral-50 border border-black/10 rounded-full outline-none font-medium cursor-pointer"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Kegiatan Warga">Kegiatan Warga</option>
              <option value="Layanan Desa">Layanan Desa</option>
              <option value="Bantuan Sosial">Bantuan Sosial</option>
              <option value="Keamanan / Imbauan">Keamanan / Imbauan</option>
            </select>
            <select
              value={filterCakupan}
              onChange={(e) => setFilterCakupan(e.target.value)}
              className="px-3 py-1.5 text-xs bg-neutral-50 border border-black/10 rounded-full outline-none font-medium cursor-pointer"
            >
              <option value="Semua">Semua Wilayah</option>
              <option value="GLOBAL">Seluruh Desa</option>
              <option value="RW">Khusus RW</option>
              <option value="RTRW">Khusus RT/RW</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs text-black/40 font-normal py-12 text-center">
            Memuat pengumuman dari database MySQL...
          </p>
        ) : filteredPengumuman.length === 0 ? (
          <p className="text-xs text-black/40 font-normal py-12 text-center">
            Belum ada pengumuman desa yang cocok dengan pencarian/kategori ini.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredPengumuman.map((item: any) => {
              const rwFmt = String(item.target_rw || '01').padStart(2, '0');
              const rtFmt = String(item.target_rt || '01').padStart(2, '0');

              return (
                <div
                  key={item.id_pengumuman}
                  className="rounded-xl border border-black/10 bg-neutral-50/50 p-4 flex flex-col justify-between space-y-3 hover:border-black/20 transition-all"
                >
                  <div className="space-y-2">
                    {/* TOP BADGES */}
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="bg-neutral-800 text-white text-[9px] font-semibold px-2.5 py-0.5 rounded-full">
                        {item.kategori}
                      </span>

                      <span className="bg-emerald-50 text-emerald-800 text-[9px] font-medium px-2 py-0.5 rounded-full border border-emerald-200 font-mono flex items-center gap-1">
                        {item.target_cakupan === 'GLOBAL' || !item.target_cakupan ? (
                          <><Globe className="w-2.5 h-2.5 text-emerald-700" /> Desa</>
                        ) : item.target_cakupan === 'RW' ? (
                          <><Building2 className="w-2.5 h-2.5 text-emerald-700" /> RW {rwFmt}</>
                        ) : (
                          <><Home className="w-2.5 h-2.5 text-emerald-700" /> RT {rtFmt}/RW {rwFmt}</>
                        )}
                      </span>
                    </div>

                    {/* JUDUL */}
                    <h3 className="font-semibold text-xs text-black leading-snug line-clamp-2 pt-0.5">
                      {item.judul}
                    </h3>

                    {/* METADATA RINGKAS (WAKTU & LOKASI) */}
                    <div className="text-[10px] text-black/60 space-y-1 font-normal pt-1">
                      <p className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{item.lokasi || 'Balai Desa'}</span>
                      </p>
                      <p className="flex items-center gap-1 truncate">
                        <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{item.tanggal_info || item.tanggal_rilis}</span>
                      </p>
                    </div>

                    {/* INDIKATOR POSTER TERLAMPIR */}
                    {item.foto && (
                      <div className="inline-flex items-center gap-1 text-[9.5px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mt-1">
                        <Paperclip className="w-3 h-3 text-blue-600" />
                        Poster Terlampir
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTONS (DETAIL & HAPUS) */}
                  <div className="flex items-center justify-between border-t border-black/10 pt-2.5 text-[10px]">
                    <span className="font-mono text-black/40">Rilis: {item.tanggal_rilis ? new Date(item.tanggal_rilis).toLocaleDateString('id-ID') : '-'}</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPengumuman(item)}
                        className="px-3 py-1 rounded-full border border-black/20 hover:border-black text-black font-medium text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Detail
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePengumuman(item.id_pengumuman)}
                        disabled={isEmergencyLocked}
                        className="p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                        title="Hapus Pengumuman"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* POP-UP MODAL DETAIL PENGUMUMAN */}
      {selectedPengumuman && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-black/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto font-['Product_Sans'] my-auto">
            
            {/* MODAL HEADER */}
            <div className="flex justify-between items-start border-b border-black/10 pb-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="bg-neutral-800 text-white text-[9.5px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                    {selectedPengumuman.id_pengumuman}
                  </span>
                  <span className="bg-slate-100 text-black/70 text-[9.5px] font-semibold px-2.5 py-0.5 rounded-full border border-black/10">
                    {selectedPengumuman.kategori}
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 text-[9.5px] font-medium px-2 py-0.5 rounded-full border border-emerald-200 font-mono flex items-center gap-1">
                    {selectedPengumuman.target_cakupan === 'GLOBAL' || !selectedPengumuman.target_cakupan ? (
                      <><Globe className="w-2.5 h-2.5 text-emerald-700" /> Desa</>
                    ) : selectedPengumuman.target_cakupan === 'RW' ? (
                      <><Building2 className="w-2.5 h-2.5 text-emerald-700" /> RW {selectedPengumuman.target_rw}</>
                    ) : (
                      <><Home className="w-2.5 h-2.5 text-emerald-700" /> RT {selectedPengumuman.target_rt}/RW {selectedPengumuman.target_rw}</>
                    )}
                  </span>
                </div>
                <h3 className="text-base font-bold text-black pt-1">
                  {selectedPengumuman.judul}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPengumuman(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-black hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MODAL METADATA BANNER */}
            <div className="p-3 rounded-xl bg-slate-50 border border-black/10 text-xs space-y-1.5 font-normal text-black/70">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <strong className="text-black">Jadwal:</strong> {selectedPengumuman.tanggal_info}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <strong className="text-black">Waktu:</strong> {selectedPengumuman.jam_info}
                </span>
              </div>
              <p className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <strong className="text-black">Lokasi:</strong> {selectedPengumuman.lokasi}
              </p>
            </div>

            {/* URAIAN DESKRIPSI UTAMA */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-black/70" /> Uraian Pengumuman
              </h4>
              <p className="text-xs text-black/80 leading-relaxed bg-slate-50 p-3 rounded-xl border border-black/10 whitespace-pre-line">
                {selectedPengumuman.isi}
              </p>
            </div>

            {/* DISPLAY POSTER PAMFLET */}
            {selectedPengumuman.foto && (
              <div className="space-y-1.5 pt-1">
                <h4 className="text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-black/70" /> Lampiran Poster / Pamflet
                </h4>
                <div className="w-full rounded-xl overflow-hidden border border-black/10 bg-white p-1">
                  <img
                    src={selectedPengumuman.foto}
                    alt="Poster Pengumuman"
                    className="w-full h-auto max-h-[450px] object-contain rounded-lg mx-auto block"
                  />
                </div>
              </div>
            )}

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-between border-t border-black/10 pt-3 text-xs text-black/40">
              <span className="font-mono">Tanggal Rilis: {selectedPengumuman.tanggal_rilis ? new Date(selectedPengumuman.tanggal_rilis).toLocaleDateString('id-ID') : '-'}</span>
              <button
                type="button"
                onClick={() => handleDeletePengumuman(selectedPengumuman.id_pengumuman)}
                disabled={isEmergencyLocked}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full text-xs font-medium cursor-pointer border border-rose-200 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Pengumuman Ini
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default TabPengumumanDesa;