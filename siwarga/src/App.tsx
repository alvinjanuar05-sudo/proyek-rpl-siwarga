import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Navbar from './components/navbar/Navbar';
import Hero from './components/hero/Hero';
import LandingSections from './components/hero/LandingSections';
import Footer from './layouts/Footer';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ChatAI from './pages/ChatAI/ChatAI';
import DesaPage from './pages/Desa/DesaPage';
import WilayahPage from './pages/Wilayah/WilayahPage';
import InformasiPage from './pages/Informasi/InformasiPage';

// IMPORT KOMPONEN PROFILE DARI FOLDER COMPONENTS/CHAT
import { Profile } from './components/chat/Profile';

import { KecamatanProvider, useKecamatan } from './context/KecamatanContext';
import { ToastProvider } from './context/ToastContext';

import DashboardDesa from './pages/Dashboard/DashboardDesa';
import DashboardSuperAdmin from './pages/Dashboard/DashboardSuperAdmin';

const Home = () => {
  return (
    <div>
      <Navbar />
      <Hero />
      <LandingSections />
      <Footer />
    </div>
  );
};

// Sub-component pembantu agar `dataKecamatan` bisa di-pass ke Halaman Register
const RegisterWithContext = () => {
  const { dataKecamatan } = useKecamatan();
  return <Register dataKecamatan={dataKecamatan} />;
};

// Sub-component pembungkus App Content
const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. INISIALISASI SESSION AUTH DARI LOCALSTORAGE SECARA AMAN
  const currentUser = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn('Gagal membaca data session user:', e);
      return null;
    }
  })();

  const userRole = (currentUser?.role || '').toLowerCase();
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'super-admin';
  const isAdminDesa =
    userRole === 'admin_desa' ||
    userRole === 'admin-desa' ||
    userRole === 'admin';
  const isAdmin = isAdminDesa || isSuperAdmin;
  const isLoggedIn = Boolean(currentUser);

  const adminTargetRoute = isSuperAdmin ? '/super-admin' : '/dashboard-desa';

  // 2. AUTO-REDIRECT: JIKA ADMIN, KUNCI 100% DI DASHBOARD (TIDAK BOLEH AKSES BERANDA / PUBLIC ROUTES)
  useEffect(() => {
    if (isAdmin) {
      const isAllowedAdminRoute =
        (isSuperAdmin &&
          (location.pathname.startsWith('/super-admin') ||
            location.pathname.startsWith('/dashboard-admin') ||
            location.pathname.startsWith('/dashboard-superadmin'))) ||
        (!isSuperAdmin && location.pathname.startsWith('/dashboard-desa'));

      if (!isAllowedAdminRoute) {
        navigate(adminTargetRoute, { replace: true });
      }
    }
  }, [isAdmin, isSuperAdmin, adminTargetRoute, location.pathname, navigate]);

  const isChatRoute = location.pathname === '/chat' || location.pathname === '/chat-ai';
  const isDashboardRoute =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/super-admin') ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  return (
    <>
      <Routes>
        {/* Public Routes dengan Route Guard untuk Admin */}
        <Route
          path="/"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <Home />}
        />
        <Route
          path="/beranda"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <Home />}
        />
        <Route
          path="/desa"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <DesaPage />}
        />
        <Route
          path="/layanan/desa"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <DesaPage />}
        />
        <Route
          path="/wilayah"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <WilayahPage />}
        />
        <Route
          path="/informasi/wilayah"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <WilayahPage />}
        />
        <Route
          path="/layanan/pengaduan"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <InformasiPage />}
        />
        <Route
          path="/layanan/status-pengaduan"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <InformasiPage />}
        />
        <Route
          path="/informasi/berita"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <InformasiPage />}
        />
        <Route
          path="/informasi/panduan"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <InformasiPage />}
        />
        <Route
          path="/informasi/tentang"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <InformasiPage />}
        />
        <Route
          path="/login"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <Login />}
        />
        <Route
          path="/register"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <RegisterWithContext />}
        />

        {/* HALAMAN CHAT AI FULL SCREEN (HANYA WARGA) */}
        <Route
          path="/chat-ai"
          element={
            isAdmin ? <Navigate to={adminTargetRoute} replace /> : <ChatAI isFullScreen={true} role="warga" />
          }
        />
        <Route
          path="/chat"
          element={
            isAdmin ? <Navigate to={adminTargetRoute} replace /> : <ChatAI isFullScreen={true} role="warga" />
          }
        />

        {/* Profile Route Warga */}
        <Route
          path="/profile"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <Profile />}
        />
        <Route
          path="/profile-warga"
          element={isAdmin ? <Navigate to={adminTargetRoute} replace /> : <Profile />}
        />

        {/* Dashboard Routes */}
        <Route path="/dashboard-desa" element={<DashboardDesa />} />

        {/* Route Super Admin */}
        <Route path="/super-admin" element={<DashboardSuperAdmin />} />
        <Route path="/dashboard-admin" element={<DashboardSuperAdmin />} />
        <Route path="/dashboard-superadmin" element={<DashboardSuperAdmin />} />
      </Routes>

      {/* CHAT AI WIDGET KECIL DI POJOK KANAN BAWAH:
          HANYA MUNCUL JIKA USER SUDAH LOGIN (isLoggedIn), BUKAN ADMIN (!isAdmin),
          DAN DI LUAR CHAT & DASHBOARD ROUTE */}
      {isLoggedIn && !isAdmin && !isChatRoute && !isDashboardRoute && (
        <ChatAI isFullScreen={false} role="warga" />
      )}
    </>
  );
};

function App() {
  return (
    <ToastProvider>
      <KecamatanProvider>
        <AppContent />
      </KecamatanProvider>
    </ToastProvider>
  );
}

export default App;