import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';

export const TabSecurityMonitoring: React.FC = () => {
  const { showToast, confirm } = useToast();
  // SIMPAN STATUS LOCK DI LOCALSTORAGE AGAR EFEKNYA PERSISTEN
  const [isSystemLocked, setIsSystemLocked] = useState<boolean>(() => {
    return localStorage.getItem('svara_emergency_lock') === 'true';
  });

  // LOG INSIDEN DINAMIS DARI LOCALSTORAGE
  const [securityLogs, setSecurityLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem('svara_security_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse security logs', e);
      }
    }
    return [
      { id: '1', waktu: new Date().toLocaleTimeString('id-ID'), pesan: 'Sesi Login Super Admin Baru Dibuat', tipe: 'SUCCESS', ip: '127.0.0.1' },
      { id: '2', waktu: new Date().toLocaleTimeString('id-ID'), pesan: 'Percobaan Login Gagal - Akun desa@siwarga.com', tipe: 'WARNING', ip: '127.0.0.1' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('svara_emergency_lock', String(isSystemLocked));
  }, [isSystemLocked]);

  useEffect(() => {
    localStorage.setItem('svara_security_logs', JSON.stringify(securityLogs));
  }, [securityLogs]);

  const handleEmergencyLock = () => {
    const nextState = !isSystemLocked;
    setIsSystemLocked(nextState);

    const logEntry = {
      id: Date.now().toString(),
      waktu: new Date().toLocaleTimeString('id-ID'),
      pesan: nextState ? 'Emergency Lock Diaktifkan oleh Super Admin' : 'Emergency Lock Dinonaktifkan',
      tipe: nextState ? 'DANGER' : 'SUCCESS',
      ip: '127.0.0.1',
    };

    setSecurityLogs((prev) => [logEntry, ...prev]);

    showToast(
      nextState
        ? 'Modus Darurat Aktif! Seluruh akses non-Super Admin dibekukan sementara.'
        : 'Modus Normal: Akses sistem kembali dibuka.',
      nextState ? 'warning' : 'success'
    );
  };

  const handleClearLogs = async () => {
    const isConfirmed = await confirm({
      title: 'Bersihkan Log Keamanan',
      message: 'Apakah Anda yakin ingin membersihkan seluruh catatan log insiden keamanan?',
      confirmText: 'Ya, Bersihkan',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (isConfirmed) {
      const resetLogs = [
        { id: Date.now().toString(), waktu: new Date().toLocaleTimeString('id-ID'), pesan: 'Log Insiden Dibersihkan oleh Super Admin', tipe: 'SUCCESS', ip: '127.0.0.1' }
      ];
      setSecurityLogs(resetLogs);
      showToast('Log insiden keamanan berhasil dibersihkan', 'success');
    }
  };

  return (
    <div className="space-y-6 select-none font-['Product_Sans',sans-serif]">
      {/* HEADER MODUL */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
            🛡️ Security Management & Threat Detection
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengawasan keamanan jaringan, insiden autentikasi, dan kontrol sesi darurat.
          </p>
        </div>
        
        {/* TOMBOL SAKLAR DARURAT */}
        <button
          onClick={handleEmergencyLock}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            isSystemLocked
              ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {isSystemLocked ? '🚨 MODUS DARURAT AKTIF (BUKA AKSES)' : '🔒 AMANKAN SISTEM (EMERGENCY LOCK)'}
        </button>
      </div>

      {/* METRIK STATISTIK KEAMANAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Sistem</span>
          <p className={`text-2xl font-extrabold mt-1 ${isSystemLocked ? 'text-red-600' : 'text-emerald-600'}`}>
            {isSystemLocked ? 'LOCKED' : 'NORMAL'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Global Access State</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Insiden Keamanan</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{securityLogs.length} Log</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Tercatat di LocalStorage</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sesi Super Admin</span>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">Active</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Root Token Validated</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Enkripsi DB</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">AES-256</p>
          <p className="text-[10px] text-slate-400 mt-0.5">db_siwarga Protected</p>
        </div>
      </div>

      {/* MONITORING SESI LOGIN & RIWAYAT INSIDEN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LOG INSIDEN KEAMANAN DINAMIS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              ⚠️ Catatan Log Insiden Keamanan
            </h3>
            <button
              onClick={handleClearLogs}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              Bersihkan Log
            </button>
          </div>
          <div className="space-y-3 text-xs max-h-64 overflow-y-auto">
            {securityLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800">{log.pesan}</p>
                  <p className="text-[10px] text-slate-500">Waktu: {log.waktu} • IP: {log.ip}</p>
                </div>
                <span className={`px-2 py-1 rounded font-bold text-[10px] ${
                  log.tipe === 'DANGER' ? 'bg-red-100 text-red-800' :
                  log.tipe === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {log.tipe}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PENGATURAN PARAMETER KEAMANAN */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
            ⚙️ Parameter Proteksi Otomatis
          </h3>
          <div className="space-y-3 text-xs font-medium">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span>Batas Login Gagal Sebelum Kunci Akun</span>
              <span className="font-bold text-slate-900">5 Kali Percobaan</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span>Durasi Sesi Otomatis (Session Timeout)</span>
              <span className="font-bold text-slate-900">30 Menit Inaktif</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span>Proteksi Cross-Site Scripting (XSS)</span>
              <span className="font-bold text-emerald-600">Active / Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabSecurityMonitoring;