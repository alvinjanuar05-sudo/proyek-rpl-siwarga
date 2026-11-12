import React, { useState, useEffect } from 'react';
import { useKecamatan } from '../../context/KecamatanContext';
import { useToast } from '../../context/ToastContext';
import { apiService } from '../../services/api';
import { 
  Inbox, 
 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Copy, 
  Eye, 
  ShieldAlert, 
  X, 
  AlertTriangle, 
  FileText, 
  Mail, 
  User,
  Download,
  Trash2
} from 'lucide-react';

interface TabVerifikasiPengajuanProps {
  namaDesaActive?: string;
}

export const TabVerifikasiPengajuan: React.FC<TabVerifikasiPengajuanProps> = ({ namaDesaActive = "Sukamaju" }) => {
  const { dataKecamatan, setDataKecamatan } = useKecamatan();
  const { showToast, confirm } = useToast();
  
  // BACA EMBARGO EMERGENCY LOCK DARI SUPER ADMIN
  const isEmergencyLocked = localStorage.getItem('svara_emergency_lock') === 'true';

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPengajuan, setSelectedPengajuan] = useState<any>(null);
  const [alasanPenolakan, setAlasanPenolakan] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // STATE UNTUK REST API
  const [daftarPengajuanApi, setDaftarPengajuanApi] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // STATE PAGINATION STANDAR SSOT
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  // Normalisasi Nama Desa
  const targetNama = (namaDesaActive || '').toLowerCase().replace(/^desa\s+/, '').trim();
  const currentDesa = dataKecamatan?.desa_kelurahan?.find((d: any) => {
    const dNama = (d.nama_desa_kelurahan || d.nama || '').toLowerCase().replace(/^desa\s+/, '').trim();
    return dNama === targetNama || dNama.includes(targetNama) || targetNama.includes(dNama);
  }) || dataKecamatan?.desa_kelurahan?.[0] || {};

  // FUNGSI LOAD DATA DARI REST API BACKEND MYSQL
  const fetchPengajuanData = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getPengajuanSurat();
      if (res && res.success && Array.isArray(res.data)) {
        const formattedData = res.data.map((item: any) => {
          let parsedIsian = item.data_isian;
          if (typeof item.data_isian === 'string') {
            try {
              parsedIsian = JSON.parse(item.data_isian);
            } catch (e) {
              parsedIsian = {};
            }
          }
          return {
            ...item,
            data_isian: parsedIsian || {}
          };
        });
        setDaftarPengajuanApi(formattedData);
      } else {
        setDaftarPengajuanApi(currentDesa?.daftar_pengajuan || []);
      }
    } catch (error) {
      console.error('Gagal mengambil data pengajuan dari API:', error);
      setDaftarPengajuanApi(currentDesa?.daftar_pengajuan || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPengajuanData();
  }, [namaDesaActive]);

  // RESET HALAMAN SAAT FILTER ATAU ITM PER PAGE BERUBAH
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, itemsPerPage]);

  // GUNAKAN DATA API (DENGAN FALLBACK DATA CONTEXT)
  const daftarPengajuan: any[] = daftarPengajuanApi.length > 0 
    ? daftarPengajuanApi 
    : (currentDesa?.daftar_pengajuan || []);

  const filteredList = daftarPengajuan.filter((item) => {
    const matchesStatus = filterStatus === 'ALL' ? true : item.status === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    
    const namaWarga = (item.nama_warga || item.data_isian?.nama_warga || '').toLowerCase();
    const nikWarga = (item.nik_warga || item.data_isian?.nik_warga || '').toLowerCase();
    const rtWarga = String(item.nomor_rt || item.data_isian?.nomor_rt || '').toLowerCase();
    const rwWarga = String(item.nomor_rw || item.data_isian?.nomor_rw || '').toLowerCase();
    const kodeSurat = (item.id_pengajuan || '').toLowerCase();

    const matchesSearch =
      !searchTerm.trim() ||
      namaWarga.includes(searchLower) ||
      nikWarga.includes(searchLower) ||
      rtWarga.includes(searchLower) ||
      rwWarga.includes(searchLower) ||
      kodeSurat.includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  // HITUNG DATA PAGINATION
  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedData = filteredList.slice(indexOfFirstItem, indexOfLastItem);

  const handleFilterChange = (status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED') => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // FUNGSI INJEKSI LOG KE SUPER ADMIN
  const injectAuditLog = (aksiMsg: string) => {
    const currentAudit = JSON.parse(localStorage.getItem('svara_audit_logs') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const newAudit = {
      id: Date.now().toString(),
      waktu: new Date().toLocaleString('id-ID'),
      aktor: currentUser.nama || 'ADMIN_DESA',
      aksi: aksiMsg
    };
    localStorage.setItem('svara_audit_logs', JSON.stringify([newAudit, ...currentAudit]));
  };

  // HANDLER APPROVE VIA REST API & LOCAL FALLBACK
  const handleApprove = async (item: any) => {
    if (isEmergencyLocked) {
      showToast('Sistem dalam Modus Darurat (Emergency Lock Active)! Tindakan dibekukan oleh Super Admin.', 'warning');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Persetujuan Permohonan Surat',
      message: `Setujui permohonan surat ${item.nama_surat || item.id_pengajuan}? Status akan diperbarui menjadi APPROVED.`,
      confirmText: 'Setujui',
      cancelText: 'Batal',
      type: 'success'
    });
    if (!isConfirmed) return;

    try {
      const res = await apiService.updateStatusSurat(item.id_pengajuan, 'APPROVED');

      if (res && res.success) {
        setDaftarPengajuanApi((prev) =>
          prev.map((p) =>
            p.id_pengajuan === item.id_pengajuan
              ? {
                  ...p,
                  status: 'APPROVED',
                  nomor_surat_resmi: res.nomor_surat_resmi || p.nomor_surat_resmi,
                  file_output: res.file_output || p.file_output,
                }
              : p
          )
        );

        setDataKecamatan((prev: any) => {
          const updatedDesa = prev?.desa_kelurahan?.map((d: any) => {
            const dNama = (d.nama_desa_kelurahan || d.nama || '').toLowerCase().replace(/^desa\s+/, '').trim();
            if (dNama === targetNama || d.id_desa === currentDesa.id_desa) {
              const updatedPengajuan = (d.daftar_pengajuan || []).map((p: any) => {
                if (p.id_pengajuan === item.id_pengajuan) {
                  return { ...p, status: 'APPROVED' };
                }
                return p;
              });
              return { ...d, daftar_pengajuan: updatedPengajuan };
            }
            return d;
          });
          const newState = { ...prev, desa_kelurahan: updatedDesa };
          localStorage.setItem('svara_kecamatan_data', JSON.stringify(newState));
          localStorage.setItem('kecamatan_app_data', JSON.stringify(newState));
          return newState;
        });

        injectAuditLog(`Menyetujui (APPROVE) Pengajuan Surat ${item.nama_surat} - NIK: ${item.nik_warga || item.data_isian?.nik_warga || '-'}`);
        showToast('Permohonan surat berhasil disetujui di MySQL!', 'success');
        setSelectedPengajuan(null);
      } else {
        showToast(`Gagal memperbarui status: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err: any) {
      console.error('Error approve:', err);
      showToast('Terjadi kesalahan koneksi saat menyetujui pengajuan.', 'error');
    }
  };

  // HANDLER SALIN DATA KE CLIPBOARD
  const handleCopyData = (dataIsian: any) => {
    const textToCopy = Object.entries(dataIsian || {})
      .filter(([key]) => key !== 'kategori_keperluan' && key !== 'sub_keperluan')
      .map(([key, val]) => `${key.replace('_', ' ').toUpperCase()}: ${val}`)
      .join('\n');

    navigator.clipboard.writeText(textToCopy);
    showToast('Data pemohon berhasil disalin ke clipboard!', 'info');
  };

  // HANDLER TOLAK PERMOHONAN VIA REST API
  const handleConfirmReject = async () => {
    if (isEmergencyLocked) {
      showToast('Modus Darurat Aktif! Tindakan dibekukan.', 'warning');
      return;
    }

    if (!alasanPenolakan.trim()) {
      showToast('Mohon isi alasan penolakan!', 'warning');
      return;
    }

    const itemTarget = selectedPengajuan;

    try {
      const res = await apiService.updateStatusSurat(itemTarget.id_pengajuan, 'REJECTED', alasanPenolakan.trim());

      if (res && res.success) {
        setDaftarPengajuanApi((prev) =>
          prev.map((p) =>
            p.id_pengajuan === itemTarget.id_pengajuan
              ? { ...p, status: 'REJECTED', catatan_admin: alasanPenolakan.trim() }
              : p
          )
        );

        setDataKecamatan((prev: any) => {
          const updatedDesa = prev?.desa_kelurahan?.map((d: any) => {
            const dNama = (d.nama_desa_kelurahan || d.nama || '').toLowerCase().replace(/^desa\s+/, '').trim();
            if (dNama === targetNama || d.id_desa === currentDesa.id_desa) {
              const updatedPengajuan = (d.daftar_pengajuan || []).map((item: any) => {
                if (item.id_pengajuan === itemTarget.id_pengajuan) {
                  return { 
                    ...item, 
                    status: 'REJECTED',
                    catatan_admin: alasanPenolakan.trim()
                  };
                }
                return item;
              });
              return { ...d, daftar_pengajuan: updatedPengajuan };
            }
            return d;
          });
          const newState = { ...prev, desa_kelurahan: updatedDesa };
          localStorage.setItem('svara_kecamatan_data', JSON.stringify(newState));
          localStorage.setItem('kecamatan_app_data', JSON.stringify(newState));
          return newState;
        });

        injectAuditLog(`Menolak (REJECT) Pengajuan Surat ${itemTarget.nama_surat} (${itemTarget.id_pengajuan})`);
        showToast(`Permohonan ${itemTarget.id_pengajuan} ditolak.`, 'info');
        setShowRejectModal(false);
        setSelectedPengajuan(null);
        setAlasanPenolakan('');
      } else {
        showToast(`Gagal menolak permohonan: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err: any) {
      console.error('Error reject:', err);
      showToast('Terjadi kesalahan koneksi saat menolak pengajuan.', 'error');
    }
  };

  // HANDLER HAPUS PENGAJUAN SURAT VIA REST API BACKEND
  const handleDeletePengajuan = async (item: any) => {
    if (isEmergencyLocked) {
      showToast('Sistem dalam Modus Darurat! Tindakan dibekukan.', 'warning');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Hapus Permohonan Surat',
      message: `Apakah Anda yakin ingin menghapus permanen pengajuan surat ${item.nama_surat} (${item.id_pengajuan})?`,
      confirmText: 'Hapus Permanen',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!isConfirmed) return;

    try {
      const res = await (apiService as any).deletePengajuanSurat(item.id_pengajuan);

      if (res && res.success) {
        setDaftarPengajuanApi((prev) => prev.filter((p) => p.id_pengajuan !== item.id_pengajuan));

        setDataKecamatan((prev: any) => {
          const updatedDesa = prev?.desa_kelurahan?.map((d: any) => {
            const dNama = (d.nama_desa_kelurahan || d.nama || '').toLowerCase().replace(/^desa\s+/, '').trim();
            if (dNama === targetNama || d.id_desa === currentDesa.id_desa) {
              const updatedPengajuan = (d.daftar_pengajuan || []).filter((p: any) => p.id_pengajuan !== item.id_pengajuan);
              return { ...d, daftar_pengajuan: updatedPengajuan };
            }
            return d;
          });
          const newState = { ...prev, desa_kelurahan: updatedDesa };
          localStorage.setItem('svara_kecamatan_data', JSON.stringify(newState));
          localStorage.setItem('kecamatan_app_data', JSON.stringify(newState));
          return newState;
        });

        injectAuditLog(`Menghapus Pengajuan Surat ${item.nama_surat} (${item.id_pengajuan})`);
        showToast(`Permohonan ${item.id_pengajuan} berhasil dihapus permanen!`, 'success');
        if (selectedPengajuan?.id_pengajuan === item.id_pengajuan) {
          setSelectedPengajuan(null);
        }
      } else {
        showToast(`Gagal menghapus dari database: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err: any) {
      console.error('Error delete pengajuan:', err);
      showToast('Terjadi kesalahan koneksi saat menghapus pengajuan dari server.', 'error');
    }
  };

  return (
    <div className="w-full space-y-6 font-['Product_Sans',sans-serif] relative select-none text-black">

      {/* EMBARGO WARNING BANNER */}
      {isEmergencyLocked && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs font-semibold">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Sistem Modus Darurat Aktif (Pembekuan aksi oleh Super Admin).</span>
        </div>
      )}

      {/* HEADER SECTION & CONTAINER TABEL */}
      <div className="bg-white border-b border-black/10 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 border-b border-black/10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium text-black flex items-center gap-2">
                <Inbox className="w-4 h-4 text-black" />
                Antrean Pengajuan Surat Warga
              </h2>
              {/* TOMBOL REFRESH STANDAR SSOT */}
              <button 
                onClick={fetchPengajuanData} 
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
              Wilayah Desa {currentDesa?.nama_desa_kelurahan || currentDesa?.nama || ''} (Tersambung MySQL)
            </p>
          </div>

          {/* SEARCH BAR PILL & SEGMENTED FILTER STATUS SSOT */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <input
              type="text"
              placeholder="Cari Nama, NIK, RT, RW..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="px-3.5 py-1.5 text-xs bg-neutral-50 border border-black/10 rounded-full outline-none focus:border-black font-['Product_Sans'] w-36 sm:w-48"
            />

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-medium shrink-0">
              <button
                onClick={() => handleFilterChange('ALL')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  filterStatus === 'ALL' ? 'bg-black text-white' : 'text-black/60 hover:text-black'
                }`}
              >
                Semua ({daftarPengajuan.length})
              </button>
              <button
                onClick={() => handleFilterChange('PENDING')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  filterStatus === 'PENDING' ? 'bg-black text-white' : 'text-black/60 hover:text-black'
                }`}
              >
                <Clock className="w-3 h-3" />
                Menunggu ({daftarPengajuan.filter(i => i.status === 'PENDING').length})
              </button>
              <button
                onClick={() => handleFilterChange('APPROVED')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  filterStatus === 'APPROVED' ? 'bg-black text-white' : 'text-black/60 hover:text-black'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Disetujui ({daftarPengajuan.filter(i => i.status === 'APPROVED').length})
              </button>
              <button
                onClick={() => handleFilterChange('REJECTED')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  filterStatus === 'REJECTED' ? 'bg-black text-white' : 'text-black/60 hover:text-black'
                }`}
              >
                <XCircle className="w-3 h-3" />
                Ditolak ({daftarPengajuan.filter(i => i.status === 'REJECTED').length})
              </button>
            </div>
          </div>
        </div>

        {/* TABEL ANTREAN PENGAJUAN */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-black/40">
              Memuat data pengajuan dari database MySQL...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-12 text-center text-black/40">
              Belum ada permohonan surat dalam kategori filter ini.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-black">
              <thead className="bg-slate-50 border-b border-black/10 text-black/60 font-medium uppercase text-[10px]">
                <tr>
                  <th className="p-4">ID & Waktu</th>
                  <th className="p-4">Pemohon</th>
                  <th className="p-4">RT/RW</th>
                  <th className="p-4">Jenis Surat</th>
                  <th className="p-4">Keperluan</th>
                  <th className="p-4">Email</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {paginatedData.map((item) => {
                  const namaWarga = item.nama_warga || item.data_isian?.nama_warga || '-';
                  const nikWarga = item.nik_warga || item.data_isian?.nik_warga || '-';
                  const rtNo = String(item.nomor_rt || item.data_isian?.nomor_rt || '01').padStart(2, '0');
                  const rwNo = String(item.nomor_rw || item.data_isian?.nomor_rw || '01').padStart(2, '0');

                  return (
                    <tr key={item.id_pengajuan} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono">
                        <span className="font-medium text-black block">{item.id_pengajuan}</span>
                        <span className="text-[10px] text-black/40 block">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : item.tanggal_pengajuan ? new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-black block leading-tight">{namaWarga}</span>
                        <span className="text-[10px] text-black/40 font-mono">NIK: {nikWarga}</span>
                      </td>
                      <td className="p-4 font-mono">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 border border-black/10 text-[10px] font-semibold text-black/70">
                          {rtNo}/{rwNo}
                        </span>
                      </td>
                      <td className="p-4 max-w-[160px]">
                        <span className="font-medium text-black leading-tight block truncate">{item.nama_surat}</span>
                        <span className="text-[10px] text-black/40 font-mono truncate block">{item.kode_surat}</span>
                      </td>
                      <td className="p-4 max-w-[150px] truncate text-black/70 italic text-[11px]">
                        "{item.data_isian?.keperluan || '-'}"
                      </td>
                      <td className="p-4 font-mono text-[10.5px] text-blue-600 max-w-[140px] truncate">
                        {item.email_warga}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium inline-block border ${
                          item.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {item.status === 'PENDING' ? 'Menunggu' : item.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPengajuan(item)}
                            className="px-3 py-1.5 rounded-full border border-black/20 hover:border-black text-black font-medium text-xs transition-colors cursor-pointer flex items-center gap-1"
                            title="Detail & Salin Data"
                          >
                            <Eye className="w-3 h-3" /> Detail
                          </button>
                          
                          {item.status === 'APPROVED' && item.file_output && (
                            <a
                              href={`http://localhost:5000/api/pengajuan-surat/${item.id_pengajuan}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-medium transition-colors border border-emerald-200 cursor-pointer flex items-center gap-1 text-xs"
                              title="Unduh Berkas Word Resmi (.docx)"
                            >
                              <Download className="w-3 h-3 text-emerald-600" /> Unduh
                            </a>
                          )}

                          {item.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(item)}
                                disabled={isEmergencyLocked}
                                className={`px-3 py-1.5 rounded-full text-white font-medium transition-colors cursor-pointer flex items-center gap-1 text-xs shadow-xs ${
                                  isEmergencyLocked ? 'bg-slate-400 cursor-not-allowed' : 'bg-black hover:bg-neutral-800'
                                }`}
                                title="Setujui"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Setujui
                              </button>
                              <button
                                onClick={() => {
                                  if (isEmergencyLocked) {
                                    showToast('Modus Darurat Aktif!', 'warning');
                                    return;
                                  }
                                  setSelectedPengajuan(item);
                                  setShowRejectModal(true);
                                }}
                                disabled={isEmergencyLocked}
                                className={`px-3 py-1.5 rounded-full text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-medium transition-colors cursor-pointer flex items-center gap-1 text-xs ${
                                  isEmergencyLocked ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title="Tolak"
                              >
                                <XCircle className="w-3 h-3" /> Tolak
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleDeletePengajuan(item)}
                            disabled={isEmergencyLocked}
                            className="p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-50"
                            title="Hapus Permohonan Surat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* CONTROLLER PAGINATION STANDAR SSOT LENGKAP */}
        {!isLoading && filteredList.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-black/10 bg-slate-50 text-xs">
            <div className="flex items-center gap-3 text-black/60">
              <span>
                Menampilkan{' '}
                <strong className="text-black">{indexOfFirstItem + 1}</strong> -{' '}
                <strong className="text-black">
                  {Math.min(indexOfLastItem, totalItems)}
                </strong>{' '}
                dari <strong className="text-black">{totalItems}</strong> pengajuan
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

      {/* MODAL DETAIL PERMOHONAN & SALIN DATA */}
      {selectedPengajuan && !showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-black/10 p-6 space-y-5 my-auto max-h-[90vh] overflow-y-auto font-['Product_Sans']">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-black flex items-center gap-2">
                  <FileText className="w-4 h-4 text-black" />
                  Rincian Permohonan & Salin Data
                </h3>
                <p className="text-xs text-black/50 font-mono mt-0.5">ID: {selectedPengajuan.id_pengajuan}</p>
              </div>
              <button
                onClick={() => setSelectedPengajuan(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-black font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-black/10">
                <div>
                  <span className="text-[10px] text-black/50 block">Jenis Surat</span>
                  <span className="font-medium text-black">{selectedPengajuan.nama_surat}</span>
                </div>
                <div>
                  <span className="text-[10px] text-black/50 block">Email / Kontak Warga</span>
                  <span className="font-medium font-mono text-blue-600 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-500" />
                    {selectedPengajuan.email_warga}
                  </span>
                </div>
              </div>

              {/* DETAIL ISIAN WARGA */}
              <div className="space-y-2 border-t border-black/10 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-black text-xs flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-black/70" />
                    Isian Data Pemohon:
                  </h4>
                  <div className="flex items-center gap-2">
                    {selectedPengajuan.file_output && (
                      <a
                        href={`http://localhost:5000/api/pengajuan-surat/${selectedPengajuan.id_pengajuan}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-full font-medium text-[11px] transition-colors border border-emerald-200 cursor-pointer flex items-center gap-1.5"
                        title="Unduh Berkas Word Resmi (.docx)"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" /> Unduh Dokumen (.docx)
                      </a>
                    )}
                    <button
                      onClick={() => handleCopyData(selectedPengajuan.data_isian)}
                      className="px-3 py-1.5 bg-slate-100 text-black hover:bg-slate-200 rounded-full font-medium text-[11px] transition-colors border border-black/10 cursor-pointer flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Salin Semua Data
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-y-1.5 bg-slate-50 p-4 rounded-xl border border-black/10 font-['Product_Sans']">
                  {Object.entries(selectedPengajuan.data_isian || {}).map(([key, val]: any) => {
                    if (key === 'kategori_keperluan' || key === 'sub_keperluan') return null;
                    return (
                      <React.Fragment key={key}>
                        <span className="col-span-4 text-black/60 capitalize font-normal">{key.replace('_', ' ')}</span>
                        <span className="col-span-8 font-medium text-black">: {val?.toString() || '-'}</span>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {selectedPengajuan.status === 'REJECTED' && (
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-800 space-y-1">
                  <span className="font-semibold flex items-center gap-1 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Catatan Penolakan Admin:
                  </span>
                  <p className="text-xs">{selectedPengajuan.catatan_admin}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-black/10 pt-4">
              <button
                onClick={() => handleDeletePengajuan(selectedPengajuan)}
                disabled={isEmergencyLocked}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full text-xs font-medium cursor-pointer border border-rose-200 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Surat
              </button>

              <div className="flex gap-2">
                {selectedPengajuan.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => {
                        if (isEmergencyLocked) {
                          showToast('Modus Darurat Aktif!', 'warning');
                          return;
                        }
                        setShowRejectModal(true);
                      }}
                      disabled={isEmergencyLocked}
                      className="px-4 py-1.5 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-medium text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Tolak Permohonan
                    </button>
                    <button
                      onClick={() => handleApprove(selectedPengajuan)}
                      disabled={isEmergencyLocked}
                      className="px-5 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 font-medium text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve Permohonan
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ISIAN ALASAN PENOLAKAN */}
      {showRejectModal && selectedPengajuan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-black/10 p-6 space-y-4 my-auto font-['Product_Sans']">
            <h3 className="text-sm font-bold text-black flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Tolak Permohonan Surat
            </h3>
            <p className="text-xs text-black/70">
              Berikan alasan penolakan untuk dikirimkan ke pemohon (<strong>{selectedPengajuan.email_warga}</strong>):
            </p>

            <textarea
              rows={3}
              placeholder="Contoh: Lampiran KTP kurang jelas..."
              value={alasanPenolakan}
              onChange={(e) => setAlasanPenolakan(e.target.value)}
              className="w-full rounded-xl border border-black/20 p-3 text-xs outline-none focus:border-black font-['Product_Sans'] bg-slate-50"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-full border border-black/20 text-black hover:bg-slate-100 font-medium text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-full bg-rose-600 text-white hover:bg-rose-700 font-medium text-xs shadow-xs cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TabVerifikasiPengajuan;