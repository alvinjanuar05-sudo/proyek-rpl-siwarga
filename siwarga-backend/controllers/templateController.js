const db = require('../db');

const DEFAULT_TEMPLATES = [
  {
    id_template: 'TPL-001',
    id_desa: 'DESA-001',
    nama_surat: 'Surat Keterangan Tidak Mampu (SKTM)',
    kode_surat: '475 / SKTM / IX / 2026',
    tipe_struktur: 'multi_ortu_anak',
    field_ortu: ['nama_ortu', 'nik_ortu', 'no_kk_ortu', 'pekerjaan_ortu', 'penghasilan_ortu', 'alamat_ortu'],
    field_warga: ['nama_warga', 'nik_warga', 'no_kk_warga', 'tempat_tgl_lahir', 'sekolah_univ', 'keperluan'],
    custom_fields: [
      { id: 'cf-1', label: 'Upload Slip Gaji / Keterangan RT', type: 'file', section: 'lampiran', required: false },
      { id: 'cf-2', label: 'Jumlah Tanggungan Anak', type: 'number', section: 'orang_tua', required: true, placeholder: 'Contoh: 3' },
    ],
    status: 'Aktif'
  },
  {
    id_template: 'TPL-002',
    id_desa: 'DESA-001',
    nama_surat: 'Surat Keterangan Usaha (SKU)',
    kode_surat: '503 / SKU / IX / 2026',
    tipe_struktur: 'single',
    field_ortu: [],
    field_warga: ['nama_warga', 'nik_warga', 'no_hp', 'tempat_tgl_lahir', 'pekerjaan', 'alamat_warga', 'keperluan'],
    custom_fields: [
      { id: 'cf-sku-1', label: 'Nama Usaha / Toko', type: 'text', section: 'warga', required: true, placeholder: 'Contoh: Toko Kelontong Berkah' },
      { id: 'cf-sku-2', label: 'Alamat Tempat Usaha', type: 'text', section: 'warga', required: true },
    ],
    status: 'Aktif'
  }
];

const parseJsonField = (val) => {
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(val) ? val : [];
};

const formatTemplate = (tpl) => ({
  ...tpl,
  field_ortu: parseJsonField(tpl.field_ortu),
  field_warga: parseJsonField(tpl.field_warga),
  custom_fields: parseJsonField(tpl.custom_fields),
});

// GET /api/template-surat
const getAllTemplates = async (req, res) => {
  const { id_desa } = req.query;
  try {
    let query = 'SELECT * FROM template_surat';
    const params = [];
    if (id_desa) {
      query += ' WHERE id_desa = ?';
      params.push(id_desa);
    }
    query += ' ORDER BY id_template ASC';

    let [rows] = await db.query(query, params);

    // Auto-seed template bawaan jika tabel template_surat masih kosong
    if (rows.length === 0 && !id_desa) {
      let defaultDesaId = 'DESA-001';
      try {
        const [desas] = await db.query('SELECT id_desa FROM desa LIMIT 1');
        if (desas.length > 0) defaultDesaId = desas[0].id_desa;
      } catch (e) {}

      for (const tpl of DEFAULT_TEMPLATES) {
        await db.query(
          `INSERT INTO template_surat (id_template, id_desa, nama_surat, kode_surat, tipe_struktur, field_ortu, field_warga, custom_fields, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tpl.id_template,
            defaultDesaId,
            tpl.nama_surat,
            tpl.kode_surat,
            tpl.tipe_struktur,
            JSON.stringify(tpl.field_ortu),
            JSON.stringify(tpl.field_warga),
            JSON.stringify(tpl.custom_fields),
            tpl.status || 'Aktif'
          ]
        );
      }
      const [seededRows] = await db.query('SELECT * FROM template_surat ORDER BY id_template ASC');
      rows = seededRows;
    }

    res.json({ success: true, data: rows.map(formatTemplate) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/template-surat
const createTemplate = async (req, res) => {
  let {
    id_template,
    id_desa,
    nama_surat,
    kode_surat,
    tipe_struktur,
    field_ortu,
    field_warga,
    custom_fields,
    status
  } = req.body;

  if (!id_template || !id_template.trim()) {
    id_template = `TPL-${Date.now().toString().slice(-4)}`;
  }

  try {
    let finalDesaId = id_desa || 'DESA-001';
    const [desas] = await db.query('SELECT id_desa FROM desa WHERE id_desa = ?', [finalDesaId]);
    if (desas.length === 0) {
      const [allDesas] = await db.query('SELECT id_desa FROM desa LIMIT 1');
      if (allDesas.length > 0) {
        finalDesaId = allDesas[0].id_desa;
      }
    }

    await db.query(
      `INSERT INTO template_surat (id_template, id_desa, nama_surat, kode_surat, tipe_struktur, field_ortu, field_warga, custom_fields, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_template,
        finalDesaId,
        nama_surat || 'Form Surat Baru',
        kode_surat || '470 / SK / IX / 2026',
        tipe_struktur || 'single',
        JSON.stringify(field_ortu || []),
        JSON.stringify(field_warga || []),
        JSON.stringify(custom_fields || []),
        status || 'Aktif'
      ]
    );

    res.json({
      success: true,
      message: 'Template surat baru berhasil dibuat!',
      id_template,
      data: {
        id_template,
        id_desa: finalDesaId,
        nama_surat,
        kode_surat,
        tipe_struktur: tipe_struktur || 'single',
        field_ortu: field_ortu || [],
        field_warga: field_warga || [],
        custom_fields: custom_fields || [],
        status: status || 'Aktif'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/template-surat/:id
const updateTemplate = async (req, res) => {
  const { id } = req.params;
  const {
    nama_surat,
    kode_surat,
    tipe_struktur,
    field_ortu,
    field_warga,
    custom_fields,
    status
  } = req.body;

  try {
    const [existing] = await db.query('SELECT * FROM template_surat WHERE id_template = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Template surat tidak ditemukan!' });
    }

    const current = existing[0];
    const newNama = nama_surat !== undefined ? nama_surat : current.nama_surat;
    const newKode = kode_surat !== undefined ? kode_surat : current.kode_surat;
    const newTipe = tipe_struktur !== undefined ? tipe_struktur : current.tipe_struktur;
    const newFieldOrtu = field_ortu !== undefined ? JSON.stringify(field_ortu) : (typeof current.field_ortu === 'string' ? current.field_ortu : JSON.stringify(current.field_ortu || []));
    const newFieldWarga = field_warga !== undefined ? JSON.stringify(field_warga) : (typeof current.field_warga === 'string' ? current.field_warga : JSON.stringify(current.field_warga || []));
    const newCustomFields = custom_fields !== undefined ? JSON.stringify(custom_fields) : (typeof current.custom_fields === 'string' ? current.custom_fields : JSON.stringify(current.custom_fields || []));
    const newStatus = status !== undefined ? status : current.status;

    await db.query(
      `UPDATE template_surat 
       SET nama_surat = ?, kode_surat = ?, tipe_struktur = ?, field_ortu = ?, field_warga = ?, custom_fields = ?, status = ?
       WHERE id_template = ?`,
      [newNama, newKode, newTipe, newFieldOrtu, newFieldWarga, newCustomFields, newStatus, id]
    );

    res.json({
      success: true,
      message: 'Susunan field template surat berhasil diperbarui!',
      id_template: id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/template-surat/:id
const deleteTemplate = async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.query('SELECT * FROM template_surat WHERE id_template = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Template surat tidak ditemukan!' });
    }

    await db.query('DELETE FROM template_surat WHERE id_template = ?', [id]);
    res.json({ success: true, message: 'Template surat berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
