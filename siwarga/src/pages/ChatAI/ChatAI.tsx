import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

import logoIcon from '../../assets/icon_navbar/Logo.svg';
import logoDesa from '../../assets/icon_navbar/Logo.svg';
import iconEnter from '../../assets/icon_chat/icon_enter.svg';

import { useKecamatan } from '../../context/KecamatanContext';
import { useToast } from '../../context/ToastContext';
import { ChatKatalogOptions } from '../../components/chat/ChatKatalogOptions';
import type { TemplateSurat } from '../../components/chat/ChatKatalogOptions';
import { SuratFormWidget } from '../../components/chat/SuratFormWidget';
import { AspirasiFormWidget } from '../../components/chat/AspirasiFormWidget';
import { AparaturCard } from '../../components/chat/AparaturCard';
import { PengumumanCard } from '../../components/chat/PengumumanCard';
import { StatusCard } from '../../components/chat/StatusCard';
import type { StatusDetailData } from '../../components/chat/StatusCard';
import { processChatMessage } from '../../components/chat/handlers/chatResponseHandler';
import type { StatusOptionItem } from '../../components/chat/handlers/chatResponseHandler';
import { apiService } from '../../services/api';
import { NotificationBell } from '../../components/notification/NotificationBell';

// 🎯 IMPORT WIDGET BANSOS & DTKS TERPISAH
import { BansosCheckWidget } from '../../components/chat/BansosCheckWidget';
import { BansosPengajuanFormWidget } from '../../components/chat/BansosPengajuanFormWidget';

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  templateData?: TemplateSurat;
  showKatalogLevel1?: boolean;
  selectedCategoryGroup?: string;
  isAspirasiForm?: boolean;
  showAparaturCard?: boolean;
  showRTRWCard?: boolean;
  showPengumumanCard?: boolean;
  targetPejabat?: 'kades' | 'sekdes' | 'aparatur_all' | string;
  statusListOptions?: StatusOptionItem[];
  totalStatusCount?: number;
  hasMoreStatus?: boolean;
  statusCardData?: StatusDetailData;
  showBansosCheckWidget?: boolean;
  isBansosPengajuanForm?: boolean;
}

interface ChatAIProps {
  isFullScreen?: boolean;
  role?: 'warga' | 'admin';
}

const ChatAI: React.FC<ChatAIProps> = ({ isFullScreen = true, role = 'warga' }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isOpen, setIsOpen] = useState(!isFullScreen ? false : true);

  const { dataKecamatan, setDataKecamatan } = useKecamatan();
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const namaLengkapWarga = currentUser?.nama || currentUser?.nama_lengkap || (role === 'admin' ? 'Admin Desa' : 'Pak Budi');
  const namaDepanWarga = namaLengkapWarga.split(' ')[0];

  const currentDesaRaw =
    dataKecamatan?.desa_kelurahan?.find((d: any) => {
      if (!d) return false;
      const namaDb = (d.nama_desa_kelurahan || d.nama || '')
        .toLowerCase()
        .replace(/desa|kelurahan/g, '')
        .trim();
      const userDesa = (currentUser?.nama_desa || currentUser?.alamat?.desa || currentUser?.desa || '')
        .toLowerCase()
        .replace(/desa|kelurahan/g, '')
        .trim();

      return (
        d.id_desa === currentUser?.id_desa ||
        (userDesa !== '' && (namaDb.includes(userDesa) || userDesa.includes(namaDb)))
      );
    }) || dataKecamatan?.desa_kelurahan?.[0] || {};

  const [rtrwDataFromApi, setRtrwDataFromApi] = useState<any[]>([]);
  const [templateSuratFromApi, setTemplateSuratFromApi] = useState<TemplateSurat[]>([]);
  const [desaDataFromApi, setDesaDataFromApi] = useState<any>(null);
  const [aparaturLainFromApi, setAparaturLainFromApi] = useState<any[]>([]);

  // 1. FETCH PROFILE DESA DAN DAFTAR APARATUR LANGSUNG DARI REST API MYSQL
  useEffect(() => {
    let isMounted = true;
    const fetchDesaDanAparatur = async () => {
      try {
        const [resDesa, resAparatur] = await Promise.all([
          apiService.getDesa().catch(() => null),
          apiService.getAparatur().catch(() => null),
        ]);

        if (isMounted) {
          if (resDesa && resDesa.success) {
            const desaMain = Array.isArray(resDesa.data) ? resDesa.data[0] : resDesa.data || resDesa;
            if (desaMain) setDesaDataFromApi(desaMain);
          }

          if (resAparatur) {
            const listAparatur = Array.isArray(resAparatur.data)
              ? resAparatur.data
              : Array.isArray(resAparatur)
              ? resAparatur
              : [];
            if (listAparatur.length > 0) setAparaturLainFromApi(listAparatur);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat profil desa & aparatur dari API:', err);
      }
    };
    fetchDesaDanAparatur();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchRtRw = async () => {
      try {
        const res = await (apiService as any).getRwRts?.();
        if (isMounted && res && res.success && Array.isArray(res.data)) {
          setRtrwDataFromApi(res.data);
        }
      } catch (err) {
        console.warn('Gagal memuat data RT/RW dari REST API:', err);
      }
    };
    fetchRtRw();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchTemplates = async () => {
      try {
        const res = await apiService.getTemplateSurat(currentDesaRaw?.id_desa || currentUser?.id_desa);
        if (isMounted && res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setTemplateSuratFromApi(res.data);
        }
      } catch (err) {
        console.warn('Gagal memuat template surat dari REST API:', err);
      }
    };
    fetchTemplates();
    return () => { isMounted = false; };
  }, [currentDesaRaw?.id_desa, currentUser?.id_desa]);

  // SINKRONISASI LENGKAP OBJEK currentDesa AGAR DITERIMA APARATURCARD KHUSUS DENGAN FOTO TERBARU
  const currentDesa = {
    ...currentDesaRaw,
    ...(desaDataFromApi || {}),
    aparatur_lain: aparaturLainFromApi.length > 0 ? aparaturLainFromApi : (currentDesaRaw.aparatur_lain || currentDesaRaw.aparatur || []),
    aparatur: aparaturLainFromApi.length > 0 ? aparaturLainFromApi : (currentDesaRaw.aparatur || currentDesaRaw.aparatur_lain || []),
    rw: rtrwDataFromApi.length > 0 ? rtrwDataFromApi : (currentDesaRaw.rw || currentDesaRaw.daftar_rw || []),
    template_surat: templateSuratFromApi.length > 0 ? templateSuratFromApi : (currentDesaRaw.template_surat || []),
  };

  const namaDesaResmi = currentDesa?.nama_desa_kelurahan || currentDesa?.nama || currentUser?.nama_desa || 'Sukamaju';

  const userRtClean = String(currentUser?.nomor_rt || '01').padStart(2, '0');
  const userRwClean = String(currentUser?.nomor_rw || '01').padStart(2, '0');

  const alamatWarga = {
    id_desa: currentDesa?.id_desa || currentUser?.id_desa || 'DESA-001',
    desa: namaDesaResmi,
    kecamatan: dataKecamatan?.nama_kecamatan || currentUser?.alamat?.kecamatan || 'Astanajapura',
    nomor_rt: userRtClean,
    nomor_rw: userRwClean,
    rt_rw: `RT ${userRtClean} / RW ${userRwClean}`,
    dusun: currentUser?.dusun || 'Dusun 1',
  };

  const templatesDesa: TemplateSurat[] = templateSuratFromApi.length > 0 
    ? templateSuratFromApi 
    : (currentDesa?.template_surat || []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formDataWarga, setFormDataWarga] = useState<any>({});

  const [formAspirasi, setFormAspirasi] = useState({
    kategori: 'Infrastruktur / Jalan',
    judul: '',
    isi: '',
    lokasi: '',
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    apiService.getAiConfig().then((res) => {
      if (res && res.success && res.data?.api_key && res.data.api_key !== 'DUMMY_KEY') {
        const currentKey = localStorage.getItem('svara_gemini_api_key');
        if (!currentKey || currentKey === 'DUMMY_KEY') {
          localStorage.setItem('svara_gemini_api_key', res.data.api_key);
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, isFullScreen ? 140 : 100)}px`;
    }
  }, [inputMessage, isFullScreen]);

  const handleInputChangeWarga = (templateId: string, fieldKey: string, value: string) => {
    setFormDataWarga((prev: any) => ({
      ...prev,
      [templateId]: {
        ...(prev[templateId] || {}),
        [fieldKey]: value,
      },
    }));
  };

  const handleSubmitPengajuanSurat = async (template: TemplateSurat) => {
    const inputValues = formDataWarga[template.id_template] || {};

    if (!inputValues.email_warga || !inputValues.email_warga.trim()) {
      showToast('Mohon lengkapi Email Aktif Anda untuk menerima pengiriman hasil verifikasi surat!', 'warning');
      return;
    }

    let releaseDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const customAlamat = inputValues.alamat_warga?.trim() || inputValues.alamat?.trim();
    const customRt = inputValues.nomor_rt || inputValues.rt;
    const customRw = inputValues.nomor_rw || inputValues.rw;

    const defaultAlamatProfile = `${alamatWarga.dusun} ${alamatWarga.rt_rw}`.trim();
    const finalAlamatSurat = customAlamat || defaultAlamatProfile;
    const finalRtSurat = customRt || alamatWarga.nomor_rt;
    const finalRwSurat = customRw || alamatWarga.nomor_rw;

    const dataIsianLengkap = {
      releaseDate: releaseDate,
      nama_warga: inputValues.nama_warga || namaLengkapWarga,
      nik_warga: currentUser?.nik || inputValues.nik_warga || '-',
      nomor_rt: finalRtSurat,
      nomor_rw: finalRwSurat,
      alamat_warga: finalAlamatSurat,
      alamat: finalAlamatSurat,
      ...inputValues,
    };

    const payload = {
      id_template: template.id_template,
      nama_surat: template.nama_surat,
      kode_surat: template.kode_surat,
      id_desa: alamatWarga.id_desa,
      email_warga: inputValues.email_warga.trim(),
      nik_warga: currentUser?.nik || inputValues.nik_warga || null,
      nama_warga: inputValues.nama_warga || namaLengkapWarga,
      nomor_rt: finalRtSurat,
      nomor_rw: finalRwSurat,
      data_isian: dataIsianLengkap,
    };

    let generatedId = `SUB-${Date.now().toString().slice(-5)}`;
    try {
      const res = await apiService.createPengajuanSurat(payload);
      if (res && res.id_pengajuan) {
        generatedId = res.id_pengajuan;
      }
      showToast('Pengajuan surat berhasil dikirim! Silakan pantau status permohonan Anda.', 'success');
    } catch (err) {
      console.warn('Backend API offline, menyimpan ke state lokal:', err);
      showToast('Pengajuan surat disimpan ke antrean lokal.', 'info');
    }

    const newPengajuan = {
      id_pengajuan: generatedId,
      ...payload,
      status: 'PENDING',
      tanggal_pengajuan: new Date().toISOString(),
    };

    const existingList: any[] = currentDesa?.daftar_pengajuan || [];
    const pendingList = existingList.filter(
      (item) => (item.status || 'PENDING').toUpperCase() === 'PENDING'
    );
    const noAntreanCurrent = pendingList.length + 1;

    const estimasiMenit = noAntreanCurrent * 30;
    let estimasiText = 'Maksimal 1x24 Jam Kerja';
    if (estimasiMenit <= 60) {
      estimasiText = `Sekitar ${estimasiMenit} menit ke depan`;
    } else {
      const jam = Math.floor(estimasiMenit / 60);
      estimasiText = `Sekitar ${jam} jam kerja ke depan`;
    }

    if (setDataKecamatan) {
      setDataKecamatan((prev: any) => {
        const updatedDesa = (prev?.desa_kelurahan || []).map((d: any) => {
          if (
            d.id_desa === currentDesa.id_desa ||
            d.nama_desa_kelurahan === currentDesa.nama_desa_kelurahan
          ) {
            return {
              ...d,
              daftar_pengajuan: [newPengajuan, ...(d.daftar_pengajuan || [])],
            };
          }
          return d;
        });

        const newState = { ...prev, desa_kelurahan: updatedDesa };
        localStorage.setItem('svara_kecamatan_data', JSON.stringify(newState));
        localStorage.setItem('kecamatan_app_data', JSON.stringify(newState));
        return newState;
      });
    }

    window.dispatchEvent(new Event('svara_notif_updated'));

    const confirmMessage: Message = {
      id: Date.now(),
      sender: 'ai',
      text: `**PERMOHONAN SURAT BERHASIL DIKIRIM**\n\n• **No. Tiket:** \`${newPengajuan.id_pengajuan}\`\n• **Surat:** ${newPengajuan.nama_surat}\n• **Alamat Domisili:** ${finalAlamatSurat}\n• **Wilayah:** RT ${finalRtSurat} / RW ${finalRwSurat}\n• **Email Tujuan:** ${newPengajuan.email_warga}\n• **Status:** PENDING (Menunggu Verifikasi Admin Desa)\n• **Posisi Antrean:** Urutan ke-${noAntreanCurrent} di Kantor Desa ${alamatWarga.desa}\n• **Estimasi Selesai:** ${estimasiText}\n\nPermohonan Anda telah terdaftar di sistem Kantor Desa **${alamatWarga.desa}**. Petugas admin akan memproses berkas sesuai urutan pendaftaran.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, confirmMessage]);
  };

  const handleSubmitAspirasiWarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAspirasi.judul.trim() || !formAspirasi.isi.trim()) {
      showToast('Mohon lengkapi judul dan uraian aspirasi Anda!', 'warning');
      return;
    }

    const payload = {
      id_desa: alamatWarga.id_desa,
      nama_warga: namaLengkapWarga,
      nik_warga: currentUser?.nik || null,
      email_warga: currentUser?.email || null,
      no_hp_warga: currentUser?.no_hp || currentUser?.telepon || null,
      nomor_rt: alamatWarga.nomor_rt,
      nomor_rw: alamatWarga.nomor_rw,
      rt_rw: alamatWarga.rt_rw,
      dusun: currentUser?.dusun || alamatWarga.dusun || '',
      alamat_lengkap: currentUser?.alamat_lengkap || '',
      kategori: formAspirasi.kategori,
      judul: formAspirasi.judul,
      isi: formAspirasi.isi,
      lokasi: formAspirasi.lokasi || alamatWarga.rt_rw,
    };

    let generatedId = `ASP-${Date.now().toString().slice(-5)}`;
    try {
      const res = await apiService.createAspirasi(payload);
      if (res && res.id_aspirasi) {
        generatedId = res.id_aspirasi;
      }
      showToast('Aspirasi Anda berhasil disampaikan!', 'success');
    } catch (err) {
      console.warn('Backend API offline, menyimpan ke state lokal:', err);
    }

    const newAspirasiItem = {
      id_aspirasi: generatedId,
      tanggal: new Date().toISOString().split('T')[0],
      ...payload,
      pesan: `[${formAspirasi.judul}] ${formAspirasi.isi} (Lokasi: ${
        formAspirasi.lokasi || alamatWarga.rt_rw
      })`,
      status: 'Menunggu',
      diteruskan_ke: '-',
      catatan_desa: '',
    };

    if (setDataKecamatan) {
      setDataKecamatan((prev: any) => {
        const updatedAspirasiList = [newAspirasiItem, ...(prev?.aspirasi_warga || [])];
        const newState = { ...prev, aspirasi_warga: updatedAspirasiList };
        localStorage.setItem('svara_kecamatan_data', JSON.stringify(newState));
        localStorage.setItem('kecamatan_app_data', JSON.stringify(newState));
        return newState;
      });
    }

    window.dispatchEvent(new Event('svara_notif_updated'));

    const replyMsg: Message = {
      id: Date.now(),
      sender: 'ai',
      text: `**ASPIRASI BERHASIL DISAMPAIKAN**\n\n• **Kode Tiket:** \`${newAspirasiItem.id_aspirasi}\`\n• **Wilayah:** ${alamatWarga.rt_rw}\n• **Kategori:** ${newAspirasiItem.kategori}\n• **Judul:** ${formAspirasi.judul}\n\nAspirasi Anda telah diteruskan ke Admin Desa ${alamatWarga.desa}. Terima kasih.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, replyMsg]);
    setFormAspirasi({ kategori: 'Infrastruktur / Jalan', judul: '', isi: '', lokasi: '' });
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();

    const textToSend = customText || inputMessage;
    if (!textToSend.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: Message = {
      id: Date.now(),
      sender: 'user',
      text: textToSend,
      time: currentTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const result = await processChatMessage(
      textToSend,
      namaLengkapWarga,
      alamatWarga,
      currentDesa,
      templatesDesa,
      role
    );

    const finalAiText = result.text || 'Maaf, tidak ada respon dari sistem AI.';

    const aiMsg: Message = {
      id: Date.now() + 1,
      sender: 'ai',
      text: finalAiText,
      showKatalogLevel1: result.showKatalogLevel1,
      selectedCategoryGroup: result.selectedCategoryGroup,
      isAspirasiForm: result.isAspirasiForm,
      templateData: result.templateData,
      showAparaturCard: result.showAparaturCard,
      showRTRWCard: result.showRTRWCard,
      showPengumumanCard: result.showPengumumanCard,
      targetPejabat: result.targetPejabat,
      statusListOptions: result.statusListOptions,
      totalStatusCount: result.totalStatusCount,
      hasMoreStatus: result.hasMoreStatus,
      statusCardData: result.statusCardData,
      showBansosCheckWidget: result.showBansosCheckWidget,
      isBansosPengajuanForm: result.isBansosPengajuanForm,
      time: currentTime,
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const handleResetChat = () => {
    setMessages([]);
    setInputMessage('');
    setIsTyping(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleGoToHome = () => {
    setIsMenuOpen(false);
    navigate('/');
  };

  const isStarted = messages.length > 0;

  const containerStyle = isFullScreen
    ? "w-screen h-screen bg-white flex flex-col justify-between overflow-hidden font-['Product_Sans',sans-serif] relative select-none"
    : "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[999] w-[calc(100vw-32px)] sm:w-[360px] h-[540px] max-h-[82vh] bg-white rounded-[24px] border border-gray-200 shadow-2xl flex flex-col justify-between overflow-hidden font-['Product_Sans',sans-serif] select-none animate-in fade-in slide-in-from-bottom-4 duration-300";

  return (
    <>
      {!isFullScreen && !isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-[999] w-14 h-14 bg-black text-white rounded-full shadow-2xl border-2 border-white flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 group"
          title="Buka Asisten SVARA AI"
        >
          <img src={logoIcon} alt="SVARA" className="w-7 h-7 object-contain group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></span>
        </button>
      )}

      {(isFullScreen || isOpen) && (
        <div className={containerStyle}>
          
          <div className={isFullScreen ? "w-full px-3 md:px-8 py-3 flex items-center justify-between z-40 flex-none bg-white border-b border-gray-100 shadow-2xs" : "w-full px-3 py-2.5 flex items-center justify-between z-40 flex-none bg-white border-b border-gray-100 shadow-2xs"}>
            
            <div className="flex items-center gap-2 md:gap-3">
              {isFullScreen ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="group w-20 h-9 md:w-28 md:h-11 relative bg-white border border-neutral-300 rounded-[76px] overflow-hidden cursor-pointer shadow-2xs flex items-center justify-between px-3 transition-colors duration-300 z-10"
                    >
                      <div
                        className={`absolute inset-0 bg-neutral-900 transition-transform duration-300 ease-in-out pointer-events-none ${
                          isMenuOpen ? 'translate-x-0' : 'translate-x-full group-hover:translate-x-0'
                        }`}
                      />

                      <div className="relative z-10 flex flex-col justify-center items-center gap-[4px] md:gap-[5px] w-4 md:w-5 h-4 md:h-5">
                        <span
                          className={`rounded-full transition-all duration-300 ease-in-out w-4 md:w-5 h-[3px] md:h-[3.5px] ${
                            isMenuOpen
                              ? 'bg-white rotate-45 translate-y-[3.5px] md:translate-y-[4.25px]'
                              : 'bg-neutral-800 group-hover:bg-white'
                          }`}
                        />
                        <span
                          className={`rounded-full transition-all duration-300 ease-in-out w-4 md:w-5 h-[3px] md:h-[3.5px] ${
                            isMenuOpen
                              ? 'bg-white -rotate-45 -translate-y-[3.5px] md:-translate-y-[4.25px]'
                              : 'bg-neutral-800 group-hover:bg-white'
                          }`}
                        />
                      </div>

                      <div className="w-7 h-7 md:w-9 md:h-9 right-[3px] md:right-[4px] absolute bg-white border border-neutral-100 rounded-full overflow-hidden flex items-center justify-center shadow-2xs z-10">
                        <img src={logoIcon} alt="Logo" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
                      </div>
                    </div>

                    {isMenuOpen && (
                      <div 
                        className="absolute left-0 top-11 md:top-14 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl z-[9999] p-2 flex flex-col gap-1"
                      >
                        <div className="px-3 py-2 border-b border-gray-100">
                          <p className="text-xs font-bold text-gray-800">{namaDepanWarga}</p>
                          <p className="text-[10px] text-gray-400">
                            {role === 'admin' ? 'Akun Admin Desa' : `Akun Warga • ${alamatWarga.rt_rw}`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleGoToHome}
                          className="text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-xl font-medium cursor-pointer transition-colors"
                        >
                          Ke Beranda
                        </button>

                        <button
                          type="button"
                          onClick={() => { setIsMenuOpen(false); navigate('/profile'); }}
                          className="text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-xl font-medium cursor-pointer transition-colors"
                        >
                          Profile Saya
                        </button>

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-xl font-medium cursor-pointer transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full border border-neutral-200 bg-white flex items-center justify-center p-1 shadow-2xs">
                    <img src={logoIcon} alt="Logo SVARA" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}

              <span className={isFullScreen ? "text-black text-sm md:text-base font-bold tracking-tight ml-1" : "text-black text-xs font-bold tracking-tight"}>
                SVARA
              </span>

              {role === 'warga' && (
                <div className="ml-2 flex items-center">
                  <NotificationBell user={currentUser} align="left" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="text-right text-black text-xs">
                <p className="font-bold text-[10.5px] md:text-xs text-gray-900">
                  {dataKecamatan?.nama_kabupaten || 'Kab. Cirebon'}
                </p>
                <p className="text-[9px] md:text-[10px] text-gray-500">
                  Kec. {alamatWarga.kecamatan} • Desa {alamatWarga.desa}
                </p>
              </div>

              {!isFullScreen ? (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors cursor-pointer text-[10px] font-bold ml-1"
                  title="Sembunyikan Chat"
                >
                  ✕
                </button>
              ) : (
                <img
                  className="w-8 h-9 md:w-10 md:h-11 object-contain rounded-md border p-0.5 bg-white shadow-2xs"
                  src={dataKecamatan?.logo_kabupaten && !dataKecamatan.logo_kabupaten.includes('placehold.co') ? dataKecamatan.logo_kabupaten : logoDesa}
                  onError={(e) => { e.currentTarget.src = logoDesa; }}
                  alt="Logo Kabupaten"
                />
              )}
            </div>
          </div>

          <div className="flex-1 w-full overflow-y-auto flex flex-col justify-start px-3 md:px-8 [&::-webkit-scrollbar]:hidden">
            <div
              className={`w-full ${isFullScreen ? 'max-w-[680px]' : 'max-w-full'} mx-auto flex flex-col transition-all duration-700 ease-in-out ${
                isStarted ? 'my-2' : 'my-auto py-6'
              }`}
            >
              {!isStarted && (
                <div className="w-full flex flex-col items-center text-center space-y-4 px-2">
                  <h1 className={isFullScreen ? "text-lg md:text-2xl font-semibold text-black tracking-tight" : "text-sm sm:text-base font-semibold text-black tracking-tight"}>
                    {role === 'admin'
                      ? `Halo Admin ${namaDepanWarga}! Ada data desa yang ingin Anda cari?`
                      : `Halo, ${namaDepanWarga}! Ada yang bisa kami bantu hari ini?`}
                  </h1>
                  <p className={isFullScreen ? "text-black/50 text-xs max-w-md" : "text-black/50 text-[10.5px] max-w-[240px]"}>
                    {role === 'admin'
                      ? "Gunakan asisten executive AI ini untuk pencarian cepat data warga, statistik pengajuan, dan log internal desa."
                      : "Semua informasi pelayanan publik desa dapat diakses secara mudah dan transparan."}
                  </p>

                  <div className={isFullScreen ? "flex flex-col sm:flex-row items-center justify-center gap-2.5 mt-3 w-full max-w-md" : "flex flex-col gap-1.5 mt-1 w-full max-w-[240px]"}>
                    {role === 'admin' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSendMessage(undefined, 'Cek Ringkasan Pengajuan Surat Pending')}
                          className={isFullScreen ? "w-full sm:w-auto h-10 px-5 bg-neutral-800 text-white hover:bg-neutral-900 rounded-full text-xs font-medium transition-all shadow-md flex items-center justify-center cursor-pointer font-['Product_Sans']" : "w-full h-8 px-3 bg-neutral-800 text-white hover:bg-neutral-900 rounded-full text-[11px] font-medium transition-all shadow-md flex items-center justify-center cursor-pointer font-['Product_Sans']"}
                        >
                          Cek Surat Pending
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendMessage(undefined, 'Cek Rekap Laporan Aspirasi')}
                          className={isFullScreen ? "w-full sm:w-auto h-10 px-5 bg-white text-neutral-800 hover:bg-neutral-50 border border-neutral-300 rounded-full text-xs font-medium transition-all shadow-2xs flex items-center justify-center cursor-pointer font-['Product_Sans']" : "w-full h-8 px-3 bg-white text-neutral-800 hover:bg-neutral-50 border border-neutral-300 rounded-full text-[11px] font-medium transition-all shadow-2xs flex items-center justify-center cursor-pointer font-['Product_Sans']"}
                        >
                          Rekap Aspirasi
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSendMessage(undefined, 'Katalog Info & Ajukan Layanan Desa')}
                          className={isFullScreen ? "w-full sm:w-auto h-10 px-5 bg-neutral-800 text-white hover:bg-neutral-900 rounded-full text-xs font-medium transition-all shadow-md flex items-center justify-center cursor-pointer font-['Product_Sans']" : "w-full h-8 px-3 bg-neutral-800 text-white hover:bg-neutral-900 rounded-full text-[11px] font-medium transition-all shadow-md flex items-center justify-center cursor-pointer font-['Product_Sans']"}
                        >
                          Informasi & Layanan Desa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendMessage(undefined, 'Sampaikan Aspirasi Warga')}
                          className={isFullScreen ? "w-full sm:w-auto h-10 px-5 bg-white text-neutral-800 hover:bg-neutral-50 border border-neutral-300 rounded-full text-xs font-medium transition-all shadow-2xs flex items-center justify-center cursor-pointer font-['Product_Sans']" : "w-full h-8 px-3 bg-white text-neutral-800 hover:bg-neutral-50 border border-neutral-300 rounded-full text-[11px] font-medium transition-all shadow-2xs flex items-center justify-center cursor-pointer font-['Product_Sans']"}
                        >
                          Aspirasi Warga
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {isStarted && (
                <div className="w-full space-y-4 py-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={isFullScreen ? `w-full max-w-[88%] md:max-w-[78%] rounded-2xl px-4 py-3 text-xs md:text-sm shadow-2xs ${
                          msg.sender === 'user'
                            ? 'bg-neutral-800 text-white rounded-br-none'
                            : 'bg-neutral-100 text-gray-800 border border-gray-200 rounded-bl-none'
                        }` : `w-full max-w-[92%] rounded-xl px-3 py-2 text-[11px] shadow-2xs ${
                          msg.sender === 'user'
                            ? 'bg-neutral-800 text-white rounded-br-none'
                            : 'bg-neutral-100 text-gray-800 border border-gray-200 rounded-bl-none'
                        }`}
                      >
                        <div className="leading-relaxed font-['Product_Sans'] prose prose-xs max-w-full [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_code]:bg-black/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[11px]">
                          <ReactMarkdown>
                            {msg.text}
                          </ReactMarkdown>
                        </div>

                        {msg.statusCardData && (
                          <div className="mt-2">
                            <StatusCard data={msg.statusCardData} />
                          </div>
                        )}

                        {msg.statusListOptions && msg.statusListOptions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {msg.statusListOptions.map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSendMessage(undefined, opt.code)}
                                className="w-full text-left bg-white border border-gray-200 hover:border-black p-2.5 rounded-xl transition-all shadow-2xs flex items-center justify-between group cursor-pointer"
                              >
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                                    [{opt.type === 'surat' ? 'Surat' : 'Aspirasi'}] #{opt.id}
                                  </span>
                                  <p className="font-semibold text-xs text-black group-hover:text-neutral-900">
                                    {opt.title}
                                  </p>
                                </div>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    opt.status === 'APPROVED' || opt.status === 'SELESAI'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : opt.status === 'REJECTED'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {opt.status}
                                </span>
                              </button>
                            ))}

                            {msg.hasMoreStatus && (
                              <button
                                type="button"
                                onClick={() => handleSendMessage(undefined, 'LIHAT_SEMUA_STATUS')}
                                className="w-full py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[11px] font-semibold rounded-xl transition-colors text-center cursor-pointer shadow-2xs mt-1 block"
                              >
                                Lihat Semua Tiket Saya ({msg.totalStatusCount})
                              </button>
                            )}
                          </div>
                        )}

                        {msg.showAparaturCard && (
                          <div className="mt-2">
                            <AparaturCard
                              currentDesa={currentDesa}
                              mode="aparatur"
                              targetPejabatId={msg.targetPejabat || 'all'}
                              alamatWarga={alamatWarga}
                            />
                          </div>
                        )}

                        {msg.showRTRWCard && (
                          <div className="mt-2">
                            <AparaturCard
                              currentDesa={currentDesa}
                              mode="rtrw"
                              alamatWarga={alamatWarga}
                            />
                          </div>
                        )}

                        {msg.showPengumumanCard && (
                          <div className="mt-2">
                            <PengumumanCard currentDesa={currentDesa} />
                          </div>
                        )}

                        {(msg.showKatalogLevel1 || msg.selectedCategoryGroup) && (
                          <ChatKatalogOptions
                            showLevel1={msg.showKatalogLevel1}
                            selectedGroup={msg.selectedCategoryGroup}
                            templatesDesa={templatesDesa}
                            onSelectOption={(selectedText) =>
                              handleSendMessage(undefined, selectedText)
                            }
                          />
                        )}

                        {msg.templateData && (
                          <SuratFormWidget
                            templateData={msg.templateData}
                            currentUser={currentUser}
                            handleInputChangeWarga={handleInputChangeWarga}
                            handleSubmitPengajuanSurat={handleSubmitPengajuanSurat}
                          />
                        )}

                        {msg.isAspirasiForm && (
                          <AspirasiFormWidget
                            formAspirasi={formAspirasi}
                            setFormAspirasi={setFormAspirasi}
                            handleSubmitAspirasiWarga={handleSubmitAspirasiWarga}
                          />
                        )}

                        {/* 🎯 PENAMPUNG WIDGET BANSOS MENU 8 (CEK NIK) */}
                        {msg.showBansosCheckWidget && (
                          <div className="mt-3">
                            <BansosCheckWidget />
                          </div>
                        )}

                        {/* 🎯 PENAMPUNG WIDGET BANSOS MENU 9 (FORM USULAN MANDIRI) */}
                        {msg.isBansosPengajuanForm && (
                          <div className="mt-3">
                            <BansosPengajuanFormWidget currentUser={currentUser} />
                          </div>
                        )}

                        {msg.sender === 'ai' && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-200/60">
                            <button
                              type="button"
                              onClick={() => handleSendMessage(undefined, 'Menu Utama')}
                              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-full text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
                            >
                              Menu Utama
                            </button>

                            {msg.statusCardData && (
                              <button
                                type="button"
                                onClick={() => handleSendMessage(undefined, 'Informasi Status & Antrean Surat')}
                                className="px-3 py-1.5 bg-white hover:bg-neutral-200 border border-neutral-300 rounded-full text-[11px] font-medium text-neutral-800 transition-colors shadow-2xs cursor-pointer"
                              >
                                Cek Tiket Lain
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={handleResetChat}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-full text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
                            >
                              Reset Chat
                            </button>
                          </div>
                        )}

                        <span className="text-[9.5px] block mt-1 text-right text-gray-400">
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-neutral-100 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs text-gray-500 italic">
                        AI SVARA sedang mengetik...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full flex justify-center z-30 flex-none bg-transparent px-4 py-3">
            <form
              onSubmit={(e) => handleSendMessage(e)}
              className={isFullScreen ? "w-full max-w-[620px] min-h-[52px] bg-white rounded-[28px] border border-gray-300 flex items-center px-5 py-2.5 relative shadow-md focus-within:border-black transition-all duration-200" : "w-full min-h-[42px] bg-white rounded-[20px] border border-gray-300 flex items-center px-3 py-1 relative shadow-xs focus-within:border-black transition-all duration-200"}
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  role === 'admin'
                    ? "Cari data warga, NIK, rekap pengajuan, atau statistik desa..."
                    : "Ketik permohonan surat, cek status, atau info pengumuman..."
                }
                className={isFullScreen ? "w-full bg-transparent text-xs md:text-sm font-normal outline-none pr-10 font-['Product_Sans'] resize-none leading-relaxed overflow-y-auto max-h-36 py-0.5" : "w-full bg-transparent text-[11px] font-normal outline-none pr-7 font-['Product_Sans'] resize-none leading-relaxed overflow-y-auto max-h-20 py-0.5"}
              />
              <button
                type="submit"
                className={isFullScreen ? "w-8 h-8 absolute right-3 bottom-2.5 bg-black rounded-full flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition-colors shadow-2xs" : "w-6 h-6 absolute right-2 bottom-2 bg-black rounded-full flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition-colors shadow-2xs"}
              >
                <img src={iconEnter} alt="Kirim" className={isFullScreen ? "w-4 h-4 object-contain" : "w-3 h-3 object-contain"} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAI;