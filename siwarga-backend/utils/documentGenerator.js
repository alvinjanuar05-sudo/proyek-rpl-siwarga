const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

/**
 * Normalisasi data untuk memastikan placeholder umum terisi dengan baik
 * baik menggunakan nama field versi singkat (rt, rw, nama) maupun panjang (nomor_rt, nama_warga)
 */
function normalizePayload(rawPayload = {}) {
  const data = { ...rawPayload };

  // Alias nama warga & nik
  if (!data.nama_warga && data.nama) data.nama_warga = data.nama;
  if (!data.nama && data.nama_warga) data.nama = data.nama_warga;
  if (!data.nik_warga && data.nik) data.nik_warga = data.nik;
  if (!data.nik && data.nik_warga) data.nik = data.nik_warga;

  // Alias RT & RW
  const rtVal = data.rt || data.nomor_rt || data.rt_warga || '-';
  const rwVal = data.rw || data.nomor_rw || data.rw_warga || '-';
  data.rt = rtVal;
  data.nomor_rt = rtVal;
  data.rw = rwVal;
  data.nomor_rw = rwVal;

  // Alias Alamat
  const alamatVal = data.alamat || data.alamat_warga || data.alamat_lengkap || '-';
  data.alamat = alamatVal;
  data.alamat_warga = alamatVal;

  // Alias Nomor KK
  const kkVal = data.no_kk || data.no_kk_warga || data.nomor_kk || data.no_kk_ortu || '-';
  data.no_kk = kkVal;
  data.nomor_kk = kkVal;

  // Tempat & Tanggal Lahir jika digabung atau dipisah
  if (!data.tempat_lahir && data.tempat_tgl_lahir) {
    const parts = String(data.tempat_tgl_lahir).split(/,|\//);
    data.tempat_lahir = parts[0]?.trim() || '-';
    if (!data.tanggal_lahir && parts[1]) {
      data.tanggal_lahir = parts[1]?.trim() || '-';
    }
  }

  // Alias Penghasilan & Pekerjaan
  if (!data.penghasilan && data.penghasilan_ortu) data.penghasilan = data.penghasilan_ortu;
  if (!data.penghasilan && data.penghasilan_pemohon !== undefined) {
    data.penghasilan = (data.penghasilan_pemohon === '0' || data.penghasilan_pemohon === 0)
      ? 'Rp 0 (Belum berpenghasilan)'
      : `Rp ${data.penghasilan_pemohon}`;
  }
  if (!data.pekerjaan && data.pekerjaan_warga) data.pekerjaan = data.pekerjaan_warga;
  if (!data.pekerjaan && data.pekerjaan_ortu) data.pekerjaan = data.pekerjaan_ortu;

  // Tanggal Surat Default jika belum ada (Format: Tanggal Bulan Tahun Indonesia)
  if (!data.tanggal_surat) {
    data.tanggal_surat = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Penandatangan default jika belum ada
  if (!data.nama_penandatangan && data.nama_kades) {
    data.nama_penandatangan = data.nama_kades;
  }
  if (!data.nama_penandatangan) {
    data.nama_penandatangan = 'Kepala Desa';
  }

  return data;
}

/**
 * Universal Word Document Generator
 * 
 * @param {string} templateFilename - Nama file template di folder /templates/ (contoh: 'SKTM_Template.docx')
 * @param {Object} dataPayload - Data isian pemohon + metadata surat & desa
 * @param {string} outputFilename - Nama file hasil render (contoh: 'SKTM-SRT-12345.docx')
 * @returns {Object} - Informasi file hasil generate ({ success, filename, filePath })
 */
const generateDocument = (templateFilename, dataPayload = {}, outputFilename) => {
  try {
    if (!templateFilename) {
      throw new Error('Nama file template (.docx) tidak ditentukan.');
    }

    const templatesDir = path.join(__dirname, '..', 'templates');
    const templatePath = path.join(templatesDir, templateFilename);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Berkas template "${templateFilename}" tidak ditemukan di folder templates.`);
    }

    // 1. Baca berkas template Word sebagai binary
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // Deteksi apakah template menggunakan delimiter {{ atau {
    let delimiters = { start: '{{', end: '}}' };
    try {
      const xml = zip.file('word/document.xml')?.asText() || '';
      if (!xml.includes('{{') && xml.includes('{')) {
        delimiters = { start: '{', end: '}' };
      }
    } catch (e) {
      // fallback ke {{ }}
    }

    // 2. Inisialisasi Docxtemplater dengan nullGetter agar tag kosong menjadi '-'
    const doc = new Docxtemplater(zip, {
      delimiters: delimiters,
      paragraphLoop: true,
      linebreaks: true,
      nullGetter(part) {
        return '-';
      }
    });

    // 3. Normalisasi data payload dan gabungkan semua tag
    const normalizedData = normalizePayload(dataPayload);

    // 4. Render template dengan data
    doc.render(normalizedData);

    // 5. Generate output buffer
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    // 6. Pastikan direktori generated_docs ada
    const outputDir = path.join(__dirname, '..', 'generated_docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 7. Tentukan nama output berkas jika tidak dispesifikasikan
    const finalOutputFilename = outputFilename || `SURAT-${Date.now()}.docx`;
    const outputPath = path.join(outputDir, finalOutputFilename);

    // 8. Tulis berkas Word hasil render
    fs.writeFileSync(outputPath, buf);

    return {
      success: true,
      filename: finalOutputFilename,
      filePath: outputPath,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[DocumentGenerator Error]:', error);
    throw error;
  }
};

module.exports = {
  generateDocument,
  normalizePayload
};
