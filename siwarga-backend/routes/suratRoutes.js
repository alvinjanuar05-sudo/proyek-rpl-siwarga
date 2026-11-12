const express = require('express');
const router = express.Router();
const suratController = require('../controllers/suratController');
const { verifyAuth, requireAdmin } = require('../middlewares/authMiddleware');

// ----------------------------------------------------
// 1. Rute Warga Terotentikasi (Buat & Unduh Surat)
// ----------------------------------------------------
router.post('/', verifyAuth, suratController.createPengajuan);
router.get('/:id/download', verifyAuth, suratController.downloadSurat);

// ----------------------------------------------------
// 2. Rute Khusus Admin Desa (Kelola, Setujui & Hapus Surat)
// ----------------------------------------------------
router.get('/', verifyAuth, requireAdmin, suratController.getAllPengajuan);
router.put('/:id', verifyAuth, requireAdmin, suratController.handleUpdateStatusPengajuan);
router.put('/:id/approve', verifyAuth, requireAdmin, suratController.approvePengajuan);
router.delete('/:id', verifyAuth, requireAdmin, suratController.deletePengajuan);

module.exports = router;