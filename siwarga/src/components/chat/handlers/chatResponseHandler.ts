import type { TemplateSurat } from '../ChatKatalogOptions';
import { callGeminiWithFailover } from '../api/geminiService';
import type { StatusDetailData } from '../StatusCard';
import { apiService } from '../../../services/api';

export interface StatusOptionItem {
  id: string;
  type: 'surat' | 'aspirasi';
  title: string;
  status: string;
  code: string;
}

export interface ChatResponseResult {
  text: string;
  showKatalogLevel1?: boolean;
  selectedCategoryGroup?: string;
  isAspirasiForm?: boolean;
  templateData?: TemplateSurat;
  showAparaturCard?: boolean;
  showRTRWCard?: boolean;
  showPengumumanCard?: boolean;
  targetPejabat?: 'kades' | 'sekdes' | 'aparatur_all' | string;
  statusListOptions?: StatusOptionItem[];
  totalStatusCount?: number;
  hasMoreStatus?: boolean;
  statusCardData?: StatusDetailData;
  showBansosCheckWidget?: boolean;
  isBansosPengajuanForm?: boolean;
}

export const processChatMessage = async (
  textToSend: string,
  namaWarga: string,
  alamatWarga: {
    desa: string;
    kecamatan: string;
    rt_rw: string;
    nomor_rt: string;
    nomor_rw: string;
    dusun?: string;
  },
  currentDesa: any,
  templatesDesa: TemplateSurat[],
  userRole: 'warga' | 'admin' = 'warga'
): Promise<ChatResponseResult> => {
  const lower = textToSend.toLowerCase().trim();

  // =========================================================================
  // 1. PEMBATASAN TOPIK DAN GUARDRAILS (STRICT DOMAIN CONSTRAINT)
  // AI Agent HANYA BISA membantu hal pelayanan publik & informasi Desa Mertapada Wetan.
  // =========================================================================
  const PENOLAKAN_RESMI = "Mohon maaf, sebagai asisten resmi Desa Mertapada Wetan, saya hanya dapat membantu Anda terkait layanan administrasi, pengumuman, aspirasi, dan informasi seputar desa.";

  const offTopicPatterns = [
    /\b(python|javascript|typescript|c\+\+|java|php|ruby|golang|rust|html|css|sql query|nosql|react|vue|angular|node\.?js)\b/i,
    /\b(bikin|buatkan|tuliskan|contoh|ajari|koreksi)\s+(kode|koding|coding|script|fungsi|function|program|algoritma|class|syntax)\b/i,
    /\b(debug|compile|syntax error|regex|npm install|pip install|terminal|cmd|powershell)\b/i,
    /\b(print\(|console\.log|def |public static|void main|import os|import sys)\b/i,
    /\b(hitunglah|kalkulator|integral|turunan|aljabar|trigonometri|pythagoras|logaritma|pecahan|persamaan linier)\b/i,
    /\b(tugas sekolah|pr sekolah|pr matematika|pekerjaan rumah|soal fisika|soal kimia|soal biologi|soal ujian|skripsi|makalah)\b/i,
    /\b(buatkan puisi|buatkan cerpen|cerita dongeng|pantun cinta|lirik lagu|novel|teks drama)\b/i,
    /\b(siapa presiden amerika|presiden rusia|perang dunia|ibukota prancis|sepak bola eropa|liga champions)\b/i,
    /\b(resep masakan|cara memasak kue|ramalan zodiak|horoskop|main game|cheat game)\b/i,
  ];

  if (offTopicPatterns.some((pattern) => pattern.test(textToSend || ''))) {
    return {
      text: PENOLAKAN_RESMI,
    };
  }

  // =========================================================================
  // JIKA DIPANGGIL DENGAN MODE ADMIN DESA (EXECUTIVE FULL DATA SEARCH ACCESS)
  // =========================================================================
  if (userRole === 'admin') {
    if (
      lower === 'halo' ||
      lower === 'hi' ||
      lower === 'p' ||
      lower.includes('menu utama') ||
      lower === 'batal'
    ) {
      return {
        text: `Halo **Admin ${namaWarga}**! Saya adalah **Svara AI Executive Assistant** untuk Administrator Desa **${alamatWarga.desa}** ⚙️.\n\nSaya terhubung langsung dengan seluruh basis data internal (Pendaftaran Warga, Verifikasi Surat, Kelola RT/RW, Template, Pengumuman, Aspirasi, dan Bansos/DTKS). Ada data yang ingin saya carikan?`,
      };
    }

    // 1. TEMBAK LANGSUNG KE BACKEND EXPRESS MYSQL CHAT AI UNTUK AMBIL DATA LENGKAP DB
    try {
      const apiKey = localStorage.getItem('svara_gemini_api_key') || '';
      const storedUserRaw = localStorage.getItem('user');
      const adminObj = storedUserRaw ? JSON.parse(storedUserRaw) : { nama: namaWarga, role: 'admin' };

      const backendRes = await apiService.sendAiChat(textToSend, adminObj, apiKey);
      if (backendRes && backendRes.success && backendRes.reply) {
        return { text: backendRes.reply };
      }
    } catch (err) {
      console.warn('Gagal memanggil backend AI Admin, menggunakan fallback lokal:', err);
    }

    // --- FETCH DATA TERBARU DARI MYSQL VIA REST API (FALLBACK DUAL STORAGE) ---
    let combinedWarga: any[] = [];
    let daftarPengajuan: any[] = [];
    let listAspirasi: any[] = [];
    let rawPengumuman: any[] = [];
    let listAparatur: any[] = [];
    let listRTRWFromApi: any[] = [];

    try {
      const [resUsers, resSurat, resAspirasi, resPengumuman, resAparatur, resRTRW] = await Promise.all([
        apiService.getUsers().catch(() => null),
        apiService.getPengajuanSurat().catch(() => null),
        apiService.getAspirasi().catch(() => null),
        apiService.getPengumuman().catch(() => null),
        apiService.getAparatur().catch(() => null),
        (apiService as any).getRwRts ? (apiService as any).getRwRts().catch(() => null) : Promise.resolve(null),
      ]);

      if (resUsers && resUsers.success && Array.isArray(resUsers.data)) combinedWarga = resUsers.data;
      if (resSurat && resSurat.success && Array.isArray(resSurat.data)) daftarPengajuan = resSurat.data;
      if (resAspirasi && resAspirasi.success && Array.isArray(resAspirasi.data)) listAspirasi = resAspirasi.data;
      if (resPengumuman && resPengumuman.success && Array.isArray(resPengumuman.data)) rawPengumuman = resPengumuman.data;
      if (resAparatur && resAparatur.success && Array.isArray(resAparatur.data)) listAparatur = resAparatur.data;
      if (resRTRW && resRTRW.success && Array.isArray(resRTRW.data)) listRTRWFromApi = resRTRW.data;
    } catch (err) {
      console.warn('Gagal memuat data REST API:', err);
    }

    // FALLBACKS DARI LOCALSTORAGE JIKA API OFFLINE
    const storedKec = JSON.parse(localStorage.getItem('svara_kecamatan_data') || 'null') ||
                      JSON.parse(localStorage.getItem('kecamatan_app_data') || '{}');

    if (combinedWarga.length === 0) {
      const registeredUsers: any[] = JSON.parse(localStorage.getItem('svara_registered_users') || '[]');
      const fallbackWarga: any[] = storedKec?.warga || currentDesa?.daftar_warga || [];
      combinedWarga = registeredUsers.length > 0 ? registeredUsers : fallbackWarga;
    }

    if (daftarPengajuan.length === 0) daftarPengajuan = currentDesa?.daftar_pengajuan || [];
    if (listAspirasi.length === 0) listAspirasi = storedKec?.aspirasi_warga || [];
    if (rawPengumuman.length === 0) {
      rawPengumuman = storedKec?.pengumuman_desa || currentDesa?.pengumuman_desa || JSON.parse(localStorage.getItem('svara_pengumuman_desa') || '[]');
    }

    const totalWarga = combinedWarga.length;
    const verifiedWarga = combinedWarga.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE' || (u.status || '').toUpperCase() === 'VERIFIED').length;
    const pendingWarga = combinedWarga.filter((u) => (u.status || '').toUpperCase() === 'PENDING_VERIFICATION' || (u.status || '').toUpperCase() === 'PENDING').length;

    const totalPengajuan = daftarPengajuan.length;
    const pendingPengajuan = daftarPengajuan.filter((p) => (p.status || 'PENDING').toUpperCase() === 'PENDING').length;
    const approvedPengajuan = daftarPengajuan.filter((p) => (p.status || '').toUpperCase() === 'APPROVED' || (p.status || '').toUpperCase() === 'SELESAI').length;
    const rejectedPengajuan = daftarPengajuan.filter((p) => (p.status || '').toUpperCase() === 'REJECTED' || (p.status || '').toUpperCase() === 'DITOLAK').length;

    const totalAspirasi = listAspirasi.length;
    const pendingAspirasi = listAspirasi.filter((a) => (a.status || 'MENUNGGU').toUpperCase() === 'MENUNGGU').length;

    const activeTemplates: TemplateSurat[] = templatesDesa.length > 0 ? templatesDesa : (currentDesa?.template_surat || []);

    const wargaFormatted = combinedWarga.length > 0
      ? combinedWarga.map((w, idx) => `${idx + 1}. Nama: ${w.nama || w.nama_lengkap || '-'} | NIK: ${w.nik || '-'} | Email: ${w.email || '-'} | Status: ${w.status || 'ACTIVE'} | Alamat: RT ${w.nomor_rt || '-'}/RW ${w.nomor_rw || '-'}`).join('\n')
      : '- Belum ada data warga terdaftar di sistem.';

    const pengajuanFormatted = daftarPengajuan.length > 0
      ? daftarPengajuan.map((p, idx) => `${idx + 1}. ID Tiket: ${p.id_pengajuan} | Jenis Surat: ${p.nama_surat} | Pemohon: ${p.data_isian?.nama_warga || p.nama_warga || p.email_warga || '-'} | Status: ${p.status || 'PENDING'} | Tanggal: ${p.tanggal_pengajuan || p.created_at || '-'}`).join('\n')
      : '- Belum ada riwayat pengajuan surat dari warga.';

    const aspirasiFormatted = listAspirasi.length > 0
      ? listAspirasi.map((a, idx) => `${idx + 1}. Kode: ${a.id_aspirasi} | Kategori: ${a.kategori} | Judul: ${a.judul} | Pelapor: ${a.nama_warga || '-'} | Status: ${a.status || 'Menunggu'}`).join('\n')
      : '- Belum ada laporan aspirasi dari warga.';

    const pengumumanFormatted = rawPengumuman.length > 0
      ? rawPengumuman.map((p, idx) => `${idx + 1}. Judul: ${p.judul || p.judul_pengumuman} (${p.tanggal_info || p.tanggal || 'Terbaru'}) | Isi: ${p.isi || p.deskripsi || '-'}`).join('\n')
      : '- Belum ada pengumuman desa.';

    const rtwFormatted = listRTRWFromApi.length > 0
      ? listRTRWFromApi.map((r) => {
          const childRtText = Array.isArray(r.rt)
            ? r.rt.map((rtItem: any) => `    * RT ${rtItem.nomor || rtItem.nomor_rt} | Ketua RT: ${rtItem.ketua || rtItem.ketua_rt || '-'} (HP: ${rtItem.kontak || '-'})`).join('\n')
            : '    * Tidak ada RT';
          return `- RW ${r.nomor || r.nomor_rw} | Ketua RW: ${r.ketua || r.ketua_rw || '-'} (HP: ${r.kontak || '-'})\n${childRtText}`;
        }).join('\n')
      : '- Data struktur RT/RW belum terkonfigurasi di API.';

    const templateFormatted = activeTemplates.length > 0
      ? activeTemplates.map((t) => `- Kode: ${t.kode_surat} | Surat: ${t.nama_surat} (${(t as any).kategori || 'Umum'})`).join('\n')
      : '- Belum ada template surat aktif.';

    const aparaturFormatted = listAparatur.length > 0
      ? listAparatur.map((ap) => `- ${ap.nama} (${ap.jabatan}) - Kontak: ${ap.no_hp || '-'}`).join('\n')
      : '- Data aparatur memakai struktur default desa.';

    const adminContextInfo = `
IDENTITAS & ROLE AI:
Anda adalah "Svara AI Executive Assistant", Asisten Cerdas Internal Administrator Desa ${alamatWarga.desa}.
Karakter: Profesional, analitis, akurat, dan tanggap membantu Administrator Desa mengelola seluruh data kantor desa.

ATURAN MUTLAK BATASAN TOPIK (STRICT DOMAIN CONSTRAINT):
1. Anda HANYA BISA membantu hal-hal yang berkaitan dengan pelayanan publik dan informasi Desa ${alamatWarga.desa}.
2. JIKA pengguna meminta hal di luar topik desa (seperti membuat kode kodingan/Python, matematika, tugas sekolah, obrolan umum di luar desa, dsb), Anda WAJIB MENOLAK secara sopan dengan respon persis seperti berikut:
"${PENOLAKAN_RESMI}"
3. DILARANG KERAS menjawab hal di luar urusan desa atau pemerintahan desa.

BATASAN HAK AKSES ROLE: MODE ADMIN (FULL ACCESS)
- Memiliki akses penuh (Full Access). Bisa melihat dan mengelola seluruh data sistem desa (semua pengumuman, seluruh pengajuan surat warga, seluruh aspirasi, statistik RT/RW, dan data akun warga).

IDENTITAS ADMIN:
- Nama Admin: ${namaWarga}
- Wilayah Tugas: Desa ${alamatWarga.desa}, Kec. ${alamatWarga.kecamatan}

AKSES FULL BASIS DATA DASHBOARD ADMIN DESA ${alamatWarga.desa.toUpperCase()}:

1. TAB AKUN WARGA:
   - Total Warga Terdaftar: ${totalWarga} Jiwa
   - Terverifikasi: ${verifiedWarga} Jiwa | Pending: ${pendingWarga} Jiwa
${wargaFormatted}

2. TAB PERSETUJUAN SURAT:
   - Total: ${totalPengajuan} | Pending: ${pendingPengajuan} | Approved: ${approvedPengajuan} | Rejected: ${rejectedPengajuan}
${pengajuanFormatted}

3. TAB ASPIRASI WARGA:
   - Total: ${totalAspirasi} | Pending: ${pendingAspirasi}
${aspirasiFormatted}

4. TAB PENGUMUMAN DESA:
${pengumumanFormatted}

5. TAB KELOLA RW & RT (DATA PENGURUS SANGAT PENTING):
${rtwFormatted}

6. TAB TEMPLATE SURAT:
${templateFormatted}

7. DAFTAR APARATUR DESA:
${aparaturFormatted}

PETUNJUK BALASAN PENCARIAN ADMIN:
- Jawablah kueri pencarian Admin secara spesifik menggunakan data lengkap di atas.
- Jika Admin menanyakan nama Ketua RT, Ketua RW, data warga, status permohonan surat, atau pengumuman, WAJIB sebutkan datanya dengan jelas dan tebal (bold).
    `.trim();

    const aiAdminReply = await callGeminiWithFailover(textToSend, adminContextInfo);
    return { text: aiAdminReply };
  }

  // =========================================================================
  // JIKA MODE WARGA (PUBLIC ACCESS & INTERACTIVE UI)
  // =========================================================================

  // 🎯 PRIORITAS 1: INTENT MODUL BANSOS & DTKS (ISOLASI DARI MENU 5)
  // CABANG A (MENU 8): CEK STATUS PENERIMA BANSOS & DTKS VIA NIK
  if (
    lower === '8. cek status penerima bansos & dtks' ||
    lower.includes('cek status penerima bansos') ||
    lower.includes('cek bansos') ||
    lower.includes('cek dtks')
  ) {
    return {
      text: `Berikut modul pemeriksaan **Bantuan Sosial & DTKS** Desa **${alamatWarga.desa}**. Silakan masukkan NIK KTP Anda pada kolom berikut untuk memeriksa status kepesertaan:`,
      showBansosCheckWidget: true,
      isBansosPengajuanForm: false,
    };
  }

  // CABANG B (MENU 9): AJUKAN USULAN MANDIRI BANSOS
  if (
    lower === '9. ajukan usulan mandiri bansos' ||
    lower.includes('ajukan usulan mandiri bansos') ||
    lower.includes('usulan mandiri bansos') ||
    lower.includes('ajukan bansos')
  ) {
    return {
      text: `**FORMULIR USULAN MANDIRI BANSOS & DTKS**\n\nSilakan lengkapi data profil sosial-ekonomi dan unggah berkas kelayakan di bawah ini untuk mengajukan usulan bantuan sosial ke Pemerintah Desa **${alamatWarga.desa}**:`,
      showBansosCheckWidget: false,
      isBansosPengajuanForm: true,
    };
  }

  // 1. NAVIGASI MENU UTAMA / RESET / SAPAAN UMUM
  if (
    lower === 'halo' || 
    lower === 'hi' || 
    lower === 'p' || 
    lower === 'ping' ||
    lower.includes('menu utama') ||
    lower.includes('kembali ke menu') ||
    lower === 'batal'
  ) {
    return {
      text: `Halo **${namaWarga}**, selamat datang di Layanan Otomatis **Desa ${alamatWarga.desa}**.\n\nSilakan pilih layanan desa yang Anda butuhkan di bawah ini:`,
      showKatalogLevel1: true,
    };
  }

  // 1.1 PERTANYAAN IDENTITAS AI
  if (
    lower.includes('siapa kamu') ||
    lower.includes('siapa anda') ||
    lower.includes('kamu siapa') ||
    lower.includes('anda siapa') ||
    lower.includes('siapa bot') ||
    lower.includes('siapa ai') ||
    lower.includes('perkenalkan')
  ) {
    return {
      text: `Halo **${namaWarga}**! Saya adalah **Svara AI**, Asisten Digital Resmi Layanan Publik Desa **${alamatWarga.desa}** 🤖.\n\nSaya bertugas membantu Anda mempermudah pengurusan surat-menyurat, melihat pengumuman desa, mengecek status bansos/DTKS, mengecek antrean status, serta menyampaikan aspirasi publik.\n\nAda yang bisa saya bantu hari ini?`,
      showKatalogLevel1: true,
    };
  }

  // 1.2 UCAPAN TERIMA KASIH
  if (
    lower === 'terima kasih' ||
    lower === 'terimakasih' ||
    lower === 'makasih' ||
    lower === 'makasi' ||
    lower === 'trims' ||
    lower === 'ok' ||
    lower === 'oke' ||
    lower === 'siap'
  ) {
    return {
      text: `Sama-sama **${namaWarga}**! Senang dapat membantu Anda. Jika ada keperluan informasi atau pengajuan surat lainnya, silakan pilih menu di bawah ini:`,
      showKatalogLevel1: true,
    };
  }

  // 2. KATALOG LAYANAN & FILTER KATEGORI
  if (
    lower.includes('katalog') ||
    lower.includes('layanan') ||
    lower.includes('informasi layanan') ||
    lower.includes('menu layanan') ||
    lower.includes('info & ajukan') ||
    lower.startsWith('kategori:')
  ) {
    if (lower.startsWith('kategori:')) {
      const selectedCat = lower.replace('kategori:', '').trim();
      return {
        text: `Silakan pilih jenis surat yang ingin Anda ajukan di bawah ini:`,
        selectedCategoryGroup: selectedCat,
      };
    }
    return {
      text: `Silakan pilih layanan desa yang Anda butuhkan di bawah ini:`,
      showKatalogLevel1: true,
    };
  }

  // 3. HANDLER PILIHAN NO. 3 KATALOG: "Pilih Pejabat Desa"
  if (lower === 'pilih pejabat desa' || lower === '3. informasi pejabat & aparatur desa') {
    return {
      text: `Silakan pilih pejabat / perangkat Desa **${alamatWarga.desa}** yang ingin Anda lihat informasinya di bawah ini:`,
      selectedCategoryGroup: 'pejabat_dropdown',
    };
  }

  // 3.1 HANDLER INPUT SPESIFIK DARI DROPDOWN PEJABAT
  if (textToSend.startsWith('PEJABAT_ID:')) {
    const idPejabat = textToSend.replace('PEJABAT_ID:', '').trim();
    return {
      text: `Berikut informasi profil dan Tupoksi pejabat desa yang Anda pilih:`,
      showAparaturCard: true,
      targetPejabat: idPejabat,
    };
  }

  if (lower === 'tampilkan semua aparatur desa' || lower === 'informasi pejabat desa') {
    return {
      text: `Berikut profil seluruh struktur eksekutif dan aparatur Pemerintah Desa **${alamatWarga.desa}**:`,
      showAparaturCard: true,
      targetPejabat: 'aparatur_all',
    };
  }

  if (lower === 'informasi kepala desa') {
    return {
      text: `Berikut profil Kepala Desa **${alamatWarga.desa}**:`,
      showAparaturCard: true,
      targetPejabat: 'kades',
    };
  }

  if (lower === 'informasi sekretaris desa') {
    return {
      text: `Berikut profil Sekretaris Desa **${alamatWarga.desa}**:`,
      showAparaturCard: true,
      targetPejabat: 'sekdes',
    };
  }

  // 4. INFORMASI PENGURUS RT & RW
  const userRTStr = String(alamatWarga?.nomor_rt || '').replace(/\D/g, '');
  const userRWStr = String(alamatWarga?.nomor_rw || '').replace(/\D/g, '');

  const displayUserRT = userRTStr ? userRTStr.padStart(2, '0') : '01';
  const displayUserRW = userRWStr ? userRWStr.padStart(2, '0') : '01';

  const userRTNumPlain = String(parseInt(displayUserRT, 10));
  const userRWNumPlain = String(parseInt(displayUserRW, 10));

  const isTanyaRTRW =
    lower === 'informasi pengurus rt & rw' ||
    lower === 'informasi pengurus rt dan rw' ||
    lower === 'kontak pengurus rt/rw' ||
    lower === '4. informasi kontak pengurus rt & rw' ||
    lower === '4. informasi kontak pengurus rt dan rw' ||
    lower.includes('informasi pengurus rt') ||
    lower.includes('informasi kontak pengurus rt') ||
    lower.includes('pengurus rt & rw') ||
    lower.includes('pengurus rt dan rw') ||
    lower.includes('kontak pengurus rt') ||
    lower.includes('kontak pengurus rw') ||
    lower.includes('pengurus rt') ||
    lower.includes('pengurus rw') ||
    lower.includes('kontak rt') ||
    lower.includes('kontak rw') ||
    lower.includes('ketua rt') ||
    lower.includes('ketua rw') ||
    lower.includes('info rt') ||
    lower.includes('info rw') ||
    lower.includes('rt & rw') ||
    lower.includes('rt dan rw') ||
    lower.includes('rt berapa') ||
    lower.includes('rw berapa') ||
    lower.includes('rt/rw');

  if (isTanyaRTRW) {
    const rawRWList = Array.isArray(currentDesa?.rw) ? currentDesa.rw : (currentDesa?.daftar_rw || []);
    const matchedRWObj = rawRWList.find((r: any) => {
      const rwField = String(r.nomor || r.nomor_rw || r.rw || r.nama_rw || r.nama || '');
      const rwDigits = rwField.replace(/\D/g, '');
      const rwPlain = String(parseInt(rwDigits || '0', 10));
      return (
        rwDigits === displayUserRW ||
        rwPlain === userRWNumPlain ||
        rwField.toLowerCase().includes(`rw ${displayUserRW}`) ||
        rwField.toLowerCase().includes(`rw ${userRWNumPlain}`)
      );
    });

    const ketuaRW = matchedRWObj?.ketua || matchedRWObj?.nama_ketua || matchedRWObj?.nama || currentDesa?.ketua_rw || (matchedRWObj ? `Bpk. Ketua RW ${displayUserRW}` : 'Belum terdaftar di sistem');
    const kontakRW = matchedRWObj?.kontak || matchedRWObj?.no_hp || matchedRWObj?.kontak_rw || currentDesa?.kontak_rw || '-';

    const listRT = Array.isArray(matchedRWObj?.rt) ? matchedRWObj.rt : 
                   Array.isArray(matchedRWObj?.daftar_rt) ? matchedRWObj.daftar_rt : 
                   Array.isArray(matchedRWObj?.rt_list) ? matchedRWObj.rt_list : [];

    const matchedRTObj = listRT.find((r: any) => {
      const rtField = String(r.nomor || r.nomor_rt || r.rt || r.nama_rt || r.nama || '');
      const rtDigits = rtField.replace(/\D/g, '');
      const rtPlain = String(parseInt(rtDigits || '0', 10));
      return (
        rtDigits === displayUserRT ||
        rtPlain === userRTNumPlain ||
        rtField.toLowerCase().includes(`rt ${displayUserRT}`) ||
        rtField.toLowerCase().includes(`rt ${userRTNumPlain}`)
      );
    });

    const ketuaRT = matchedRTObj?.ketua || matchedRTObj?.nama_ketua || matchedRTObj?.nama || currentDesa?.ketua_rt || (matchedRTObj ? `Bpk. Ketua RT ${displayUserRT}` : 'Belum terdaftar di sistem');
    const kontakRT = matchedRTObj?.kontak || matchedRTObj?.no_hp || matchedRTObj?.kontak_rt || currentDesa?.kontak_rt || '-';

    return { 
      text: `Halo, **${namaWarga}**! Berdasarkan data profil terdaftar akun Anda di Desa **${alamatWarga.desa}**:\n\n` +
            `• **Wilayah Domisili:** RT ${displayUserRT} / RW ${displayUserRW}\n` +
            `• **Ketua RT ${displayUserRT}:** **${ketuaRT}** (Kontak/WA: ${kontakRT})\n` +
            `• **Ketua RW ${displayUserRW}:** **${ketuaRW}** (Kontak/WA: ${kontakRW})\n\n` +
            `Berikut rincian kartu kontak Pengurus RT ${displayUserRT} / RW ${displayUserRW} Anda:`,
      showRTRWCard: true,
    };
  }

  // 5. TIKET STATUS SPESIFIK
  if (textToSend.startsWith('TIKET:') || textToSend.startsWith('ASPIRASI:')) {
    const code = textToSend.split(':')[1]?.trim();
    const isSurat = textToSend.startsWith('TIKET:');

    if (isSurat) {
      let daftarPengajuan: any[] = currentDesa?.daftar_pengajuan || [];
      
      try {
        const res = await apiService.getPengajuanSurat();
        if (res && res.success && Array.isArray(res.data)) {
          daftarPengajuan = res.data;
        }
      } catch (e) {
        // Fallback ke data lokal jika API offline
      }

      const item = daftarPengajuan.find((p) => p.id_pengajuan === code) || daftarPengajuan[0];

      if (!item) return { text: 'Data pengajuan surat tidak ditemukan.' };

      const pendingList = daftarPengajuan.filter(
        (p) => (p.status || 'PENDING').toUpperCase() === 'PENDING'
      );
      const indexInPending = pendingList.findIndex((p) => p.id_pengajuan === item.id_pengajuan);
      const noAntreanCurrent = indexInPending !== -1 ? indexInPending + 1 : 1;
      const estimasiMenit = noAntreanCurrent * 30;
      const estimasiText = estimasiMenit <= 60 ? `Sekitar ${estimasiMenit} menit` : `Sekitar ${Math.floor(estimasiMenit / 60)} jam kerja`;

      const tglPengajuanFormatted = item.tanggal_pengajuan || item.created_at
        ? new Date(item.tanggal_pengajuan || item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : '-';

      const statusCardPayload: StatusDetailData = {
        type: 'surat',
        id_tiket: item.id_pengajuan,
        nama_layanan: item.nama_surat,
        status: item.status || 'PENDING',
        tanggal_pengajuan: tglPengajuanFormatted,
        email_warga: item.email_warga,
        posisi_antrean: noAntreanCurrent,
        total_antrean: pendingList.length,
        estimasi_selesai: estimasiText,
        catatan_desa: item.catatan_desa || item.catatan_admin || item.alasan_penolakan || '',
        nama_desa: alamatWarga.desa,
      };

      return {
        text: `Berikut detail status permohonan Anda:`,
        statusCardData: statusCardPayload,
      };
    } else {
      let listAspirasi: any[] = [];
      try {
        const res = await apiService.getAspirasi();
        if (res && res.success && Array.isArray(res.data)) {
          listAspirasi = res.data;
        }
      } catch (e) {
        const storedKec = JSON.parse(localStorage.getItem('svara_kecamatan_data') || '{}');
        listAspirasi = storedKec?.aspirasi_warga || [];
      }

      const item = listAspirasi.find((a) => a.id_aspirasi === code);

      if (!item) return { text: 'Data aspirasi warga tidak ditemukan.' };

      const tglAspirasiFormatted = item.tanggal || item.created_at
        ? new Date(item.tanggal || item.created_at).toLocaleDateString('id-ID')
        : '-';

      const statusCardPayload: StatusDetailData = {
        type: 'aspirasi',
        id_tiket: item.id_aspirasi,
        nama_layanan: item.judul || 'Aspirasi Warga',
        kategori: item.kategori,
        status: item.status || 'Menunggu',
        tanggal_pengajuan: tglAspirasiFormatted,
        catatan_desa: item.catatan_desa || item.tanggapan || '',
        nama_desa: alamatWarga.desa,
      };

      return {
        text: `Berikut detail status permohonan Anda:`,
        statusCardData: statusCardPayload,
      };
    }
  }

  // 6. CEK ANTREAN & STATUS SURAT / ASPIRASI UMUM
  if (
    lower.includes('status & antrean') ||
    lower.includes('status surat') ||
    lower.includes('cek status') ||
    lower.includes('informasi status') ||
    lower.includes('cek antrian') ||
    lower.includes('cek antrean') ||
    lower.includes('estimasi surat') ||
    lower.includes('progres surat') ||
    textToSend === 'LIHAT_SEMUA_STATUS' ||
    lower === '5. cek status pengajuan & laporan warga'
  ) {
    let daftarPengajuan: any[] = currentDesa?.daftar_pengajuan || [];
    let listAspirasi: any[] = [];

    try {
      const [resSurat, resAspirasi] = await Promise.all([
        apiService.getPengajuanSurat().catch(() => null),
        apiService.getAspirasi().catch(() => null),
      ]);

      if (resSurat && resSurat.success && Array.isArray(resSurat.data)) {
        daftarPengajuan = resSurat.data;
      }
      if (resAspirasi && resAspirasi.success && Array.isArray(resAspirasi.data)) {
        listAspirasi = resAspirasi.data;
      }
    } catch (e) {
      const storedKec = JSON.parse(localStorage.getItem('svara_kecamatan_data') || '{}');
      listAspirasi = storedKec?.aspirasi_warga || [];
    }

    const rawOptions: StatusOptionItem[] = [];

    daftarPengajuan.forEach((p) => {
      rawOptions.push({
        id: p.id_pengajuan,
        type: 'surat',
        title: p.nama_surat,
        status: p.status || 'PENDING',
        code: `TIKET: ${p.id_pengajuan}`,
      });
    });

    listAspirasi.forEach((a) => {
      rawOptions.push({
        id: a.id_aspirasi,
        type: 'aspirasi',
        title: a.judul || a.kategori || 'Aspirasi Warga',
        status: a.status || 'Menunggu',
        code: `ASPIRASI: ${a.id_aspirasi}`,
      });
    });

    if (rawOptions.length === 0) {
      const emptyCardData: StatusDetailData = {
        type: 'surat',
        id_tiket: 'KOSONG',
        nama_layanan: 'Belum Ada Permohonan Aktif',
        status: 'KOSONG',
        catatan_desa: `Belum ada riwayat pengajuan surat atau aspirasi atas nama Anda di Desa ${alamatWarga.desa}.`,
        nama_desa: alamatWarga.desa,
      };

      return {
        text: `Berikut status riwayat permohonan Anda di Desa **${alamatWarga.desa}**:`,
        statusCardData: emptyCardData,
      };
    }

    if (rawOptions.length === 1) {
      const singleItem = rawOptions[0];
      return await processChatMessage(singleItem.code, namaWarga, alamatWarga, currentDesa, templatesDesa, userRole);
    }

    const sortedOptions = [...rawOptions].sort((a, b) => {
      const isAPending = a.status.toUpperCase() === 'PENDING' || a.status.toUpperCase() === 'MENUNGGU';
      const isBPending = b.status.toUpperCase() === 'PENDING' || b.status.toUpperCase() === 'MENUNGGU';

      if (isAPending && !isBPending) return -1;
      if (!isAPending && isBPending) return 1;
      return 0;
    });

    const showAll = textToSend === 'LIHAT_SEMUA_STATUS';
    const LIMIT = 3;
    const finalOptions = showAll ? sortedOptions : sortedOptions.slice(0, LIMIT);
    const hasMore = sortedOptions.length > LIMIT && !showAll;

    let replyMulti = `**PILIH TIKET STATUS PENGAJUAN / ASPIRASI**\n\n`;
    if (showAll) {
      replyMulti += `Menampilkan seluruh **${sortedOptions.length} tiket riwayat** Anda:`;
    } else {
      replyMulti += `Ditemukan **${sortedOptions.length} tiket aktif/riwayat** atas nama Anda. Menampilkan ${finalOptions.length} tiket prioritas:`;
    }

    return {
      text: replyMulti,
      statusListOptions: finalOptions,
      totalStatusCount: sortedOptions.length,
      hasMoreStatus: hasMore,
    };
  }

  // 7. PENGUMUMAN & AGENDA DESA
  if (
    lower.includes('pengumuman & agenda') ||
    lower.includes('pengumuman desa') ||
    lower.includes('agenda desa') ||
    lower.includes('kegiatan desa') ||
    lower.includes('poster') ||
    lower.includes('pengumuman ada apa saja') ||
    lower === '6. pengumuman & agenda desa terbaru'
  ) {
    let rawPengumumanList: any[] = [];

    try {
      const res = await apiService.getPengumuman();
      if (res && res.success && Array.isArray(res.data)) {
        rawPengumumanList = res.data;
      }
    } catch (e) {
      const storedKec = JSON.parse(localStorage.getItem('svara_kecamatan_data') || 'null') ||
                        JSON.parse(localStorage.getItem('kecamatan_app_data') || '{}');

      const activeDesaFromStorage = storedKec?.desa_kelurahan?.find((d: any) => 
        (d.nama_desa_kelurahan || d.nama || '').toLowerCase().includes((alamatWarga.desa || '').toLowerCase())
      );

      rawPengumumanList = 
        storedKec?.pengumuman_desa?.length > 0
          ? storedKec.pengumuman_desa
          : currentDesa?.pengumuman_desa?.length > 0
          ? currentDesa.pengumuman_desa
          : currentDesa?.pengumuman?.length > 0
          ? currentDesa.pengumuman
          : activeDesaFromStorage?.pengumuman_desa?.length > 0
          ? activeDesaFromStorage.pengumuman_desa
          : activeDesaFromStorage?.pengumuman?.length > 0
          ? activeDesaFromStorage.pengumuman
          : JSON.parse(localStorage.getItem('svara_pengumuman_desa') || '[]');
    }

    const pengumumanDesaIni = rawPengumumanList.filter((item: any) => {
      if (!item?.desa) return true;
      const itemDesa = item.desa.toLowerCase().replace(/desa|kelurahan/g, '').trim();
      const targetDesa = (alamatWarga.desa || '').toLowerCase().replace(/desa|kelurahan/g, '').trim();
      return itemDesa === '' || itemDesa.includes(targetDesa) || targetDesa.includes(itemDesa);
    });

    if (pengumumanDesaIni && pengumumanDesaIni.length > 0) {
      let replyPengumuman = `Berikut **${pengumumanDesaIni.length} pengumuman & agenda kegiatan resmi** dari Pemerintah Desa **${alamatWarga.desa}**:\n\n`;

      pengumumanDesaIni.forEach((p: any, idx: number) => {
        const judul = p.judul || p.judul_pengumuman || 'Pengumuman Desa';
        const tgl = p.tanggal_info || p.tanggal_kegiatan || p.tanggal || 'Terbaru';
        const isi = p.isi || p.isi_pengumuman || p.deskripsi || '-';
        replyPengumuman += `${idx + 1}. **${judul}** (${tgl})\n   ${isi}\n\n`;
      });

      return { 
        text: replyPengumuman,
        showPengumumanCard: true,
      };
    }

    return {
      text: `Berikut pengumuman dan agenda kegiatan resmi dari Pemerintah Desa **${alamatWarga.desa}**:`,
      showPengumumanCard: true,
    };
  }

  // 8. INFORMASI PEJABAT (KADES & SEKDES SAJA)
  const isTanyaKades = lower.includes('kades') || lower.includes('kepala desa');
  const isTanyaSekdes = lower.includes('sekdes') || lower.includes('sekretaris desa');

  if (isTanyaKades) {
    return { 
      text: `Berikut profil Kepala Desa **${alamatWarga.desa}**:`,
      showAparaturCard: true,
      targetPejabat: 'kades',
    };
  }

  if (isTanyaSekdes) {
    return { 
      text: `Berikut profil Sekretaris Desa **${alamatWarga.desa}**:`,
      showAparaturCard: true,
      targetPejabat: 'sekdes',
    };
  }

  // 9. FORM ASPIRASI
  if (
    lower.includes('aspirasi') ||
    lower.includes('pengaduan') ||
    lower.includes('lapor') ||
    lower.includes('sampaikan aspirasi')
  ) {
    return {
      text: `**FORMULIR ASPIRASI & PENGADUAN WARGA**\n\nSilakan isi formulir di bawah ini untuk menyampaikan aduan atau masukan publik ke Pemerintah Desa **${alamatWarga.desa}**:`,
      isAspirasiForm: true,
    };
  }

  // 10. MATCHING SURAT UNTUK FORMULIR
  const inputClean = lower.replace('ajukan', '').trim();
  const matchedTemplate = templatesDesa.find((t) => {
    const namaLower = (t.nama_surat || '').toLowerCase();
    const kodeLower = (t.kode_surat || '').toLowerCase();

    return (
      namaLower === inputClean ||
      kodeLower === inputClean ||
      (inputClean.length >= 3 && namaLower.includes(inputClean)) ||
      (lower.includes('sktm') && namaLower.includes('sktm')) ||
      (lower.includes('sku') && namaLower.includes('sku'))
    );
  });

  if (matchedTemplate && lower.includes('ajukan')) {
    return {
      text: `**FORMULIR PENGAJUAN ONLINE - ${matchedTemplate.nama_surat.toUpperCase()}**\n\nBerikut formulir pengajuan resmi Kantor Desa **${alamatWarga.desa}**. Silakan isi data berikut:`,
      templateData: matchedTemplate,
    };
  }

  // 11. FALLBACKS KE BACKEND EXPRESS MYSQL CHAT AI
  try {
    const apiKey = localStorage.getItem('svara_gemini_api_key') || '';
    const storedUserRaw = localStorage.getItem('user');
    const userObj = storedUserRaw ? JSON.parse(storedUserRaw) : { nama: namaWarga };

    const backendRes = await apiService.sendAiChat(textToSend, userObj, apiKey);
    if (backendRes && backendRes.success && backendRes.reply) {
      return { text: backendRes.reply };
    }
  } catch (err) {
    console.warn('Backend API offline / error, fallback ke Gemini direct:', err);
  }

  const kadesName = currentDesa?.nama_kepala_desa_lurah || currentDesa?.kades || 'H. Ahmad Subagja';
  const sekdesName = currentDesa?.nama_sekdes || 'Bpk. Mulyadi';
  const jamOperasional = currentDesa?.jam_operasional || 'Senin - Jumat (08:00 - 15:00 WIB)';
  const alamatKantor = currentDesa?.alamat_kantor || `Jl. Raya Desa ${alamatWarga.desa} No. 01`;
  const kontakKantor = currentDesa?.nomor_kontak || currentDesa?.kontak_desa || '0812-3456-7890';
  const emailResmi = currentDesa?.email_resmi || `desa.${alamatWarga.desa.toLowerCase().replace(/\s+/g, '')}@siwarga.go.id`;

  const contextInfo = `
IDENTITAS & PERAN AI:
Anda adalah "Svara AI", Asisten Digital Resmi Pelayanan Publik Desa ${alamatWarga.desa} untuk Warga.
Karakter Anda: Ramah, komunikatif, solutif, dan taat aturan privasi data.

IDENTITAS WARGA SAAT INI:
- Nama Lengkap Warga: ${namaWarga || 'Warga'}
- Wilayah Domisili Terdaftar: RT ${displayUserRT} / RW ${displayUserRW} (${alamatWarga.dusun || 'Dusun 1'}), Desa ${alamatWarga.desa}

DATA UMUM KANTOR DESA YANG BOLEH DIPUBLIKASIKAN:
- Kepala Desa: ${kadesName}
- Sekretaris Desa: ${sekdesName}
- Alamat Kantor Desa: ${alamatKantor}
- Jam Operasional Kantor: ${jamOperasional}
- Kontak WA / Phone Resmi: ${kontakKantor}
- Email Resmi: ${emailResmi}

ATURAN MUTLAK BATASAN TOPIK (STRICT DOMAIN CONSTRAINT):
1. Anda HANYA BISA membantu hal-hal yang berkaitan dengan pelayanan publik dan informasi Desa ${alamatWarga.desa}.
2. JIKA pengguna meminta hal di luar topik desa (seperti membuat kode kodingan/Python, matematika, tugas sekolah, obrolan umum di luar desa, dsb), Anda WAJIB MENOLAK secara sopan dengan respon persis seperti berikut:
"Mohon maaf, sebagai asisten resmi Desa Mertapada Wetan, saya hanya dapat membantu Anda terkait layanan administrasi, pengumuman, aspirasi, dan informasi seputar desa."
3. DILARANG KERAS menjawab soal pemrograman, matematika, tugas sekolah, atau hal di luar desa.

BATASAN HAK AKSES ROLE: MODE WARGA (RESTRICTED ACCESS)
- Memiliki akses terbatas HANYA untuk layanan publik dan data miliknya sendiri.
- WARGA INI TERDAFTAR DI RT ${displayUserRT} / RW ${displayUserRW}. DILARANG KERAS memberikan seluruh daftar RT/RW desa lain jika warga ini menanyakan lokasi domisili/pengurusnya. Sebutkan spesifik bahwa dia berada di RT ${displayUserRT} / RW ${displayUserRW}.
- FITUR YANG DIIZINKAN UNTUK WARGA:
  * Informasi Tab RT/RW (Struktur dan info wilayah domisili sendiri).
  * Layanan Administrasi (Petunjuk dan pengajuan surat).
  * Pengumuman Desa (Melihat pengumuman publik).
  * Status Bansos & DTKS (Mengecek kepesertaan bansos dan E-Tiket antrean).
  * Persetujuan & Status Surat (HANYA melihat riwayat/status surat milik akun warga yang sedang login).
  * Aspirasi Warga (HANYA melihat dan mengajukan aspirasi dari akun warga yang sedang login).
- LARANGAN KERAS:
  * AI DILARANG memberikan data milik warga lain (NIK, nama warga lain, pengajuan surat orang lain, atau aduan orang lain) atau data sensitif internal desa kepada pengguna dengan role Warga.
  * Jika warga menanyakan jumlah penduduk / data rekapitulasi desa, tolak secara sopan dan arahkan datang langsung ke kantor desa.
  * DILARANG KERAS menggunakan teks placeholder seperti "[Masukkan Jumlah Total Penduduk...]" atau mengira-ngira/halusinasi angka populasi desa.
  * TUGAS UTAMA ANDA UNTUK WARGA:
    Membantu informasi pengajuan surat online, tata cara permohonan layanan, cek tiket milik sendiri, cek bansos & DTKS, jadwal kantor desa, dan menyampaikan aspirasi publik.
  `.trim();

  const aiReplyText = await callGeminiWithFailover(textToSend, contextInfo);
  return { text: aiReplyText };
};