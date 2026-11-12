const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyAuth, requireAdmin, requireSuperAdmin } = require('../middlewares/authMiddleware');

// =========================================================================
// 🎯 RUTE SUPER ADMIN PUSAT (MANAJEMEN SELURUH AKUN & RESET PASSWORD)
// =========================================================================
router.get('/all-system', verifyAuth, requireSuperAdmin, userController.getAllSystemUsers);
router.put('/:id/reset-password', verifyAuth, requireSuperAdmin, userController.adminResetPassword);

// =========================================================================
// 🎯 RUTE ADMIN DESA (MANAJEMEN AKUN & VERIFIKASI WARGA)
// =========================================================================
router.get('/', verifyAuth, requireAdmin, userController.getAllUsers);
router.put('/:id/status', verifyAuth, requireAdmin, userController.updateUserStatus);
router.delete('/:id', verifyAuth, requireAdmin, userController.deleteUser);

// =========================================================================
// 🎯 RUTE PENGATURAN AKUN & PRIVASI WARGA (SELF-SERVICE)
// =========================================================================

// 1. Update data profil kependudukan & kontak (Email, HP, Dusun, Alamat)
router.put('/:id/profile', verifyAuth, userController.updateUserProfile);

// 2. Update preferensi notifikasi warga (Email & Pengumuman)
router.put('/:id/preferences', verifyAuth, userController.updateNotificationPreferences);

// 3. Ambil riwayat log aktivitas warga
router.get('/:id/activity', verifyAuth, userController.getActivityLog);

// 4. Ambil daftar sesi perangkat aktif warga
router.get('/:id/sessions', verifyAuth, userController.getUserSessions);

module.exports = router;