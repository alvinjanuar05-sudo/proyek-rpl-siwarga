// Pembatasan topik dan guardrails domain Desa Mertapada Wetan
const PENOLAKAN_RESMI = "Mohon maaf, sebagai asisten resmi Desa Mertapada Wetan, saya hanya dapat membantu Anda terkait layanan administrasi, pengumuman, aspirasi, dan informasi seputar desa.";

const offTopicPatterns = [
  /\b(python|javascript|typescript|c\+\+|java|php|ruby|golang|rust|html|css|sql query|nosql|react|vue|angular|node\.?js)\b/i,
  /\b(bikin|buatkan|tuliskan|contoh|ajari|koreksi)\s+(kode|koding|coding|script|fungsi|function|program|algoritma|class|syntax)\b/i,
  /\b(debug|compile|syntax error|regex|npm install|pip install|terminal|cmd|powershell)\b/i,
  /\b(print\(|console\.log|def |public static|void main|import os|import sys)\b/i,
  /\b(hitunglah|kalkulator|integral|turunan|aljabar|trigonometri|pythagoras|logaritma|pecahan|persamaan linier)\b/i,
  /\b(tugas sekolah|pr sekolah|pr matematika|pekerjaan rumah|soal fisika|soal kimia|soal biologi|soal ujian|skripsi|makalah)\b/i,
  /\b(buatkan puisi|buatkan cerpen|cerita dongeng|pantun cinta|lirik lagu|novel|teks drama)\b/i,
  /\b(siapa presiden amerika|presiden rusia|perang dunia|ibukota prancis|sepak bola eropa|liga champions)\b/i,
  /\b(resep masakan|cara memasak kue|ramalan zodiak|horoskop|main game|cheat game)\b/i,
];

module.exports = {
  PENOLAKAN_RESMI,
  offTopicPatterns
};
