import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface PasswordSettingsCardProps {
  currentUser: any;
}

export const PasswordSettingsCard: React.FC<PasswordSettingsCardProps> = ({ currentUser }) => {
  const { showToast } = useToast();

  // 1. State Stepper & Loading
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. State Input Kata Sandi
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 3. State Toggle Visibility (Ikon Mata)
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 4. State Modal Reset Sandi via Email
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  // Real-time Calculator Kekuatan Sandi (0 - 4 Point)
  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length >= 8) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) score += 1;
    return score;
  };

  const strengthScore = calculatePasswordStrength(newPassword);

  // 🎯 Step 1: Handling Lanjut dari Step 1 ke Step 2
  const handleVerifyOldPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword) {
      showToast('Masukkan kata sandi saat ini terlebih dahulu!', 'warning');
      return;
    }

    const emailUser = currentUser?.email;
    if (!emailUser) {
      showToast('Email pengguna tidak terdeteksi!', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await apiService.verifyPassword(emailUser, oldPassword);
      if (res.success) {
        showToast('Kata sandi terverifikasi! Silakan buat kata sandi baru.', 'success');
        setCurrentStep(2);
      } else {
        showToast(res.message || 'Kata sandi saat ini tidak sesuai!', 'error');
      }
    } catch (err: any) {
      showToast('Gagal memverifikasi kata sandi saat ini.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // 🎯 Step 2: Handling Simpan Kata Sandi Baru
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      showToast('Lengkapi seluruh kolom kata sandi baru!', 'warning');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Kata sandi baru minimal 8 karakter!', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi kata sandi baru tidak cocok!', 'warning');
      return;
    }

    const emailUser = currentUser?.email;
    if (!emailUser) {
      showToast('Email pengguna tidak terdeteksi!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiService.changePassword({
        email: emailUser,
        old_password: oldPassword,
        new_password: newPassword,
      });

      if (res.success) {
        showToast('Kata sandi berhasil diperbarui!', 'success');
        // Reset Form & Kembalikan ke Step 1
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentStep(1);
      } else {
        showToast(res.message || 'Gagal memperbarui kata sandi.', 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan saat memperbarui kata sandi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🎯 Modal: Trigger Lupa Kata Sandi via Email Dispatcher
  const handleSendResetEmail = async () => {
    const emailUser = currentUser?.email;
    if (!emailUser) {
      showToast('Email terdaftar tidak ditemukan!', 'error');
      return;
    }

    setIsSendingResetEmail(true);
    try {
      const res = await apiService.forgotPassword(emailUser);
      if (res.success) {
        showToast('Tautan pemulihan kata sandi telah dikirim ke email Anda!', 'success');
        setIsForgotModalOpen(false);
      } else {
        showToast(res.message || 'Gagal mengirim email pemulihan.', 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan jaringan saat mengirim email.', 'error');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  return (
    <>
      <div className="w-full bg-white border border-black/10 rounded-2xl shadow-xs overflow-hidden font-['Product_Sans',sans-serif]">
        
        {/* HEADER KARTU KEAMANAN */}
        <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 text-neutral-800 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                Pengaturan Keamanan & Sandi
              </h3>
              <p className="text-[10.5px] text-neutral-500">
                Kelola kata sandi akun Anda untuk menjaga keamanan data kependudukan.
              </p>
            </div>
          </div>
          <span className="text-[9.5px] bg-neutral-200/60 text-neutral-800 px-2.5 py-1 rounded-full font-mono font-semibold shrink-0">
            STEP {currentStep} OF 2
          </span>
        </div>

        {/* STEPPER HEADER INDICATOR */}
        <div className="flex items-center justify-center gap-3 px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors ${
                currentStep === 1
                  ? 'bg-neutral-900 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {currentStep > 1 ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                '1'
              )}
            </div>
            <span
              className={`text-xs font-semibold ${
                currentStep === 1 ? 'text-neutral-900' : 'text-neutral-500'
              }`}
            >
              Verifikasi Sandi Lama
            </span>
          </div>

          <div
            className={`h-[2px] w-10 sm:w-16 transition-colors ${
              currentStep === 2 ? 'bg-neutral-900' : 'bg-neutral-200'
            }`}
          />

          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors ${
                currentStep === 2
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-200 text-neutral-500'
              }`}
            >
              2
            </div>
            <span
              className={`text-xs font-semibold ${
                currentStep === 2 ? 'text-neutral-900' : 'text-neutral-400'
              }`}
            >
              Buat Sandi Baru
            </span>
          </div>
        </div>

        {/* ISIAN FORM STEP 1 */}
        {currentStep === 1 && (
          <form onSubmit={handleVerifyOldPassword} className="p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800 block">
                Kata Sandi Saat Ini <span className="text-rose-500">*</span>
              </label>
              <div className="relative w-full">
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan kata sandi sebelumnya..."
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-neutral-50 border border-black/10 rounded-xl outline-none focus:border-black transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors cursor-pointer text-xs"
                >
                  {showOldPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 012.122-.163c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-1.745 1.745a3.5 3.5 0 11-4.95-4.95" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-xs text-neutral-600 hover:text-black underline underline-offset-2 font-medium cursor-pointer"
              >
                Lupa kata sandi?
              </button>

              <button
                type="submit"
                disabled={isVerifying}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded-full transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isVerifying ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memeriksa...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjut ke Step 2</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ISIAN FORM STEP 2 */}
        {currentStep === 2 && (
          <form onSubmit={handleChangePasswordSubmit} className="p-5 sm:p-6 space-y-4">
            {/* INPUT KATA SANDI BARU */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800 block">
                Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <div className="relative w-full">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter..."
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-neutral-50 border border-black/10 rounded-xl outline-none focus:border-black transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors cursor-pointer text-xs"
                >
                  {showNewPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 012.122-.163c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-1.745 1.745a3.5 3.5 0 11-4.95-4.95" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* BAR INDIKATOR KEKUATAN SANDI */}
              {newPassword && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-neutral-500">Kekuatan Kata Sandi:</span>
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        strengthScore <= 1
                          ? 'text-rose-600'
                          : strengthScore <= 3
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          strengthScore <= 1
                            ? 'bg-rose-600'
                            : strengthScore <= 3
                            ? 'bg-amber-600'
                            : 'bg-emerald-600'
                        }`}
                      />
                      {strengthScore <= 1
                        ? 'Sandi Terlalu Lemah'
                        : strengthScore <= 3
                        ? 'Sandi Cukup Baik'
                        : 'Sandi Sangat Kuat'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strengthScore >= 1
                          ? strengthScore <= 1
                            ? 'bg-rose-500 w-1/3'
                            : strengthScore <= 3
                            ? 'bg-amber-500 w-2/3'
                            : 'bg-emerald-500 w-full'
                          : 'bg-transparent w-0'
                      }`}
                    />
                  </div>
                </div>
              )}

              <p className="text-[10.5px] text-neutral-500 leading-relaxed">
                * Gunakan minimal 8 karakter dengan kombinasi huruf kapital, angka, dan simbol (!@#$%^&*).
              </p>
            </div>

            {/* INPUT KONFIRMASI KATA SANDI BARU */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800 block">
                Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <div className="relative w-full">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru..."
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-neutral-50 border border-black/10 rounded-xl outline-none focus:border-black transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black transition-colors cursor-pointer text-xs"
                >
                  {showConfirmPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 012.122-.163c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-1.745 1.745a3.5 3.5 0 11-4.95-4.95" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* TOMBOL AKSI STEP 2 */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-medium rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Kembali</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-full transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Simpan Kata Sandi Baru</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 🎯 MODAL POPUP DIALOG RESET PASSWORD VIA REACT PORTAL */}
      {isForgotModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-black/10 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 font-['Product_Sans',sans-serif] animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3 border-b border-black/10 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 border border-black/10 flex items-center justify-center text-neutral-800 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                    Reset Kata Sandi via Email
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-500 leading-relaxed">
                    Sistem akan mengirimkan tautan khusus ke email Anda untuk membuat kata sandi baru.
                  </p>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-3.5 border border-black/10 space-y-1 text-xs">
                <span className="text-neutral-500 text-[11px] block">Email Terdaftar:</span>
                <span className="font-bold text-neutral-900 font-mono text-xs">
                  {currentUser?.email || '-'}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-full border border-black/20 text-neutral-800 text-xs font-medium hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSendingResetEmail}
                  onClick={handleSendResetEmail}
                  className="w-1/2 py-2.5 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-black shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSendingResetEmail ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <span>Ya, Kirim Link</span>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};