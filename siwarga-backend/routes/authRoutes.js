const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rute Otentikasi Dasar
router.post('/login', authController.login);
router.post('/register', authController.register);

// Rute Pengaturan & Keamanan Kata Sandi
router.post('/verify-password', authController.verifyPassword);
router.put('/change-password', authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);

// Rute Keamanan Sesi & Privasi
router.post('/logout-all', authController.logoutAllDevices);

module.exports = router;