const mysql = require('mysql2/promise');

const dbPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Password default Laragon biasanya kosong
  database: 'db_siwarga',
  port: 3308, // Port MySQL Laragon kamu (jika 3308 tidak bisa, coba ganti ke 3306)
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

(async () => {
  try {
    const connection = await dbPool.getConnection();
    console.log('✅ Berhasil terhubung ke Database MySQL Laragon (db_siwarga)');
    connection.release();
  } catch (error) {
    console.error('❌ Gagal terhubung ke Database MySQL Laragon:', error.message || error);
  }
})();

module.exports = dbPool;