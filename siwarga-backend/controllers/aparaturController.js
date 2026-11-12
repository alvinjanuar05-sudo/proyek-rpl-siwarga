const db = require('../db');

// GET /api/aparatur
const getAllAparatur = async (req, res) => {
  try {
    let rows = [];
    try {
      const [data] = await db.query('SELECT * FROM aparatur_desa ORDER BY urutan ASC, id ASC');
      rows = data;
    } catch (e) {
      const [data] = await db.query('SELECT * FROM aparatur_desa');
      rows = data;
    }

    const formatted = rows.map((r) => ({
      ...r,
      id: r.id,
      id_aparatur: r.id,
      kontak: r.kontak || r.no_hp || '',
      no_hp: r.no_hp || r.kontak || '',
      tupoksi: r.tupoksi || r.keterangan || '',
      keterangan: r.keterangan || r.tupoksi || '',
      foto: r.foto || ''
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Error getAllAparatur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/aparatur
const createAparatur = async (req, res) => {
  const { 
    id,
    id_aparatur,
    id_desa, 
    nama, 
    jabatan, 
    no_hp, 
    kontak, 
    email, 
    keterangan, 
    tupoksi, 
    foto, 
    urutan 
  } = req.body;

  const idVal = id || id_aparatur || ('APR-' + Date.now());
  const targetDesa = id_desa || 'DESA-001';
  const phone = no_hp || kontak || null;
  const ket = keterangan || tupoksi || email || null;
  const urutanVal = urutan ? parseInt(urutan) : 1;

  try {
    await db.query(
      `INSERT INTO aparatur_desa (id, id_desa, nama, jabatan, kontak, no_hp, tupoksi, keterangan, foto, urutan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idVal, targetDesa, nama, jabatan, phone, phone, ket, ket, foto || null, urutanVal]
    );

    const [rows] = await db.query('SELECT * FROM aparatur_desa WHERE id = ?', [idVal]);
    const row = rows[0] || {};
    const formatted = {
      ...row,
      id: row.id || idVal,
      id_aparatur: row.id || idVal,
      kontak: row.kontak || row.no_hp || '',
      no_hp: row.no_hp || row.kontak || '',
      tupoksi: row.tupoksi || row.keterangan || '',
      keterangan: row.keterangan || row.tupoksi || '',
      foto: row.foto || ''
    };

    res.json({ 
      success: true, 
      message: 'Data aparatur berhasil disimpan!', 
      id: idVal,
      id_aparatur: idVal,
      data: formatted 
    });
  } catch (err) {
    console.error('Error create aparatur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/aparatur/:id or PUT /api/aparatur
const updateAparatur = async (req, res) => {
  const targetId = req.params.id || req.body.id || req.body.id_aparatur;
  if (!targetId) {
    return res.status(400).json({ success: false, message: 'ID aparatur diperlukan.' });
  }

  const { 
    id_desa, 
    nama, 
    jabatan, 
    no_hp, 
    kontak, 
    email, 
    keterangan, 
    tupoksi, 
    foto, 
    urutan 
  } = req.body;

  const phone = no_hp || kontak || null;
  const ket = keterangan || tupoksi || email || null;
  const urutanVal = urutan ? parseInt(urutan) : 1;

  try {
    const [existing] = await db.query('SELECT * FROM aparatur_desa WHERE id = ?', [targetId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Data aparatur tidak ditemukan.' });
    }

    const finalFoto = foto !== undefined ? foto : existing[0].foto;

    await db.query(
      `UPDATE aparatur_desa SET 
        nama = ?, 
        jabatan = ?, 
        kontak = ?, 
        no_hp = ?, 
        tupoksi = ?, 
        keterangan = ?, 
        foto = ?, 
        urutan = ?
       WHERE id = ?`,
      [
        nama || existing[0].nama, 
        jabatan || existing[0].jabatan, 
        phone !== null ? phone : existing[0].kontak, 
        phone !== null ? phone : existing[0].no_hp, 
        ket !== null ? ket : existing[0].tupoksi, 
        ket !== null ? ket : existing[0].keterangan, 
        finalFoto, 
        urutanVal, 
        targetId
      ]
    );

    const [rows] = await db.query('SELECT * FROM aparatur_desa WHERE id = ?', [targetId]);
    const row = rows[0] || {};
    const formatted = {
      ...row,
      id: row.id || targetId,
      id_aparatur: row.id || targetId,
      kontak: row.kontak || row.no_hp || '',
      no_hp: row.no_hp || row.kontak || '',
      tupoksi: row.tupoksi || row.keterangan || '',
      keterangan: row.keterangan || row.tupoksi || '',
      foto: row.foto || ''
    };

    res.json({ 
      success: true, 
      message: 'Data aparatur berhasil diperbarui!', 
      data: formatted 
    });
  } catch (err) {
    console.error('Error update aparatur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/aparatur/:id
const deleteAparatur = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM aparatur_desa WHERE id = ?', [id]);
    res.json({ success: true, message: 'Data aparatur berhasil dihapus!' });
  } catch (err) {
    console.error('Error delete aparatur:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAllAparatur,
  createAparatur,
  updateAparatur,
  deleteAparatur
};
