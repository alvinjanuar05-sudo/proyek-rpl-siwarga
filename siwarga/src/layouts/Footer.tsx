import React from 'react';
import { Link } from 'react-router-dom';
import logoSvara from '../assets/icon_navbar/Logo.svg';

const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-black/10 bg-white text-neutral-800 font-['Product_Sans',sans-serif]">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Kolom Brand & Deskripsi */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-3">
              <img src={logoSvara} alt="Logo SVARA" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold tracking-wide text-neutral-900">
                SVARA — SIWARGA
              </span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-500 max-w-sm">
              Sistem Informasi Pelayanan Administrasi Desa Terpadu & Asisten Virtual Publik Pemerintah Desa Mertapada Wetan, Kec. Astanajapura, Kab. Cirebon.
            </p>
          </div>

          {/* Kolom Navigasi Layanan */}
          <div className="md:col-span-3 space-y-2.5 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-neutral-900">
              Layanan Publik
            </h4>
            <ul className="space-y-2 text-neutral-500">
              <li>
                <Link to="/chat-ai" className="hover:text-neutral-900 transition-colors">
                  Asisten Virtual SVARA AI
                </Link>
              </li>
              <li>
                <Link to="/desa" className="hover:text-neutral-900 transition-colors">
                  Profil & Pengumuman Desa
                </Link>
              </li>
              <li>
                <Link to="/wilayah" className="hover:text-neutral-900 transition-colors">
                  Direktori Wilayah RT / RW
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom Akses Akun */}
          <div className="md:col-span-4 space-y-2.5 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-neutral-900">
              Portal Akses
            </h4>
            <ul className="space-y-2 text-neutral-500">
              <li>
                <Link to="/login" className="hover:text-neutral-900 transition-colors">
                  Masuk Akun Warga / Perangkat Desa
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-neutral-900 transition-colors">
                  Pendaftaran Akun Kependudukan Baru
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-black/5 pt-6 text-[11px] text-neutral-400 sm:flex-row">
          <p>© 2026 SIWARGA / SVARA — Pemerintah Desa Mertapada Wetan. All rights reserved.</p>
          <p>Smart Civic Information &amp; Regional Assistant</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;