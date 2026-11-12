import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Inbox, 
  Clock, 
  Cog, 
  CheckCircle2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Building2, 
  X, 
  ShieldAlert,
  Trash2
} from 'lucide-react';

interface TabAspirasiDesaProps {
  currentDesa: any;
  dataKecamatan: any;
  setDataKecamatan: React.Dispatch<React.SetStateAction<any>>;
}

export const TabAspirasiDesa: React.FC<TabAspirasiDesaProps> = ({
  currentDesa,
  dataKecamatan,
  setDataKecamatan,
}) => {
  const { showToast, confirm } = useToast();
  const isEmergencyLocked = localStorage.getItem('svara_emergency_lock') === 'true';
  const namaDesaTarget = currentDesa?.nama_desa_kelurahan || currentDesa?.nama || 'Sukamaju';

  // STATE REST API BACKEND
  const [listAspirasiApi, setListAspirasiApi] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // STATE FILTER & SEARCH
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterRW, setFilterRW] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // STATE PAGINATION STANDAR SSOT
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  // STATE MODAL DETAIL & CATATAN
  const [selectedAspirasi, setSelectedAspirasi] = useState<any>(null);
  const [catatanText, setCatatanText] = useState<string>('');

  // LOAD DATA ASPIRASI DARI REST API MYSQL
  const fetchAspirasi = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getAspirasi();
      if (res && res.success && Array.isArray(res.data)) {
        setListAspirasiApi(res.data);
      } else {
        setListAspirasiApi(dataKecamatan?.aspirasi_warga || []);
      }
    } catch (err) {
      console.error('Gagal mengambil data aspirasi dari API:', err);
      setListAspirasiApi(dataKecamatan?.aspirasi_warga || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAspirasi();
  }, [namaDesaTarget]);

  // RESET HALAMAN SAAT FILTER ATAU JUMLAH PER HALAMAN BERUBAH
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterRW, searchTerm, itemsPerPage]);

  const defaultAspirasi = [
    {
      id_aspirasi: 'ASP-DESA-001',
      nama_warga: 'Siti Aminah',
      nik_warga: '3209124508980001',
      email_warga: 'siti.aminah@gmail.com',
      no_hp_warga: '081234567890',
      desa: namaDesaTarget,
      nomor_rt: '02',
      nomor_rw: '01',
      rt_rw: 'RT 02 / RW 01',
      dusun: 'Dusun 1',
      alamat_lengkap: 'Jl. Mawar No. 12',
      kategori: 'Infrastruktur Desa',
      judul: 'Kerusakan Lampu Penerangan Jalan',
      isi: 'Lampu penerangan jalan umum di gang RT 02 padam sudah 3 hari, mohon bantuan perbaikan dari pihak desa.',
      lokasi: 'Gang RT 02 / RW 01',
      tanggal: '2026-08-22',
      pesan: 'Lampu penerangan jalan umum di gang RT 02 padam sudah 3 hari.',
      status: 'Menunggu',
      diteruskan_ke: '-',
      catatan_desa: '',
    },
  ];

  const listAspirasi = listAspirasiApi.length > 0 
    ? listAspirasiApi 
    : (dataKecamatan?.aspirasi_warga || defaultAspirasi);

  const aspirasiDesaIni = listAspirasi.filter(
    (item: any) => (item.desa || item.nama_desa || namaDesaTarget).toLowerCase() === namaDesaTarget.toLowerCase()
  );

  // DAFTAR RW UNTUK FILTER TERITORIAL
  const daftarRWKandidat = Array.from(
    new Set(
      aspirasiDesaIni.map((item: any) =>
        String(item.nomor_rw || (item.rt_rw ? item.rt_rw.split('RW')[1] : '') || '01').trim().padStart(2, '0')
      )
    )
  );

  const filteredData = aspirasiDesaIni.filter((item: any) => {
    const matchesStatus = filterStatus === 'Semua' || item.status === filterStatus;

    const rtNo = String(item.nomor_rt || '').padStart(2, '0');
    const rwNo = String(item.nomor_rw || (item.rt_rw ? item.rt_rw.split('RW')[1] : '') || '01').trim().padStart(2, '0');
    const matchesRW = filterRW === 'Semua' || rwNo === filterRW;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      (item.nama_warga && item.nama_warga.toLowerCase().includes(searchLower)) ||
      (item.nik_warga && item.nik_warga.includes(searchLower)) ||
      (item.judul && item.judul.toLowerCase().includes(searchLower)) ||
      (item.kategori && item.kategori.toLowerCase().includes(searchLower)) ||
      rtNo.includes(searchLower) ||
      rwNo.includes(searchLower) ||
      (item.rt_rw && item.rt_rw.toLowerCase().includes(searchLower));

    return matchesStatus && matchesRW && matchesSearch;
  });

  // PAGINATION CALCULATIONS
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const injectAuditLog = (aksiMsg: string) => {
    const currentAudit = JSON.parse(localStorage.getItem('svara_audit_logs') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const newAudit = {
      id: Date.now().toString(),
      waktu: new Date().toLocaleString('id-ID'),
      aktor: currentUser.nama || `Admin Desa ${namaDesaTarget}`,
      aksi: aksiMsg,
    };
    localStorage.setItem('svara_audit_logs', JSON.stringify([newAudit, ...currentAudit]));
  };

  // HANDLER UPDATE STATUS ASPIRASI VIA REST API MYSQL
  const handleUpdateAspirasi = async (id: string, newStatus: string, diteruskanKe: string = '-') => {
    if (isEmergencyLocked) {
      showToast('Sistem dalam Modus Darurat (Emergency Lock Active)! Tindakan dibekukan oleh Super Admin.', 'warning');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Update Status Aspirasi',
      message: `Apakah Anda yakin ingin memperbarui status aspirasi ini menjadi "${newStatus}"?`,
      confirmText: 'Ya, Perbarui',
      cancelText: 'Batal',
      type: newStatus === 'SELESAI' || newStatus === 'Selesai' ? 'success' : newStatus === 'DIPROSES' || newStatus === 'Diproses' ? 'info' : 'warning'
    });
    if (!isConfirmed) return;

    const notes = catatanText.trim() || undefined;

    try {
      const res = await apiService.updateStatusAspirasi(id, newStatus, notes, diteruskanKe !== '-' ? diteruskanKe : undefined);

      if (res && res.success) {
        setListAspirasiApi((prev) =>
          prev.map((item: any) => {
            if (item.id_aspirasi === id) {
              return {
                ...item,
                status: newStatus,
                diteruskan_ke: diteruskanKe !== '-' ? diteruskanKe : item.diteruskan_ke,
                catatan_desa: notes || item.catatan_desa,
              };
            }
            return item;
          })
        );

        const updatedList = listAspirasi.map((item: any) => {
          if (item.id_aspirasi === id) {
            return {
              ...item,
              status: newStatus,
              diteruskan_ke: diteruskanKe !== '-' ? diteruskanKe : item.diteruskan_ke,
              catatan_desa: notes || item.catatan_desa,
            };
          }
          return item;
        });

        const newState = {
          ...dataKecamatan,
          aspirasi_warga: updatedList,
        };

        setDataKecamatan(newState);
        localStorage.setItem('svara_kecamatan_data', JSON.stringify(newState));
        localStorage.setItem('kecamatan_app_data', JSON.stringify(newState));

        let logMsg = `Mengubah Status Aspirasi ${id} menjadi [${newStatus}]`;
        if (diteruskanKe !== '-') logMsg += ` - Diteruskan ke: ${diteruskanKe}`;
        injectAuditLog(logMsg);

        setSelectedAspirasi(null);
        setCatatanText('');
        showToast('Status Aspirasi Warga berhasil diperbarui di MySQL!', 'success');
      } else {
        showToast(`Gagal memperbarui status aspirasi: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err) {
      console.error('Error update aspirasi:', err);
      showToast('Terjadi kesalahan koneksi saat memperbarui status aspirasi.', 'error');
    }
  };

  // HANDLER HAPUS PERMANEN ASPIRASI (SELESAI INTEGRASI REST API MYSQL)
  const handleDeleteAspirasi = async (item: any) => {
    if (isEmergencyLocked) {
      showToast('Sistem dalam Modus Darurat! Tindakan dibekukan oleh Super Admin.', 'warning');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Hapus Permanen Aspirasi',
      message: `Apakah Anda yakin ingin menghapus permanen riwayat aspirasi dari ${item.nama_warga || 'Warga'} (ID: ${item.id_aspirasi})? Data di database akan dihapus sepenuhnya.`,
      confirmText: 'Ya, Hapus Permanen',
      cancelText: 'Batal',
      type: 'danger',
    });

    if (!isConfirmed) return;

    try {
      const res = await apiService.deleteAspirasi(item.id_aspirasi);

      if (res && res.success) {
        setListAspirasiApi((prev) => prev.filter((a: any) => a.id_aspirasi !== item.id_aspirasi));

        const updatedList = listAspirasi.filter((a: any) => a.id_aspirasi !== item.id_aspirasi);
        const newState = {
          ...dataKecamatan,
          aspirasi_warga: updatedList,
        };

        setDataKecamatan(newState);
        localStorage.setItem('svara_kecamatan_data', JSON.stringify(newState));
        localStorage.setItem('kecamatan_app_data', JSON.stringify(newState));

        injectAuditLog(`Menghapus Permanen Aspirasi Warga (ID: ${item.id_aspirasi})`);
        showToast('Riwayat aspirasi berhasil dihapus permanen dari MySQL!', 'success');

        if (selectedAspirasi?.id_aspirasi === item.id_aspirasi) {
          setSelectedAspirasi(null);
        }
        fetchAspirasi();
      } else {
        showToast(`Gagal menghapus aspirasi: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err) {
      console.error('Error delete aspirasi:', err);
      showToast('Terjadi kesalahan koneksi saat menghapus aspirasi.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-['Product_Sans',sans-serif] select-none text-black">
      {/* EMBARGO WARNING BANNER */}
      {isEmergencyLocked && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Sistem Modus Darurat Aktif (Pembekuan aksi oleh Super Admin).</span>
        </div>
      )}

      {/* STATISTIK KARTU */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-2xs">
          <p className="text-[10px] font-semibold text-black/50 uppercase tracking-wider flex items-center gap-1">
            <Inbox className="w-3.5 h-3.5 text-black/60" /> Aduan Masuk
          </p>
          <p className="text-2xl font-bold text-black mt-1">{aspirasiDesaIni.length}</p>
        </div>
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 shadow-2xs">
          <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Perlu Ditinjau
          </p>
          <p className="text-2xl font-bold text-amber-900 mt-1">
            {aspirasiDesaIni.filter((a: any) => a.status === 'Menunggu').length}
          </p>
        </div>
        <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 shadow-2xs">
          <p className="text-[10px] font-semibold text-blue-800 uppercase tracking-wider flex items-center gap-1">
            <Cog className="w-3.5 h-3.5 text-blue-600" /> Sedang Diproses
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {aspirasiDesaIni.filter((a: any) => a.status === 'Diproses').length}
          </p>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 shadow-2xs">
          <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selesai Ditangani
          </p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {aspirasiDesaIni.filter((a: any) => a.status === 'Selesai').length}
          </p>
        </div>
      </div>

      {/* HEADER SECTION & TABLE WRAPPER - ELEGAN SSOT */}
      <div className="bg-white border-b border-black/10 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium text-black flex items-center gap-2">
                <Inbox className="w-4 h-4 text-black" />
                Kotak Masuk Aspirasi Warga Desa {namaDesaTarget}
              </h2>
              {/* TOMBOL REFRESH STANDAR SSOT */}
              <button
                onClick={fetchAspirasi}
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
            <p className="text-xs text-black/50 mt-0.5">
              Daftar keluhan dan masukan publik terintegrasi profil warga berbasis wilayah RT/RW. (Tersambung MySQL)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* SEARCH BAR PILL */}
            <input
              type="text"
              placeholder="Cari Warga, NIK, Judul..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-1.5 text-xs bg-neutral-50 border border-black/10 rounded-full outline-none focus:border-black font-['Product_Sans'] w-36 sm:w-44"
            />

            {/* FILTER KANTONG RW */}
            <select
              value={filterRW}
              onChange={(e) => setFilterRW(e.target.value)}
              className="px-3 py-1.5 text-xs bg-neutral-50 border border-black/10 rounded-full outline-none focus:border-black font-['Product_Sans'] cursor-pointer font-medium"
            >
              <option value="Semua">Semua Wilayah RW</option>
              {daftarRWKandidat.map((rwNo) => (
                <option key={String(rwNo)} value={String(rwNo)}>
                  RW {String(rwNo)}
                </option>
              ))}
            </select>

            {/* SEGMENTED TAB STATUS */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-medium shrink-0">
              {['Semua', 'Menunggu', 'Diproses', 'Selesai'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === st
                      ? 'bg-black text-white'
                      : 'text-black/60 hover:text-black'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TABEL DATA ASPIRASI */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-black">
            <thead className="bg-slate-50 border-b border-black/10 text-black/60 font-medium uppercase text-[10px]">
              <tr>
                <th className="p-4">Warga & Lokasi</th>
                <th className="p-4">Kategori & Judul</th>
                <th className="p-4 w-1/3">Uraian Aspirasi</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Aksi / Kontrol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-black/40">
                    Memuat data aspirasi dari database MySQL...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-black/40">
                    Belum ada aspirasi dalam kategori filter ini.
                  </td>
                </tr>
              ) : (
                currentItems.map((item: any) => {
                  const displayRt = String(item.nomor_rt || '01').padStart(2, '0');
                  const displayRw = String(item.nomor_rw || (item.rt_rw ? item.rt_rw.split('RW')[1] : '') || '01').trim().padStart(2, '0');

                  return (
                    <tr key={item.id_aspirasi} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-black block">{item.nama_warga}</p>
                        <span className="text-[10px] font-mono text-black/50 block">
                          RT {displayRt} / RW {displayRw}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-[10px] font-semibold text-black/70 border border-black/10 inline-block mb-1">
                          {item.kategori}
                        </span>
                        <p className="font-medium text-black block leading-tight">
                          {item.judul || 'Tanpa Judul'}
                        </p>
                        <span className="text-[10px] text-black/40 font-mono block mt-0.5">
                          {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}
                        </span>
                      </td>

                      <td className="p-4">
                        <p className="line-clamp-2 text-black/70 leading-relaxed">
                          {item.isi || item.pesan}
                        </p>
                        {(item.catatan_desa || item.tanggapan) && (
                          <p className="text-[10px] mt-1 text-black/70 bg-slate-50 p-1.5 rounded-lg border border-black/10 line-clamp-1 font-medium">
                            <strong>Catatan Desa:</strong> {item.catatan_desa || item.tanggapan}
                          </p>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium inline-block border ${
                            item.status === 'Menunggu'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : item.status === 'Diproses'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.diteruskan_ke && item.diteruskan_ke !== '-' && (
                          <span className="text-[9.5px] text-black/50 font-medium block mt-1">
                            Diteruskan: {item.diteruskan_ke}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* TOMBOL DETAIL / TINJAU */}
                          <button
                            onClick={() => {
                              setSelectedAspirasi(item);
                              setCatatanText(item.catatan_desa || item.tanggapan || '');
                            }}
                            className="px-3 py-1.5 rounded-full border border-black/20 hover:border-black text-black font-medium text-xs transition-colors cursor-pointer"
                          >
                            Detail & Tinjau
                          </button>

                          {/* TOMBOL HAPUS PERMANEN (STANDAR SSOT TRASH2) */}
                          <button
                            type="button"
                            onClick={() => handleDeleteAspirasi(item)}
                            disabled={isEmergencyLocked}
                            className="p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                            title="Hapus Permanen Aspirasi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* CONTROLLER PAGINATION STANDAR SSOT LENGKAP */}
        {!isLoading && filteredData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-black/10 bg-slate-50 text-xs">
            <div className="flex items-center gap-3 text-black/60">
              <span>
                Menampilkan{' '}
                <strong className="text-black">{indexOfFirstItem + 1}</strong> -{' '}
                <strong className="text-black">
                  {Math.min(indexOfLastItem, totalItems)}
                </strong>{' '}
                dari <strong className="text-black">{totalItems}</strong> aspirasi
              </span>

              <div className="flex items-center gap-1.5">
                <span>| Tampilkan:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-black/10 rounded-md outline-none focus:border-black cursor-pointer font-medium"
                >
                  <option value={5}>5 baris</option>
                  <option value={10}>10 baris</option>
                  <option value={20}>20 baris</option>
                  <option value={50}>50 baris</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-black/10 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-black font-medium transition-colors cursor-pointer"
              >
                Sebelumnya
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      currentPage === page
                        ? 'bg-black text-white'
                        : 'bg-white border border-black/10 hover:bg-slate-100 text-black'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-black/10 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-black font-medium transition-colors cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETAIL ASPIRASI & PROFIL WARGA */}
      {selectedAspirasi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-black/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto font-['Product_Sans'] my-auto">
            {/* HEADER MODAL */}
            <div className="flex justify-between items-start border-b border-black/10 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-neutral-800 text-white text-[9.5px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                    {selectedAspirasi.id_aspirasi}
                  </span>
                  <span className="bg-slate-100 text-black/70 text-[9.5px] font-semibold px-2.5 py-0.5 rounded-full border border-black/10">
                    {selectedAspirasi.kategori}
                  </span>
                </div>
                <h3 className="text-base font-bold text-black">
                  Tinjauan Aspirasi Warga
                </h3>
              </div>
              <button
                onClick={() => setSelectedAspirasi(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-black hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SECTION 1: PROFIL WARGA */}
            <div className="p-4 rounded-xl bg-slate-50 border border-black/10 space-y-2">
              <h4 className="text-xs font-semibold text-black uppercase tracking-wider border-b border-black/10 pb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-black/70" /> Data Profil Pelapor
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <p className="text-black/50 text-[10.5px]">Nama Lengkap:</p>
                  <p className="font-medium text-black">{selectedAspirasi.nama_warga}</p>
                </div>
                <div>
                  <p className="text-black/50 text-[10.5px]">NIK:</p>
                  <p className="font-mono font-medium text-black">{selectedAspirasi.nik_warga || '-'}</p>
                </div>
                <div>
                  <p className="text-black/50 text-[10.5px] flex items-center gap-1">
                    <Phone className="w-3 h-3 text-black/40" /> Kontak WhatsApp:
                  </p>
                  <p className="font-mono font-medium text-black">{selectedAspirasi.no_hp_warga || '-'}</p>
                </div>
                <div>
                  <p className="text-black/50 text-[10.5px] flex items-center gap-1">
                    <Mail className="w-3 h-3 text-black/40" /> Email Warga:
                  </p>
                  <p className="font-medium text-blue-600 font-mono">{selectedAspirasi.email_warga || '-'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-black/50 text-[10.5px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-black/40" /> Domisili Wilayah:
                  </p>
                  <p className="text-black font-medium">
                    {selectedAspirasi.rt_rw || `RT ${selectedAspirasi.nomor_rt} / RW ${selectedAspirasi.nomor_rw}`} {selectedAspirasi.dusun ? `• ${selectedAspirasi.dusun}` : ''} ({selectedAspirasi.alamat_lengkap || 'Alamat tidak dilampirkan'})
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2: DETAIL URAIAN ASPIRASI */}
            <div className="p-4 rounded-xl bg-white border border-black/10 space-y-2">
              <h4 className="text-xs font-semibold text-black uppercase tracking-wider border-b border-black/10 pb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-black/70" /> Isi Aduan & Perihal
              </h4>
              <div className="space-y-2 text-xs pt-1">
                <div>
                  <p className="text-black/50 text-[10.5px]">Judul Aspirasi:</p>
                  <p className="font-medium text-black text-sm">{selectedAspirasi.judul || 'Tanpa Judul'}</p>
                </div>
                <div>
                  <p className="text-black/50 text-[10.5px]">Lokasi Kejadian / Fasilitas:</p>
                  <p className="font-medium text-black">{selectedAspirasi.lokasi || selectedAspirasi.rt_rw}</p>
                </div>
                <div>
                  <p className="text-black/50 text-[10.5px]">Uraian Laporan:</p>
                  <p className="text-black/80 leading-relaxed bg-slate-50 p-3 rounded-xl border border-black/10 whitespace-pre-line mt-1">
                    {selectedAspirasi.isi || selectedAspirasi.pesan}
                  </p>
                </div>
              </div>
            </div>

            {/* FORM CATATAN & AKSI DESA */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-medium text-black block mb-1">
                  Catatan Tindak Lanjut / Respon Desa
                </label>
                <textarea
                  rows={2}
                  value={catatanText}
                  onChange={(e) => setCatatanText(e.target.value)}
                  disabled={isEmergencyLocked}
                  placeholder="Masukkan catatan respon untuk warga..."
                  className="w-full rounded-xl border border-black/20 p-3 text-xs outline-none focus:border-black bg-slate-50 font-['Product_Sans']"
                />
              </div>

              <div className="border-t border-black/10 pt-3 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-black/50 uppercase tracking-wider">
                    Tindakan Status:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteAspirasi(selectedAspirasi)}
                    disabled={isEmergencyLocked}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full text-xs font-medium cursor-pointer border border-rose-200 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus Permanen
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateAspirasi(selectedAspirasi.id_aspirasi, 'Diproses', '-')}
                    disabled={isEmergencyLocked || selectedAspirasi.status === 'Diproses'}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedAspirasi.status === 'Diproses' ? 'bg-slate-100 text-black/40 cursor-not-allowed' : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <Cog className="w-3.5 h-3.5" /> Proses Aspirasi
                  </button>

                  <button
                    onClick={() => handleUpdateAspirasi(selectedAspirasi.id_aspirasi, 'Selesai', '-')}
                    disabled={isEmergencyLocked || selectedAspirasi.status === 'Selesai'}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedAspirasi.status === 'Selesai' ? 'bg-slate-100 text-black/40 cursor-not-allowed' : 'bg-black text-white hover:bg-neutral-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tandai Selesai
                  </button>

                  <button
                    onClick={() => handleUpdateAspirasi(selectedAspirasi.id_aspirasi, 'Diproses', 'Kecamatan')}
                    disabled={isEmergencyLocked}
                    className="col-span-2 rounded-full border border-black/20 bg-slate-50 px-4 py-2 text-xs font-medium text-black hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5 text-black/70" /> Eskalasi ke Kantor Kecamatan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabAspirasiDesa;