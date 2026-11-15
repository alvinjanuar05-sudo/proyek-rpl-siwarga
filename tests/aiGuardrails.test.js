const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// Impor modul guardrails domain AI resmi
const { PENOLAKAN_RESMI, offTopicPatterns } = require(path.join(__dirname, '../siwarga-backend/constants/aiGuardrails.js'));

describe('1. AI Strict Domain Guardrails Tests (Offline Suite)', () => {

  it('Konstanta PENOLAKAN_RESMI harus terdefinisi dan memuat identitas Desa Mertapada Wetan', () => {
    assert.ok(PENOLAKAN_RESMI, 'PENOLAKAN_RESMI tidak boleh kosong');
    assert.strictEqual(typeof PENOLAKAN_RESMI, 'string');
    assert.match(PENOLAKAN_RESMI, /Mertapada Wetan/i, 'Pesan penolakan harus mencantumkan nama Desa Mertapada Wetan');
  });

  it('Daftar offTopicPatterns harus berupa array regular expression yang valid', () => {
    assert.ok(Array.isArray(offTopicPatterns), 'offTopicPatterns harus berupa array');
    assert.ok(offTopicPatterns.length >= 8, 'offTopicPatterns harus memiliki minimal 8 pola filter pembatasan');
    offTopicPatterns.forEach((pattern) => {
      assert.ok(pattern instanceof RegExp, 'Setiap elemen offTopicPatterns harus bertipe RegExp');
    });
  });

  describe('Pengujian Penolakan Topik di Luar Domain Desa (Off-Topic Detection)', () => {
    const prohibitedQueries = [
      { prompt: 'Tolong buatkan kode python untuk kalkulator sederhana', category: 'Pemrograman / Koding' },
      { prompt: 'Bagaimana cara install react dan tailwind css via npm install?', category: 'Software Development' },
      { prompt: 'Tolong ajari algoritma binary search dan sql query', category: 'Ilmu Komputer' },
      { prompt: 'Hitunglah integral dari persamaan 3x^2 + 4x dx', category: 'Matematika Akademik' },
      { prompt: 'Tolong bantu selesaikan pr matematika dan fisika saya', category: 'Pekerjaan Rumah / PR' },
      { prompt: 'Buatkan puisi romantis tentang senja di pantai', category: 'Karya Sastra Umum' },
      { prompt: 'Siapa presiden amerika serikat saat perang dunia ke 2?', category: 'Politik / Sejarah Global' },
      { prompt: 'Berikan resep masakan rendang padang dan cara memasak kue', category: 'Kuliner / Umum' },
      { prompt: 'Bagaimana ramalan zodiak leo untuk hari ini?', category: 'Horoskop / Hiburan' }
    ];

    prohibitedQueries.forEach(({ prompt, category }) => {
      it(`Harus mendeteksi dan menolak pertanyaan kategori [${category}]: "${prompt}"`, () => {
        const isOffTopic = offTopicPatterns.some((pattern) => pattern.test(prompt));
        assert.strictEqual(isOffTopic, true, `Prompt kategori ${category} seharusnya terdeteksi off-topic`);
      });
    });
  });

  describe('Pengujian Persetujuan Topik Resmi Administrasi Desa (On-Topic Approval)', () => {
    const validQueries = [
      'Bagaimana syarat dan cara membuat Surat Keterangan Tidak Mampu (SKTM) untuk beasiswa kuliah?',
      'Kapan jadwal pencairan bantuan sosial BLT-DD di Desa Mertapada Wetan?',
      'Saya ingin menyampaikan aspirasi perbaikan lampu jalan umum di wilayah RT 02 RW 01',
      'Siapakah nama Kuwu atau Kepala Desa Mertapada Wetan saat ini?',
      'Di mana alamat kantor balai desa dan jam operasional pelayanan surat?',
      'Bagaimana prosedur mengurus Surat Keterangan Usaha (SKU) bagi UMKM warga?',
      'Apakah ada pengumuman kegiatan posyandu dan vaksinasi balita bulan ini?'
    ];

    validQueries.forEach((prompt) => {
      it(`Harus mengizinkan pertanyaan administrasi desa resmi: "${prompt.slice(0, 45)}..."`, () => {
        const isOffTopic = offTopicPatterns.some((pattern) => pattern.test(prompt));
        assert.strictEqual(isOffTopic, false, 'Pertanyaan seputar desa tidak boleh ditolak oleh guardrails');
      });
    });
  });

});
