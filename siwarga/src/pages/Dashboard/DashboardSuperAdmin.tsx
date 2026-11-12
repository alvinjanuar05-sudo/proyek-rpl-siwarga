import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

// IMPORT SUB-MODULES
import { TabDashboardGlobal } from '../../components/superadmin/TabDashboardGlobal';
import { TabManajemenUser } from '../../components/superadmin/TabManajemenUser';
import { TabStrukturDesa } from '../../components/superadmin/TabStrukturDesa';
import { TabKonfigurasiAI } from '../../components/superadmin/TabKonfigurasiAI';
import { TabAnalyticsAI } from '../../components/superadmin/TabAnalyticsAI';
import { TabSecurityMonitoring } from '../../components/superadmin/TabSecurityMonitoring';
import { TabAuditLog } from '../../components/superadmin/TabAuditLog';

const DashboardSuperAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, confirm } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // TAB STATE
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'users' | 'desa' | 'ai-config' | 'ai-analytics' | 'security' | 'audit'
  >('dashboard');

  // STATE DATA SHARED (PERSISTEN DENGAN LOCALSTORAGE)
  const [adminList, setAdminList] = useState<any[]>(() => {
    const saved = localStorage.getItem('svara_admin_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse admin list', e);
      }
    }
    return [];
  });

  const [auditLogs, setAuditLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem('svara_audit_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse audit logs', e);
      }
    }
    return [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ nama: '', email: '', desa: '' });

  // 1. SINKRONISASI KE LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem('svara_admin_list', JSON.stringify(adminList));
  }, [adminList]);

  useEffect(() => {
    localStorage.setItem('svara_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // 2. PROTEKSI SESI LOGIN STRICT (SUPER_ADMIN ONLY)
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      const user = JSON.parse(savedUser);
      const userRole = (user?.role || '').toUpperCase();

      if (userRole !== 'SUPER_ADMIN') {
        showToast('Akses ditolak! Halaman ini khusus Super Admin.', 'error');
        navigate('/login', { replace: true });
        return;
      }

      setCurrentUser(user);
    } catch (err) {
      console.error('Error parsing user data:', err);
      localStorage.removeItem('user');
      navigate('/login', { replace: true });
    }
  }, [navigate, showToast]);

  // Jangan render apapun sebelum verifikasi role selesai
  if (!currentUser) {
    return null;
  }

  // FUNGSI INJEKSI LOG OTOMATIS
  const addAuditLog = (aksi: string) => {
    const newLog = {
      id: Date.now().toString(),
      waktu: new Date().toLocaleString('id-ID'),
      aktor: currentUser?.nama || 'SUPER_ADMIN',
      aksi: aksi
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar dari Panel Super Admin?',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal',
      type: 'danger',
    });

    if (isConfirmed) {
      addAuditLog('Logout dari Sistem Control Center');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const handleToggleStatus = (id: string) => {
    setAdminList(prev => prev.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === 'Active' ? 'Suspended' : 'Active';
        addAuditLog(`Mengubah status akun ${item.nama} (${item.email}) menjadi ${nextStatus}`);
        return { ...item, status: nextStatus };
      }
      return item;
    }));
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.nama || !newAdmin.email || !newAdmin.desa) return;

    // CEK DUPLIKASI EMAIL
    const isEmailExist = adminList.some(item => item.email.toLowerCase() === newAdmin.email.toLowerCase());
    if (isEmailExist) {
      showToast('Gagal: Email ini sudah terdaftar di sistem!', 'error');
      return;
    }

    // SANITASI INPUT NAMA DESA
    const formattedDesa = newAdmin.desa.trim().toLowerCase().startsWith('desa')
      ? newAdmin.desa.trim()
      : `Desa ${newAdmin.desa.trim()}`;

    const createdUser = {
      id: Date.now().toString(),
      nama: newAdmin.nama.trim(),
      email: newAdmin.email.trim(),
      role: 'ADMIN_DESA',
      desa: formattedDesa,
      status: 'Active',
    };

    setAdminList(prev => [...prev, createdUser]);
    addAuditLog(`Mendaftarkan Akun Admin Desa Baru: ${createdUser.nama} (${createdUser.email})`);

    setNewAdmin({ nama: '', email: '', desa: '' });
    setIsModalOpen(false);
    showToast('Akun Admin Desa Berhasil Didaftarkan!', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-['Product_Sans',sans-serif] text-slate-800 antialiased select-none pb-12">
      
      {/* HEADER UTAMA */}
      <header className="border-b border-slate-800 bg-slate-950 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row relative">
          <div className="hidden md:block w-32"></div>

          <div className="flex flex-col items-center text-center gap-2 mx-auto">
            <div className="h-12 w-12 rounded-xl bg-white/10 border border-slate-700 flex items-center justify-center text-2xl shadow-sm">
              🛡️
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-white md:text-2xl uppercase">
                Pemerintah Daerah & Pusat
              </p>
              <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl uppercase">
                SUPER ADMIN — SVARA CONTROL CENTER
              </h1>
              <span className="mt-1 block text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Otoritas Keamanan, Manajemen Pengguna & AI Engine
              </span>
            </div>
          </div>

          <div className="flex items-center w-full md:w-32 justify-end">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-bold text-red-600 shadow-md hover:bg-slate-100 transition-all cursor-pointer border border-slate-200"
            >
              🚪 <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* TAB NAVIGASI UTAMA */}
        <div className="bg-slate-900 border-t border-slate-800 px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-1">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'dashboard' ? 'border-white text-white bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>📊 Dashboard Global</button>
            <button onClick={() => setActiveTab('users')} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'users' ? 'border-white text-white bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>👥 Manajemen Pengguna</button>
            <button onClick={() => setActiveTab('desa')} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'desa' ? 'border-white text-white bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>🏘️ Struktur Desa</button>
            <button onClick={() => setActiveTab('ai-config')} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'ai-config' ? 'border-white text-white bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>🤖 Konfigurasi AI</button>
            <button onClick={() => setActiveTab('ai-analytics')} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'ai-analytics' ? 'border-white text-white bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>📈 AI Analytics</button>
            <button onClick={() => setActiveTab('security')} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'security' ? 'border-white text-white bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>🛡️ Keamanan & Logs</button>
            <button onClick={() => setActiveTab('audit')} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'audit' ? 'border-white text-white bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>📋 Audit Log</button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl p-6 md:p-8 space-y-8">
        {activeTab === 'dashboard' && <TabDashboardGlobal adminList={adminList} />}
        {activeTab === 'users' && <TabManajemenUser adminList={adminList} onToggleStatus={handleToggleStatus} onOpenModal={() => setIsModalOpen(true)} />}
        {activeTab === 'desa' && <TabStrukturDesa />}
        {activeTab === 'ai-config' && <TabKonfigurasiAI />}
        {activeTab === 'ai-analytics' && <TabAnalyticsAI />}
        {activeTab === 'security' && <TabSecurityMonitoring />}
        {activeTab === 'audit' && <TabAuditLog logs={auditLogs} />}
      </main>

      {/* MODAL TAMBAH ADMIN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Tambah Akun Admin Desa Baru</h3>
              <p className="text-xs text-slate-500">Daftarkan administrator wilayah desa baru.</p>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Administrator</label>
                <input type="text" placeholder="Contoh: Admin Desa Mekarwangi" value={newAdmin.nama} onChange={(e) => setNewAdmin({ ...newAdmin, nama: e.target.value })} className="w-full rounded-xl border border-slate-300 p-3 font-medium focus:border-slate-800 focus:outline-none" required />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Login</label>
                <input type="email" placeholder="Contoh: mekarwangi@siwarga.com" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className="w-full rounded-xl border border-slate-300 p-3 font-medium focus:border-slate-800 focus:outline-none" required />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Desa Wilayah</label>
                <input type="text" placeholder="Contoh: Mekarwangi" value={newAdmin.desa} onChange={(e) => setNewAdmin({ ...newAdmin, desa: e.target.value })} className="w-full rounded-xl border border-slate-300 p-3 font-medium focus:border-slate-800 focus:outline-none" required />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer">Batal</button>
                <button type="submit" className="rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white hover:bg-slate-800 cursor-pointer">Simpan & Daftarkan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardSuperAdmin;