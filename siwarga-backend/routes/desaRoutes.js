const express = require('express');
const router = express.Router();
const desaController = require('../controllers/desaController');
const aparaturController = require('../controllers/aparaturController');

// Catatan: Route /rw harus ditaruh sebelum / agar tidak bentrok jika ada parameter dinamis
router.get('/rw', desaController.getStrukturRwRt);
router.put('/rw', desaController.updateStrukturRwRt);

// Route /aparatur di bawah /api/desa untuk fleksibilitas (/api/desa/aparatur)
router.get('/aparatur', aparaturController.getAllAparatur);
router.post('/aparatur', aparaturController.createAparatur);
router.put('/aparatur/:id', aparaturController.updateAparatur);
router.put('/aparatur', aparaturController.updateAparatur);
router.delete('/aparatur/:id', aparaturController.deleteAparatur);

router.get('/', desaController.getProfilDesa);
router.put('/', desaController.updateProfilDesa);

module.exports = router;
