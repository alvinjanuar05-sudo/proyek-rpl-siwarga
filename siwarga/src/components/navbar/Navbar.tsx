import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import arrowIcon from '../../assets/icon_navbar/icon_arrow.svg';
import logoIcon from '../../assets/icon_navbar/Logo.svg';
import { NotificationBell } from '../notification/NotificationBell';

const Navbar = () => {
  const navigate = useNavigate();
  const [isLayananOpen, setIsLayananOpen] = useState(false);
  const [isInformasiOpen, setIsInformasiOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navRef = useRef<HTMLHeadingElement>(null);

  // AMBIL DATA USER LOGIN DARI LOCALSTORAGE
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const namaLengkap = currentUser?.nama || currentUser?.nama_lengkap || 'Warga';
  const namaDepan = namaLengkap.split(' ')[0];

  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    setIsUserMenuOpen(false);
    navigate('/login');
  };

  // Otomatis tutup dropdown jika user klik di luar Navbar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsLayananOpen(false);
        setIsInformasiOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header ref={navRef} className="w-full bg-white sticky top-0 z-[1000] font-['Product_Sans',sans-serif] select-none">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between relative">
        
        {/* Logo + Teks SVARA (Selalu muncul di Mobile & Desktop) */}
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <img src={logoIcon} alt="Siwarga Logo" className="w-7 h-7 object-contain" />
          <span className="text-black text-xl font-bold tracking-tight">
            SVARA
          </span>
        </a>

        {/* Menu Navigasi Tengah */}
        <nav className="hidden md:flex items-center gap-8 text-black/65 text-sm font-medium">
          <a href="/" className="hover:text-black transition-colors">Beranda</a>
          <a href="/desa" className="hover:text-black transition-colors">Desa</a>
          <a href="/wilayah" className="hover:text-black transition-colors">Wilayah</a>
          
          {/* Layanan Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setIsLayananOpen(!isLayananOpen); setIsInformasiOpen(false); setIsUserMenuOpen(false); }}
              className="bg-transparent border-none cursor-pointer text-inherit text-sm font-medium flex items-center gap-1.5 p-0 hover:text-black transition-colors"
            >
              Layanan
              <img 
                src={arrowIcon} 
                alt="arrow" 
                className={`w-2.5 h-1.5 opacity-70 transition-transform duration-200 ${isLayananOpen ? 'rotate-180' : 'rotate-0'}`} 
              />
            </button>

            {/* Dropdown Card Layanan */}
            {isLayananOpen && (
              <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[calc(100vw-48px)] max-w-[1200px] h-[290px] bg-white rounded-b-[40px] border border-black/20 shadow-2xl overflow-hidden z-[2000] flex items-center px-16 gap-12 font-['Inter',sans-serif]">
                <div className="w-[300px] text-black text-2xl font-normal leading-tight">
                  Kemudahan layanan<br/>untuk setiap warga
                </div>
                <div className="w-px h-48 bg-zinc-300 flex-none" />
                <div className="flex flex-col gap-4 text-black text-sm">
                  <a href="/layanan/desa" className="hover:font-semibold hover:underline" onClick={() => setIsLayananOpen(false)}>Layanan Desa</a>
                  <a href="/layanan/pengaduan" className="hover:font-semibold hover:underline" onClick={() => setIsLayananOpen(false)}>Pengaduan Masyarakat</a>
                  <a href="/layanan/status-pengaduan" className="hover:font-semibold hover:underline" onClick={() => setIsLayananOpen(false)}>Cek Status Pengaduan</a>
                </div>
              </div>
            )}
          </div>

          {/* Informasi Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setIsInformasiOpen(!isInformasiOpen); setIsLayananOpen(false); setIsUserMenuOpen(false); }}
              className="bg-transparent border-none cursor-pointer text-inherit text-sm font-medium flex items-center gap-1.5 p-0 hover:text-black transition-colors"
            >
              Informasi
              <img 
                src={arrowIcon} 
                alt="arrow" 
                className={`w-2.5 h-1.5 opacity-70 transition-transform duration-200 ${isInformasiOpen ? 'rotate-180' : 'rotate-0'}`} 
              />
            </button>

            {/* Dropdown Card Informasi */}
            {isInformasiOpen && (
              <div className="fixed top-16 left-1/2 -translate-x-1/2 w-[calc(100vw-48px)] max-w-[1200px] h-[290px] bg-white rounded-b-[40px] border border-black/20 shadow-2xl overflow-hidden z-[2000] flex items-center px-16 gap-12 font-['Inter',sans-serif]">
                <div className="w-[300px] text-black text-2xl font-normal leading-tight">
                  Kenali wilayah Anda<br/>lebih dekat
                </div>
                <div className="w-px h-48 bg-zinc-300 flex-none" />
                <div className="flex flex-col gap-4 text-black text-sm">
                  <a href="/informasi/berita" className="hover:font-semibold hover:underline" onClick={() => setIsInformasiOpen(false)}>Berita & Pengumuman</a>
                  <a href="/informasi/panduan" className="hover:font-semibold hover:underline" onClick={() => setIsInformasiOpen(false)}>Panduan Warga</a>
                  <a href="/informasi/wilayah" className="hover:font-semibold hover:underline" onClick={() => setIsInformasiOpen(false)}>Informasi Wilayah</a>
                  <a href="/informasi/tentang" className="hover:font-semibold hover:underline" onClick={() => setIsInformasiOpen(false)}>Tentang Platform</a>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Bagian Kanan: Kondisional Berdasarkan Status Login */}
        {currentUser ? (
          /* ======================================================== */
          /* KONDISI 1: JIKA WARGA SUDAH LOGIN                        */
          /* ======================================================== */
          <div className="relative flex items-center gap-3">
            {/* Lonceng Notifikasi Interaktif */}
            <NotificationBell user={currentUser} align="right" />

            <button
              onClick={() => { setIsUserMenuOpen(!isUserMenuOpen); setIsLayananOpen(false); setIsInformasiOpen(false); }}
              className="h-9 px-3.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300/80 rounded-full flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <div className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                {namaDepan.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-neutral-800 tracking-tight">
                {namaDepan}
              </span>
              <img
                src={arrowIcon}
                alt="arrow"
                className={`w-2.5 h-1.5 opacity-70 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : 'rotate-0'}`}
              />
            </button>

            {/* DROPDOWN MENU USER YANG SUDAH LOGIN */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-11 w-48 bg-white border border-gray-200 rounded-2xl shadow-xl z-[2000] p-2 flex flex-col gap-1 font-['Product_Sans']">
                <div className="px-3 py-1.5 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-800">{namaLengkap}</p>
                  <p className="text-[10px] text-gray-400">Akun Warga Terverifikasi</p>
                </div>
                <a
                  href="/chat-ai"
                  className="text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-xl font-medium no-underline"
                >
                  Asisten AI
                </a>
                <a
                  href="/profile"
                  className="text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-xl font-medium no-underline"
                >
                  Profil Saya
                </a>
                <button
                  onClick={handleLogout}
                  className="text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-xl font-medium cursor-pointer border-none bg-transparent w-full"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* KONDISI 2: JIKA BELUM LOGIN (TAMPILKAN TOMBOL BAWAAN)    */
          /* ======================================================== */
          <div className="flex items-center gap-6">
            <a href="/login" className="text-black text-xs font-medium no-underline hover:underline font-['Product_Sans']">
              Masuk
            </a>
            
            <a 
              href="/register" 
              className="w-28 h-8 bg-neutral-800 rounded-3xl shadow-[inset_0px_-3px_5px_0px_rgba(255,255,255,0.2),inset_0px_3px_5px_0px_rgba(0,0,0,0.4)] border border-black/10 text-white text-xs font-medium flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors font-['Product_Sans'] no-underline"
            >
              Buat Akun
            </a>
          </div>
        )}

      </div>
    </header>
  );
};

export default Navbar;