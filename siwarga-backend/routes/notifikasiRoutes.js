const express = require('express');
const router = express.Router();
const notifikasiController = require('../controllers/notifikasiController');
const { verifyAuth } = require('../middlewares/authMiddleware');

// ----------------------------------------------------
// Seluruh Rute Notifikasi Wajib Terotentikasi (verifyAuth)
// ----------------------------------------------------
router.get('/', verifyAuth, notifikasiController.getNotifikasi);
router.put('/:id/read', verifyAuth, notifikasiController.markAsRead);
router.put('/read-all', verifyAuth, notifikasiController.markAllAsRead);

// Rute Fitur Bersihkan & Hapus Notifikasi
router.delete('/clear-all', verifyAuth, notifikasiController.clearAllNotifikasi);
router.delete('/:id', verifyAuth, notifikasiController.deleteNotifikasi);

module.exports = router;