import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { apiService } from '../../services/api';

interface TabBansosDTKSProps {
  currentDesa?: any;
}

export const TabBansosDTKS: React.FC<TabBansosDTKSProps> = ({ currentDesa }) => {
  const [subTab, setSubTab] = useState<'penerima' | 'pengajuan' | 'statistik'>('penerima');

  // State Data Master & Form
  const [penerimaList, setPenerimaList] = useState<any[]>([]);
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatusBansos, setFilterStatusBansos] = useState<'ALL' | 'WAITING' | 'READY' | 'CAIR'>('ALL');

  // State Pratinjau Lightbox Dokumen Tunggal Admin
  const [previewDoc, setPreviewDoc] = useState<{ title: string; src: string } | null>(null);

  // State Pagination (Diselaraskan dengan Tab Admin Lain)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPenerima, setEditingPenerima] = useState<any>(null);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedPengajuan, setSelectedPengajuan] = useState<any>(null);

  // Import File State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Form State Penerima Baru
  const [formData, setFormData] = useState({
    nik: '',
    nama_lengkap: '',
    alamat_lengkap: '',
    nomor_rt: '01',
    nomor_rw: '01',
    dusun: 'Dusun 1',
    no_hp: '',
    jenis_bansos: 'BLT-DD',
    periode: 'Semester 1',
    tahun_anggaran: new Date().getFullYear(),
    nominal_bantuan: 300000,
    keterangan: '',
  });

  // Form State Batching Kuota
  const [batchData, setBatchData] = useState({
    nama_gelombang: 'Pencairan Gelombang 1 2026',
    tanggal_pencairan: new Date().toISOString().split('T')[0],
    lokasi_pencairan: 'Balai Desa Sukamaju',
    kuota_harian: 20,
    jenis_bansos: 'BLT-DD',
  });

  // State Input Manual / Payload Scanner QR Code
  const [qrInputPayload, setQrInputPayload] = useState('');
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    fetchBansosData();
  }, []);

  // Auto Reset Halaman ke 1 saat Filter atau Search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatusBansos, filterJenis, searchTerm, itemsPerPage]);

  // Effect untuk menginisialisasi Kamera Scanner saat Modal QR dibuka
  useEffect(() => {
    if (showScannerModal) {
      setScanMessage(null);
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          'qr-reader-container',
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            rememberLastUsedCamera: true,
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            scanner.clear();
            handleProcessScannedCode(decodedText);
          },
          () => {
            // Ignore scan error logs
          }
        );

        scannerRef.current = scanner;
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
      };
    }
  }, [showScannerModal]);

  const fetchBansosData = async () => {
    setIsLoading(true);
    try {
      const [resPenerima, resPengajuan, resBatch] = await Promise.all([
        apiService.getBansosPenerima(),
        apiService.getBansosPengajuan(),
        apiService.getActiveBansosBatch().catch(() => null),
      ]);

      if (resPenerima?.success && Array.isArray(resPenerima.data)) {
        setPenerimaList(resPenerima.data);
      }
      if (resPengajuan?.success && Array.isArray(resPengajuan.data)) {
        setPengajuanList(resPengajuan.data);
      }
      if (resBatch?.success && resBatch.data) {
        setActiveBatch(resBatch.data);
      }
    } catch (err) {
      console.error('[Fetch Bansos Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessScannedCode = async (rawCode: string) => {
    setIsProcessingScan(true);
    setScanMessage(null);
    try {
      let parsedKodeTiket = rawCode.trim();
      let parsedToken = '';

      if (rawCode.includes('{')) {
        try {
          const parsedObj = JSON.parse(rawCode);
          parsedKodeTiket = parsedObj.tk || parsedObj.id || parsedKodeTiket;
          parsedToken = parsedObj.tok || '';
        } catch {
          // Fallback string murni
        }
      }

      const res = await apiService.scanPencairanBansos({
        kode_tiket: parsedKodeTiket,
        petugas_nama: 'Admin Desa',
        qr_token: parsedToken,
      });

      if (res && (res.success || res.status === 'success')) {
        setScanMessage({ type: 'success', text: 'Verifikasi berhasil! Bantuan berhasil dicairkan.' });
        setQrInputPayload('');
        fetchBansosData();
        setTimeout(() => {
          setShowScannerModal(false);
        }, 1500);
      } else {
        setScanMessage({ type: 'error', text: res.message || 'Gagal memverifikasi QR Tiket.' });
      }
    } catch (err) {
      console.error('[Scan QR Error]:', err);
      setScanMessage({ type: 'error', text: 'Terjadi kesalahan sistem saat pemindaian.' });
    } finally {
      setIsProcessingScan(false);
    }
  };

  const handleExecuteManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInputPayload.trim()) return;
    handleProcessScannedCode(qrInputPayload);
  };

  // Handler Import File CSV / XLSX
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const text = await selectedFile.text();
      const rows = text.split('\n').filter((row) => row.trim().length > 0);
      const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());

      const dataArray = rows.slice(1).map((row) => {
        const values = row.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] || '';
        });
        return {
          nik: obj.nik || obj.nik_warga || '',
          nama_lengkap: obj.nama || obj.nama_lengkap || '',
          alamat_lengkap: obj.alamat || '',
          nomor_rt: obj.rt || '01',
          nomor_rw: obj.rw || '01',
          jenis_bansos: obj.jenis_bansos || 'BLT-DD',
          nominal_bantuan: Number(obj.nominal || 300000),
          id_desa: currentDesa?.id_desa || 'DESA-001',
        };
      });

      const res = await apiService.bulkImportBansos(dataArray);
      if (res && (res.success || res.status === 'success')) {
        setShowImportModal(false);
        setSelectedFile(null);
        fetchBansosData();
      }
    } catch (err) {
      console.error('[Import CSV Error]:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreatePenerima = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiService.createBansosPenerima({
        ...formData,
        id_desa: currentDesa?.id_desa || 'DESA-001',
      });
      if (res.success) {
        setShowAddModal(false);
        setFormData({
          nik: '',
          nama_lengkap: '',
          alamat_lengkap: '',
          nomor_rt: '01',
          nomor_rw: '01',
          dusun: 'Dusun 1',
          no_hp: '',
          jenis_bansos: 'BLT-DD',
          periode: 'Semester 1',
          tahun_anggaran: new Date().getFullYear(),
          nominal_bantuan: 300000,
          keterangan: '',
        });
        fetchBansosData();
      }
    } catch (err) {
      console.error('[Create Penerima Error]:', err);
    }
  };

  // Handler Buka Modal Edit
  const handleOpenEdit = (item: any) => {
    setEditingPenerima({
      id_penerima: item.id_penerima,
      nik: item.nik,
      nama_lengkap: item.nama_lengkap,
      alamat_lengkap: item.alamat_lengkap || '',
      nomor_rt: item.nomor_rt || '01',
      nomor_rw: item.nomor_rw || '01',
      dusun: item.dusun || 'Dusun 1',
      no_hp: item.no_hp || '',
      jenis_bansos: item.jenis_bansos || 'BLT-DD',
      periode: item.periode || 'Semester 1',
      tahun_anggaran: item.tahun_anggaran || new Date().getFullYear(),
      nominal_bantuan: item.nominal_bantuan || 300000,
      keterangan: item.keterangan || '',
      status_batch: item.status_batch || 'READY_CLAIM',
      status_pencairan: item.status_pencairan || 'Belum',
    });
    setShowEditModal(true);
  };

  // Handler Submit Update Data Penerima
  const handleUpdatePenerima = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPenerima?.id_penerima) return;

    try {
      const res = await apiService.updateBansosPenerima(editingPenerima.id_penerima, editingPenerima);
      if (res && (res.success || res.status === 'success')) {
        setShowEditModal(false);
        setEditingPenerima(null);
        fetchBansosData();
      } else {
        alert(res?.message || 'Gagal memperbarui data penerima.');
      }
    } catch (err) {
      console.error('[Update Penerima Error]:', err);
      alert('Terjadi kesalahan jaringan/sistem saat memperbarui data.');
    }
  };

  // Handler Hapus Penerima
  const handleDeletePenerima = async (item: any) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data bansos warga: ${item.nama_lengkap} (NIK: ${item.nik})?`)) {
      return;
    }

    try {
      const res = await apiService.deleteBansosPenerima(item.id_penerima);
      if (res && (res.success || res.status === 'success')) {
        fetchBansosData();
      } else {
        alert(res?.message || 'Gagal menghapus data.');
      }
    } catch (err) {
      console.error('[Delete Penerima Error]:', err);
      alert('Terjadi kesalahan sistem saat menghapus data.');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBatch(true);
    try {
      const payload = {
        ...batchData,
        kuota_harian: Number(batchData.kuota_harian) || 20,
      };

      const res = await apiService.createBansosBatch(payload);
      if (res && (res.success || res.status === 'success')) {
        setShowBatchModal(false);
        fetchBansosData();
      } else {
        alert(res?.message || 'Gagal membuat gelombang pencairan.');
      }
    } catch (err) {
      console.error('[Create Batch Error]:', err);
      alert('Terjadi kesalahan jaringan/sistem saat rilis batch.');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleCairkanBansos = async (idPenerima: string) => {
    try {
      const res = await apiService.updateStatusPencairan(idPenerima, {
        status_pencairan: 'Sudah Dicairkan',
        metode_pencairan: 'Tunai',
        qr_scanned_by: 'Admin Desa',
      });
      if (res.success) {
        fetchBansosData();
      }
    } catch (err) {
      console.error('[Cairkan Bansos Error]:', err);
    }
  };

  const handleVerifikasiPengajuan = async (idPengajuan: string, status: 'Disetujui' | 'Ditolak') => {
    try {
      const res = await apiService.updateVerifikasiBansos(idPengajuan, {
        status_verifikasi: status,
        catatan_verifikasi: status === 'Disetujui' ? 'Memenuhi syarat kelayakan DTKS.' : 'Dokumen/berkas fisik tidak lengkap.',
        diverifikasi_oleh: 'Admin Desa',
      });
      if (res.success) {
        setSelectedPengajuan(null);
        fetchBansosData();
      }
    } catch (err) {
      console.error('[Verifikasi Pengajuan Error]:', err);
    }
  };

  // LOGIKA FILTER DAN SEARCHING
  const filteredPenerima = penerimaList.filter((item) => {
    const matchSearch =
      (item.nama_lengkap || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nik || '').includes(searchTerm);
    const matchJenis = filterJenis ? item.jenis_bansos === filterJenis : true;

    let matchStatus = true;
    if (filterStatusBansos === 'WAITING') {
      matchStatus = item.status_batch === 'WAITING_QUEUE' && item.status_pencairan !== 'Sudah Dicairkan';
    } else if (filterStatusBansos === 'READY') {
      matchStatus =
        (item.status_batch === 'READY_CLAIM' || !item.status_batch || item.status_batch === '') &&
        item.status_pencairan !== 'Sudah Dicairkan';
    } else if (filterStatusBansos === 'CAIR') {
      matchStatus = item.status_pencairan === 'Sudah Dicairkan';
    }

    return matchSearch && matchJenis && matchStatus;
  });

  // LOGIKA PAGINATION SLICING (Diselaraskan dengan Tab Admin SIWARGA)
  const totalItems = filteredPenerima.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPenerimaItems = filteredPenerima.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6 font-['Product_Sans',sans-serif]">
      {/* HEADER MODUL BANSOS */}
      <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-black flex items-center gap-2">
            <span>Pengelolaan Bantuan Sosial & DTKS</span>
            <span className="text-[10px] bg-black text-white px-2.5 py-0.5 rounded-full font-mono font-normal">
              Live System
            </span>
          </h2>
          <p className="text-xs text-black/50 mt-0.5">
            Kelola master data penerima BLT, PKH, BPNT, batching kuota pencairan, serta scan QR verifikasi.
          </p>
        </div>

        {/* SUB NAVIGASI INNER TAB */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl border border-black/5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('penerima')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              subTab === 'penerima' ? 'bg-white text-black shadow-xs font-semibold' : 'text-black/60 hover:text-black'
            }`}
          >
            Data Penerima ({penerimaList.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('pengajuan')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              subTab === 'pengajuan' ? 'bg-white text-black shadow-xs font-semibold' : 'text-black/60 hover:text-black'
            }`}
          >
            <span>Usulan Warga</span>
            {pengajuanList.filter((p) => (p.status_verifikasi || '').toLowerCase() === 'menunggu').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('statistik')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              subTab === 'statistik' ? 'bg-white text-black shadow-xs font-semibold' : 'text-black/60 hover:text-black'
            }`}
          >
            Statistik & Rekap
          </button>
        </div>
      </div>

      {/* INFORMASI BATCH AKTIF */}
      {activeBatch && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-emerald-900 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
              [Batch Pencairan Aktif Hari Ini]
            </span>
            <p className="font-bold text-sm text-emerald-900">{activeBatch.nama_gelombang}</p>
            <p className="text-[11px] text-emerald-800">
              Jadwal: {activeBatch.tanggal_pencairan} • Lokasi: {activeBatch.lokasi_pencairan} • Kuota: {activeBatch.kuota_harian} Warga/Hari
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-medium shadow-2xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <span>Buka Scanner QR Lapangan</span>
          </button>
        </div>
      )}

      {/* SUB TAB 1: DATA PENERIMA BANSOS */}
      {subTab === 'penerima' && (
        <div className="bg-white border border-black/10 rounded-2xl shadow-xs overflow-hidden space-y-4 p-5">
          {/* TOOLBAR FILTER UTAMA */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-black/10 pb-4">
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Cari NIK atau Nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3.5 py-2 text-xs border border-black/10 rounded-xl outline-none focus:border-black w-full sm:w-64"
              />
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="px-3 py-2 text-xs border border-black/10 rounded-xl outline-none focus:border-black bg-white"
              >
                <option value="">Semua Jenis Bansos</option>
                <option value="BLT-DD">BLT Dana Desa</option>
                <option value="PKH">PKH</option>
                <option value="BPNT">BPNT / Sembako</option>
                <option value="BST">BST</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-medium rounded-xl border border-black/10 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Import CSV/Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setShowScannerModal(true)}
                className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-medium rounded-xl border border-black/10 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Scan QR</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBatchModal(true)}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                Tetapkan Gelombang & Kuota
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                + Tambah Penerima
              </button>
            </div>
          </div>

          {/* QUICK FILTER STATUS TABS (COUNTER REAL-TIME) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterStatusBansos('ALL')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filterStatusBansos === 'ALL'
                  ? 'bg-black text-white'
                  : 'bg-neutral-100 text-black/60 hover:bg-neutral-200'
              }`}
            >
              Semua ({penerimaList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatusBansos('READY')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filterStatusBansos === 'READY'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-neutral-100 text-black/60 hover:bg-neutral-200'
              }`}
            >
              Siap Pencairan ({penerimaList.filter((p) => p.status_pencairan !== 'Sudah Dicairkan' && p.status_batch !== 'WAITING_QUEUE').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatusBansos('WAITING')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filterStatusBansos === 'WAITING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-neutral-100 text-black/60 hover:bg-neutral-200'
              }`}
            >
              Antrean Batch ({penerimaList.filter((p) => p.status_batch === 'WAITING_QUEUE' && p.status_pencairan !== 'Sudah Dicairkan').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatusBansos('CAIR')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filterStatusBansos === 'CAIR'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-black/60 hover:bg-neutral-200'
              }`}
            >
              Sudah Dicairkan ({penerimaList.filter((p) => p.status_pencairan === 'Sudah Dicairkan').length})
            </button>
          </div>

          {/* TABEL PENERIMA BANSOS */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/10 bg-neutral-50 text-black/60 font-medium">
                  <th className="p-3">NIK & Nama Warga</th>
                  <th className="p-3">Jenis Bansos</th>
                  <th className="p-3">Status Gelombang</th>
                  <th className="p-3">Nominal</th>
                  <th className="p-3">Status Pencairan</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-black/40">
                      Memuat data penerima bansos...
                    </td>
                  </tr>
                ) : currentPenerimaItems.length > 0 ? (
                  currentPenerimaItems.map((item) => (
                    <tr key={item.id_penerima || item.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-black">{item.nama_lengkap}</div>
                        <div className="text-[10.5px] text-black/50 font-mono">NIK: {item.nik}</div>
                      </td>
                      <td className="p-3 font-semibold text-black/80">{item.jenis_bansos}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-neutral-100 rounded text-[10.5px] font-mono text-black/70">
                          {item.status_batch || 'READY_CLAIM'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-black">
                        Rp {Number(item.nominal_bantuan || 300000).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            item.status_pencairan === 'Sudah Dicairkan'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {item.status_pencairan || 'Belum'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status_pencairan !== 'Sudah Dicairkan' && (
                            <button
                              type="button"
                              onClick={() => handleCairkanBansos(item.id_penerima)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-medium rounded-lg transition-colors cursor-pointer"
                              title="Cairkan Dana"
                            >
                              Cairkan
                            </button>
                          )}

                          {/* TOMBOL EDIT DATA */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer border border-black/10"
                            title="Edit Data Penerima"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* TOMBOL HAPUS DATA */}
                          <button
                            type="button"
                            onClick={() => handleDeletePenerima(item)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
                            title="Hapus Data Penerima"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-black/40">
                      Belum ada data penerima bansos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER NAVIGASI HALAMAN (SELARAS TAB ADMIN LAIN) */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-black/10 text-xs">
              <div className="flex items-center gap-2 text-black/60">
                <span>
                  Menampilkan <strong>{indexOfFirstItem + 1}</strong> - <strong>{Math.min(indexOfLastItem, totalItems)}</strong> dari <strong>{totalItems}</strong> penerima bansos
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 border border-black/10 rounded-lg bg-white outline-none font-mono"
                >
                  <option value={5}>5 baris</option>
                  <option value={10}>10 baris</option>
                  <option value={20}>20 baris</option>
                  <option value={50}>50 baris</option>
                </select>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 rounded-xl font-medium cursor-pointer transition-colors"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-3 py-1.5 font-mono font-bold text-black">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 rounded-xl font-medium cursor-pointer transition-colors"
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB TAB 2: USULAN MANDIRI WARGA */}
      {subTab === 'pengajuan' && (
        <div className="bg-white border border-black/10 rounded-2xl shadow-xs overflow-hidden p-5 space-y-4">
          <h3 className="text-xs font-bold text-black uppercase tracking-wider font-mono">
            Daftar Usulan Mandiri & Berkas Kelayakan Warga
          </h3>
          <div className="space-y-3">
            {pengajuanList.length > 0 ? (
              pengajuanList.map((item) => (
                <div
                  key={item.id_pengajuan || item.id}
                  className="p-4 bg-neutral-50 rounded-xl border border-black/10 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-black">{item.nama_pengaju}</h4>
                      <span className="text-[10px] bg-neutral-200 text-black px-2 py-0.5 rounded font-mono">
                        NIK: {item.nik_pengaju}
                      </span>
                    </div>
                    <p className="text-[11px] text-black/60">
                      Mengajukan: <strong className="text-black">{item.jenis_bansos_diajukan || 'BLT-DD'}</strong> • Tanggungan: {item.jumlah_tanggungan || 0} orang
                    </p>

                    <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                      <span className="bg-white px-2 py-0.5 rounded border border-black/10 font-mono">
                        Daya Listrik: {item.daya_listrik || '450 VA'}
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-black/10 font-mono">
                        Sumber Air: {item.sumber_air || 'Sumur'}
                      </span>
                    </div>

                    {item.alasan_pengajuan && (
                      <p className="text-[11px] text-black/60 italic bg-white p-2 rounded border border-black/5 mt-1">
                        "{item.alasan_pengajuan}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedPengajuan(item)}
                      className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-black text-xs font-medium rounded-lg cursor-pointer flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5 text-black/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Cek Berkas Usulan</span>
                    </button>

                    {(item.status_verifikasi || '').toLowerCase() === 'menunggu' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleVerifikasiPengajuan(item.id_pengajuan, 'Disetujui')}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg cursor-pointer"
                        >
                          Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifikasiPengajuan(item.id_pengajuan, 'Ditolak')}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg cursor-pointer"
                        >
                          Tolak
                        </button>
                      </>
                    ) : (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          item.status_verifikasi === 'Disetujui'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {item.status_verifikasi}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-black/40 text-center py-6">Belum ada usulan mandiri dari warga.</p>
            )}
          </div>
        </div>
      )}

      {/* SUB TAB 3: STATISTIK & REKAPITULASI */}
      {subTab === 'statistik' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-xs space-y-1">
            <span className="text-[11px] text-black/50 font-mono uppercase">Total Penerima Terdaftar</span>
            <p className="text-2xl font-bold text-black font-mono">{penerimaList.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-xs space-y-1">
            <span className="text-[11px] text-black/50 font-mono uppercase">Sudah Dicairkan</span>
            <p className="text-2xl font-bold text-emerald-700 font-mono">
              {penerimaList.filter((p) => p.status_pencairan === 'Sudah Dicairkan').length}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-xs space-y-1">
            <span className="text-[11px] text-black/50 font-mono uppercase">Belum Dicairkan</span>
            <p className="text-2xl font-bold text-amber-600 font-mono">
              {penerimaList.filter((p) => p.status_pencairan !== 'Sudah Dicairkan').length}
            </p>
          </div>
        </div>
      )}

      {/* MODAL 1: SCANNER KAMERA QR CODE LAPANGAN */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-black/10">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black flex items-center gap-2">
                <span>Scan E-Tiket QR Pencairan</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (scannerRef.current) scannerRef.current.clear().catch(() => {});
                  setShowScannerModal(false);
                }}
                className="text-black/50 hover:text-black cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* VIEWPORT KAMERA SCANNER REAL-TIME */}
            <div className="space-y-3">
              <div
                id="qr-reader-container"
                className="w-full bg-neutral-900 rounded-xl overflow-hidden border border-black/10 text-center min-h-[240px]"
              />

              {scanMessage && (
                <div
                  className={`p-2.5 rounded-xl text-xs text-center font-medium ${
                    scanMessage.type === 'success'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  {scanMessage.text}
                </div>
              )}

              {/* INPUT CADANGAN TEKS / JSON */}
              <form onSubmit={handleExecuteManualScan} className="space-y-2 pt-2 border-t border-black/10">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                  Atau Tempelkan Payload / Kode Tiket
                </span>
                <textarea
                  rows={2}
                  value={qrInputPayload}
                  onChange={(e) => setQrInputPayload(e.target.value)}
                  placeholder='Contoh: {"tk":"TK-BNS-001"} atau Kode Tiket TK-BNS-001'
                  className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black font-mono text-[11px]"
                />
                <button
                  type="submit"
                  disabled={isProcessingScan}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isProcessingScan ? 'Memproses Verifikasi...' : 'Verifikasi & Eksekusi Pencairan'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORT FILE CSV / EXCEL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-black/10">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black flex items-center gap-2">
                <span>Import Massal Data DTKS (CSV)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-black/50 hover:text-black cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-3 text-xs">
              <p className="text-[11px] text-black/60">
                Pilih file CSV data penerima bansos dari Dinas Sosial. Pastikan kolom memuat header: <code>nik</code>, <code>nama</code>, <code>rt</code>, <code>rw</code>, <code>jenis_bansos</code>.
              </p>

              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 cursor-pointer"
                required
              />

              <div className="pt-3 flex justify-end gap-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-neutral-100 text-black/70 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isImporting || !selectedFile}
                  className="px-5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl cursor-pointer font-medium disabled:opacity-50"
                >
                  {isImporting ? 'Mengunggah Data...' : 'Proses Import Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TETAPKAN GELOMBANG & KUOTA HARIAN */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-black/10">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">Tetapkan Gelombang & Kuota Harian</h3>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-black/50 hover:text-black cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block text-black/70 font-medium mb-1">Nama Gelombang</label>
                <input
                  type="text"
                  required
                  value={batchData.nama_gelombang}
                  onChange={(e) => setBatchData({ ...batchData, nama_gelombang: e.target.value })}
                  className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-black/70 font-medium mb-1">Tanggal Pelaksanaan</label>
                  <input
                    type="date"
                    required
                    value={batchData.tanggal_pencairan}
                    onChange={(e) => setBatchData({ ...batchData, tanggal_pencairan: e.target.value })}
                    className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black font-mono"
                  />
                </div>
                <div>
                  <label className="block text-black/70 font-medium mb-1">Kuota Harian (Warga)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={batchData.kuota_harian}
                    onChange={(e) => setBatchData({ ...batchData, kuota_harian: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-black/70 font-medium mb-1">Lokasi Pencairan</label>
                <input
                  type="text"
                  required
                  value={batchData.lokasi_pencairan}
                  onChange={(e) => setBatchData({ ...batchData, lokasi_pencairan: e.target.value })}
                  className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 bg-neutral-100 text-black/70 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl cursor-pointer font-medium disabled:opacity-50"
                >
                  {isSubmittingBatch ? 'Memproses Batch...' : 'Rilis Batch & Kirim Email Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DETAIL PRATINJAU BERKAS USULAN WARGA FORMAL */}
      {selectedPengajuan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-black/10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-black">Detail Berkas Usulan Mandiri</h3>
                <p className="text-[10.5px] text-black/50">
                  Pemohon: {selectedPengajuan.nama_pengaju} (NIK: {selectedPengajuan.nik_pengaju})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPengajuan(null)}
                className="text-black/50 hover:text-black cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-3 rounded-xl border border-black/5">
                <div>
                  <span className="text-[10px] text-black/50 block">Daya Listrik</span>
                  <strong className="text-black">{selectedPengajuan.daya_listrik || '450 VA'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-black/50 block">Sumber Air Utama</span>
                  <strong className="text-black">{selectedPengajuan.sumber_air || 'Sumur'}</strong>
                </div>
              </div>

              {/* DAFTAR VERIFIKASI 5 DOKUMEN FISIK FORMAL DENGAN ICON SVG */}
              <div className="space-y-2 pt-2 border-t border-black/10">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block font-mono">
                  Daftar Berkas & Dokumen Kelayakan (*5 Berkas Master)
                </span>

                <div className="space-y-1.5 text-xs">
                  {[
                    {
                      id: 'ktp',
                      label: '1. Kartu Tanda Penduduk (KTP Asli)',
                      src: selectedPengajuan.foto_ktp,
                      wajib: true,
                    },
                    {
                      id: 'kk',
                      label: '2. Kartu Keluarga (KK Asli)',
                      src: selectedPengajuan.foto_kk,
                      wajib: false,
                    },
                    {
                      id: 'rumah_depan',
                      label: '3. Foto Rumah Tampak Depan',
                      src: selectedPengajuan.foto_rumah_depan || selectedPengajuan.foto_rumah,
                      wajib: true,
                    },
                    {
                      id: 'rumah_dalam',
                      label: '4. Kondisi Dapur / Interior Rumah',
                      src: selectedPengajuan.foto_rumah_dalam,
                      wajib: false,
                    },
                    {
                      id: 'sktm',
                      label: '5. SKTM / Surat Pengantar RT/RW',
                      src: selectedPengajuan.foto_sktm || selectedPengajuan.foto_pendukung,
                      wajib: false,
                    },
                  ].map((doc) => {
                    const isAvailable = Boolean(doc.src);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-black/5 hover:bg-neutral-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          {doc.wajib ? (
                            <svg className="w-4 h-4 text-black/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-black/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          )}
                          <div>
                            <p className="font-semibold text-black text-[11.5px] leading-tight">{doc.label}</p>
                            <span className="text-[9.5px] text-gray-400">
                              {doc.wajib ? 'Dokumen Utama (Wajib)' : 'Dokumen Pendukung'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9.5px] font-semibold border flex items-center gap-1 ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                            }`}
                          >
                            {isAvailable ? (
                              <>
                                <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Tersedia</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Tidak Dilampirkan</span>
                              </>
                            )}
                          </span>

                          {isAvailable ? (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ title: doc.label, src: doc.src! })}
                              className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white font-medium rounded-lg text-[10.5px] transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>Lihat Berkas</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-gray-300 px-3">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => handleVerifikasiPengajuan(selectedPengajuan.id_pengajuan, 'Ditolak')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer font-medium"
                >
                  Tolak Usulan
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifikasiPengajuan(selectedPengajuan.id_pengajuan, 'Disetujui')}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl cursor-pointer font-medium"
                >
                  Setujui Usulan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX OVERLAY PRATINJAU FOTO DOKUMEN */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between border-b border-black/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h5 className="font-bold text-xs text-black font-mono uppercase">{previewDoc.title}</h5>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="w-7 h-7 bg-neutral-100 hover:bg-neutral-200 rounded-full flex items-center justify-center text-xs font-bold text-black transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-black/5 rounded-xl p-2 flex items-center justify-center min-h-[250px] max-h-[70vh] overflow-hidden">
              <img
                src={previewDoc.src}
                alt={previewDoc.title}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-md"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: TAMBAH PENERIMA BANSOS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-black/10">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">Tambah Penerima Bansos</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-black/50 hover:text-black cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePenerima} className="space-y-3 text-xs">
              <div>
                <label className="block text-black/70 font-medium mb-1">NIK Warga</label>
                <input
                  type="text"
                  required
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  placeholder="3209..."
                  className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <label className="block text-black/70 font-medium mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  placeholder="Nama sesuai KTP"
                  className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-black/70 font-medium mb-1">Jenis Bansos</label>
                  <select
                    value={formData.jenis_bansos}
                    onChange={(e) => setFormData({ ...formData, jenis_bansos: e.target.value })}
                    className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black bg-white"
                  >
                    <option value="BLT-DD">BLT Dana Desa</option>
                    <option value="PKH">PKH</option>
                    <option value="BPNT">BPNT / Sembako</option>
                    <option value="BST">BST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-black/70 font-medium mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    value={formData.nominal_bantuan}
                    onChange={(e) => setFormData({ ...formData, nominal_bantuan: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-neutral-100 text-black/70 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl cursor-pointer font-medium"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: EDIT DATA PENERIMA BANSOS */}
      {showEditModal && editingPenerima && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-black/10">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">Edit Data Penerima Bansos</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-black/50 hover:text-black cursor-pointer font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePenerima} className="space-y-3 text-xs">
              <div>
                <label className="block text-black/70 font-medium mb-1">NIK Warga</label>
                <input
                  type="text"
                  required
                  value={editingPenerima.nik}
                  onChange={(e) => setEditingPenerima({ ...editingPenerima, nik: e.target.value })}
                  className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <label className="block text-black/70 font-medium mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editingPenerima.nama_lengkap}
                  onChange={(e) => setEditingPenerima({ ...editingPenerima, nama_lengkap: e.target.value })}
                  className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-black/70 font-medium mb-1">Jenis Bansos</label>
                  <select
                    value={editingPenerima.jenis_bansos}
                    onChange={(e) => setEditingPenerima({ ...editingPenerima, jenis_bansos: e.target.value })}
                    className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black bg-white"
                  >
                    <option value="BLT-DD">BLT Dana Desa</option>
                    <option value="PKH">PKH</option>
                    <option value="BPNT">BPNT / Sembako</option>
                    <option value="BST">BST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-black/70 font-medium mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    value={editingPenerima.nominal_bantuan}
                    onChange={(e) => setEditingPenerima({ ...editingPenerima, nominal_bantuan: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-black/70 font-medium mb-1">Status Gelombang</label>
                  <select
                    value={editingPenerima.status_batch}
                    onChange={(e) => setEditingPenerima({ ...editingPenerima, status_batch: e.target.value })}
                    className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black bg-white font-mono"
                  >
                    <option value="READY_CLAIM">READY_CLAIM</option>
                    <option value="WAITING_QUEUE">WAITING_QUEUE</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-black/70 font-medium mb-1">No. HP Warga</label>
                  <input
                    type="text"
                    value={editingPenerima.no_hp}
                    onChange={(e) => setEditingPenerima({ ...editingPenerima, no_hp: e.target.value })}
                    placeholder="08..."
                    className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-black font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-neutral-100 text-black/70 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl cursor-pointer font-medium"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};