const db = require('../db');
const { PENOLAKAN_RESMI, offTopicPatterns } = require('../constants/aiGuardrails');

// POST /api/chat
const chatAi = async (req, res) => {
  const { message, apiKey } = req.body;
  // 🛡️ SANITASI KEAMANAN: Gunakan req.user dari verifyAuth (database), BUKAN dari req.body
  const authUser = req.user || {};

  // =========================================================================
  // 1. PEMBATASAN TOPIK DAN GUARDRAILS (STRICT DOMAIN CONSTRAINT)
  // AI Agent HANYA BISA membantu hal pelayanan publik & informasi Desa Mertapada Wetan.
  // =========================================================================
  if (offTopicPatterns.some((pattern) => pattern.test(message || ''))) {
    return res.json({
      success: true,
      reply: PENOLAKAN_RESMI
    });
  }

  const userRole = (authUser.role || '').toLowerCase();
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'super-admin';

  // Hanya Super Admin yang diizinkan menguji apiKey kustom lewat payload
  let effectiveApiKey = isSuperAdmin && apiKey && apiKey !== 'DUMMY_KEY' ? apiKey.trim() : null;
  let preferredModel = 'gemini-2.0-flash';

  try {
    const [configRows] = await db.query('SELECT api_key, model_default FROM ai_config LIMIT 1');
    if (configRows.length > 0) {
      if (!effectiveApiKey && configRows[0].api_key && configRows[0].api_key !== 'DUMMY_KEY') {
        effectiveApiKey = configRows[0].api_key.trim();
      }
      if (configRows[0].model_default) {
        preferredModel = configRows[0].model_default.trim();
      }
    }
  } catch (e) {
    console.warn('Gagal membaca ai_config dari DB:', e.message);
  }

  if (!effectiveApiKey) {
    return res.status(400).json({ 
      success: false, 
      message: 'API Key Gemini belum diatur di Super Admin!' 
    });
  }

  try {
    // =========================================================================
    // 2. PEMBATASAN HAK AKSES BERDASARKAN ROLE TERVERIFIKASI (RBAC)
    // Mode Admin: Full Access ke seluruh data sistem
    // Mode Warga: Restricted Access HANYA data miliknya sendiri & info publik
    // =========================================================================
    const isAdmin =
      userRole === 'admin' ||
      userRole === 'admin_desa' ||
      userRole === 'admin-desa' ||
      isSuperAdmin;
    const userNik = (authUser.nik || '').trim();
    const userEmail = (authUser.email || '').trim().toLowerCase();

    // 1. Fetch Profil Desa
    let desaInfo = {};
    try {
      const [desaRows] = await db.query('SELECT * FROM desa LIMIT 1');
      if (desaRows.length > 0) desaInfo = desaRows[0];
    } catch (e) {}

    const namaDesa = desaInfo.nama_desa_kelurahan || 'Mertapada Wetan';
    const namaKec = desaInfo.nama_kecamatan || 'Astanajapura';
    const namaKab = desaInfo.nama_kabupaten || 'Kabupaten Cirebon';
    const namaKades = desaInfo.nama_kepala_desa_lurah || '-';
    const namaSekdes = desaInfo.nama_sekdes || '-';
    const alamatKantor = desaInfo.alamat_kantor || '-';
    const kontakKantor = desaInfo.nomor_kontak || '-';

    // 2. Fetch Aparatur Desa (Publik)
    let aparaturRows = [];
    try {
      const [rows] = await db.query('SELECT * FROM aparatur_desa ORDER BY urutan ASC');
      aparaturRows = rows;
    } catch (e) {
      aparaturRows = [];
    }

    // 3. Fetch Pengumuman Publik Desa
    let pengumumanRows = [];
    try {
      const [rows] = await db.query('SELECT judul, kategori, tanggal_info, lokasi, isi FROM pengumuman_desa ORDER BY id_pengumuman DESC LIMIT 5');
      pengumumanRows = rows;
    } catch (e) {
      pengumumanRows = [];
    }

    // 4. Fetch Struktur RT & RW (Publik untuk Wilayah)
    let rwRows = [];
    let rtRows = [];
    try {
      const [rws] = await db.query('SELECT * FROM rw ORDER BY nomor_rw ASC');
      rwRows = rws;
    } catch (e) {}

    try {
      const [rts] = await db.query('SELECT * FROM rt ORDER BY nomor_rt ASC');
      rtRows = rts;
    } catch (e) {}

    // 5. Fetch Data Sensitif Sesuai Hak Akses Role
    let wargaRows = [];
    let pengajuanRows = [];
    let aspirasiRows = [];
    let statsSurat = { total: 0, pending: 0, approved: 0, rejected: 0 };
    let statsAspirasi = { total: 0, menunggu: 0, diproses: 0, selesai: 0, ditolak: 0 };

    if (isAdmin) {
      // MODE ADMIN: Akses Penuh
      try {
        const [wargas] = await db.query("SELECT nama, nik, nomor_rt, nomor_rw, status FROM users WHERE LOWER(role) = 'warga' OR role IS NULL LIMIT 100");
        wargaRows = wargas;
      } catch (e) {}

      try {
        const [suratAll] = await db.query(
          'SELECT id_pengajuan, nama_surat, nama_warga, email_warga, status, tanggal_pengajuan FROM pengajuan_surat ORDER BY created_at DESC LIMIT 20'
        );
        pengajuanRows = suratAll;

        const [suratStats] = await db.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN UPPER(status) = 'PENDING' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN UPPER(status) = 'APPROVED' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN UPPER(status) = 'REJECTED' THEN 1 ELSE 0 END) as rejected
          FROM pengajuan_surat
        `);
        if (suratStats.length > 0) {
          statsSurat = {
            total: suratStats[0].total || 0,
            pending: suratStats[0].pending || 0,
            approved: suratStats[0].approved || 0,
            rejected: suratStats[0].rejected || 0,
          };
        }
      } catch (e) {}

      try {
        const [aspAll] = await db.query(
          'SELECT id_aspirasi, nama_warga, kategori, judul, status, lokasi, tanggal FROM aspirasi_warga ORDER BY tanggal DESC LIMIT 20'
        );
        aspirasiRows = aspAll;

        const [aspStats] = await db.query(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN LOWER(status) = 'menunggu' THEN 1 ELSE 0 END) as menunggu,
            SUM(CASE WHEN LOWER(status) = 'diproses' THEN 1 ELSE 0 END) as diproses,
            SUM(CASE WHEN LOWER(status) = 'selesai' THEN 1 ELSE 0 END) as selesai,
            SUM(CASE WHEN LOWER(status) = 'ditolak' THEN 1 ELSE 0 END) as ditolak
          FROM aspirasi_warga
        `);
        if (aspStats.length > 0) {
          statsAspirasi = {
            total: aspStats[0].total || 0,
            menunggu: aspStats[0].menunggu || 0,
            diproses: aspStats[0].diproses || 0,
            selesai: aspStats[0].selesai || 0,
            ditolak: aspStats[0].ditolak || 0,
          };
        }
      } catch (e) {}
    } else {
      // MODE WARGA: Akses Terbatas HANYA Milik Sendiri (Data Warga Lain Dikosongkan)
      wargaRows = [];

      try {
        if (userNik || userEmail) {
          const [mySurat] = await db.query(
            'SELECT id_pengajuan, nama_surat, status, catatan_admin, tanggal_pengajuan FROM pengajuan_surat WHERE (nik_warga = ? OR email_warga = ?) ORDER BY created_at DESC LIMIT 10',
            [userNik || null, userEmail || null]
          );
          pengajuanRows = mySurat;

          const [myAsp] = await db.query(
            'SELECT id_aspirasi, kategori, judul, status, catatan_desa, tanggal FROM aspirasi_warga WHERE (nik_warga = ? OR email_warga = ?) ORDER BY tanggal DESC LIMIT 10',
            [userNik || null, userEmail || null]
          );
          aspirasiRows = myAsp;
        }
      } catch (e) {}
    }

    // 6. Fetch Template Surat Resmi (Publik untuk informasi layanan surat)
    let templateSuratRows = [];
    try {
      const [tsRows] = await db.query(
        "SELECT id_template, nama_surat, kode_surat, tipe_struktur FROM template_surat WHERE status = 'Aktif' OR status IS NULL"
      );
      templateSuratRows = tsRows;
    } catch (e) {}

    let teksTemplateSurat = templateSuratRows.length > 0
      ? templateSuratRows.map(t => `- [${t.kode_surat}] ${t.nama_surat}`).join('\n')
      : 'Belum ada template surat aktif di database.';

    let teksAparatur = aparaturRows.length > 0 
      ? aparaturRows.map(a => {
          const hp = a.no_hp || a.kontak || a.telepon || '-';
          return `- ${a.nama} (Jabatan: ${a.jabatan}${hp !== '-' ? `, No. HP: ${hp}` : ''})`;
        }).join('\n')
      : 'Belum ada data aparatur desa tambahan.';

    let teksStrukturRTRW = '';
    if (rwRows.length === 0) {
      teksStrukturRTRW = 'Belum ada data pengurus RW/RT yang diinput.';
    } else {
      rwRows.forEach((rw) => {
        const rawRwNo = rw.nomor_rw || rw.nomor || rw.rw || '-';
        const rwClean = String(rawRwNo).replace(/^0+/, '') || '0';
        const ketuaRw = rw.ketua_rw || rw.ketua || '-';
        const kontakRw = rw.kontak || rw.no_hp || '-';

        teksStrukturRTRW += `\n* RW ${rawRwNo} (RW ${rwClean}) | Ketua RW: ${ketuaRw} | Kontak WA: ${kontakRw}\n`;

        const childRt = rtRows.filter((rt) => String(rt.id_rw) === String(rw.id) || String(rt.nomor_rw) === String(rawRwNo));
        childRt.forEach((rt) => {
          const rawRtNo = rt.nomor_rt || rt.nomor || rt.rt || '-';
          const ketuaRt = rt.ketua_rt || rt.ketua || '-';
          const kontakRt = rt.kontak || rt.no_hp || '-';
          teksStrukturRTRW += `  - RT ${rawRtNo} | Ketua RT: ${ketuaRt} | Kontak WA: ${kontakRt}\n`;
        });
      });
    }

    let teksWarga = '';
    if (isAdmin) {
      teksWarga = wargaRows.length > 0 
        ? `Total Warga Terdaftar: ${wargaRows.length} orang\nDetail Akun Warga:\n` + wargaRows.map(w => `- Nama: ${w.nama} | NIK: ${w.nik || '-'} | RT: ${w.nomor_rt} | RW: ${w.nomor_rw} | Status: ${w.status}`).join('\n')
        : 'Belum ada data warga terdaftar.';
    } else {
      teksWarga = 'AKSES DIBATASI: Rekapitulasi kependudukan dan NIK warga lain bersifat rahasia internal desa dan tidak boleh diberikan kepada role Warga.';
    }

    let teksPengajuanSurat = '';
    if (isAdmin) {
      teksPengajuanSurat = `Total Pengajuan Surat: ${statsSurat.total} (Pending: ${statsSurat.pending}, Disetujui: ${statsSurat.approved}, Ditolak: ${statsSurat.rejected})\n`;
      if (pengajuanRows.length > 0) {
        teksPengajuanSurat += 'Daftar Pengajuan Terbaru:\n' + pengajuanRows.map(p => 
          `- ID: ${p.id_pengajuan} | Surat: ${p.nama_surat} | Pemohon: ${p.nama_warga || p.email_warga || '-'} | Status: ${p.status}`
        ).join('\n');
      } else {
        teksPengajuanSurat += 'Belum ada data permohonan surat.';
      }
    } else {
      if (pengajuanRows.length > 0) {
        teksPengajuanSurat = `Riwayat Pengajuan Surat Milik Akun Anda Sendiri (${authUser.nama || 'Warga'}):\n` + pengajuanRows.map(p => 
          `- ID Tiket: ${p.id_pengajuan} | Surat: ${p.nama_surat} | Status: ${p.status}${p.catatan_admin ? ` (Catatan Petugas: ${p.catatan_admin})` : ''}`
        ).join('\n');
      } else {
        teksPengajuanSurat = 'Belum ada riwayat pengajuan surat atas nama akun Anda.';
      }
    }

    let teksAspirasi = '';
    if (isAdmin) {
      teksAspirasi = `Total Aspirasi Warga: ${statsAspirasi.total} (Menunggu: ${statsAspirasi.menunggu}, Diproses: ${statsAspirasi.diproses}, Selesai: ${statsAspirasi.selesai})\n`;
      if (aspirasiRows.length > 0) {
        teksAspirasi += 'Daftar Aspirasi Terbaru:\n' + aspirasiRows.map(a => 
          `- ID: ${a.id_aspirasi} | Kategori: ${a.kategori} | Judul: "${a.judul}" | Pelapor: ${a.nama_warga || '-'} | Status: ${a.status}`
        ).join('\n');
      } else {
        teksAspirasi += 'Belum ada data aspirasi warga.';
      }
    } else {
      if (aspirasiRows.length > 0) {
        teksAspirasi = `Riwayat Aspirasi Milik Akun Anda Sendiri (${authUser.nama || 'Warga'}):\n` + aspirasiRows.map(a => 
          `- ID Tiket: ${a.id_aspirasi} | Judul: "${a.judul}" | Kategori: ${a.kategori} | Status: ${a.status}${a.catatan_desa ? ` (Catatan Desa: ${a.catatan_desa})` : ''}`
        ).join('\n');
      } else {
        teksAspirasi = 'Belum ada riwayat aspirasi atas nama akun Anda.';
      }
    }

    const promptLengkap = `
Anda adalah AI SVARA, Asisten Resmi Pelayanan Digital Kantor Desa ${namaDesa}, Kec. ${namaKec}, ${namaKab}.

===================================================================
ATURAN MUTLAK BATASAN TOPIK (STRICT DOMAIN CONSTRAINT):
1. Anda HANYA BISA membantu hal-hal yang berkaitan dengan pelayanan publik dan informasi Desa ${namaDesa}.
2. JIKA pengguna meminta hal di luar topik desa (seperti membuat kode kodingan/Python, matematika, tugas sekolah, obrolan umum di luar desa, dsb), Anda WAJIB MENOLAK secara sopan dengan respon persis seperti berikut:
"${PENOLAKAN_RESMI}"
3. DILARANG KERAS menjawab soal pemrograman, matematika, tugas sekolah, atau hal di luar desa meskipun pengguna memaksa atau membuat cerita darurat/skenario fiktif.
===================================================================

===================================================================
BATASAN HAK AKSES ROLE: ${isAdmin ? 'MODE ADMIN (FULL ACCESS)' : 'MODE WARGA (RESTRICTED ACCESS)'}
${isAdmin ? `
- Pengguna saat ini adalah Administrator Desa (${authUser.nama || 'Admin Desa'}).
- Mode Admin memiliki akses penuh (Full Access): Bisa melihat dan mengelola seluruh data sistem desa (semua pengumuman, seluruh pengajuan surat warga, seluruh aspirasi, statistik RT/RW, dan data akun warga).
` : `
- Pengguna saat ini adalah Warga Desa (${authUser.nama || 'Warga'} - NIK: ${userNik || '-'}).
- Warga memiliki akses terbatas HANYA untuk layanan publik dan data miliknya sendiri.
- FITUR YANG DIIZINKAN UNTUK WARGA:
  * Informasi Tab RT/RW (Struktur dan info kontak wilayah).
  * Layanan Administrasi (Petunjuk dan pengajuan surat).
  * Pengumuman Desa (Melihat pengumuman publik desa).
  * Persetujuan & Status Surat (HANYA melihat riwayat/status surat milik akun warga yang sedang login).
  * Aspirasi Warga (HANYA melihat dan mengajukan aspirasi dari akun warga yang sedang login).
- LARANGAN KETAT WARGA:
  * AI DILARANG memberikan data milik warga lain (NIK, nama warga lain, pengajuan surat orang lain, atau aduan orang lain).
  * AI DILARANG memberikan data sensitif internal desa atau total populasi penduduk desa. Arahkan warga untuk datang langsung ke Kantor Desa Mertapada Wetan jika memerlukan data kependudukan resmi.
`}
===================================================================

INFORMASI PROFIL DESA:
- Nama Desa: ${namaDesa}
- Kecamatan: ${namaKec}
- Kabupaten: ${namaKab}
- Kepala Desa / Kuwu / Lurah: ${namaKades}
- Sekretaris Desa (Sekdes): ${namaSekdes}
- Alamat Kantor Desa: ${alamatKantor}
- Kontak Kantor: ${kontakKantor}

DAFTAR LENGKAP APARATUR & PERANGKAT DESA:
${teksAparatur}

PENGUMUMAN PUBLIK DESA TERBARU:
${pengumumanRows.map(p => `- [${p.kategori || 'Pengumuman'}] ${p.judul}: ${p.isi || ''}`).join('\n') || 'Tidak ada pengumuman.'}

DATA RESMI PENGURUS RT & RW (INFORMASI WILAYAH):
${teksStrukturRTRW}

DAFTAR TEMPLATE & JENIS LAYANAN SURAT RESMI:
${teksTemplateSurat}

DATA KEPENDUDUKAN:
${teksWarga}

DATA PERSETUJUAN & STATUS PENGAJUAN SURAT:
${teksPengajuanSurat}

DATA LAPORAN ASPIRASI & KELUHAN:
${teksAspirasi}

PERTANYAAN PENGGUNA (${authUser.nama || 'Pengguna'} - Role: ${authUser.role || 'WARGA'}): "${message}"

INSTRUKSI CARA MENJAWAB:
1. Selalu patuhi ATURAN MUTLAK BATASAN TOPIK. Jika di luar topik desa, langsung tolak dengan: "${PENOLAKAN_RESMI}".
2. Selalu patuhi HAK AKSES ROLE. Jika role Warga menanyakan data warga lain atau data internal desa, tolak secara sopan.
3. Jawablah secara singkat, ramah, sopan, dan terstruktur rapi dengan format markdown.
`;

    const candidateModels = Array.from(
      new Set([
        preferredModel || 'gemini-3.7-flash',
        'gemini-3.7-flash',
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-flash-lite-latest'
      ])
    );

    let responseText = null;

    for (const modelName of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${effectiveApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptLengkap }] }]
            })
          }
        );

        const data = await response.json();
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseText = data.candidates[0].content.parts[0].text;
          console.log(`✅ AI Berhasil merespon menggunakan model: ${modelName}`);
          break;
        } else if (data.error) {
          console.warn(`Model ${modelName} error (${data.error.code}): ${data.error.message}`);
        }
      } catch (e) {
        console.warn(`Gagal coba model ${modelName}, mencoba model selanjutnya...`);
      }
    }

    if (!responseText) {
      throw new Error('Semua model Gemini gagal merespon. Pastikan API Key di Super Admin valid.');
    }

    return res.json({ success: true, reply: responseText });

  } catch (err) {
    console.error('❌ Error pada Gemini Chat AI:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal memproses AI Chat.',
      error: err.message 
    });
  }
};

// GET /api/config/ai
const getAiConfig = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ai_config ORDER BY id DESC LIMIT 1');
    if (rows.length === 0) {
      return res.json({ 
        success: true, 
        data: { api_key: '', model_default: 'gemini-2.0-flash' } 
      });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/config/ai
const updateAiConfig = async (req, res) => {
  const { api_key, apiKey, model_default, model } = req.body;
  const finalKey = (api_key || apiKey || '').trim();
  const finalModel = (model_default || model || 'gemini-2.0-flash').trim();

  try {
    const [existing] = await db.query('SELECT * FROM ai_config LIMIT 1');
    if (existing.length === 0) {
      await db.query(
        'INSERT INTO ai_config (api_key, model_default) VALUES (?, ?)',
        [finalKey, finalModel]
      );
    } else {
      await db.query(
        'UPDATE ai_config SET api_key = ?, model_default = ? WHERE id = ?',
        [finalKey, finalModel, existing[0].id]
      );
    }

    res.json({ 
      success: true, 
      message: 'Konfigurasi AI berhasil disimpan ke database MySQL!',
      data: { api_key: finalKey, model_default: finalModel }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  chatAi,
  getAiConfig,
  updateAiConfig
};