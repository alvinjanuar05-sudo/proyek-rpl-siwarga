import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKecamatan } from '../../context/KecamatanContext';
import { useToast } from '../../context/ToastContext';

import { TabProfilAparaturDesa } from '../../components/dashboard-desa/TabProfilAparaturDesa';
import { TabAspirasiDesa } from '../../components/dashboard-desa/TabAspirasiDesa';
import { TabPengumumanDesa } from '../../components/dashboard-desa/TabPengumumanDesa';
import { TabTemplateSuratDesa } from '../../components/dashboard-desa/TabTemplateSuratDesa';
import { TabRwRtDesa } from '../../components/dashboard-desa/TabRwRtDesa';
import TabVerifikasiPengajuan from '../../components/dashboard-desa/TabVerifikasiPengajuan';
import { TabVerifikasiWarga } from '../../components/dashboard-desa/TabVerifikasiWarga';
import { TabLayananDesa } from '../../components/dashboard-desa/TabLayananDesa';
import { TabBansosDTKS } from '../../components/dashboard-desa/TabBansosDTKS';

// IMPORT WIDGET CHAT AI
import ChatAI from '../ChatAI/ChatAI';

const DashboardDesa: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, confirm } = useToast();
  const { dataKecamatan, setDataKecamatan } = useKecamatan();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // STATUS SAKLAR DARURAT DARI SUPER ADMIN
  const [isEmergencyLocked, setIsEmergencyLocked] = useState<boolean>(false);

  // 1. STATE TAB
  const [activeTab, setActiveTab] = useState<
    'profil' | 'rw-rt' | 'layanan' | 'template' | 'pengumuman' | 'aspirasi' | 'verifikasi-surat' | 'verifikasi-warga' | 'bansos'
  >('profil');

  // 2. PROTEKSI SESI LOGIN & EMBARGO EMERGENCY LOCK STRICT
  useEffect(() => {
    const lockedState = localStorage.getItem('svara_emergency_lock') === 'true';
    setIsEmergencyLocked(lockedState);

    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      const user = JSON.parse(savedUser);
      const roleLower = (user.role || '').toLowerCase();

      if (roleLower !== 'admin_desa' && roleLower !== 'admin-desa' && roleLower !== 'super_admin' && roleLower !== 'super-admin') {
        showToast('Akses Ditolak: Anda tidak memiliki otoritas Administrator Desa!', 'error');
        navigate('/login', { replace: true });
        return;
      }

      if ((user.status || '').toLowerCase() === 'suspended') {
        showToast('Akses Ditolak: Akun Anda dalam status dibekukan oleh Super Admin!', 'error');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
        return;
      }

      setCurrentUser(user);
    } catch (err) {
      console.error('Error parsing session user:', err);
      localStorage.removeItem('user');
      navigate('/login', { replace: true });
    }
  }, [navigate, showToast]);

  // 3. FETCH DATA STRUKTUR RT/RW REAL-TIME DARI MYSQL VIA BACKEND API
  useEffect(() => {
    const fetchStrukturRTRW = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/desa/rw');
        const resData = await response.json();

        if (resData && resData.success && Array.isArray(resData.data)) {
          // Update data RW ke dalam state global kecamatan
          setDataKecamatan((prev: any) => {
            if (!prev) return prev;
            const desaList = prev.desa_kelurahan || [];
            const updatedDesaList = desaList.map((d: any, idx: number) => {
              if (idx === 0) {
                return { ...d, rw: resData.data };
              }
              return d;
            });
            return { ...prev, desa_kelurahan: updatedDesaList };
          });
        }
      } catch (err) {
        console.warn('Gagal memuat data RT/RW dari MySQL:', err);
      }
    };

    if (currentUser) {
      fetchStrukturRTRW();
    }
  }, [setDataKecamatan, currentUser]);

  // Tahan render sebelum verifikasi role selesai
  if (!currentUser) {
    return null;
  }

  // SINGLE VILLAGE NODE (Ambil data desa utama)
  const currentDesa = dataKecamatan?.desa_kelurahan?.[0] || {
    id_desa: 'DESA-001',
    nama_desa_kelurahan: 'Sukamaju',
    rw: [],
    daftar_pengajuan: [],
    aparatur_lain: [],
  };

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar dari Panel Admin Desa?',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal',
      type: 'danger',
    });

    if (isConfirmed) {
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  // HITUNG BADGE
  const pendingCountSurat = (currentDesa.daftar_pengajuan || []).filter((i: any) => i.status === 'PENDING').length;
  const registeredUsers = JSON.parse(localStorage.getItem('svara_registered_users') || '[]');
  const pendingCountWarga = registeredUsers.filter((u: any) => u.status === 'PENDING_VERIFICATION').length;

  return (
    <div className="h-screen w-screen bg-white font-['Product_Sans',sans-serif] text-black antialiased select-none flex flex-col overflow-hidden relative">
      
      {/* BANNER MODUS DARURAT */}
      {isEmergencyLocked && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-xs font-medium animate-pulse flex-none z-50">
          SYSTEM EMERGENCY LOCK ACTIVE: Seluruh aktivitas administratif dibekukan sementara oleh Super Admin.
        </div>
      )}

      {/* HEADER & NAVIGASI */}
      <header className="border-b border-black/10 bg-white font-['Product_Sans'] flex-none z-40 shadow-xs">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-4 md:flex-row relative">
          <div className="hidden md:block w-32"></div>

          <div className="flex flex-col items-center text-center gap-1 mx-auto">
            <img 
              src={dataKecamatan?.logo_kabupaten || 'https://placehold.co/43x45'} 
              alt="Logo Kabupaten" 
              className="h-9 w-9 object-contain p-0.5 border border-black/10 rounded" 
            />
            <div>
              <p className="text-xs font-medium tracking-wide text-black md:text-sm font-['Product_Sans']">
                Pemerintah Desa / Kelurahan
              </p>
              <h1 className="text-sm font-semibold tracking-wide text-black md:text-base font-['Product_Sans']">
                Kantor Desa {currentDesa.nama_desa_kelurahan || currentDesa.nama || 'Sukamaju'}
              </h1>
              <span className="text-[10.5px] text-black/60 font-normal block">
                Kec. {dataKecamatan?.nama_kecamatan || 'Astanajapura'} • {dataKecamatan?.nama_kabupaten || 'Kabupaten Cirebon'}
              </span>
            </div>
          </div>

          <div className="flex items-center w-full md:w-32 justify-end">
            <button 
              onClick={handleLogout} 
              className="w-28 h-8 bg-neutral-800 rounded-3xl shadow-[inset_0px_-3px_5px_0px_rgba(255,255,255,0.2),inset_0px_3px_5px_0px_rgba(0,0,0,0.4)] border border-black/10 text-white text-xs font-medium flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors font-['Product_Sans']"
            >
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* TAB NAVIGASI PANEL ADMIN DESA */}
        <div className="bg-white border-t border-black/10 px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-1 md:gap-2">
            <button
              onClick={() => setActiveTab('profil')}
              className={`px-3 md:px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer font-['Product_Sans'] ${
                activeTab === 'profil' ? 'border-black text-black font-semibold' : 'border-transparent text-black/50 hover:text-black'
              }`}
            >
              Profil & Aparatur Desa
            </button>
            <button
              onClick={() => setActiveTab('rw-rt')}
              className={`px-3 md:px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer font-['Product_Sans'] ${
                activeTab === 'rw-rt' ? 'border-black text-black font-semibold' : 'border-transparent text-black/50 hover:text-black'
              }`}
            >
              Kelola RW & RT ({currentDesa.rw?.length || 0} RW)
            </button>

            <button
              onClick={() => setActiveTab('verifikasi-warga')}
              className={`px-3 md:px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 font-['Product_Sans'] ${
                activeTab === 'verifikasi-warga' ? 'border-black text-black font-semibold' : 'border-transparent text-black/50 hover:text-black'
              }`}
            >
              Verifikasi Akun Warga
              {pendingCountWarga > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-black text-white text-[10px] font-normal">
                  {pendingCountWarga}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('verifikasi-surat')}
              className={`px-3 md:px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 font-['Product_Sans'] ${
                activeTab === 'verifikasi-surat' ? 'border-black text-black font-semibold' : 'border-transparent text-black/50 hover:text-black'
              }`}
            >
              Persetujuan Surat Warga
              {pendingCountSurat > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-black text-white text-[10px] font-normal">
                  {pendingCountSurat}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('layanan')}
              className={`px-3 md:px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer font-['Product_Sans'] ${
                activeTab === 'layanan' ? 'border-black text-black font-semibold' : 'border-transparent text-black/50 hover:text-black'
              }`}
            >
              Layanan Administrasi
            </button>
            
            <button
              onClick={() => setActiveTab('template')}
              className={`px-3 md:px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer font-['Product_Sans'] ${
                activeTab === 'template' ? 'border-black text-black font-semibold' : 'border-transparent text-black/50 hover:text-black'
              }`}
            >
              Kelola Form Surat
            </button>

            <button
              onClick={() => setActiveTab('pengumuman')}
              className={`px-3 md:px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer font-['Product_Sans'] ${
                activeTab === 'pengumuman' ? 'border-black text-black font-semibold' : 'border-transparent text-black/50 hover:text-black'
              }`}
            >
              Pengumuman Desa
            </button>
            <button
              onClick={() => setActiveTab('aspirasi')}
              className={`px-3 md:px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer font-['Product_Sans'] ${
                activeTab === 'aspirasi' ? 'border-black text-black font-semibold' : 'border-transparent text-black/50 hover:text-black'
              }`}
            >
              Aspirasi Warga
            </button>

            {/* TAB BARU: KELOLA BANSOS & DTKS */}
            <button
              onClick={() => setActiveTab('bansos')}
              className={`px-3 md:px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer font-['Product_Sans'] ${
                activeTab === 'bansos' ? 'border-black text-black font-semibold' : 'border-transparent text-black/50 hover:text-black'
              }`}
            >
              Kelola Bansos & DTKS
            </button>
          </div>
        </div>
      </header>

      {/* AREA KONTEN UTAMA */}
      <main className="flex-1 w-full overflow-y-auto p-6 font-['Product_Sans']">
        <div className="mx-auto max-w-7xl">
          {activeTab === 'profil' && (
            <TabProfilAparaturDesa
              currentDesa={currentDesa}
              dataKecamatan={dataKecamatan}
              setDataKecamatan={setDataKecamatan}
              isEmergencyLocked={isEmergencyLocked}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'rw-rt' && (
            <TabRwRtDesa
              currentDesa={currentDesa}
              dataKecamatan={dataKecamatan}
              setDataKecamatan={setDataKecamatan}
            />
          )}

          {activeTab === 'verifikasi-warga' && (
            <TabVerifikasiWarga namaDesaActive={currentDesa.nama_desa_kelurahan || currentDesa.nama} />
          )}

          {activeTab === 'verifikasi-surat' && (
            <TabVerifikasiPengajuan namaDesaActive={currentDesa.nama_desa_kelurahan || currentDesa.nama} />
          )}

          {activeTab === 'layanan' && (
            <TabLayananDesa currentDesa={currentDesa} />
          )}

          {activeTab === 'template' && (
            <TabTemplateSuratDesa
              currentDesa={currentDesa}
              dataKecamatan={dataKecamatan}
              setDataKecamatan={setDataKecamatan}
            />
          )}

          {activeTab === 'pengumuman' && (
            <TabPengumumanDesa
              currentDesa={currentDesa}
              dataKecamatan={dataKecamatan}
              setDataKecamatan={setDataKecamatan}
            />
          )}

          {activeTab === 'aspirasi' && (
            <TabAspirasiDesa
              currentDesa={currentDesa}
              dataKecamatan={dataKecamatan}
              setDataKecamatan={setDataKecamatan}
            />
          )}

          {/* RENDER KONTEN TAB BANSOS & DTKS */}
          {activeTab === 'bansos' && (
            <TabBansosDTKS currentDesa={currentDesa} />
          )}
        </div>
      </main>

      {/* WIDGET CHAT AI */}
      <ChatAI isFullScreen={false} role="admin" />
    </div>
  );
};

export default DashboardDesa;