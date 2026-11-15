const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Cari modul bcryptjs dari subfolder backend secara aman
let bcrypt;
try {
  bcrypt = require(path.join(__dirname, '../siwarga-backend/node_modules/bcryptjs'));
} catch (e) {
  try {
    bcrypt = require('bcryptjs');
  } catch (err) {
    bcrypt = null;
  }
}

describe('2. Security, Architecture & Data Integrity Tests (Offline Suite)', () => {

  describe('A. Bcryptjs Cryptographic Password Hashing Tests', () => {
    it('Modul bcryptjs harus terpasang dan dapat diakses', () => {
      assert.ok(bcrypt, 'bcryptjs harus terpasang di siwarga-backend/node_modules/bcryptjs');
      assert.strictEqual(typeof bcrypt.hash, 'function');
      assert.strictEqual(typeof bcrypt.compare, 'function');
    });

    it('Harus menghasilkan hash satu arah berstandar Bcrypt ($2a$ atau $2b$) dengan salt rounds 10', async () => {
      const plaintextPassword = 'KataSandiRahasiaDesa2026!';
      const hash = await bcrypt.hash(plaintextPassword, 10);

      assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Hash harus diawali tanda pengenal versi Bcrypt ($2a$ / $2b$)');
      assert.strictEqual(hash.length, 60, 'Panjang string hash Bcrypt standar harus tepat 60 karakter');
      assert.notStrictEqual(hash, plaintextPassword, 'Password tidak boleh tersimpan dalam teks mentah');
    });

    it('Harus berhasil memvalidasi kecocokan kata sandi yang benar dan menolak kata sandi yang salah', async () => {
      const passwordAsli = 'AdminMertapadaWetan#2026';
      const passwordSalah = 'AdminMertapadaWetan#Salah';
      const hash = await bcrypt.hash(passwordAsli, 10);

      const isMatchValid = await bcrypt.compare(passwordAsli, hash);
      const isMatchInvalid = await bcrypt.compare(passwordSalah, hash);

      assert.strictEqual(isMatchValid, true, 'Bcrypt compare harus menghasilkan TRUE untuk password yang cocok');
      assert.strictEqual(isMatchInvalid, false, 'Bcrypt compare harus menghasilkan FALSE untuk password yang salah');
    });
  });

  describe('B. Backend Routes & Controllers Architecture Verification', () => {
    const backendRoot = path.join(__dirname, '../siwarga-backend');

    const expectedRoutes = [
      'authRoutes.js',
      'suratRoutes.js',
      'templateRoutes.js',
      'aspirasiRoutes.js',
      'userRoutes.js',
      'pengumumanRoutes.js',
      'notifikasiRoutes.js',
      'aparaturRoutes.js',
      'desaRoutes.js',
      'bansosRoutes.js',
      'bansosPengajuanRoutes.js',
      'aiRoutes.js',
      'index.js'
    ];

    expectedRoutes.forEach((routeFile) => {
      it(`File rute backend harus tersedia di disk: [routes/${routeFile}]`, () => {
        const filePath = path.join(backendRoot, 'routes', routeFile);
        assert.ok(fs.existsSync(filePath), `Berkas routes/${routeFile} tidak ditemukan`);
      });
    });

    const expectedControllers = [
      'authController.js',
      'suratController.js',
      'templateController.js',
      'aspirasiController.js',
      'userController.js',
      'pengumumanController.js',
      'notifikasiController.js',
      'aparaturController.js',
      'desaController.js',
      'bansosController.js',
      'bansosPengajuanController.js',
      'aiController.js'
    ];

    expectedControllers.forEach((ctrlFile) => {
      it(`File controller backend harus tersedia di disk: [controllers/${ctrlFile}]`, () => {
        const filePath = path.join(backendRoot, 'controllers', ctrlFile);
        assert.ok(fs.existsSync(filePath), `Berkas controllers/${ctrlFile} tidak ditemukan`);
      });
    });

    const criticalCoreFiles = [
      'server.js',
      'db.js',
      'middlewares/authMiddleware.js',
      'middlewares/errorHandler.js',
      'constants/aiGuardrails.js',
      'utils/documentGenerator.js',
      'utils/mailer.js'
    ];

    criticalCoreFiles.forEach((coreFile) => {
      it(`File core arsitektur backend harus ada: [${coreFile}]`, () => {
        const filePath = path.join(backendRoot, coreFile);
        assert.ok(fs.existsSync(filePath), `Berkas inti ${coreFile} tidak ditemukan`);
      });
    });
  });

  describe('C. NIK (Nomor Induk Kependudukan) Validation Logic', () => {
    // Fungsi validator 16-digit numerik NIK standar Dukcapil
    const validateNik = (nik) => {
      if (!nik || typeof nik !== 'string') return false;
      const clean = nik.trim();
      return /^\d{16}$/.test(clean);
    };

    it('Harus menerima format NIK 16 digit murni angka yang valid', () => {
      const validNiks = [
        '3209124508980001',
        '3209120101900002',
        '3274011504950003'
      ];
      validNiks.forEach((nik) => {
        assert.strictEqual(validateNik(nik), true, `NIK ${nik} seharusnya valid`);
      });
    });

    it('Harus menolak NIK yang kurang dari 16 digit, lebih dari 16 digit, atau mengandung karakter non-angka', () => {
      const invalidNiks = [
        '320912450898000',      // 15 digit (kurang)
        '32091245089800011',    // 17 digit (lebih)
        '320912450898000A',     // Mengandung huruf
        '32091245-0898-0001',   // Mengandung strip
        '',                     // String kosong
        null,                   // Null
        undefined               // Undefined
      ];
      invalidNiks.forEach((nik) => {
        assert.strictEqual(validateNik(nik), false, `NIK ${nik} seharusnya tidak valid`);
      });
    });
  });

});

