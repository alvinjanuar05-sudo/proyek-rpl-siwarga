const BASE_URL = 'http://localhost:5000/api';

export const apiService = {
  // 1. Autentikasi & Keamanan Akun
  async login(email: string, pass: string) {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    return await response.json();
  },

  async register(dataWarga: any) {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataWarga),
    });
    return await response.json();
  },

  async verifyPassword(email: string, password: string) {
    const response = await fetch(`${BASE_URL}/auth/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return await response.json();
  },

  async changePassword(payload: { email: string; old_password: string; new_password: string }) {
    const response = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async forgotPassword(email: string) {
    const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  },

  async logoutAllDevices(email: string) {
    const response = await fetch(`${BASE_URL}/auth/logout-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  },

  // 2. Pengajuan Surat
  async getPengajuanSurat() {
    const response = await fetch(`${BASE_URL}/pengajuan-surat`);
    return await response.json();
  },

  async createPengajuanSurat(payload: any) {
    const response = await fetch(`${BASE_URL}/pengajuan-surat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async updateStatusSurat(id: string, status: string, catatan_admin?: string) {
    const response = await fetch(`${BASE_URL}/pengajuan-surat/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, catatan_admin }),
    });
    return await response.json();
  },

  async deletePengajuanSurat(id: string) {
    const response = await fetch(`${BASE_URL}/pengajuan-surat/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  // 3. Aspirasi Warga
  async getAspirasi() {
    const response = await fetch(`${BASE_URL}/aspirasi`);
    return await response.json();
  },

  async createAspirasi(payload: any) {
    const response = await fetch(`${BASE_URL}/aspirasi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async updateStatusAspirasi(id: string, status: string, tanggapan?: string, diteruskan_ke?: string) {
    const response = await fetch(`${BASE_URL}/aspirasi/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, tanggapan, catatan_desa: tanggapan, diteruskan_ke }),
    });
    return await response.json();
  },

  async deleteAspirasi(id: string) {
    const response = await fetch(`${BASE_URL}/aspirasi/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  // 4. Manajemen User / Warga
  async getUsers() {
    const response = await fetch(`${BASE_URL}/users`);
    return await response.json();
  },

  async updateStatusUser(id: string, status: string) {
    const response = await fetch(`${BASE_URL}/users/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return await response.json();
  },

  async deleteUser(id: string) {
    const response = await fetch(`${BASE_URL}/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  // Pengaturan Profil Warga
  async updateUserProfile(id: string, payload: { email: string; no_hp: string; dusun: string; alamat_lengkap: string; id_user?: string; nik?: string }) {
    const response = await fetch(`${BASE_URL}/users/${encodeURIComponent(id)}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async updateNotificationPreferences(id: string, payload: { notif_email_surat: boolean; notif_pengumuman: boolean }) {
    const response = await fetch(`${BASE_URL}/users/${encodeURIComponent(id)}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async getActivityLog(id: string) {
    const response = await fetch(`${BASE_URL}/users/${encodeURIComponent(id)}/activity`);
    return await response.json();
  },

  async getUserSessions(id: string) {
    const response = await fetch(`${BASE_URL}/users/${encodeURIComponent(id)}/sessions`);
    return await response.json();
  },

  // 5. Pengumuman Desa
  async getPengumuman() {
    const response = await fetch(`${BASE_URL}/pengumuman`);
    return await response.json();
  },

  async createPengumuman(payload: any) {
    const response = await fetch(`${BASE_URL}/pengumuman`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async deletePengumuman(id: string) {
    const response = await fetch(`${BASE_URL}/pengumuman/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  // 6. Aparatur Desa
  async getAparatur() {
    const response = await fetch(`${BASE_URL}/aparatur`);
    return await response.json();
  },

  async createAparatur(payload: any) {
    const response = await fetch(`${BASE_URL}/aparatur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async updateAparatur(id: string, payload: any) {
    const response = await fetch(`${BASE_URL}/aparatur/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async deleteAparatur(id: string) {
    const response = await fetch(`${BASE_URL}/aparatur/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  // 7. Profil Utama Desa
  async getDesa() {
    const response = await fetch(`${BASE_URL}/desa`);
    return await response.json();
  },

  async getProfilDesa() {
    const response = await fetch(`${BASE_URL}/desa`);
    return await response.json();
  },

  async updateDesa(payload: any) {
    const response = await fetch(`${BASE_URL}/desa`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async updateProfilDesa(payload: any) {
    const response = await fetch(`${BASE_URL}/desa`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  // 8. Chatbot AI SVARA
  async sendAiChat(message: string, user: any, apiKey: string) {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, user, apiKey }),
    });
    return await response.json();
  },

  // 9. Kelola Struktur RT / RW Desa
  async getStrukturRTRW() {
    const response = await fetch(`${BASE_URL}/desa/rw`);
    return await response.json();
  },

  async getRwRts() {
    const response = await fetch(`${BASE_URL}/desa/rw`);
    return await response.json();
  },

  async updateStrukturRTRW(payload: { id_desa?: string; nama_desa?: string; nama_kecamatan?: string; rw: any[] }) {
    const response = await fetch(`${BASE_URL}/desa/rw`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  // 10. Konfigurasi AI Engine (Tabel ai_config MySQL)
  async getAiConfig() {
    const response = await fetch(`${BASE_URL}/config/ai`);
    return await response.json();
  },

  async saveAiConfig(payload: { api_key: string; model_default?: string }) {
    const response = await fetch(`${BASE_URL}/config/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  // 11. Kelola Form Surat / Template Surat (Tabel template_surat MySQL)
  async getTemplateSurat(id_desa?: string) {
    const url = id_desa
      ? `${BASE_URL}/template-surat?id_desa=${encodeURIComponent(id_desa)}`
      : `${BASE_URL}/template-surat`;
    const response = await fetch(url);
    return await response.json();
  },

  async createTemplateSurat(payload: any) {
    const response = await fetch(`${BASE_URL}/template-surat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async updateTemplateSurat(id: string, payload: any) {
    const response = await fetch(`${BASE_URL}/template-surat/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async deleteTemplateSurat(id: string) {
    const response = await fetch(`${BASE_URL}/template-surat/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  // 12. Sistem Notifikasi Warga
  async getNotifikasi(params: { nik?: string; id_desa?: string; nomor_rt?: string; nomor_rw?: string }) {
    const query = new URLSearchParams();
    if (params.nik) query.append('nik', params.nik);
    if (params.id_desa) query.append('id_desa', params.id_desa);
    if (params.nomor_rt) query.append('nomor_rt', params.nomor_rt);
    if (params.nomor_rw) query.append('nomor_rw', params.nomor_rw);

    const response = await fetch(`${BASE_URL}/notifikasi?${query.toString()}`);
    return await response.json();
  },

  async markNotifikasiRead(id_notifikasi: string) {
    const response = await fetch(`${BASE_URL}/notifikasi/${encodeURIComponent(id_notifikasi)}/read`, {
      method: 'PUT',
    });
    return await response.json();
  },

  async markAllNotifikasiRead(nik: string, id_desa?: string, nomor_rt?: string, nomor_rw?: string) {
    const response = await fetch(`${BASE_URL}/notifikasi/read-all`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nik, id_desa: id_desa || 'DESA-001', nomor_rt, nomor_rw }),
    });
    return await response.json();
  },

  async deleteNotifikasi(id_notifikasi: string) {
    const response = await fetch(`${BASE_URL}/notifikasi/${encodeURIComponent(id_notifikasi)}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  async clearAllNotifikasi(nik?: string, id_desa?: string) {
    const query = new URLSearchParams();
    if (nik) query.append('nik', nik);
    if (id_desa) query.append('id_desa', id_desa);

    const response = await fetch(`${BASE_URL}/notifikasi/clear-all?${query.toString()}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  // 13. Kelola Bansos & DTKS (Master Data, Batching, QR Ticket, & Usulan Mandiri)
  async getBansosPenerima() {
    const response = await fetch(`${BASE_URL}/bansos`);
    return await response.json();
  },

  async cekBansosByNik(nik: string) {
    const response = await fetch(`${BASE_URL}/bansos/cek/${encodeURIComponent(nik)}`);
    return await response.json();
  },

  async createBansosPenerima(payload: any) {
    const response = await fetch(`${BASE_URL}/bansos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async updateBansosPenerima(id: string, payload: any) {
    const response = await fetch(`${BASE_URL}/bansos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async scanPencairanBansos(payload: { kode_tiket: string; petugas_nama?: string; qr_token?: string }) {
    const response = await fetch(`${BASE_URL}/bansos/scan-pencairan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async updateStatusPencairan(id: string, payload: any) {
    const response = await fetch(`${BASE_URL}/bansos/${encodeURIComponent(id)}/pencairan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async deleteBansosPenerima(id: string) {
    const response = await fetch(`${BASE_URL}/bansos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  async getBansosPengajuan() {
    const response = await fetch(`${BASE_URL}/bansos-pengajuan`);
    return await response.json();
  },

  async createBansosPengajuan(payload: any) {
    const response = await fetch(`${BASE_URL}/bansos-pengajuan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async updateVerifikasiBansos(id: string, payload: any) {
    const response = await fetch(`${BASE_URL}/bansos-pengajuan/${encodeURIComponent(id)}/verifikasi`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async deleteBansosPengajuan(id: string) {
    const response = await fetch(`${BASE_URL}/bansos-pengajuan/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await response.json();
  },

  // METHOD BATCHING, KLAIM QR & BULK UPLOAD BANSOS
  async createBansosBatch(payload: { nama_gelombang: string; tanggal_pencairan: string; lokasi_pencairan: string; kuota_harian: number; jenis_bansos?: string }) {
    const response = await fetch(`${BASE_URL}/bansos/batch/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async getActiveBansosBatch() {
    const response = await fetch(`${BASE_URL}/bansos/batch/active`);
    return await response.json();
  },

  async klaimQrBansos(payload: { nik: string; id_penerima?: string }) {
    const response = await fetch(`${BASE_URL}/bansos/klaim-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  },

  async bulkImportBansos(dataArray: any[]) {
    const response = await fetch(`${BASE_URL}/bansos/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dataArray }),
    });
    return await response.json();
  },

  async exportRekapBansos() {
    const response = await fetch(`${BASE_URL}/bansos/export-rekap`);
    return await response.json();
  },
};