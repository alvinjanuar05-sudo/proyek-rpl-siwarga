import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface BansosPengajuanFormWidgetProps {
  currentUser?: any;
  onSuccess?: () => void;
}

export const BansosPengajuanFormWidget: React.FC<BansosPengajuanFormWidgetProps> = ({ currentUser: propsUser, onSuccess }) => {
  const { showToast } = useToast();

  // Dapatkan data user dari props atau fallback ke LocalStorage
  const storedUserRaw = localStorage.getItem('user');
  const user = propsUser || (storedUserRaw ? JSON.parse(storedUserRaw) : null);

  const [formData, setFormData] = useState({
    nik_pengaju: user?.nik || '',
    nama_pengaju: user?.nama || user?.nama_lengkap || '',
    no_kk_pengaju: user?.no_kk || '',
    email_pengaju: user?.email || '',
    no_hp_pengaju: user?.no_hp || user?.telepon || '',
    jenis_bansos_diajukan: 'BLT-DD',
    jumlah_tanggungan: 2,
    estimasi_penghasilan: 1000000,
    pekerjaan: 'Buruh Harian Lepas',
    daya_listrik: '450 VA (Subsidi)',
    sumber_air: 'Sumur / Mata Air',
    kondisi_bangunan: 'Semi Permanen / Dinding Papan',
    kepemilikan_aset: 'Hanya Sepeda Motor Tua',
    alasan_pengajuan: '',
  });

  // State Berkas Gambar (Base64)
  const [fotoKtp, setFotoKtp] = useState<string | null>(null);
  const [fotoKk, setFotoKk] = useState<string | null>(null);
  const [fotoRumahDepan, setFotoRumahDepan] = useState<string | null>(null);
  const [fotoRumahDalam, setFotoRumahDalam] = useState<string | null>(null);
  const [fotoSktm, setFotoSktm] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState('');

  // Utilitas Kompresi Gambar via Canvas (Menjaga ukuran Base64 tetap ringan)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          const scaleSize = MAX_WIDTH / img.width;
          
          if (scaleSize < 1) {
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Handler Konversi & Kompresi Gambar ke Base64
  const handleFileChange = async (
    type: 'ktp' | 'kk' | 'rumah_depan' | 'rumah_dalam' | 'sktm',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      if (showToast) showToast('Ukuran berkas asli terlalu besar! Maksimal 10MB.', 'warning');
      return;
    }

    try {
      const compressedBase64 = await compressImage(file);
      if (type === 'ktp') setFotoKtp(compressedBase64);
      if (type === 'kk') setFotoKk(compressedBase64);
      if (type === 'rumah_depan') setFotoRumahDepan(compressedBase64);
      if (type === 'rumah_dalam') setFotoRumahDalam(compressedBase64);
      if (type === 'sktm') setFotoSktm(compressedBase64);
    } catch (err) {
      console.error('Gagal mengompres gambar:', err);
      if (showToast) showToast('Gagal memproses gambar. Ganti dengan foto lain.', 'warning');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nik_pengaju || formData.nik_pengaju.length !== 16) {
      if (showToast) showToast('NIK KTP harus terdiri dari tepat 16 digit angka!', 'warning');
      return;
    }

    if (!formData.alasan_pengajuan.trim()) {
      if (showToast) showToast('Mohon isi uraian alasan kelayakan pengajuan!', 'warning');
      return;
    }

    if (!fotoKtp || !fotoRumahDepan) {
      if (showToast) showToast('Foto KTP dan Foto Rumah Tampak Depan wajib diunggah!', 'warning');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      ...formData,
      id_desa: user?.id_desa || 'DESA-001',
      nomor_rt: user?.nomor_rt || '01',
      nomor_rw: user?.nomor_rw || '01',
      dusun: user?.dusun || 'Dusun 1',
      alamat_lengkap: user?.alamat_lengkap || '',
      foto_ktp: fotoKtp,
      foto_kk: fotoKk,
      foto_rumah: fotoRumahDepan,
      foto_rumah_depan: fotoRumahDepan,
      foto_rumah_dalam: fotoRumahDalam,
      foto_sktm: fotoSktm,
      tanggal_pengajuan: new Date().toISOString(),
    };

    try {
      const res = await apiService.createBansosPengajuan(payload);
      if (res && res.success) {
        setGeneratedTicket(res.id_pengajuan || `USL-${Date.now().toString().slice(-5)}`);
        setIsSubmitted(true);
        if (showToast) showToast('Usulan Bansos & DTKS berhasil dikirim!', 'success');
        if (onSuccess) onSuccess();
      } else {
        if (showToast) showToast(`Gagal mengirim: ${res?.error || 'Terjadi kesalahan server'}`, 'error');
      }
    } catch (err: any) {
      console.error('[Submit Pengajuan Bansos Error]:', err);
      if (showToast) showToast('Gagal terhubung ke server backend desa.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2.5 text-xs text-emerald-900 font-['Product_Sans',sans-serif] my-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-800">
            <span>✓ Usulan Bansos Berhasil Dikirim!</span>
          </div>
          <span className="font-mono text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-900 font-bold">
            {generatedTicket}
          </span>
        </div>
        <p className="text-[11.5px] leading-relaxed">
          Permohonan usulan bansos Anda atas nama <strong>{formData.nama_pengaju}</strong> (NIK: <span className="font-mono">{formData.nik_pengaju}</span>) telah terdaftar di sistem verifikasi Kantor Desa. Berkas fisik dan foto kelayakan lingkungan Anda akan diperiksa oleh Tim Verifikator Desa & Pengurus RT/RW.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white border border-black/10 rounded-2xl p-4 shadow-xs space-y-3 font-['Product_Sans',sans-serif] my-2">
      <div className="border-b border-black/10 pb-2">
        <h4 className="text-xs font-bold text-black">Form Usulan Mandiri Bansos & DTKS</h4>
        <p className="text-[10.5px] text-black/50">Lengkapi parameter kelayakan sosial-ekonomi berstandar DTKS Kemensos.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {/* SECTION 1: DATA IDENTITAS */}
        <div className="space-y-2">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            1. Identitas Pemohon
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-black/70 font-medium text-[10.5px] mb-0.5">NIK Pemohon</label>
              <input
                type="text"
                disabled
                value={formData.nik_pengaju}
                placeholder="NIK KTP"
                className="w-full px-2.5 py-1.5 bg-neutral-100 border border-black/10 rounded-lg text-black/70 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block text-black/70 font-medium text-[10.5px] mb-0.5">Nomor KK</label>
              <input
                type="text"
                maxLength={16}
                value={formData.no_kk_pengaju}
                onChange={(e) => setFormData({ ...formData, no_kk_pengaju: e.target.value.replace(/\D/g, '') })}
                placeholder="16 Digit No. KK"
                className="w-full px-2.5 py-1.5 bg-white border border-black/10 rounded-lg outline-none font-mono text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-black/70 font-medium text-[10.5px] mb-0.5">Nama Lengkap Pemohon</label>
            <input
              type="text"
              disabled
              value={formData.nama_pengaju}
              placeholder="Nama Pemohon"
              className="w-full px-2.5 py-1.5 bg-neutral-100 border border-black/10 rounded-lg text-black/70 text-[11px]"
            />
          </div>
        </div>

        {/* SECTION 2: INDIKATOR KELAYAKAN EKONOMI */}
        <div className="space-y-2 pt-2 border-t border-black/5">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            2. Indikator Kelayakan Sosial-Ekonomi
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-black/70 font-medium text-[10.5px] mb-0.5">Pilihan Bansos</label>
              <select
                value={formData.jenis_bansos_diajukan}
                onChange={(e) => setFormData({ ...formData, jenis_bansos_diajukan: e.target.value })}
                className="w-full px-2 py-1.5 border border-black/10 rounded-lg bg-white outline-none text-[11px]"
              >
                <option value="BLT-DD">BLT Dana Desa</option>
                <option value="PKH">PKH (Program Keluarga Harapan)</option>
                <option value="BPNT">BPNT / Sembako</option>
                <option value="BST">BST Kemensos</option>
              </select>
            </div>
            <div>
              <label className="block text-black/70 font-medium text-[10.5px] mb-0.5">Jumlah Tanggungan</label>
              <input
                type="number"
                min={1}
                value={formData.jumlah_tanggungan}
                onChange={(e) => setFormData({ ...formData, jumlah_tanggungan: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 border border-black/10 rounded-lg outline-none font-mono text-[11px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-black/70 font-medium text-[10.5px] mb-0.5">Daya Listrik</label>
              <select
                value={formData.daya_listrik}
                onChange={(e) => setFormData({ ...formData, daya_listrik: e.target.value })}
                className="w-full px-2 py-1.5 border border-black/10 rounded-lg bg-white outline-none text-[11px]"
              >
                <option value="450 VA (Subsidi)">450 VA (Subsidi)</option>
                <option value="900 VA (Subsidi)">900 VA (Subsidi)</option>
                <option value="900 VA (Non-Subsidi)">900 VA (Non-Subsidi)</option>
                <option value="1300 VA +">1300 VA ke atas</option>
                <option value="Menumpang / Numpang Listrik">Numpang Tetangga</option>
              </select>
            </div>
            <div>
              <label className="block text-black/70 font-medium text-[10.5px] mb-0.5">Sumber Air Utama</label>
              <select
                value={formData.sumber_air}
                onChange={(e) => setFormData({ ...formData, sumber_air: e.target.value })}
                className="w-full px-2 py-1.5 border border-black/10 rounded-lg bg-white outline-none text-[11px]"
              >
                <option value="Sumur / Mata Air">Sumur / Mata Air</option>
                <option value="PDAM">PDAM / Air Perumda</option>
                <option value="Air Isi Ulang / Eceran">Beli Isi Ulang Eceran</option>
                <option value="Sungai / Lainnya">Sungai / Penampungan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-black/70 font-medium text-[10.5px] mb-0.5">Uraian Alasan Kelayakan</label>
            <textarea
              required
              rows={2}
              value={formData.alasan_pengajuan}
              onChange={(e) => setFormData({ ...formData, alasan_pengajuan: e.target.value })}
              placeholder="Jelaskan kondisi pekerjaan, penghasilan bulanan, atau beban keluarga..."
              className="w-full px-2.5 py-1.5 border border-black/10 rounded-lg outline-none text-[11px] resize-none"
            />
          </div>
        </div>

        {/* SECTION 3: UNGGAH BERKAS BUKTI LENGKAP */}
        <div className="pt-2 border-t border-black/5 space-y-2">
          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            3. Unggah Berkas & Bukti Fisik (Auto-Compressed)
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Foto KTP (*Wajib)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('ktp', e)}
                className="w-full text-[9.5px] text-gray-500 file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Foto KK Asli</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('kk', e)}
                className="w-full text-[9.5px] text-gray-500 file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Rumah Tampak Depan (*Wajib)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('rumah_depan', e)}
                className="w-full text-[9.5px] text-gray-500 file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">Kondisi Dapur / Dalam</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('rumah_dalam', e)}
                className="w-full text-[9.5px] text-gray-500 file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-600 mb-0.5">SKTM / Surat Pengantar RT/RW (Opsional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange('sktm', e)}
              className="w-full text-[9.5px] text-gray-500 file:mr-1 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Mengirimkan Usulan...' : 'Kirim Usulan Bansos & DTKS Mandiri'}
          </button>
        </div>
      </form>
    </div>
  );
};