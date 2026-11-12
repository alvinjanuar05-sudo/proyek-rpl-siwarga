const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifyAuth, requireSuperAdmin } = require('../middlewares/authMiddleware');

// ----------------------------------------------------
// 1. Endpoint Chat AI (Wajib Terotentikasi agar Role Valid)
// ----------------------------------------------------
router.post('/chat', verifyAuth, aiController.chatAi);

// ----------------------------------------------------
// 2. Endpoint Konfigurasi & API Key AI (Khusus Super Admin)
// ----------------------------------------------------
router.get('/config/ai', verifyAuth, requireSuperAdmin, aiController.getAiConfig);
router.post('/config/ai', verifyAuth, requireSuperAdmin, aiController.updateAiConfig);

module.exports = router;