import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';

interface TabManajemenUserProps {
  adminList?: any[];
  onToggleStatus: (id: string) => void;
  onOpenModal: () => void;
  onUpdateAdminPassword?: (id: string, newPass: string) => void;
}

const API_BASE = 'http://localhost:5000/api';

export const TabManajemenUser: React.FC<TabManajemenUserProps> = ({
  adminList = [],
  onToggleStatus,
  onOpenModal,
}) => {
  const { showToast } = useToast();
  const [mergedList, setMergedList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // STATE MODAL RESET PASSWORD CUSTOM
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAuthHeaders = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      'Content-Type': 'application/json',
      'x-user-id': currentUser.id_user || currentUser.id || '',
    };
  };

  // HELPER INJEKSI AUDIT LOG SUPER ADMIN
  const injectAuditLog = (aksiMsg: string) => {
    const currentAudit = JSON.parse(localStorage.getItem('svara_audit_logs') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const newAudit = {
      id: Date.now().toString(),
      waktu: new Date().toLocaleString('id-ID'),
      aktor: currentUser.nama || 'SUPER_ADMIN',
      aksi: aksiMsg,
    };
    localStorage.setItem('svara_audit_logs', JSON.stringify([newAudit, ...currentAudit]));
  };

  // TARIK DATA REAL-TIME DARI DATABASE MYSQL VIA BACKEND API
  const loadAllUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users/all-system`, {
        headers: getAuthHeaders(),
      });
      const resData = await response.json();

      if (resData && resData.success && Array.isArray(resData.data)) {
        const dbUsers = resData.data.map((u: any) => ({
          id: u.id_user,
          nama: u.nama,
          email: u.email,
          role: (u.role || 'WARGA').toUpperCase(),
          desa: u.id_desa || 'DESA-001',
          status:
            u.status === 'PENDING_VERIFICATION' || u.status === 'Pending'
              ? 'Pending'
              : u.status || 'Active',
          isFromDb: true,
        }));
        setMergedList(dbUsers);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Gagal mengambil daftar user dari API, memakai state lokal:', err);
    }

    // Fallback aman jika API sedang tidak terjangkau (tanpa properti password)
    const safeAdminList = Array.isArray(adminList)
      ? adminList.map(({ password, ...rest }) => rest)
      : [];
    setMergedList(safeAdminList);
    setIsLoading(false);
  }, [adminList]);

  useEffect(() => {
    loadAllUsers();
  }, [loadAllUsers]);

  // HANDLE BEKUKAN / AKTIFKAN USER KE DATABASE MYSQL
  const handleToggleUserStatus = async (item: any) => {
    const nextStatus =
      item.status === 'Active' || item.status === 'ACTIVE' ? 'Suspended' : 'Active';

    if (item.isFromDb) {
      try {
        const res = await fetch(`${API_BASE}/users/${encodeURIComponent(item.id)}/status`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: nextStatus }),
        });
        const data = await res.json();
        if (!data.success) {
          showToast(data.message || 'Gagal mengubah status akun!', 'error');
          return;
        }
        await loadAllUsers();
      } catch (err) {
        showToast('Gagal terhubung ke server saat mengubah status.', 'error');
        return;
      }
    } else {
      onToggleStatus(item.id);
    }

    injectAuditLog(`Mengubah status akun ${item.nama} (${item.email}) menjadi '${nextStatus}'`);
    showToast(`Status akun ${item.nama} diubah menjadi ${nextStatus}`, 'success');
  };

  const handleOpenResetModal = (user: any) => {
    setSelectedUser(user);
    setCustomPassword('');
  };

  // SUBMIT RESET PASSWORD KE BACKEND MYSQL (TERENKRIPSI BCRYPT)
  const handleSubmitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPassClean = customPassword.trim();
    if (!newPassClean || newPassClean.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter!', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetId = selectedUser.id || selectedUser.email;
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(targetId)}/reset-password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ new_password: newPassClean }),
      });

      const data = await res.json();
      if (!data.success) {
        showToast(data.message || 'Gagal melakukan reset password di server!', 'error');
        setIsSubmitting(false);
        return;
      }

      injectAuditLog(`Melakukan Reset Password (Bcrypt) untuk akun ${selectedUser.nama} (${selectedUser.email})`);
      showToast(
        `Kata sandi untuk ${selectedUser.nama} (${selectedUser.email}) berhasil diperbarui & terenkripsi di database!`,
        'success'
      );

      setSelectedUser(null);
      setCustomPassword('');
      await loadAllUsers();
    } catch (err) {
      showToast('Gagal terhubung ke server backend!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 select-none font-['Product_Sans',sans-serif]">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Manajemen Hak Akses & Akun System
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Otoritas pembuatan, pembekuan, dan reset kredensial akun terdaftar (MySQL Encrypted).
            </p>
          </div>
          <button
            onClick={onOpenModal}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            + Tambah Admin Desa Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-900 text-white font-bold text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Nama Pengguna</th>
                <th className="py-3.5 px-6">Email Login</th>
                <th className="py-3.5 px-6">Role / Akses</th>
                <th className="py-3.5 px-6">Wilayah Otoritas</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-center">Aksi Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    Memuat data akun dari database...
                  </td>
                </tr>
              ) : mergedList.length > 0 ? (
                mergedList.map((item) => {
                  const isActive = item.status === 'Active' || item.status === 'ACTIVE' || item.status === 'APPROVED';
                  return (
                    <tr
                      key={item.id || item.email}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {item.nama || 'Tanpa Nama'}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-600">
                        {item.email}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wider ${
                            item.role === 'SUPER_ADMIN' || item.role === 'SUPER-ADMIN'
                              ? 'bg-slate-900 text-white'
                              : item.role === 'ADMIN_DESA' || item.role === 'ADMIN-DESA'
                              ? 'bg-slate-800 text-white'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.role || 'USER'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-700">
                        {item.desa || item.wilayah || 'Semua Wilayah'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Pending' || item.status === 'PENDING_VERIFICATION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center space-x-2">
                        {item.role !== 'SUPER_ADMIN' && item.role !== 'SUPER-ADMIN' ? (
                          <>
                            <button
                              onClick={() => handleToggleUserStatus(item)}
                              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              }`}
                            >
                              {isActive ? 'Bekukan' : 'Aktifkan'}
                            </button>
                            <button
                              onClick={() => handleOpenResetModal(item)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                            >
                              🔑 Reset Pass
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic">
                            Protected Account
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-slate-400 italic"
                  >
                    Belum ada data pengguna terdaftar di sistem.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL POPUP CUSTOM RESET PASSWORD */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Reset Kata Sandi Akun
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengguna:{' '}
                <span className="font-bold text-slate-800">
                  {selectedUser.nama}
                </span>{' '}
                ({selectedUser.email})
              </p>
            </div>

            <form
              onSubmit={handleSubmitResetPassword}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kata Sandi Sementara Baru
                </label>
                <input
                  type="text"
                  placeholder="Masukkan kata sandi baru (minimal 6 karakter)"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 font-mono focus:border-slate-800 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  *Password otomatis dienkripsi Bcrypt dan disimpan permanen di MySQL.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MATRIKS PRIVILEGE RBAC */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
          🔐 RBAC Privilege Matrix (Role & Permission)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="border border-slate-200 p-4 rounded-xl bg-slate-50 space-y-2">
            <span className="font-bold text-slate-900 block">
              ADMIN DESA Privilege:
            </span>
            <p className="text-slate-600">✓ Profil Desa (CRUD)</p>
            <p className="text-slate-600">✓ Kelola RW & RT (CRUD)</p>
            <p className="text-slate-600">✓ Template Surat & Layanan (CRUD)</p>
            <p className="text-slate-600">
              ❌ AI Configuration & System Config (Restricted)
            </p>
          </div>
          <div className="border border-slate-200 p-4 rounded-xl bg-slate-900 text-white space-y-2">
            <span className="font-bold text-white block">
              SUPER ADMIN Privilege:
            </span>
            <p className="text-slate-300">
              ✓ Full Access Master Node (CRUD All)
            </p>
            <p className="text-slate-300">✓ AI Management & LLM API Config</p>
            <p className="text-slate-300">
              ✓ Audit Log Global & Security Monitoring
            </p>
            <p className="text-slate-300">
              ✓ Database Structure & Tenant Lock
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};