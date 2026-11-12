const express = require('express');
const router = express.Router();
const aparaturController = require('../controllers/aparaturController');
const { verifyAuth, requireAdmin } = require('../middlewares/authMiddleware');

// ----------------------------------------------------
// 1. Rute Warga (Melihat Daftar Aparatur Desa)
// ----------------------------------------------------
router.get('/', verifyAuth, aparaturController.getAllAparatur);

// ----------------------------------------------------
// 2. Rute Khusus Admin Desa (Kelola Aparatur)
// ----------------------------------------------------
router.post('/', verifyAuth, requireAdmin, aparaturController.createAparatur);
router.put('/:id', verifyAuth, requireAdmin, aparaturController.updateAparatur);
router.put('/', verifyAuth, requireAdmin, aparaturController.updateAparatur);
router.delete('/:id', verifyAuth, requireAdmin, aparaturController.deleteAparatur);

module.exports = router;