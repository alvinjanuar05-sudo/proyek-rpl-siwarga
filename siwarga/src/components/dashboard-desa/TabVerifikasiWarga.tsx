import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface TabVerifikasiWargaProps {
  namaDesaActive?: string;
}

export const TabVerifikasiWarga: React.FC<TabVerifikasiWargaProps> = ({
  namaDesaActive = 'Sukamaju',
}) => {
  const { showToast, confirm } = useToast();
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | 'PENDING_VERIFICATION' | 'Active' | 'Rejected'
  >('PENDING_VERIFICATION');
  const [searchTerm, setSearchTerm] = useState('');

  // STATE DINAMIS UNTUK FILTER RT / RW
  const [masterRwList, setMasterRwList] = useState<any[]>([]);
  const [selectedRwFilter, setSelectedRwFilter] = useState<string>('ALL');
  const [selectedRtFilter, setSelectedRtFilter] = useState<string>('ALL');

  // STATE PAGINATION
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [alasanTolak, setAlasanTolak] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // STATE UNTUK POP-UP MODAL EDIT DAN HAPUS
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);

  // BACA EMBARGO EMERGENCY LOCK
  const isEmergencyLocked =
    localStorage.getItem('svara_emergency_lock') === 'true';

  // Helper untuk cek status pending secara konsisten
  const checkIsPending = (status: string) => {
    if (!status) return true;
    const s = status.toUpperCase();
    return s === 'PENDING' || s === 'PENDING_VERIFICATION' || s === 'MENUNGGU';
  };

  // Helper untuk cek status aktif secara konsisten
  const checkIsActive = (status: string) => {
    if (!status) return false;
    const s = status.toUpperCase();
    return s === 'ACTIVE' || s === 'VERIFIED' || s === 'AKTIFF';
  };

  // RESET HALAMAN KE 1 SETIAP KALI FILTER BERUBAH
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, selectedRwFilter, selectedRtFilter, searchTerm, itemsPerPage]);

  // LOAD DATA USERS DARI REST API MYSQL (Hanya Role WARGA)
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getUsers();
      if (res && res.success && Array.isArray(res.data)) {
        const hanyaWarga = res.data.filter((u: any) => {
          const role = (u.role || 'WARGA').toUpperCase();
          return role === 'WARGA';
        });
        setRegisteredUsers(hanyaWarga);
      } else {
        const localUsers = JSON.parse(
          localStorage.getItem('svara_registered_users') || '[]'
        );
        setRegisteredUsers(localUsers);
      }
    } catch (err) {
      console.error('Gagal mengambil data user dari API:', err);
      const localUsers = JSON.parse(
        localStorage.getItem('svara_registered_users') || '[]'
      );
      setRegisteredUsers(localUsers);
    } finally {
      setIsLoading(false);
    }
  };

  // FETCH DATA MASTER RW & RT DARI API DESA / LOCALSTORAGE
  const fetchMasterRtRw = async () => {
    try {
      let rwData: any[] = [];
      
      if (typeof apiService.getStrukturRTRW === 'function') {
        const res = await apiService.getStrukturRTRW();
        if (res && res.success && Array.isArray(res.data)) {
          rwData = res.data;
        }
      } else if (typeof apiService.getRwRts === 'function') {
        const res = await apiService.getRwRts();
        if (res && res.success && Array.isArray(res.data)) {
          rwData = res.data;
        }
      }

      if (!rwData || rwData.length === 0) {
        rwData = JSON.parse(
          localStorage.getItem('svara_master_rw_list') || '[]'
        );
      }

      setMasterRwList(rwData);
    } catch (err) {
      console.error('Gagal memuat master data RT/RW:', err);
      const localRw = JSON.parse(
        localStorage.getItem('svara_master_rw_list') || '[]'
      );
      setMasterRwList(localRw);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMasterRtRw();
  }, []);

  const saveUsersToStorage = (updatedUsers: any[]) => {
    setRegisteredUsers(updatedUsers);
    localStorage.setItem(
      'svara_registered_users',
      JSON.stringify(updatedUsers)
    );
  };

  // INJEKSI LOG KE SUPER ADMIN
  const injectAuditLog = (aksiMsg: string) => {
    const currentAudit = JSON.parse(
      localStorage.getItem('svara_audit_logs') || '[]'
    );
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const newAudit = {
      id: Date.now().toString(),
      waktu: new Date().toLocaleString('id-ID'),
      aktor: currentUser.nama || 'ADMIN_DESA',
      aksi: aksiMsg,
    };
    localStorage.setItem(
      'svara_audit_logs',
      JSON.stringify([newAudit, ...currentAudit])
    );
  };

  // HANDLER SETUJUI AKUN WARGA VIA REST API
  const handleApproveUser = async (user: any) => {
    if (isEmergencyLocked) {
      showToast('Modus Darurat Aktif! Tindakan dibekukan oleh Super Admin.', 'warning');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Konfirmasi Verifikasi Akun',
      message: `Setujui pendaftaran akun warga atas nama ${user.nama} (NIK: ${user.nik})?`,
      confirmText: 'Setujui',
      cancelText: 'Batal',
      type: 'success'
    });
    if (!isConfirmed) return;

    const formattedRt = String(user.nomor_rt || '01').padStart(2, '0');
    const formattedRw = String(user.nomor_rw || '01').padStart(2, '0');
    const targetId = user.id_user || user.nik;

    try {
      const res = await apiService.updateStatusUser(targetId, 'Active');
      if (res && res.success) {
        const updated = registeredUsers.map((u) => {
          if (
            (u.id_user && u.id_user === user.id_user) ||
            (u.nik && u.nik === user.nik)
          ) {
            return {
              ...u,
              status: 'Active',
              nomor_rt: formattedRt,
              nomor_rw: formattedRw,
              rt_rw: `RT ${formattedRt} / RW ${formattedRw}`,
            };
          }
          return u;
        });

        saveUsersToStorage(updated);
        injectAuditLog(
          `Menyetujui Verifikasi Akun Warga: ${user.nama} (NIK: ${user.nik}) - Wilayah: RT ${formattedRt}/RW ${formattedRw}`
        );
        showToast(`Akun warga ${user.nama} berhasil diverifikasi di MySQL!`, 'success');
        fetchUsers();
      } else {
        showToast(`Gagal memverifikasi akun: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err) {
      console.error('Error approve user:', err);
      showToast('Terjadi kesalahan koneksi saat memverifikasi akun warga.', 'error');
    }
  };

  // HANDLER TOLAK AKUN WARGA VIA REST API
  const handleConfirmReject = async () => {
    if (isEmergencyLocked) {
      showToast('Modus Darurat Aktif!', 'warning');
      return;
    }

    if (!alasanTolak.trim()) {
      showToast('Mohon isi alasan penolakan!', 'warning');
      return;
    }

    const targetId = selectedUser.id_user || selectedUser.nik;

    try {
      const res = await apiService.updateStatusUser(targetId, 'Ditolak');
      if (res && res.success) {
        const updated = registeredUsers.map((u) => {
          if (
            (u.id_user && u.id_user === selectedUser.id_user) ||
            (u.nik && u.nik === selectedUser.nik)
          ) {
            return {
              ...u,
              status: 'Ditolak',
              catatan_admin: alasanTolak.trim(),
            };
          }
          return u;
        });

        saveUsersToStorage(updated);
        injectAuditLog(
          `Menolak Verifikasi Akun Warga: ${selectedUser.nama} (NIK: ${selectedUser.nik}) - Alasan: ${alasanTolak.trim()}`
        );

        showToast(`Pendaftaran akun warga ${selectedUser.nama} ditolak.`, 'info');
        setShowRejectModal(false);
        setSelectedUser(null);
        setAlasanTolak('');
        fetchUsers();
      } else {
        showToast(`Gagal menolak akun: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err) {
      console.error('Error reject user:', err);
      showToast('Terjadi kesalahan koneksi saat menolak akun warga.', 'error');
    }
  };

  // HANDLER SIMPAN EDIT DATA WARGA VIA REST API
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmergencyLocked) {
      showToast('Modus Darurat Aktif!', 'warning');
      return;
    }

    if (!editingUser) return;

    const formattedRt = String(editingUser.nomor_rt || '01').padStart(2, '0');
    const formattedRw = String(editingUser.nomor_rw || '01').padStart(2, '0');
    const targetId = editingUser.id_user || editingUser.nik;

    try {
      const res = await apiService.updateStatusUser(targetId, editingUser.status || 'Active');
      if (res && res.success) {
        const updated = registeredUsers.map((u) => {
          if (
            (u.id_user && u.id_user === editingUser.id_user) ||
            (u.nik && u.nik === editingUser.nik)
          ) {
            return {
              ...editingUser,
              nomor_rt: formattedRt,
              nomor_rw: formattedRw,
              rt_rw: `RT ${formattedRt} / RW ${formattedRw}`,
            };
          }
          return u;
        });

        saveUsersToStorage(updated);
        injectAuditLog(
          `Memperbarui Data Warga: ${editingUser.nama} (NIK: ${editingUser.nik})`
        );
        showToast(`Data warga ${editingUser.nama} berhasil diperbarui!`, 'success');
        setEditingUser(null);
        fetchUsers();
      } else {
        showToast(`Gagal memperbarui data: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err) {
      console.error('Error edit user:', err);
      showToast('Terjadi kesalahan koneksi saat memperbarui data.', 'error');
    }
  };

  // HANDLER HAPUS PERMANEN DATA WARGA VIA REST API MYSQL
  const handleConfirmDeleteUser = async () => {
    if (isEmergencyLocked) {
      showToast('Modus Darurat Aktif!', 'warning');
      return;
    }

    if (!deletingUser) return;

    const targetId = deletingUser.id_user || deletingUser.nik;

    try {
      const res = await apiService.deleteUser(targetId);
      if (res && res.success) {
        const updated = registeredUsers.filter(
          (u) =>
            (u.id_user ? u.id_user !== deletingUser.id_user : true) &&
            (u.nik ? u.nik !== deletingUser.nik : true)
        );

        saveUsersToStorage(updated);
        injectAuditLog(
          `Menghapus Permanen Akun Warga: ${deletingUser.nama} (NIK: ${deletingUser.nik})`
        );
        showToast(`Data warga ${deletingUser.nama} berhasil dihapus secara permanen!`, 'success');
        setDeletingUser(null);
        fetchUsers();
      } else {
        showToast(`Gagal menghapus akun: ${res?.message || 'Terjadi kesalahan'}`, 'error');
      }
    } catch (err) {
      console.error('Error delete user:', err);
      showToast('Terjadi kesalahan koneksi saat menghapus akun warga dari database.', 'error');
    }
  };

  // EXTRACTION RW LIST (DARI MASTER ATAU AUTO-EXTRACT DARI DATA WARGA)
  const availableRwNumbers: string[] = React.useMemo(() => {
    if (masterRwList.length > 0) {
      return masterRwList.map((rwItem: any, idx: number) =>
        String(rwItem.nomor || rwItem.nomor_rw || rwItem.rw || idx + 1).padStart(2, '0')
      );
    }
    const setRw = new Set<string>();
    registeredUsers.forEach((u) => {
      const rwVal = u.nomor_rw || u.rw;
      if (rwVal) setRw.add(String(rwVal).padStart(2, '0'));
    });
    return Array.from(setRw).sort();
  }, [masterRwList, registeredUsers]);

  // EXTRACTION RT LIST BERDASARKAN RW TERPILIH
  const availableRtNumbers: string[] = React.useMemo(() => {
    if (selectedRwFilter === 'ALL') return [];

    if (masterRwList.length > 0) {
      const currentRwObj = masterRwList.find(
        (rwItem) =>
          String(rwItem.nomor || rwItem.nomor_rw || rwItem.rw).padStart(2, '0') ===
          String(selectedRwFilter).padStart(2, '0')
      );
      const rtList = currentRwObj ? currentRwObj.rt || currentRwObj.daftar_rt || [] : [];
      return rtList.map((rtItem: any) =>
        String(rtItem.nomor || rtItem.nomor_rt || rtItem.rt || rtItem).padStart(2, '0')
      );
    }

    const setRt = new Set<string>();
    registeredUsers.forEach((u) => {
      const uRw = String(u.nomor_rw || u.rw || '').padStart(2, '0');
      const uRt = u.nomor_rt || u.rt;
      if (uRw === String(selectedRwFilter).padStart(2, '0') && uRt) {
        setRt.add(String(uRt).padStart(2, '0'));
      }
    });
    return Array.from(setRt).sort();
  }, [selectedRwFilter, masterRwList, registeredUsers]);

  // MULTI-LEVEL FILTERING DATA WARGA
  const filteredList = registeredUsers.filter((u) => {
    const isPending = checkIsPending(u.status);
    const isActive = checkIsActive(u.status);

    // 1. FILTER STATUS
    const matchesStatus =
      filterStatus === 'ALL'
        ? true
        : filterStatus === 'PENDING_VERIFICATION'
        ? isPending
        : filterStatus === 'Active'
        ? isActive
        : !isPending && !isActive;

    // 2. FILTER RW (Mengabaikan leading zeros)
    const matchesRw =
      selectedRwFilter === 'ALL' ||
      String(u.nomor_rw || u.rw || '').replace(/^0+/, '') ===
        String(selectedRwFilter).replace(/^0+/, '');

    // 3. FILTER RT (Mengabaikan leading zeros)
    const matchesRt =
      selectedRtFilter === 'ALL' ||
      String(u.nomor_rt || u.rt || '').replace(/^0+/, '') ===
        String(selectedRtFilter).replace(/^0+/, '');

    // 4. FILTER SEARCH TEXT
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      (u.nama && u.nama.toLowerCase().includes(searchLower)) ||
      (u.nik && u.nik.includes(searchLower)) ||
      (u.nomor_rt && String(u.nomor_rt).includes(searchLower)) ||
      (u.nomor_rw && String(u.nomor_rw).includes(searchLower)) ||
      (u.rt_rw && u.rt_rw.toLowerCase().includes(searchLower));

    return matchesStatus && matchesRw && matchesRt && matchesSearch;
  });

  // PEMOTONGAN DATA UNTUK PAGINATION
  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="w-full space-y-6 font-['Product_Sans',sans-serif] select-none text-black">
      {/* HEADER SECTION - DUA SISI RAPI DAN TANPA SCROLLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 border-b border-black/10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-black">
              Verifikasi & Pendaftaran Akun Warga
            </h2>
            <button
              onClick={() => {
                fetchUsers();
                fetchMasterRtRw();
              }}
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
            Kroscek NIK dan data wilayah (RT/RW) warga Desa {namaDesaActive} sebelum memberikan akses login. (Tersambung MySQL)
          </p>
        </div>

        {/* CONTAINER FILTER FLEX WRAP TANPA OVERFLOW SCROLL */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* DROPDOWN RW */}
          <select
            value={selectedRwFilter}
            onChange={(e) => {
              setSelectedRwFilter(e.target.value);
              setSelectedRtFilter('ALL');
            }}
            className="px-3 py-1.5 text-xs bg-neutral-50 border border-black/10 rounded-full outline-none focus:border-black font-['Product_Sans'] cursor-pointer font-medium"
          >
            <option value="ALL">Semua RW</option>
            {availableRwNumbers.map((rwNum) => (
              <option key={rwNum} value={rwNum}>
                RW {rwNum}
              </option>
            ))}
          </select>

          {/* DROPDOWN RT */}
          <select
            value={selectedRtFilter}
            onChange={(e) => setSelectedRtFilter(e.target.value)}
            disabled={selectedRwFilter === 'ALL' && availableRtNumbers.length === 0}
            className="px-3 py-1.5 text-xs bg-neutral-50 border border-black/10 rounded-full outline-none focus:border-black font-['Product_Sans'] cursor-pointer font-medium disabled:opacity-50"
          >
            <option value="ALL">Semua RT</option>
            {availableRtNumbers.map((rtNum) => (
              <option key={rtNum} value={rtNum}>
                RT {rtNum}
              </option>
            ))}
          </select>

          {/* INPUT SEARCH */}
          <input
            type="text"
            placeholder="Cari Nama, NIK..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3.5 py-1.5 text-xs bg-neutral-50 border border-black/10 rounded-full outline-none focus:border-black font-['Product_Sans'] w-36 sm:w-44"
          />

          {/* TAB FILTER STATUS */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-medium shrink-0">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === 'ALL'
                  ? 'bg-black text-white'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Semua ({registeredUsers.length})
            </button>
            <button
              onClick={() => setFilterStatus('PENDING_VERIFICATION')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === 'PENDING_VERIFICATION'
                  ? 'bg-black text-white'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Menunggu (
              {registeredUsers.filter((u) => checkIsPending(u.status)).length}
              )
            </button>
            <button
              onClick={() => setFilterStatus('Active')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === 'Active'
                  ? 'bg-black text-white'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Aktif (
              {registeredUsers.filter((u) => checkIsActive(u.status)).length})
            </button>
            <button
              onClick={() => setFilterStatus('Rejected')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === 'Rejected'
                  ? 'bg-black text-white'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Ditolak (
              {
                registeredUsers.filter(
                  (u) => !checkIsPending(u.status) && !checkIsActive(u.status)
                ).length
              }
              )
            </button>
          </div>
        </div>
      </div>

      {/* TABEL DATA WARGA */}
      <div className="bg-white border-b border-black/10 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-black/40 space-y-2">
            <p className="text-xs font-normal">Memuat data warga dari MySQL database...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-black/40 space-y-2">
            <p className="text-xs font-normal">
              Belum ada data pendaftaran warga dalam kategori filter ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-black">
              <thead className="bg-slate-50 border-b border-black/10 text-black/60 font-medium uppercase text-[10px]">
                <tr>
                  <th className="p-4">Tanggal & ID</th>
                  <th className="p-4">Nama & NIK</th>
                  <th className="p-4">Wilayah RT / RW</th>
                  <th className="p-4">Kontak WhatsApp / Email</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi / Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {currentItems.map((user) => {
                  const displayRt = String(user.nomor_rt || user.rt || '01').padStart(2, '0');
                  const displayRw = String(user.nomor_rw || user.rw || '01').padStart(2, '0');
                  const isPending = checkIsPending(user.status);
                  const isActive = checkIsActive(user.status);

                  return (
                    <tr
                      key={user.id_user || user.nik}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="p-4 font-mono">
                        <span className="font-medium text-black block">
                          {user.id_user || '-'}
                        </span>
                        <span className="text-[10px] text-black/40">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString('id-ID')
                            : user.tanggal_daftar
                            ? new Date(user.tanggal_daftar).toLocaleDateString('id-ID')
                            : '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-black block">
                          {user.nama}
                        </span>
                        <span className="text-[10.5px] text-black/60 font-mono">
                          NIK: {user.nik}
                        </span>
                      </td>
                      
                      <td className="p-4 font-medium text-black/80">
                        <span className="px-2.5 py-1 rounded-md bg-neutral-100 border border-black/10 text-[11px] font-mono inline-block font-semibold">
                          RT {displayRt} / RW {displayRw}
                        </span>
                      </td>

                      <td className="p-4 font-mono">
                        <span className="block text-black">{user.no_hp || '-'}</span>
                        <span className="text-[10px] text-black/50">
                          {user.email}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium inline-block border ${
                            isPending
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {isPending
                            ? 'Menunggu'
                            : isActive
                            ? 'Aktif'
                            : 'Ditolak'}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApproveUser(user)}
                                disabled={isEmergencyLocked}
                                className="px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-900 text-white font-medium text-xs transition-colors cursor-pointer"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowRejectModal(true);
                                }}
                                disabled={isEmergencyLocked}
                                className="px-3 py-1.5 rounded-full border border-black/20 hover:border-black text-black font-medium text-xs transition-colors cursor-pointer"
                              >
                                Tolak
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditingUser(user)}
                            disabled={isEmergencyLocked}
                            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-black/10 text-neutral-800 transition-colors cursor-pointer flex items-center justify-center"
                            title="Edit Data Warga"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingUser(user)}
                            disabled={isEmergencyLocked}
                            className="p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-colors cursor-pointer flex items-center justify-center"
                            title="Hapus Permanen Data Warga"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTROLLER PENOMORAN HALAMAN / PAGINATION */}
        {!isLoading && filteredList.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-black/10 bg-slate-50 text-xs">
            <div className="flex items-center gap-3 text-black/60">
              <span>
                Menampilkan{' '}
                <strong className="text-black">{indexOfFirstItem + 1}</strong> -{' '}
                <strong className="text-black">
                  {Math.min(indexOfLastItem, totalItems)}
                </strong>{' '}
                dari <strong className="text-black">{totalItems}</strong> warga
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

      {/* MODAL EDIT DATA WARGA */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEditUser}
            className="w-full max-w-lg bg-white rounded-2xl border border-black/10 p-5 space-y-4 my-auto font-['Product_Sans']"
          >
            <div className="flex justify-between items-center border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">Edit Data Warga</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-medium text-black/70 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editingUser.nama || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nama: e.target.value })}
                  className="w-full p-2 border border-black/20 rounded-xl outline-none focus:border-black"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-black/70 block mb-1">NIK</label>
                <input
                  type="text"
                  value={editingUser.nik || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nik: e.target.value })}
                  className="w-full p-2 border border-black/20 rounded-xl outline-none focus:border-black font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-black/70 block mb-1">No. WhatsApp / HP</label>
                <input
                  type="text"
                  value={editingUser.no_hp || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, no_hp: e.target.value })}
                  className="w-full p-2 border border-black/20 rounded-xl outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="font-medium text-black/70 block mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full p-2 border border-black/20 rounded-xl outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="font-medium text-black/70 block mb-1">Nomor RT</label>
                <input
                  type="text"
                  value={editingUser.nomor_rt || '01'}
                  onChange={(e) => setEditingUser({ ...editingUser, nomor_rt: e.target.value })}
                  className="w-full p-2 border border-black/20 rounded-xl outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="font-medium text-black/70 block mb-1">Nomor RW</label>
                <input
                  type="text"
                  value={editingUser.nomor_rw || '01'}
                  onChange={(e) => setEditingUser({ ...editingUser, nomor_rw: e.target.value })}
                  className="w-full p-2 border border-black/20 rounded-xl outline-none focus:border-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-medium text-black/70 block mb-1">Status Verifikasi</label>
                <select
                  value={editingUser.status || 'Pending'}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full p-2 border border-black/20 rounded-xl outline-none focus:border-black bg-white"
                >
                  <option value="Active">Active (Terverifikasi)</option>
                  <option value="Pending">Pending (Menunggu)</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-medium text-black/70 block mb-1">Alamat Jalan / Lengkap</label>
                <textarea
                  rows={2}
                  value={editingUser.alamat_lengkap || editingUser.alamat || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, alamat_lengkap: e.target.value, alamat: e.target.value })}
                  className="w-full p-2 border border-black/20 rounded-xl outline-none focus:border-black resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-black rounded-full text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-medium cursor-pointer shadow-xs"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PERMANEN WARGA */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-black/10 p-5 space-y-4 my-auto font-['Product_Sans'] text-center">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-black">Hapus Permanen Data Warga?</h3>
              <p className="text-xs text-black/60 mt-1">
                Apakah Anda yakin ingin menghapus akun warga atas nama <strong className="text-black">{deletingUser.nama}</strong> (NIK: {deletingUser.nik}) secara permanen dari database MySQL?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-black rounded-full text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-medium cursor-pointer shadow-xs"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TOLAK AKUN WARGA */}
      {showRejectModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-black/10 p-6 space-y-4 my-auto">
            <h3 className="text-sm font-medium text-black">
              Tolak Pendaftaran Warga
            </h3>
            <p className="text-xs text-black/60">
              Berikan alasan penolakan pendaftaran untuk warga atas nama{' '}
              <strong>{selectedUser.nama}</strong> (NIK: {selectedUser.nik}):
            </p>

            <textarea
              rows={3}
              placeholder="Contoh: NIK tidak terdaftar di data domisili desa..."
              value={alasanTolak}
              onChange={(e) => setAlasanTolak(e.target.value)}
              className="w-full rounded-xl border border-black/20 p-3 text-xs outline-none focus:border-black font-['Product_Sans']"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-1.5 rounded-full border border-black/20 text-black font-medium text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-full bg-neutral-800 text-white font-medium text-xs cursor-pointer hover:bg-black"
              >
                Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabVerifikasiWarga;