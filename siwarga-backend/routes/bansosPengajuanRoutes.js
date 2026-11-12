const express = require('express');
const router = express.Router();
const bansosPengajuanController = require('../controllers/bansosPengajuanController');
const { verifyAuth, requireAdmin } = require('../middlewares/authMiddleware');

// 1. Rute Khusus Admin Desa (Melihat, Verifikasi & Hapus Usulan)
router.get('/', verifyAuth, requireAdmin, bansosPengajuanController.getAllPengajuan);
router.put('/:id/verifikasi', verifyAuth, requireAdmin, bansosPengajuanController.updateStatusVerifikasi);
router.delete('/:id', verifyAuth, requireAdmin, bansosPengajuanController.deletePengajuan);

// 2. Rute Warga (Pengajuan Usulan Mandiri)
router.post('/', verifyAuth, bansosPengajuanController.createPengajuan);

module.exports = router;