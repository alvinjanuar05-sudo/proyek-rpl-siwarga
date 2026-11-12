import React from 'react';

interface AspirasiFormWidgetProps {
  formAspirasi: { kategori: string; judul: string; isi: string; lokasi: string };
  setFormAspirasi: React.Dispatch<
    React.SetStateAction<{ kategori: string; judul: string; isi: string; lokasi: string }>
  >;
  handleSubmitAspirasiWarga: (e: React.FormEvent) => void;
}

export const AspirasiFormWidget: React.FC<AspirasiFormWidgetProps> = ({
  formAspirasi,
  setFormAspirasi,
  handleSubmitAspirasiWarga,
}) => {
  return (
    <form
      onSubmit={handleSubmitAspirasiWarga}
      className="mt-3 rounded-2xl border border-black/10 bg-white p-4 text-xs space-y-3.5 text-black font-['Product_Sans',sans-serif] shadow-xs select-none"
    >
      {/* HEADER FORM */}
      <div className="border-b border-black/10 pb-2.5 flex items-center justify-between">
        <span className="font-semibold text-black text-xs tracking-wide">
          📢 Form Aspirasi & Laporan Warga
        </span>
        <span className="text-[10px] bg-neutral-100 text-black/60 px-2 py-0.5 rounded-full border border-black/5 font-medium">
          Layanan Publik
        </span>
      </div>

      {/* KATEGORI ASPIRASI */}
      <div className="space-y-1">
        <label className="font-medium text-black/80 block text-[11px]">
          Kategori Laporan <span className="text-black/40">*</span>
        </label>
        <select
          value={formAspirasi.kategori}
          onChange={(e) => setFormAspirasi({ ...formAspirasi, kategori: e.target.value })}
          className="w-full bg-white border border-black/20 p-2 text-xs text-black outline-none focus:border-black font-['Product_Sans'] rounded-lg font-medium"
        >
          <option value="Infrastruktur / Jalan">Infrastruktur / Perbaikan Jalan</option>
          <option value="Fasilitas Umum / Lampu Jalan">Fasilitas Umum / Penerangan Jalan</option>
          <option value="Kebersihan & Sampah">Kebersihan Lingkungan & Sampah</option>
          <option value="Keamanan & Ketertiban">Keamanan & Ketertiban Lingkungan</option>
          <option value="Layanan Administrasi Desa">Pelayanan Administrasi Desa</option>
          <option value="Lainnya / Masukan Umum">Lainnya / Masukan Umum</option>
        </select>
      </div>

      {/* JUDUL ASPIRASI */}
      <div className="space-y-1">
        <label className="font-medium text-black/80 block text-[11px]">
          Judul Laporan <span className="text-black/40">*</span>
        </label>
        <input
          type="text"
          required
          placeholder="Contoh: Lampu penerangan gang RT 02 padam"
          value={formAspirasi.judul}
          onChange={(e) => setFormAspirasi({ ...formAspirasi, judul: e.target.value })}
          className="w-full bg-white border border-black/20 p-2 text-xs text-black outline-none focus:border-black placeholder:text-black/30 font-['Product_Sans'] rounded-lg"
        />
      </div>

      {/* LOKASI KEJADIAN */}
      <div className="space-y-1">
        <label className="font-medium text-black/80 block text-[11px]">
          Lokasi Spesifik / Patokan Kejadian
        </label>
        <input
          type="text"
          placeholder="Contoh: Depan Pos Ronda RT 02 / Gang Musholla"
          value={formAspirasi.lokasi}
          onChange={(e) => setFormAspirasi({ ...formAspirasi, lokasi: e.target.value })}
          className="w-full bg-white border border-black/20 p-2 text-xs text-black outline-none focus:border-black placeholder:text-black/30 font-['Product_Sans'] rounded-lg"
        />
      </div>

      {/* URAIAN LAPORAN */}
      <div className="space-y-1">
        <label className="font-medium text-black/80 block text-[11px]">
          Uraian Detail Laporan <span className="text-black/40">*</span>
        </label>
        <textarea
          rows={3}
          required
          placeholder="Tuliskan secara lengkap kronologi atau masalah yang dihadapi..."
          value={formAspirasi.isi}
          onChange={(e) => setFormAspirasi({ ...formAspirasi, isi: e.target.value })}
          className="w-full bg-white border border-black/20 p-2 text-xs text-black outline-none focus:border-black placeholder:text-black/30 resize-none font-['Product_Sans'] rounded-lg"
        />
      </div>

      {/* TOMBOL SUBMIT */}
      <div className="pt-2 flex justify-center">
        <button
          type="submit"
          className="w-full h-9 bg-neutral-800 rounded-full border border-black/10 text-white text-xs font-medium flex items-center justify-center cursor-pointer hover:bg-black transition-colors font-['Product_Sans'] shadow-xs"
        >
          Kirim Aspirasi Ke Desa
        </button>
      </div>
    </form>
  );
};