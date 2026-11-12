const express = require('express');
const router = express.Router();
const aspirasiController = require('../controllers/aspirasiController');
const { verifyAuth, requireAdmin } = require('../middlewares/authMiddleware');

// ----------------------------------------------------
// 1. Rute Warga (Melihat & Mengirim Aspirasi)
// ----------------------------------------------------
router.get('/', verifyAuth, aspirasiController.getAllAspirasi);
router.post('/', verifyAuth, aspirasiController.createAspirasi);

// ----------------------------------------------------
// 2. Rute Khusus Admin Desa (Update Status & Hapus Aspirasi)
// ----------------------------------------------------
router.put('/:id/status', verifyAuth, requireAdmin, aspirasiController.updateStatusAspirasi);
router.delete('/:id', verifyAuth, requireAdmin, aspirasiController.deleteAspirasi);

module.exports = router;