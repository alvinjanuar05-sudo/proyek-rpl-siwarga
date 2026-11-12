const express = require('express');
const router = express.Router();
const pengumumanController = require('../controllers/pengumumanController');
const { verifyAuth, requireAdmin } = require('../middlewares/authMiddleware');

// ----------------------------------------------------
// 1. Rute Warga (Melihat Informasi & Pengumuman Desa)
// ----------------------------------------------------
router.get('/', verifyAuth, pengumumanController.getAllPengumuman);

// ----------------------------------------------------
// 2. Rute Khusus Admin Desa (Buat & Hapus Pengumuman)
// ----------------------------------------------------
router.post('/', verifyAuth, requireAdmin, pengumumanController.createPengumuman);
router.delete('/:id', verifyAuth, requireAdmin, pengumumanController.deletePengumuman);

module.exports = router;