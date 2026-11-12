/**
 * Helper Sanitasi Tipe Data DATE (mengembalikan format YYYY-MM-DD atau null jika kosong/tidak valid)
 */
const sanitizeDate = (val) => {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[\/\-]/);
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
};

module.exports = {
  sanitizeDate
};
