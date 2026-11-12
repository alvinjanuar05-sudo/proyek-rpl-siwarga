const express = require('express');
const router = express.Router();
const bansosController = require('../controllers/bansosController');
const { verifyAuth, requireAdmin } = require('../middlewares/authMiddleware');

// ----------------------------------------------------
// 1. Rute Rekap & Klaim QR (Di atas rute dinamis /:id)
// ----------------------------------------------------
router.get('/export-rekap', verifyAuth, requireAdmin, bansosController.exportRekap);
router.post('/klaim-qr', verifyAuth, bansosController.klaimQr);

// ----------------------------------------------------
// 2. Rute Gelombang / Batching Kuota Harian
// ----------------------------------------------------
router.post('/batch/create', verifyAuth, requireAdmin, bansosController.createBatch);
router.get('/batch/active', verifyAuth, bansosController.getActiveBatch);

// ----------------------------------------------------
// 3. Rute Scanner Kamera QR Code & Impor Massal
// ----------------------------------------------------
router.post('/scan-pencairan', verifyAuth, requireAdmin, bansosController.scanPencairan);
router.post('/bulk-import', verifyAuth, requireAdmin, bansosController.bulkImport);

// ----------------------------------------------------
// 4. Rute Dasar CRUD Penerima Bansos
// ----------------------------------------------------
router.get('/', verifyAuth, requireAdmin, bansosController.getAllPenerima);
router.get('/cek/:nik', verifyAuth, bansosController.getPenerimaByNik);
router.post('/', verifyAuth, requireAdmin, bansosController.createPenerima);
router.put('/:id', verifyAuth, requireAdmin, bansosController.updatePenerima);
router.put('/:id/pencairan', verifyAuth, requireAdmin, bansosController.updateStatusPencairan);
router.delete('/:id', verifyAuth, requireAdmin, bansosController.deletePenerima);

module.exports = router;