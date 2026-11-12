import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';

import logoSvara from '../../assets/icon_navbar/Logo.svg';
import iconGoogle from '../../assets/icon_login/icon_google.svg';
import iconArrow from '../../assets/icon_login/icon_arrow.svg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const inputEmail = email.trim().toLowerCase();
    const inputPassword = password.trim();

    // ==========================================
    // AUTHENTIKASI WAJIB KE BACKEND API (MYSQL)
    // ==========================================
    try {
      const res = await apiService.login(inputEmail, inputPassword);

      if (res && res.success && res.user) {
        const foundUser = { ...res.user };

        // 🛡️ SANITASI KEAMANAN: Pastikan kata sandi dibuang dari LocalStorage Sisi Klien
        delete foundUser.password;
        localStorage.setItem('user', JSON.stringify(foundUser));

        const userRole = (foundUser.role || '').toLowerCase();

        if (userRole === 'admin_desa' || userRole === 'admin-desa') {
          navigate('/dashboard-desa');
        } else if (userRole === 'warga') {
          navigate('/chat-ai');
        } else if (userRole === 'super_admin' || userRole === 'super-admin') {
          navigate('/super-admin');
        } else {
          navigate('/dashboard-desa');
        }
        return;
      } else if (res && res.message) {
        setErrorMessage(`⚠️ ${res.message}`);
        return;
      } else {
        setErrorMessage('⚠️ Email/NIK atau Kata Sandi tidak valid!');
      }
    } catch (err) {
      console.error('Login API Error:', err);
      setErrorMessage('⚠️ Gagal terhubung ke server autentikasi. Pastikan server backend aktif.');
    }
  };

  return (
    <div className="w-screen h-screen bg-white flex items-center justify-center overflow-hidden font-['Product_Sans',sans-serif] select-none">
      <div className="relative w-full h-full bg-white overflow-hidden flex flex-col md:flex-row">
        
        {/* Tombol Kembali (Kiri Atas) */}
        <a 
          href="/" 
          className="absolute left-6 top-6 md:left-12 md:top-12 z-30 flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer"
        >
          <img src={iconArrow} alt="Kembali" className="w-3 h-2.5 object-contain" />
          <span className="text-black text-xs font-medium font-['Product_Sans']">Kembali</span>
        </a>

        {/* SISI KIRI - LOGO & BRANDING */}
        <div className="w-full md:w-[45%] h-2/5 md:h-full flex items-center justify-center z-10 pt-10 md:pt-0 md:pl-12">
          <div className={`flex items-center gap-4 md:gap-6 transition-all duration-700 ease-out ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}>
            <img 
              src={logoSvara} 
              alt="Logo SVARA" 
              className="w-16 h-16 md:w-28 md:h-28 object-contain" 
            />
            <span className="text-black text-4xl md:text-6xl font-normal tracking-wide font-['Product_Sans']">
              SVARA
            </span>
          </div>
        </div>

        {/* SISI KANAN - FORM LOGIN */}
        <div className="w-full md:w-[55%] h-3/5 md:h-full relative flex items-center justify-center">
          <div className="absolute -left-[1%] top-1/2 -translate-y-1/2 w-[1100px] h-[1100px] bg-white rounded-full shadow-[-10px_0px_20px_0px_rgba(0,0,0,0.08)] border-l border-black/5 pointer-events-none hidden md:block z-0" />

          <div className={`relative z-20 w-full max-w-[320px] md:max-w-[360px] px-4 transition-all duration-700 delay-100 ease-out ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}>
            
            <h1 className="text-center text-black text-base md:text-lg font-medium mb-4 md:mb-6 font-['Product_Sans']">
              Selamat Datang Kembali
            </h1>

            {/* NOTIFIKASI ERROR / PENDING STATUS */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-neutral-100 border border-black/10 rounded-xl text-xs text-black/80 font-['Product_Sans'] leading-relaxed transition-all">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
              {/* Input Email / NIK */}
              <div className="relative border-b border-black/80 pb-1.5">
                <label className="block text-black text-xs font-medium mb-1 font-['Product_Sans']">
                  Email atau NIK
                </label>
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan Email atau NIK"
                  className="w-full bg-transparent text-black text-xs font-medium outline-none placeholder:text-black/30 font-['Product_Sans']"
                  required
                />
              </div>

              {/* Input Kata Sandi */}
              <div className="relative border-b border-black/80 pb-1.5">
                <label className="block text-black text-xs font-medium mb-1 font-['Product_Sans']">
                  Kata Sandi
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan Kata Sandi"
                  className="w-full bg-transparent text-black text-xs font-medium outline-none placeholder:text-black/30 font-['Product_Sans']"
                  required
                />
              </div>

              {/* Ingat Saya & Lupa Kata Sandi */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3 h-3 rounded-[2px] border border-black accent-neutral-800 cursor-pointer"
                  />
                  <span className="text-black text-xs font-medium font-['Product_Sans']">Ingat Saya</span>
                </label>

                <a 
                  href="/lupa-sandi" 
                  className="text-black text-xs font-medium hover:underline cursor-pointer font-['Product_Sans']"
                >
                  Lupa Kata Sandi?
                </a>
              </div>

              {/* Tombol Masuk */}
              <div className="pt-2 md:pt-4 flex justify-center">
                <button 
                  type="submit"
                  className="w-28 h-8 bg-neutral-800 rounded-3xl shadow-[inset_0px_-3px_5px_0px_rgba(255,255,255,0.2),inset_0px_3px_5px_0px_rgba(0,0,0,0.4)] border border-black/10 text-white text-xs font-medium flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors font-['Product_Sans']"
                >
                  Masuk
                </button>
              </div>
            </form>

            <div className="mt-4 md:mt-6 text-center text-black/70 text-xs font-normal font-['Product_Sans']">
              Atau
            </div>

            <div className="mt-3 md:mt-5 flex items-center justify-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
              <img src={iconGoogle} alt="Google" className="w-4 h-4 object-contain" />
              <span className="text-black text-xs font-normal font-['Product_Sans']">Masuk Dengan Google</span>
            </div>

            <p className="mt-4 text-center text-xs text-black/70 font-['Product_Sans']">
              Belum punya akun?{' '}
              <a
                href="/register"
                className="text-black font-bold hover:underline cursor-pointer"
              >
                Daftar di sini
              </a>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;