import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { QrCodeDisplay } from './QrCodeDisplay';
import { BansosPengajuanFormWidget } from '../chat/BansosPengajuanFormWidget';

interface WargaBansosCheckModalProps {
  currentUser?: any;
  onClose?: () => void;
}

export const WargaBansosCheckModal: React.FC<WargaBansosCheckModalProps> = ({ currentUser, onClose }) => {
  const [nikInput, setNikInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [penerimaData, setPenerimaData] = useState<any[]>([]);
  const [showUsulanForm, setShowUsulanForm] = useState(false);

  // Format NIK: hanya angka & maks 16 digit
  const handleNikChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    setNikInput(val);
  };

  const handleCekBansos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nikInput.length < 16) return;

    setIsLoading(true);
    setHasSearched(false);
    setShowUsulanForm(false);

    try {
      const res = await apiService.cekBansosByNik(nikInput);
      if (res?.success && Array.isArray(res.data)) {
        setPenerimaData(res.data);
      } else {
        setPenerimaData([]);
      }
    } catch (err) {
      console.error('[Cek Bansos Error]:', err);
      setPenerimaData([]);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white border border-black/10 rounded-2xl p-5 shadow-lg space-y-4 font-['Product_Sans',sans-serif] my-2">
      {/* HEADER WIDGET */}
      <div className="flex items-center justify-between border-b border-black/10 pb-3">
        <div>
          <h3 className="text-sm font-bold text-black flex items-center gap-2">
            <span>Cek Status Penerima Bansos & DTKS</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-semibold">
              Resmi Desa
            </span>
          </h3>
          <p className="text-[11px] text-black/50 mt-0.5">
            Cek kepesertaan BLT Dana Desa, PKH, BPNT, atau Sembako menggunakan NIK KTP Anda.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-black/40 hover:text-black cursor-pointer text-sm">
            ✕
          </button>
        )}
      </div>

      {/* FORM INPUT NIK (16 DIGIT) */}
      <form onSubmit={handleCekBansos} className="space-y-2">
        <label className="block text-xs font-semibold text-black">
          Nomor Induk Kependudukan (NIK)
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Masukkan 16 digit NIK..."
              value={nikInput}
              onChange={handleNikChange}
              className="w-full px-3.5 py-2.5 border border-black/15 rounded-xl outline-none focus:border-black font-mono text-xs"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-black/40">
              {nikInput.length}/16
            </span>
          </div>

          <button
            type="submit"
            disabled={nikInput.length < 16 || isLoading}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isLoading ? 'Memeriksa...' : 'Cari Data'}
          </button>
        </div>
      </form>

      {/* HASIL 1: DATA DITEMUKAN (TERDAFTAR) */}
      {hasSearched && penerimaData.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <span className="text-base">✓</span>
            <div>
              <p className="font-bold">NIK Terdaftar di Master Data Bansos Desa!</p>
              <p className="text-[11px] text-emerald-800">
                Berikut adalah detail hak bantuan sosial dan E-Tiket antrean pencairan Anda.
              </p>
            </div>
          </div>

          {penerimaData.map((item, idx) => (
            <div key={item.id_penerima || idx} className="p-4 bg-neutral-50 rounded-2xl border border-black/10 space-y-3">
              <div className="flex items-start justify-between border-b border-black/10 pb-2">
                <div>
                  <h4 className="text-sm font-bold text-black">{item.nama_lengkap}</h4>
                  <p className="text-[11px] text-black/50 font-mono">NIK: {item.nik}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  item.status_pencairan === 'Sudah Dicairkan'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {item.status_pencairan || 'Siap Diambil'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-black/40 block text-[10px] font-mono uppercase">Program</span>
                  <strong className="text-black">{item.jenis_bansos}</strong>
                </div>
                <div>
                  <span className="text-black/40 block text-[10px] font-mono uppercase">Nominal / Alokasi</span>
                  <strong className="text-black font-mono">
                    Rp {Number(item.nominal_bantuan || 0).toLocaleString('id-ID')}
                  </strong>
                </div>
                <div>
                  <span className="text-black/40 block text-[10px] font-mono uppercase">Periode</span>
                  <span>{item.periode || 'Semester 1'} {item.tahun_anggaran || 2026}</span>
                </div>
                <div>
                  <span className="text-black/40 block text-[10px] font-mono uppercase">Sumber Data</span>
                  <span className="text-black/80">{item.sumber_data || 'DTKS Kemensos'}</span>
                </div>
              </div>

              {/* GENERATOR E-TIKET QR CODE */}
              {item.status_pencairan !== 'Sudah Dicairkan' && (
                <div className="pt-2 border-t border-black/10 flex flex-col items-center gap-2">
                  <p className="text-[11px] text-black/60 text-center">
                    Tunjukkan QR Code Tiket ini ke petugas kantor desa saat pembagian bantuan:
                  </p>
                  <QrCodeDisplay value={item.kode_tiket || item.qr_token || `TK-${item.id_penerima}`} size={160} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* HASIL 2: DATA TIDAK DITEMUKAN (TAMPIL ALERT RAMAH + TOMBOL USULAN MANDIRI) */}
      {hasSearched && penerimaData.length === 0 && !showUsulanForm && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3 text-xs">
          <div className="space-y-1">
            <h4 className="font-bold text-amber-900 text-xs">Data NIK Belum Terdaftar</h4>
            <p className="text-[11.5px] text-amber-800 leading-relaxed">
              Mohon maaf, NIK <span className="font-mono font-bold">{nikInput}</span> belum tercatat di Data Terpadu Kesejahteraan Sosial (DTKS) atau daftar penerima bansos tahap ini.
            </p>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border border-amber-200/60 space-y-2">
            <p className="text-[11px] text-black/70 font-medium">
              Apakah Anda atau keluarga Anda merasa layak menerima bantuan sosial desa?
            </p>
            <button
              onClick={() => setShowUsulanForm(true)}
              className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer text-center"
            >
              + Ajukan Usulan Mandiri Bansos
            </button>
          </div>
        </div>
      )}

      {/* RENDER FORM USULAN MANDIRI JIKA KLIK TOMBOL */}
      {showUsulanForm && (
        <div className="pt-2 border-t border-black/10">
          <BansosPengajuanFormWidget
            currentUser={{ ...currentUser, nik: nikInput }}
            onSuccess={() => {
              setShowUsulanForm(false);
              setHasSearched(false);
            }}
          />
        </div>
      )}
    </div>
  );
};