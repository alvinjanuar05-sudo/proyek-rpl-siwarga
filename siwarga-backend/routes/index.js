const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const suratRoutes = require('./suratRoutes');
const templateRoutes = require('./templateRoutes');
const aspirasiRoutes = require('./aspirasiRoutes');
const userRoutes = require('./userRoutes');
const pengumumanRoutes = require('./pengumumanRoutes');
const notifikasiRoutes = require('./notifikasiRoutes');
const aparaturRoutes = require('./aparaturRoutes');
const desaRoutes = require('./desaRoutes');
const aiRoutes = require('./aiRoutes');

// Rute Baru Modul Bansos & DTKS
const bansosRoutes = require('./bansosRoutes');
const bansosPengajuanRoutes = require('./bansosPengajuanRoutes');

// Masing-masing sub-router dipetakan ke prefix path-nya
router.use('/auth', authRoutes);
router.use('/pengajuan-surat', suratRoutes);
router.use('/template-surat', templateRoutes);
router.use('/aspirasi', aspirasiRoutes);
router.use('/users', userRoutes);
router.use('/pengumuman', pengumumanRoutes);
router.use('/notifikasi', notifikasiRoutes);
router.use('/aparatur', aparaturRoutes);
router.use('/desa', desaRoutes);

// Pemetaan Rute Baru Bansos & DTKS
router.use('/bansos', bansosRoutes);
router.use('/bansos-pengajuan', bansosPengajuanRoutes);

router.use('/', aiRoutes); // Menyediakan /chat dan /config/ai

module.exports = router;