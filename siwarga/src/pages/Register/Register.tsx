import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

import logoSvara from '../../assets/icon_navbar/Logo.svg';
import iconGoogle from '../../assets/icon_login/icon_google.svg';
import iconArrow from '../../assets/icon_login/icon_arrow.svg';

export const Register = ({ dataKecamatan }: { dataKecamatan?: any }) => {
  const { showToast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // STATE MULTI-STEP
  const navigate = useNavigate();

  // AMBIL DATA 1 DESA AKTIF DARI CONTEXT
  const desaAktif = dataKecamatan?.desa_kelurahan?.[0] || {
    id_desa: 'DESA-001',
    nama_desa_kelurahan: 'Sukamaju',
    rw: [
      {
        nomor: '01',
        ketua: 'Usman',
        kontak: '087779898989',
        rt: [
          { nomor: '01', ketua: 'Umar', kontak: '089989123333' },
          { nomor: '02', ketua: 'Ali', kontak: '081234567890' },
        ],
      },
    ],
  };

  const namaDesaResmi =
    desaAktif.nama_desa_kelurahan || desaAktif.nama || 'Sukamaju';

  const [formData, setFormData] = useState({
    nik: '',
    nama_lengkap: '',
    email: '',
    password: '',
    confirm_password: '',
    no_hp: '',
    nomor_rw: '',
    nomor_rt: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // SAMAKAN DENGAN PROPERTI ADMIN DESA (`rw` dan `rt`)
  const rwListAktif = desaAktif.rw || [];
  const selectedRwObj = rwListAktif.find(
    (rw: any) => rw.nomor === formData.nomor_rw
  );
  const rtListAktif = selectedRwObj?.rt || [];

  // VALIDASI LANGKAH 1 SEBELUM NEXT
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nomor_rw || !formData.nomor_rt) {
      showToast('Silakan pilih RW dan RT terlebih dahulu!', 'warning');
      return;
    }

    if (formData.nik.length !== 16) {
      showToast('NIK harus berjumlah 16 digit angka!', 'warning');
      return;
    }

    if (!formData.nama_lengkap.trim()) {
      showToast('Nama lengkap tidak boleh kosong!', 'warning');
      return;
    }

    if (!formData.email.trim()) {
      showToast('Email wajib diisi!', 'warning');
      return;
    }

    const existingUsers = JSON.parse(
      localStorage.getItem('svara_registered_users') || '[]'
    );

    const isExist = existingUsers.some(
      (u: any) =>
        u.nik === formData.nik ||
        u.email.toLowerCase() === formData.email.trim().toLowerCase()
    );

    if (isExist) {
      showToast('NIK atau Email sudah pernah terdaftar!', 'warning');
      return;
    }

    setStep(2);
  };

  // SUBMIT AKHIR DI LANGKAH 2 (TERHUBUNG KE BACKEND API)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      showToast('Kata sandi minimal terdiri dari 6 karakter!', 'warning');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      showToast('Konfirmasi Kata Sandi tidak cocok!', 'warning');
      return;
    }

    const payload = {
      nik: formData.nik,
      nama: formData.nama_lengkap.trim(),
      email: formData.email.trim(),
      password: formData.password,
      no_hp: formData.no_hp,
      id_desa: desaAktif.id_desa || 'DESA-001',
      nomor_rt: formData.nomor_rt,
      nomor_rw: formData.nomor_rw,
      rt_rw: `RT ${formData.nomor_rt} / RW ${formData.nomor_rw}`,
      dusun: '',
      alamat_lengkap: `Desa ${namaDesaResmi}, RT ${formData.nomor_rt} / RW ${formData.nomor_rw}`,
    };

    // ==========================================
    // 1. UTAMAKAN KIRIM REGISTRASI KE BACKEND API
    // ==========================================
    try {
      const res = await apiService.register(payload);
      if (res && res.success) {
        showToast(
          `Pendaftaran akun berhasil dikirim! Silakan tunggu verifikasi dari Admin Desa ${namaDesaResmi}.`,
          'success'
        );

        // Opsi simpan ke fallback lokal agar langsung tersinkron
        const existingUsers = JSON.parse(
          localStorage.getItem('svara_registered_users') || '[]'
        );
        const newUserLocal = {
          ...payload,
          id_user: res.id_user || `USR-${Date.now().toString().slice(-5)}`,
          nama_desa: namaDesaResmi,
          role: 'WARGA',
          status: 'PENDING_VERIFICATION',
          tanggal_daftar: new Date().toISOString(),
        };
        localStorage.setItem(
          'svara_registered_users',
          JSON.stringify([...existingUsers, newUserLocal])
        );

        navigate('/login');
        return;
      } else if (res && res.error) {
        showToast(`Pendaftaran Gagal: ${res.error}`, 'error');
        return;
      }
    } catch (err) {
      console.warn(
        'Backend API offline / bermasalah, berpindah ke fallback local storage:',
        err
      );
    }

    // ==========================================
    // 2. FALLBACK KEDUA: BACA/SIMPAN KE LOCALSTORAGE
    // ==========================================
    const existingUsers = JSON.parse(
      localStorage.getItem('svara_registered_users') || '[]'
    );

    const newUser = {
      id_user: `USR-${Date.now().toString().slice(-5)}`,
      nik: formData.nik,
      nama: formData.nama_lengkap,
      email: formData.email.trim(),
      password: formData.password,
      no_hp: formData.no_hp,
      id_desa: desaAktif.id_desa || 'DESA-001',
      nama_desa: namaDesaResmi,
      nomor_rw: formData.nomor_rw,
      nomor_rt: formData.nomor_rt,
      rt_rw: `RT ${formData.nomor_rt} / RW ${formData.nomor_rw}`,
      role: 'WARGA',
      status: 'PENDING_VERIFICATION',
      tanggal_daftar: new Date().toISOString(),
    };

    const updatedUsers = [...existingUsers, newUser];
    localStorage.setItem(
      'svara_registered_users',
      JSON.stringify(updatedUsers)
    );

    showToast(
      `Pendaftaran akun berhasil dikirim! Silakan tunggu verifikasi dari Admin Desa ${namaDesaResmi}.`,
      'success'
    );
    navigate('/login');
  };

  return (
    <div className="w-screen h-screen bg-white flex items-center justify-center overflow-hidden font-['Product_Sans',sans-serif]">
      <div className="relative w-full h-full bg-white overflow-hidden flex flex-col md:flex-row">
        {/* Tombol Kembali */}
        <a
          href="/"
          className="absolute left-6 top-6 md:left-12 md:top-12 z-30 flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer font-['Product_Sans']"
        >
          <img
            src={iconArrow}
            alt="Kembali"
            className="w-3 h-2.5 object-contain"
          />
          <span className="text-black text-xs font-medium">Kembali</span>
        </a>

        {/* SISI KIRI - LOGO & BRANDING */}
        <div className="w-full md:w-[45%] h-1/4 md:h-full flex items-center justify-center z-10 pt-8 md:pt-0 md:pl-12">
          <div
            className={`flex items-center gap-4 md:gap-6 transition-all duration-700 ease-out ${
              isLoaded
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-6'
            }`}
          >
            <img
              src={logoSvara}
              alt="Logo SVARA"
              className="w-14 h-14 md:w-28 md:h-28 object-contain"
            />
            <span className="text-black text-3xl md:text-6xl font-normal tracking-wide font-['Product_Sans']">
              SVARA
            </span>
          </div>
        </div>

        {/* SISI KANAN - FORM REGISTER WARGA */}
        <div className="w-full md:w-[55%] h-3/4 md:h-full relative flex items-center justify-center overflow-y-auto md:overflow-visible py-6">
          {/* SHAPE LINGKARAN BACKGROUND */}
          <div className="absolute -left-[1%] top-1/2 -translate-y-1/2 w-[1100px] h-[1100px] bg-white rounded-full shadow-[-10px_0px_20px_0px_rgba(0,0,0,0.08)] border-l border-black/5 pointer-events-none z-0 hidden md:block" />

          <div
            className={`relative z-20 w-full max-w-[320px] md:max-w-[360px] px-4 my-auto transition-all duration-700 delay-100 ease-out ${
              isLoaded
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-6'
            }`}
          >
            {/* HEADER & INDIKATOR STEP */}
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-black text-base md:text-lg font-medium font-['Product_Sans']">
                Pendaftaran Warga Desa
              </h1>
              <span className="text-[11px] font-medium text-black/60 bg-black/5 px-2.5 py-1 rounded-full">
                Langkah {step} dari 2
              </span>
            </div>

            {/* LANGKAH 1: DATA DIRI & WILAYAH */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-4">
                {/* NAMA DESA (AUTO-LOCK FIELD) */}
                <div className="relative border-b border-black/80 pb-1.5">
                  <label className="block text-black text-xs font-medium mb-1 font-['Product_Sans']">
                    Desa
                  </label>
                  <input
                    type="text"
                    value={`Desa ${namaDesaResmi}`}
                    readOnly
                    className="w-full bg-transparent text-black text-xs font-medium outline-none cursor-default font-['Product_Sans']"
                  />
                </div>

                {/* Grid 2 Kolom: Pilih RW & RT Dinamis */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative border-b border-black/80 pb-1.5">
                    <label className="block text-black text-xs font-medium mb-1 font-['Product_Sans']">
                      Pilih RW
                    </label>
                    <select
                      value={formData.nomor_rw}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nomor_rw: e.target.value,
                          nomor_rt: '',
                        })
                      }
                      className="w-full bg-transparent text-black text-xs font-medium outline-none cursor-pointer font-['Product_Sans']"
                      required
                    >
                      <option value="">-- Pilih RW --</option>
                      {rwListAktif.map((rw: any, idx: number) => (
                        <option key={idx} value={rw.nomor}>
                          RW {rw.nomor}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative border-b border-black/80 pb-1.5">
                    <label className="block text-black text-xs font-medium mb-1 font-['Product_Sans']">
                      Pilih RT
                    </label>
                    <select
                      value={formData.nomor_rt}
                      onChange={(e) =>
                        setFormData({ ...formData, nomor_rt: e.target.value })
                      }
                      className="w-full bg-transparent text-black text-xs font-medium outline-none cursor-pointer font-['Product_Sans']"
                      required
                      disabled={!formData.nomor_rw}
                    >
                      <option value="">-- Pilih RT --</option>
                      {rtListAktif.map((rt: any, idx: number) => (
                        <option key={idx} value={rt.nomor}>
                          RT {rt.nomor}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Input NIK */}
                <div className="relative border-b border-black/80 pb-1.5">
                  <label className="block text-black text-xs font-medium mb-1 font-['Product_Sans']">
                    NIK (16 Digit)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formData.nik}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nik: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="Masukkan 16 Digit NIK"
                    className="w-full bg-transparent text-black text-xs font-medium outline-none placeholder:text-black/30 font-['Product_Sans']"
                    required
                  />
                </div>

                {/* Input Nama Lengkap */}
                <div className="relative border-b border-black/80 pb-1.5">
                  <label className="block text-black text-xs font-medium mb-1 font-['Product_Sans']">
                    Nama Lengkap Sesuai KTP
                  </label>
                  <input
                    type="text"
                    value={formData.nama_lengkap}
                    onChange={(e) =>
                      setFormData({ ...formData, nama_lengkap: e.target.value })
                    }
                    placeholder="Masukkan Nama Lengkap"
                    className="w-full bg-transparent text-black text-xs font-medium outline-none placeholder:text-black/30 font-['Product_Sans']"
                    required
                  />
                </div>

                {/* Input No HP & Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative border-b border-black/80 pb-1.5">
                    <label className="block text-black text-xs font-medium mb-1 font-['Product_Sans']">
                      No. WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formData.no_hp}
                      onChange={(e) =>
                        setFormData({ ...formData, no_hp: e.target.value })
                      }
                      placeholder="0812..."
                      className="w-full bg-transparent text-black text-xs font-medium outline-none placeholder:text-black/30 font-['Product_Sans']"
                    />
                  </div>
                  <div className="relative border-b border-black/80 pb-1.5">
                    <label className="block text-black text-xs font-medium mb-1 font-['Product_Sans']">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="nama@email.com"
                      className="w-full bg-transparent text-black text-xs font-medium outline-none placeholder:text-black/30 font-['Product_Sans']"
                      required
                    />
                  </div>
                </div>

                {/* Tombol Lanjut */}
                <div className="pt-3 flex justify-center">
                  <button
                    type="submit"
                    className="w-28 h-8 bg-neutral-800 rounded-3xl shadow-[inset_0px_-3px_5px_0px_rgba(255,255,255,0.2),inset_0px_3px_5px_0px_rgba(0,0,0,0.4)] border border-black/10 text-white text-xs font-medium flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors font-['Product_Sans']"
                  >
                    Lanjut
                  </button>
                </div>
              </form>
            )}

            {/* LANGKAH 2: KEAMANAN & KATA SANDI */}
            {step === 2 && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Input Kata Sandi */}
                <div className="relative border-b border-black/80 pb-1.5">
                  <label className="block text-black text-xs font-medium mb-1 font-['Product_Sans']">
                    Kata Sandi
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Masukkan Kata Sandi"
                    className="w-full bg-transparent text-black text-xs font-medium outline-none placeholder:text-black/30 font-['Product_Sans']"
                    required
                  />
                </div>

                {/* Input Ulangi Sandi */}
                <div className="relative border-b border-black/80 pb-1.5">
                  <label className="block text-black text-xs font-medium mb-1 font-['Product_Sans']">
                    Ulangi Kata Sandi
                  </label>
                  <input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirm_password: e.target.value,
                      })
                    }
                    placeholder="Ulangi Kata Sandi"
                    className="w-full bg-transparent text-black text-xs font-medium outline-none placeholder:text-black/30 font-['Product_Sans']"
                    required
                  />
                </div>

                {/* NOTES PERINGATAN KATA SANDI */}
                <div className="p-3 bg-neutral-50 rounded-xl border border-black/10 space-y-1">
                  <p className="text-[11px] font-medium text-black/80 font-['Product_Sans']">
                    Catatan Keamanan Kata Sandi:
                  </p>
                  <ul className="text-[10px] text-black/60 space-y-0.5 list-disc pl-3.5 font-['Product_Sans']">
                    <li>
                      Gunakan sandi yang rumit dengan kombinasi huruf besar, huruf
                      kecil, dan angka.
                    </li>
                    <li>
                      Tambahkan simbol unik (seperti @, #, $, atau !) untuk
                      keamanan ekstra.
                    </li>
                  </ul>
                </div>

                {/* Tombol Aksi (Kembali & Buat Akun) */}
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 h-8 bg-transparent border border-black/20 rounded-3xl text-black text-xs font-medium cursor-pointer hover:bg-black/5 transition-colors font-['Product_Sans']"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="w-28 h-8 bg-neutral-800 rounded-3xl shadow-[inset_0px_-3px_5px_0px_rgba(255,255,255,0.2),inset_0px_3px_5px_0px_rgba(0,0,0,0.4)] border border-black/10 text-white text-xs font-medium flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors font-['Product_Sans']"
                  >
                    Buat Akun
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4 md:mt-6 text-center text-black/70 text-xs font-normal font-['Product_Sans']">
              Atau
            </div>

            <div className="mt-3 md:mt-5 flex items-center justify-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
              <img
                src={iconGoogle}
                alt="Google"
                className="w-4 h-4 object-contain"
              />
              <span className="text-black text-xs font-normal font-['Product_Sans']">
                Daftar Dengan Google
              </span>
            </div>

            <p className="mt-4 text-center text-xs text-black/70 font-['Product_Sans']">
              Sudah punya akun?{' '}
              <a
                href="/login"
                className="text-black font-bold hover:underline cursor-pointer"
              >
                Masuk di sini
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;