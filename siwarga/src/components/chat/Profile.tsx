import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKecamatan } from '../../context/KecamatanContext';
import { apiService } from '../../services/api';
import { PasswordSettingsCard } from './PasswordSettingsCard';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { dataKecamatan, setDataKecamatan } = useKecamatan();

  // 🎯 State Tab Aktif ('profil' | 'keamanan' | 'notifikasi' | 'privasi' | 'aktivitas' | 'bantuan')
  const [activeTab, setActiveTab] = useState<
    'profil' | 'keamanan' | 'notifikasi' | 'privasi' | 'aktivitas' | 'bantuan'
  >('profil');

  const [storedUser, setStoredUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    nik: '',
    nama: '',
    email: '',
    no_hp: '',
    nomor_rt: '01',
    nomor_rw: '01',
    dusun: 'Dusun 1',
    alamat_lengkap: '',
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 🎯 State Notifikasi
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPengumuman, setNotifPengumuman] = useState(true);
  const [isSavingNotif, setIsSavingNotif] = useState(false);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  // 🎯 State Sesi & Log Aktivitas dari Database
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // 🎯 State Logout dari Semua Perangkat
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [logoutAllMessage, setLogoutAllMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      setStoredUser(parsed);
      setFormData({
        nik: parsed?.nik || '',
        nama: parsed?.nama || parsed?.nama_lengkap || '',
        email: parsed?.email || '',
        no_hp: parsed?.no_hp || parsed?.telepon || '',
        nomor_rt: String(parsed?.nomor_rt || '01').padStart(2, '0'),
        nomor_rw: String(parsed?.nomor_rw || '01').padStart(2, '0'),
        dusun: parsed?.dusun || 'Dusun 1',
        alamat_lengkap: parsed?.alamat_lengkap || parsed?.alamat?.detail || '',
      });

      if (parsed?.notif_email_surat !== undefined) setNotifEmail(Boolean(parsed.notif_email_surat));
      if (parsed?.notif_pengumuman !== undefined) setNotifPengumuman(Boolean(parsed.notif_pengumuman));

      // Fetch Log & Sesi Akun dari Backend
      fetchUserSessionsAndLogs(parsed.id_user || parsed.nik);
    }
  }, []);

  const fetchUserSessionsAndLogs = async (userId: string) => {
    if (!userId) return;
    setIsLoadingLogs(true);
    try {
      const [resSessions, resLogs] = await Promise.all([
        apiService.getUserSessions(userId),
        apiService.getActivityLog(userId)
      ]);

      if (resSessions?.success && Array.isArray(resSessions.data)) {
        setSessionsList(resSessions.data);
      }
      if (resLogs?.success && Array.isArray(resLogs.data)) {
        setActivityLogs(resLogs.data);
      }
    } catch (err) {
      console.error('[Fetch Profile Logs Error]:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const formattedRt = String(storedUser?.nomor_rt || formData.nomor_rt).padStart(2, '0');
    const formattedRw = String(storedUser?.nomor_rw || formData.nomor_rw).padStart(2, '0');

    const updatedUser = {
      ...storedUser,
      nik: storedUser?.nik || formData.nik,
      nama: storedUser?.nama || formData.nama,
      nama_lengkap: storedUser?.nama || formData.nama,
      email: formData.email,
      no_hp: formData.no_hp,
      telepon: formData.no_hp,
      nomor_rt: formattedRt,
      nomor_rw: formattedRw,
      rt_rw: `RT ${formattedRt} / RW ${formattedRw}`,
      dusun: formData.dusun,
      alamat_lengkap: formData.alamat_lengkap,
    };

    try {
      // Simpan ke Backend MySQL
      const targetId = storedUser?.id_user || storedUser?.nik || formData.nik;
      await apiService.updateUserProfile(targetId, {
        email: formData.email,
        no_hp: formData.no_hp,
        dusun: formData.dusun,
        alamat_lengkap: formData.alamat_lengkap,
        id_user: storedUser?.id_user,
        nik: storedUser?.nik
      });
    } catch (err) {
      console.error('[Update Profile API Error]:', err);
    }

    localStorage.setItem('user', JSON.stringify(updatedUser));
    setStoredUser(updatedUser);

    const savedWarga = localStorage.getItem('svara_registered_users');
    if (savedWarga) {
      try {
        let wargaList = JSON.parse(savedWarga);
        wargaList = wargaList.map((w: any) => {
          if (
            (w.id_user && w.id_user === updatedUser.id_user) ||
            (w.nik && w.nik === updatedUser.nik) ||
            (w.email && w.email.toLowerCase() === updatedUser.email.toLowerCase())
          ) {
            return {
              ...w,
              ...updatedUser,
            };
          }
          return w;
        });
        localStorage.setItem('svara_registered_users', JSON.stringify(wargaList));
      } catch (err) {
        console.error('Gagal update svara_registered_users:', err);
      }
    }

    if (setDataKecamatan) {
      setDataKecamatan((prev: any) => ({
        ...prev,
        user_active: updatedUser,
      }));
    }

    setIsSaving(false);
    setIsSaved(true);
    fetchUserSessionsAndLogs(storedUser?.id_user || storedUser?.nik);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // 🎯 Handler Simpan Preferensi Notifikasi
  const handleSaveNotificationPreferences = async (newEmailNotif: boolean, newPengumumanNotif: boolean) => {
    setNotifEmail(newEmailNotif);
    setNotifPengumuman(newPengumumanNotif);
    setIsSavingNotif(true);
    setNotifMessage(null);

    const targetId = storedUser?.id_user || storedUser?.nik;
    try {
      const res = await apiService.updateNotificationPreferences(targetId, {
        notif_email_surat: newEmailNotif,
        notif_pengumuman: newPengumumanNotif,
      });

      if (res.success) {
        setNotifMessage('Preferensi notifikasi berhasil disimpan.');
        const updated = { ...storedUser, notif_email_surat: newEmailNotif, notif_pengumuman: newPengumumanNotif };
        localStorage.setItem('user', JSON.stringify(updated));
        setStoredUser(updated);
      }
    } catch (err) {
      setNotifMessage('Gagal menyimpan preferensi notifikasi.');
    } finally {
      setIsSavingNotif(false);
      setTimeout(() => setNotifMessage(null), 3000);
    }
  };

  // 🎯 Handler Aksi Logout dari Semua Perangkat
  const handleLogoutAllDevices = async () => {
    const targetEmail = storedUser?.email || formData.email;
    if (!targetEmail) return;

    setIsLoggingOutAll(true);
    setLogoutAllMessage(null);

    try {
      const res = await apiService.logoutAllDevices(targetEmail);
      if (res.success) {
        setLogoutAllMessage({ type: 'success', text: 'Berhasil mengakhiri seluruh sesi di semua perangkat.' });
        setTimeout(() => {
          localStorage.removeItem('user');
          navigate('/login');
        }, 1200);
      } else {
        setLogoutAllMessage({ type: 'error', text: res.message || 'Gagal keluar dari semua perangkat.' });
        setIsLoggingOutAll(false);
      }
    } catch (err: any) {
      setLogoutAllMessage({ type: 'error', text: 'Terjadi kesalahan koneksi server.' });
      setIsLoggingOutAll(false);
    }
  };

  const namaDesa = storedUser?.nama_desa || storedUser?.desa || 'Mertapada Wetan';
  const namaKecamatan = dataKecamatan?.nama_kecamatan || storedUser?.kecamatan || 'Astanajapura';

  return (
    <div className="min-h-screen w-full bg-neutral-50 font-['Product_Sans',sans-serif] text-black flex flex-col items-center py-6 px-4 select-none">
      
      {/* HEADER NAVIGASI */}
      <div className="w-full max-w-4xl bg-white border border-black/10 rounded-2xl p-4 mb-4 shadow-xs flex items-center justify-between">
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 text-xs font-medium text-black/70 hover:text-black transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Chat Bot
        </button>
        <span className="text-xs font-semibold text-black/40 uppercase tracking-wider font-mono">
          Pengaturan Akun Warga
        </span>
      </div>

      {/* CONTAINER LAYOUT UTAMA (2 KOLOM: SIDEBAR MENU + PANEL KONTEN) */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        
        {/* 📱 SIDEBAR LEFT: MENU LIST NAVIGASI */}
        <div className="md:col-span-4 bg-white border border-black/10 rounded-2xl p-3 shadow-xs space-y-1">
          {/* HEADER MINI PROFILE */}
          <div className="p-3 border-b border-black/10 flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-full bg-neutral-900 text-white flex items-center justify-center text-base font-bold shrink-0">
              {formData.nama ? formData.nama.charAt(0).toUpperCase() : 'W'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold text-black truncate">{formData.nama || 'Warga Desa'}</h2>
              <p className="text-[10.5px] text-black/50 truncate">
                Desa {namaDesa}
              </p>
            </div>
          </div>

          {/* LIST ITEM 1: INFORMASI DIRI */}
          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'profil'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Informasi Diri</span>
            </div>
            <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* LIST ITEM 2: KEAMANAN & SANDI */}
          <button
            type="button"
            onClick={() => setActiveTab('keamanan')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'keamanan'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Keamanan & Sandi</span>
            </div>
            <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* LIST ITEM 3: NOTIFIKASI */}
          <button
            type="button"
            onClick={() => setActiveTab('notifikasi')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'notifikasi'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Preferensi Notifikasi</span>
            </div>
            <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* LIST ITEM 4: PRIVASI & SESI */}
          <button
            type="button"
            onClick={() => setActiveTab('privasi')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'privasi'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Privasi & Sesi Akun</span>
            </div>
            <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* LIST ITEM 5: RIWAYAT AKTIVITAS */}
          <button
            type="button"
            onClick={() => setActiveTab('aktivitas')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'aktivitas'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Riwayat Aktivitas</span>
            </div>
            <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* LIST ITEM 6: BANTUAN */}
          <button
            type="button"
            onClick={() => setActiveTab('bantuan')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'bantuan'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Bantuan & Informasi</span>
            </div>
            <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 💻 RIGHT PANEL: PANEL KONTEN INTERAKTIF */}
        <div className="md:col-span-8">
          
          {/* TAB 1: INFORMASI KEPENDUDUKAN & KONTAK */}
          {activeTab === 'profil' && (
            <div className="bg-white border border-black/10 rounded-2xl shadow-xs overflow-hidden">
              <div className="bg-white px-6 py-4 border-b border-black/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-black">Informasi Kependudukan</h3>
                  <p className="text-[11px] text-black/50">Data diri resmi terdaftar di kantor desa.</p>
                </div>
                <span className="text-[10px] bg-neutral-100 text-black/70 px-3 py-1 rounded-full border border-black/10 font-medium">
                  Terverifikasi
                </span>
              </div>

              {isSaved && (
                <div className="mx-6 mt-4 p-3 bg-neutral-900 text-white text-xs rounded-xl flex items-center justify-between">
                  <span>Data profil berhasil diperbarui ke database.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* NIK (TERKUNCI) */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-black/70 flex items-center gap-1">
                      NIK Pemohon
                      <svg className="w-3 h-3 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </label>
                    <input
                      type="text"
                      name="nik"
                      value={formData.nik}
                      disabled
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-200/60 border border-black/10 rounded-xl outline-none font-mono text-black/60 cursor-not-allowed"
                    />
                  </div>

                  {/* NAMA LENGKAP (TERKUNCI) */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-black/70 flex items-center gap-1">
                      Nama Sesuai KTP
                      <svg className="w-3 h-3 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </label>
                    <input
                      type="text"
                      name="nama"
                      value={formData.nama}
                      disabled
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-200/60 border border-black/10 rounded-xl outline-none text-black/60 cursor-not-allowed"
                    />
                  </div>

                  {/* EMAIL AKTIF */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-black/70">Email Aktif</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="contoh@gmail.com"
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-black/10 rounded-xl outline-none focus:border-black transition-colors"
                      required
                    />
                  </div>

                  {/* NOMOR HP */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-black/70">No. WhatsApp / HP</label>
                    <input
                      type="text"
                      name="no_hp"
                      value={formData.no_hp}
                      onChange={handleChange}
                      placeholder="081234567890"
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-black/10 rounded-xl outline-none focus:border-black font-mono transition-colors"
                      required
                    />
                  </div>

                  {/* RT */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-black/70 flex items-center gap-1">
                      Nomor RT
                      <svg className="w-3 h-3 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </label>
                    <input
                      type="text"
                      name="nomor_rt"
                      value={formData.nomor_rt}
                      disabled
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-200/60 border border-black/10 rounded-xl outline-none font-mono text-black/60 cursor-not-allowed"
                    />
                  </div>

                  {/* RW */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-black/70 flex items-center gap-1">
                      Nomor RW
                      <svg className="w-3 h-3 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </label>
                    <input
                      type="text"
                      name="nomor_rw"
                      value={formData.nomor_rw}
                      disabled
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-200/60 border border-black/10 rounded-xl outline-none font-mono text-black/60 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-black/70">Dusun / Blok</label>
                    <input
                      type="text"
                      name="dusun"
                      value={formData.dusun}
                      onChange={handleChange}
                      placeholder="Dusun 1 / Blok Manis"
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-black/10 rounded-xl outline-none focus:border-black transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-black/70">Alamat Lengkap</label>
                    <input
                      type="text"
                      name="alamat_lengkap"
                      value={formData.alamat_lengkap}
                      onChange={handleChange}
                      placeholder="Jl. Melati No. 12"
                      className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-black/10 rounded-xl outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-black/10">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-neutral-800 hover:bg-black text-white text-xs font-medium rounded-full transition-colors shadow-xs cursor-pointer font-['Product_Sans'] disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Data'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: KEAMANAN & UBAH SANDI */}
          {activeTab === 'keamanan' && (
            <div className="mt-0">
              <PasswordSettingsCard currentUser={storedUser} />
            </div>
          )}

          {/* TAB 3: PREFERENSI NOTIFIKASI */}
          {activeTab === 'notifikasi' && (
            <div className="bg-white border border-black/10 rounded-2xl shadow-xs p-6 space-y-4">
              <div className="border-b border-black/10 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-black">Preferensi Notifikasi</h3>
                  <p className="text-[11px] text-black/50">Atur bagaimana sistem SVARA memberi tahu kabar permohonan Anda.</p>
                </div>
                {isSavingNotif && <span className="text-[10px] text-neutral-400 font-mono">Menyimpan...</span>}
              </div>

              {notifMessage && (
                <div className="p-3 bg-neutral-900 text-white text-xs rounded-xl">
                  {notifMessage}
                </div>
              )}

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-black/5">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">Notifikasi Email Surat</h4>
                    <p className="text-[10.5px] text-neutral-500">Terima pesan email saat status surat disetujui atau ditolak.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifEmail}
                    onChange={(e) => handleSaveNotificationPreferences(e.target.checked, notifPengumuman)}
                    className="accent-neutral-900 cursor-pointer w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-black/5">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">Pengumuman Penting Desa</h4>
                    <p className="text-[10.5px] text-neutral-500">Notifikasi jadwal kerja bakti, bansos, dan edaran resmi desa.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPengumuman}
                    onChange={(e) => handleSaveNotificationPreferences(notifEmail, e.target.checked)}
                    className="accent-neutral-900 cursor-pointer w-4 h-4"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVASI & SESI AKUN */}
          {activeTab === 'privasi' && (
            <div className="bg-white border border-black/10 rounded-2xl shadow-xs p-6 space-y-5">
              <div className="border-b border-black/10 pb-3">
                <h3 className="text-sm font-bold text-black">Privasi & Sesi Perangkat Aktif</h3>
                <p className="text-[11px] text-black/50">Pantau dan kelola sesi login akun Anda di berbagai perangkat.</p>
              </div>

              <div className="space-y-3">
                {sessionsList.length > 0 ? (
                  sessionsList.map((session, idx) => (
                    <div key={session.id_session || idx} className="p-3.5 bg-neutral-50 rounded-xl border border-black/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-200/60 flex items-center justify-center text-neutral-700 shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-900">{session.browser || 'Web Browser'} ({session.device_type || 'Desktop'})</h4>
                          <p className="text-[10.5px] text-neutral-500 font-mono">
                            IP: {session.ip_address || '127.0.0.1'} • {new Date(session.login_at || Date.now()).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9.5px] font-semibold px-2.5 py-1 rounded-full border ${
                        session.is_active !== 0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-neutral-200 text-neutral-600 border-neutral-300'
                      }`}>
                        {session.is_active !== 0 ? 'Sesi Aktif' : 'Non-aktif'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3.5 bg-neutral-50 rounded-xl border border-black/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-200/60 flex items-center justify-center text-neutral-700 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900">Web Browser (Sesi Ini)</h4>
                        <p className="text-[10.5px] text-neutral-500 font-mono">
                          Aktif saat ini • {new Date().toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9.5px] bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                      Sesi Aktif
                    </span>
                  </div>
                )}
              </div>

              {/* DUA OPSI LOGOUT: LOKAL & GLOBAL */}
              <div className="pt-3 border-t border-black/10 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('user');
                    navigate('/login');
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-full transition-colors cursor-pointer"
                >
                  Keluar dari Sesi Ini
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutAllModal(true)}
                  className="w-full sm:w-auto px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-full transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Keluar dari Semua Perangkat
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: RIWAYAT AKTIVITAS */}
          {activeTab === 'aktivitas' && (
            <div className="bg-white border border-black/10 rounded-2xl shadow-xs p-6 space-y-4">
              <div className="border-b border-black/10 pb-3">
                <h3 className="text-sm font-bold text-black">Riwayat Aktivitas Terakhir</h3>
                <p className="text-[11px] text-black/50">Catatan aktivitas penting pada akun Anda dari database.</p>
              </div>

              <div className="space-y-2">
                {isLoadingLogs ? (
                  <p className="text-xs text-neutral-400 py-4 text-center">Memuat riwayat aktivitas...</p>
                ) : activityLogs.length > 0 ? (
                  activityLogs.map((log, idx) => (
                    <div key={log.id_log || idx} className="p-3 bg-neutral-50 rounded-xl border border-black/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          log.tipe_aktivitas === 'LOGIN' ? 'bg-emerald-500' :
                          log.tipe_aktivitas === 'UBAH_SANDI' ? 'bg-amber-500' : 'bg-neutral-400'
                        }`} />
                        <span className="font-medium text-neutral-800">{log.deskripsi}</span>
                      </div>
                      <span className="text-[10.5px] text-neutral-400 font-mono">
                        {new Date(log.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-black/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-medium text-neutral-800">Login akun berhasil</span>
                      </div>
                      <span className="text-[10.5px] text-neutral-400 font-mono">Hari ini</span>
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-xl border border-black/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-neutral-400 shrink-0" />
                        <span className="font-medium text-neutral-800">Pembaruan data profil kependudukan</span>
                      </div>
                      <span className="text-[10.5px] text-neutral-400 font-mono">Terbaru</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: BANTUAN & TENTANG SVARA */}
          {activeTab === 'bantuan' && (
            <div className="bg-white border border-black/10 rounded-2xl shadow-xs p-6 space-y-5">
              <div className="border-b border-black/10 pb-3">
                <h3 className="text-sm font-bold text-black">Pusat Bantuan & Informasi SVARA</h3>
                <p className="text-[11px] text-black/50">Layanan bantuan resmi dari Kantor Desa {namaDesa}.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-black/10 space-y-1">
                  <span className="font-bold text-neutral-900 block text-xs">Kantor Desa {namaDesa}</span>
                  <p className="text-neutral-600 text-[11px]">
                    Kecamatan {namaKecamatan}, Kabupaten Cirebon, Jawa Barat
                  </p>
                  <p className="text-neutral-500 text-[10.5px] font-mono pt-1">
                    Email Kontak: svara.desa@gmail.com
                  </p>
                </div>

                <div className="p-3.5 bg-neutral-50 rounded-xl border border-black/10 space-y-1">
                  <span className="font-bold text-neutral-900 block text-xs">Versi Sistem</span>
                  <p className="text-neutral-600 text-[11px]">SVARA Layanan Digital Desa v2.4.0 (Release 2026)</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 🛑 MODAL DIALOG KONFIRMASI: LOGOUT DARI SEMUA PERANGKAT */}
      {showLogoutAllModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 border border-black/10 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Keluar dari Semua Perangkat?</h3>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Tindakan ini akan memutus sesi login akun Anda di <strong className="text-black">seluruh HP, laptop, dan browser lain</strong>. Anda harus melakukan login ulang di setiap perangkat.
            </p>

            {logoutAllMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  logoutAllMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}
              >
                {logoutAllMessage.text}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isLoggingOutAll}
                onClick={() => setShowLogoutAllModal(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isLoggingOutAll}
                onClick={handleLogoutAllDevices}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-full transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoggingOutAll ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Ya, Keluar Semua</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;