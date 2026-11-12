const db = require('../db');

// GET /api/desa
const getProfilDesa = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM desa LIMIT 1');
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data profil desa belum ada.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/desa
const updateProfilDesa = async (req, res) => {
  const { 
    id_desa, 
    nama_desa_kelurahan, 
    nama_kecamatan, 
    nama_kabupaten, 
    nama_kepala_desa_lurah, 
    foto_kades,
    nama_sekdes, 
    foto_sekdes,
    alamat_kantor, 
    nomor_kontak,
    email_resmi
  } = req.body;

  const targetId = id_desa || 'DESA-001';

  try {
    const [existing] = await db.query('SELECT * FROM desa WHERE id_desa = ?', [targetId]);

    if (existing.length === 0) {
      await db.query(
        `INSERT INTO desa (id_desa, nama_desa_kelurahan, nama_kecamatan, nama_kabupaten, nama_kepala_desa_lurah, foto_kades, nama_sekdes, foto_sekdes, alamat_kantor, nomor_kontak, email_resmi)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          targetId, 
          nama_desa_kelurahan || 'Mertapada Wetan', 
          nama_kecamatan || 'Astanajapura', 
          nama_kabupaten || 'Kabupaten Cirebon', 
          nama_kepala_desa_lurah || '-', 
          foto_kades || null,
          nama_sekdes || '-', 
          foto_sekdes || null,
          alamat_kantor || '-', 
          nomor_kontak || '-',
          email_resmi || null
        ]
      );
    } else {
      const finalFotoKades = foto_kades !== undefined ? foto_kades : existing[0].foto_kades;
      const finalFotoSekdes = foto_sekdes !== undefined ? foto_sekdes : existing[0].foto_sekdes;

      await db.query(
        `UPDATE desa SET 
          nama_desa_kelurahan = ?, 
          nama_kecamatan = ?, 
          nama_kabupaten = ?, 
          nama_kepala_desa_lurah = ?, 
          foto_kades = ?,
          nama_sekdes = ?, 
          foto_sekdes = ?,
          alamat_kantor = ?, 
          nomor_kontak = ?,
          email_resmi = ?
         WHERE id_desa = ?`,
        [
          nama_desa_kelurahan || existing[0].nama_desa_kelurahan, 
          nama_kecamatan || existing[0].nama_kecamatan, 
          nama_kabupaten || existing[0].nama_kabupaten, 
          nama_kepala_desa_lurah || existing[0].nama_kepala_desa_lurah, 
          finalFotoKades,
          nama_sekdes || existing[0].nama_sekdes, 
          finalFotoSekdes,
          alamat_kantor || existing[0].alamat_kantor, 
          nomor_kontak || existing[0].nomor_kontak, 
          email_resmi !== undefined ? email_resmi : existing[0].email_resmi,
          targetId
        ]
      );
    }

    const [updatedRows] = await db.query('SELECT * FROM desa WHERE id_desa = ?', [targetId]);

    res.json({ 
      success: true, 
      message: 'Profil Desa berhasil diperbarui!', 
      data: updatedRows[0] || req.body 
    });
  } catch (err) {
    console.error('Error update profil desa:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/desa/rw
const getStrukturRwRt = async (req, res) => {
  try {
    const [rwRows] = await db.query('SELECT * FROM rw ORDER BY nomor_rw ASC');
    const [rtRows] = await db.query('SELECT * FROM rt ORDER BY nomor_rt ASC');

    const structuredData = rwRows.map((rw) => {
      const childRt = rtRows
        .filter((rt) => String(rt.id_rw) === String(rw.id))
        .map((rt) => ({
          nomor: rt.nomor_rt,
          ketua: rt.ketua_rt,
          kontak: rt.kontak,
          foto: rt.foto
        }));

      return {
        id: rw.id,
        nomor: rw.nomor_rw,
        ketua: rw.ketua_rw,
        kontak: rw.kontak,
        foto: rw.foto,
        rt: childRt
      };
    });

    res.json({ success: true, data: structuredData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/desa/rw
const updateStrukturRwRt = async (req, res) => {
  const { id_desa, rw } = req.body;
  const targetIdDesa = id_desa || 'DESA-001';
  const rwList = Array.isArray(rw) ? rw : [];

  try {
    console.log('🔄 Memproses simpan RT/RW ke tabel rw & rt MySQL...');

    await db.query('DELETE FROM rt WHERE id_desa = ?', [targetIdDesa]);
    await db.query('DELETE FROM rw WHERE id_desa = ?', [targetIdDesa]);

    for (const itemRw of rwList) {
      const [resultRw] = await db.query(
        `INSERT INTO rw (id_desa, nomor_rw, ketua_rw, kontak, foto)
         VALUES (?, ?, ?, ?, ?)`,
        [
          targetIdDesa,
          String(itemRw.nomor || ''),
          String(itemRw.ketua || ''),
          String(itemRw.kontak || ''),
          itemRw.foto || null
        ]
      );

      const insertedRwId = resultRw.insertId;

      const rtList = Array.isArray(itemRw.rt) ? itemRw.rt : [];
      for (const itemRt of rtList) {
        await db.query(
          `INSERT INTO rt (id_rw, id_desa, nomor_rt, ketua_rt, kontak, foto)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            insertedRwId,
            targetIdDesa,
            String(itemRt.nomor || ''),
            String(itemRt.ketua || ''),
            String(itemRt.kontak || ''),
            itemRt.foto || null
          ]
        );
      }
    }

    console.log('✅ SUKSES: Data RT/RW tersimpan rapi ke tabel rw dan rt!');
    res.json({ success: true, message: 'Data RT & RW berhasil tersimpan ke database MySQL!' });
  } catch (err) {
    console.error('❌ ERROR SQL SIMPAN RT/RW:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getProfilDesa,
  updateProfilDesa,
  getStrukturRwRt,
  updateStrukturRwRt
};
