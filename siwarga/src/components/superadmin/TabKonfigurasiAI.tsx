import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface ApiKeyItem {
  id: string;
  provider: string;
  key: string;
  model: string;
  status: 'Active' | 'Backup' | 'Quota Exceeded';
}

const DEFAULT_SYSTEM_PROMPT = 
  'Anda adalah AI SVARA, Asisten Resmi Pelayanan Digital Kantor Desa Mertapada Wetan. Anda HANYA BISA membantu hal-hal yang berkaitan dengan pelayanan publik dan informasi Desa Mertapada Wetan. JIKA pengguna meminta hal di luar topik desa (koding/Python, matematika, tugas sekolah, obrolan umum di luar desa), Anda WAJIB MENOLAK secara sopan: "Mohon maaf, sebagai asisten resmi Desa Mertapada Wetan, saya hanya dapat membantu Anda terkait layanan administrasi, pengumuman, aspirasi, dan informasi seputar desa."';

const DEFAULT_FALLBACK_GUIDE = 
  'Mohon maaf, sebagai asisten resmi Desa Mertapada Wetan, saya hanya dapat membantu Anda terkait layanan administrasi, pengumuman, aspirasi, dan informasi seputar desa.';

const DEFAULT_FLASH_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

export const TabKonfigurasiAI: React.FC = () => {
  const { showToast, confirm } = useToast();
  // STATE UTAMA KONFIGURASI AI
  const [aiConfig, setAiConfig] = useState(() => {
    const saved = localStorage.getItem('svara_ai_config');
    const directKey = localStorage.getItem('svara_gemini_api_key') || '';

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          provider: parsed.provider || 'Google Gemini',
          model: parsed.model && !parsed.model.includes('2.0') && !parsed.model.includes('1.5') ? parsed.model : 'gemini-3.7-flash',
          apiKey: parsed.apiKey || directKey,
          backupKeys: parsed.backupKeys || [],
          vectorDb: parsed.vectorDb || 'Local Vector DB / Pinecone',
          fallbackMsg: parsed.fallbackMsg || DEFAULT_FALLBACK_GUIDE,
          systemPrompt: parsed.systemPrompt || DEFAULT_SYSTEM_PROMPT,
          temperature: parsed.temperature ?? 0.7,
        };
      } catch (e) {
        console.error('Gagal parse ai config', e);
      }
    }
    return {
      provider: 'Google Gemini',
      model: 'gemini-3.7-flash',
      apiKey: directKey,
      backupKeys: [] as ApiKeyItem[],
      vectorDb: 'Local Vector DB / Pinecone',
      fallbackMsg: DEFAULT_FALLBACK_GUIDE,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      temperature: 0.7,
    };
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>(DEFAULT_FLASH_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // STATE UNTUK TAMBAH API KEY CADANGAN (FAILOVER)
  const [newBackupKey, setNewBackupKey] = useState('');
  const [newBackupProvider] = useState('Google Gemini');
  const [newBackupModel, setNewBackupModel] = useState('gemini-2.0-flash');
  const [backupModelsList, setBackupModelsList] = useState<string[]>(DEFAULT_FLASH_MODELS);

  // FUNGSI INJEKSI LOG KE SUPER ADMIN
  const injectAuditLog = (aksiMsg: string) => {
    const currentAudit = JSON.parse(localStorage.getItem('svara_audit_logs') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const newAudit = {
      id: Date.now().toString(),
      waktu: new Date().toLocaleString('id-ID'),
      aktor: currentUser.nama || 'SUPER_ADMIN',
      aksi: aksiMsg,
    };
    localStorage.setItem('svara_audit_logs', JSON.stringify([newAudit, ...currentAudit]));
  };

  // 🔄 FETCH REAL-TIME MODEL DARI GOOGLE GEMINI API
  const fetchGeminiModels = async (key: string, isBackup = false) => {
    if (!key || key.trim().length < 10) {
      if (!isBackup) setAvailableModels(DEFAULT_FLASH_MODELS);
      return;
    }

    if (!isBackup) setIsLoadingModels(true);
    setFetchError('');

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'API Key tidak valid');
      }

      if (data.models) {
        const fetchedModels = data.models
          .filter((m: any) =>
            m.supportedGenerationMethods?.includes('generateContent')
          )
          .map((m: any) => m.name.replace('models/', ''));

        const mergedModels = Array.from(new Set([...DEFAULT_FLASH_MODELS, ...fetchedModels]));

        if (isBackup) {
          setBackupModelsList(mergedModels);
          if (mergedModels.length > 0 && !newBackupModel) {
            setNewBackupModel(mergedModels[0]);
          }
        } else {
          setAvailableModels(mergedModels);
          if (!aiConfig.model || !mergedModels.includes(aiConfig.model)) {
            setAiConfig((prev: any) => ({ ...prev, model: 'gemini-2.0-flash' }));
          }
        }
      }
    } catch (err: any) {
      console.error('Gagal fetch Gemini models:', err);
      if (!isBackup) {
        setAvailableModels(DEFAULT_FLASH_MODELS);
        setFetchError('⚠️ Menggunakan daftar model Gemini Flash standar.');
      }
    } finally {
      if (!isBackup) setIsLoadingModels(false);
    }
  };

  // 🔄 FETCH KONFIGURASI DARI DATABASE MYSQL PADA SAAT AWAL DIMUAT
  useEffect(() => {
    apiService.getAiConfig().then((res) => {
      if (res && res.success && res.data?.api_key && res.data.api_key !== 'DUMMY_KEY') {
        const dbKey = res.data.api_key;
        const dbModel = res.data.model_default || 'gemini-2.0-flash';
        localStorage.setItem('svara_gemini_api_key', dbKey);
        setAiConfig((prev: any) => ({
          ...prev,
          apiKey: prev.apiKey || dbKey,
          model: prev.model || dbModel,
        }));
      }
    }).catch((err) => {
      console.warn('Backend offline saat fetch konfigurasi AI:', err);
    });
  }, []);

  useEffect(() => {
    if (aiConfig.apiKey && aiConfig.provider === 'Google Gemini') {
      const timer = setTimeout(() => {
        fetchGeminiModels(aiConfig.apiKey);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [aiConfig.apiKey, aiConfig.provider]);

  useEffect(() => {
    if (newBackupKey && newBackupProvider === 'Google Gemini') {
      const timer = setTimeout(() => {
        fetchGeminiModels(newBackupKey, true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [newBackupKey, newBackupProvider]);

  // SIMPAN KONFIGURASI KE DATABASE MYSQL & LOCALSTORAGE (DUAL PERSISTENCE)
  const handleSaveConfig = async () => {
    const cleanApiKey = aiConfig.apiKey ? aiConfig.apiKey.trim() : '';
    const cleanConfig = {
      ...aiConfig,
      apiKey: cleanApiKey,
      model: aiConfig.model ? aiConfig.model.trim() : 'gemini-2.0-flash',
    };

    // 1. SIMPAN KE DATABASE MYSQL (TABEL ai_config)
    try {
      await apiService.saveAiConfig({
        api_key: cleanApiKey,
        model_default: cleanConfig.model,
      });
    } catch (e) {
      console.warn('Gagal simpan konfigurasi AI ke backend MySQL:', e);
    }

    // 2. SIMPAN PERSISTEN KE LOCALSTORAGE
    localStorage.setItem('svara_ai_config', JSON.stringify(cleanConfig));
    localStorage.setItem('svara_gemini_api_key', cleanApiKey);
    
    setAiConfig(cleanConfig);

    injectAuditLog(`Memperbarui Konfigurasi AI Engine (Provider: ${cleanConfig.provider}, Model: ${cleanConfig.model})`);
    showToast('Konfigurasi AI Engine Berhasil Disimpan ke Database MySQL & LocalStorage!', 'success');
  };

  // RESET DEFAULT
  const handleResetDefault = async () => {
    const isConfirmed = await confirm({
      title: 'Reset Konfigurasi AI',
      message: 'Apakah Anda yakin ingin mengembalikan seluruh konfigurasi AI Engine ke setelan awal pabrik?',
      confirmText: 'Ya, Reset',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (isConfirmed) {
      const defaultConfig = {
        provider: 'Google Gemini',
        model: 'gemini-2.0-flash',
        apiKey: '',
        backupKeys: [],
        vectorDb: 'Local Vector DB / Pinecone',
        fallbackMsg: DEFAULT_FALLBACK_GUIDE,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        temperature: 0.7,
      };

      try {
        await apiService.saveAiConfig({ api_key: '', model_default: 'gemini-2.0-flash' });
      } catch (e) {}

      setAiConfig(defaultConfig);
      localStorage.setItem('svara_ai_config', JSON.stringify(defaultConfig));
      localStorage.setItem('svara_gemini_api_key', '');
      injectAuditLog('Mereset Konfigurasi AI Engine ke Setelan Default Pabrik');
      showToast('Konfigurasi AI berhasil direset ke setelan awal pabrik', 'success');
    }
  };

  // TAMBAH KEY CADANGAN
  const handleAddBackupKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBackupKey.trim()) {
      showToast('Masukkan API Key cadangan!', 'warning');
      return;
    }

    const newItem: ApiKeyItem = {
      id: `KEY-${Date.now().toString().slice(-4)}`,
      provider: newBackupProvider,
      key: newBackupKey.trim(),
      model: newBackupModel || 'gemini-2.0-flash',
      status: 'Backup',
    };

    const updatedBackup = [...(aiConfig.backupKeys || []), newItem];
    const newConfig = { ...aiConfig, backupKeys: updatedBackup };

    setAiConfig(newConfig);
    localStorage.setItem('svara_ai_config', JSON.stringify(newConfig));

    injectAuditLog(`Menambahkan API Key Cadangan Failover (${newItem.provider} - ${newItem.model})`);

    setNewBackupKey('');
    setNewBackupModel('gemini-2.0-flash');
    setBackupModelsList(DEFAULT_FLASH_MODELS);
  };

  // HAPUS KEY CADANGAN
  const handleRemoveBackupKey = (id: string) => {
    const updated = (aiConfig.backupKeys || []).filter((k: ApiKeyItem) => k.id !== id);
    const newConfig = { ...aiConfig, backupKeys: updated };

    setAiConfig(newConfig);
    localStorage.setItem('svara_ai_config', JSON.stringify(newConfig));
    injectAuditLog(`Menghapus API Key Cadangan ID: ${id}`);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-2xs space-y-6 select-none font-['Product_Sans',sans-serif]">
      {/* HEADER */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
            🤖 AI Engine & Knowledge Base Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur LLM Provider, Dynamic Model Fetching, Multi-API Key Failover, dan System Prompt.
          </p>
        </div>
        <button
          onClick={handleResetDefault}
          className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors cursor-pointer self-start sm:self-auto"
        >
          Reset Setelan Awal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* PROVIDER SELECT */}
        <div>
          <label className="font-bold text-slate-700 block mb-1.5">Pilih LLM API Provider</label>
          <select
            value={aiConfig.provider}
            onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value })}
            className="w-full rounded-xl border border-slate-300 p-3 font-medium focus:border-slate-800 focus:outline-none bg-white"
          >
            <option value="Google Gemini">Google Gemini AI</option>
            <option value="OpenAI">OpenAI (ChatGPT)</option>
            <option value="Anthropic">Anthropic Claude</option>
          </select>
        </div>

        {/* API KEY INPUT UTAMA */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="font-bold text-slate-700 block">LLM API Key Utama (Real Credential)</label>
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              {showApiKey ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
          <input
            type={showApiKey ? 'text' : 'password'}
            placeholder="Paste API Key resmi (misal: AIzaSy...)"
            value={aiConfig.apiKey || ''}
            onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
            className="w-full rounded-xl border border-slate-300 p-3 font-mono text-slate-800 focus:border-slate-800 focus:outline-none"
          />
          {fetchError && <p className="text-[10px] text-red-600 font-bold mt-1">{fetchError}</p>}
        </div>

        {/* DYNAMIC MODEL SELECTOR */}
        <div className="md:col-span-2">
          <label className="font-bold text-slate-700 block mb-1.5">
            Pilih Model (Auto-Detected via API Key)
          </label>
          {isLoadingModels ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 italic">
              ⚡ Menghubungkan ke API Google & Menerima Daftar Model...
            </div>
          ) : availableModels.length > 0 ? (
            <select
              value={aiConfig.model}
              onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-3 font-medium focus:border-slate-800 focus:outline-none bg-white"
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={aiConfig.model}
              onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
              placeholder="Masukkan nama model (misal: gemini-2.0-flash)"
              className="w-full rounded-xl border border-slate-300 p-3 font-medium focus:border-slate-800 focus:outline-none"
            />
          )}
          <p className="text-[10px] text-slate-400 mt-1">
            *Daftar model terisi otomatis saat API Key valid berhasil dimasukkan.
          </p>
        </div>

        {/* SLIDER TEMPERATURE / KREATIVITAS RESPONS */}
        <div className="md:col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
          <div className="flex justify-between items-center">
            <label className="font-bold text-slate-800">Tingkat Akurasi / Temperature AI</label>
            <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded-md">
              {aiConfig.temperature}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={aiConfig.temperature}
            onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
            className="w-full accent-slate-900 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0.0 (Presisi & Kaku - Cocok Surat/Data)</span>
            <span>1.0 (Kreatif & Fleksibel - Chat Biasa)</span>
          </div>
        </div>

        {/* TABEL MULTI-API KEY FAILOVER */}
        <div className="md:col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              🔄 Multi-API Key Failover Management (Auto-Switch Cadangan)
            </h3>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {aiConfig.backupKeys?.length || 0} Key Cadangan
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Jika token/kuota pada API Key Utama habis, Chat AI akan otomatis beralih ke daftar API Key cadangan.
          </p>

          <div className="space-y-2">
            {(aiConfig.backupKeys || []).map((item: ApiKeyItem, idx: number) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400">#{idx + 1}</span>
                  <span className="font-bold text-slate-800">{item.provider}</span>
                  <span className="text-slate-400">({item.model})</span>
                  <span className="text-slate-600">
                    {item.key.slice(0, 8)}...{item.key.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    {item.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBackupKey(item.id)}
                    className="text-red-500 hover:text-red-700 font-bold px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddBackupKey} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <input
              type="password"
              placeholder="Paste API Key Cadangan..."
              value={newBackupKey}
              onChange={(e) => setNewBackupKey(e.target.value)}
              className="rounded-xl border border-slate-300 p-2 font-mono focus:border-slate-800 focus:outline-none bg-white text-xs"
            />
            {backupModelsList.length > 0 ? (
              <select
                value={newBackupModel}
                onChange={(e) => setNewBackupModel(e.target.value)}
                className="rounded-xl border border-slate-300 p-2 font-medium focus:border-slate-800 focus:outline-none bg-white text-xs"
              >
                {backupModelsList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Model (misal: gemini-2.0-flash)"
                value={newBackupModel}
                onChange={(e) => setNewBackupModel(e.target.value)}
                className="rounded-xl border border-slate-300 p-2 font-medium focus:border-slate-800 focus:outline-none bg-white text-xs"
              />
            )}
            <button
              type="submit"
              className="rounded-xl bg-slate-800 px-3 py-2 font-bold text-white hover:bg-slate-900 transition-colors cursor-pointer text-xs"
            >
              + Tambah Key Cadangan
            </button>
          </form>
        </div>

        {/* VECTOR DB */}
        <div className="md:col-span-2">
          <label className="font-bold text-slate-700 block mb-1.5">
            Vector Database & Knowledge Retrieval (RAG)
          </label>
          <input
            type="text"
            value={aiConfig.vectorDb}
            onChange={(e) => setAiConfig({ ...aiConfig, vectorDb: e.target.value })}
            className="w-full rounded-xl border border-slate-300 p-3 font-medium focus:border-slate-800 focus:outline-none"
          />
        </div>

        {/* SYSTEM PROMPT */}
        <div className="md:col-span-2">
          <label className="font-bold text-slate-700 block mb-1.5">
            System Prompt Utama AI Chatbot
          </label>
          <textarea
            rows={4}
            value={aiConfig.systemPrompt}
            onChange={(e) => setAiConfig({ ...aiConfig, systemPrompt: e.target.value })}
            className="w-full rounded-xl border border-slate-300 p-3 font-medium focus:border-slate-800 focus:outline-none leading-relaxed"
          />
        </div>

        {/* FALLBACK MESSAGE */}
        <div className="md:col-span-2">
          <label className="font-bold text-slate-700 block mb-1.5">
            Pesan Fallback (Saat Informasi Tidak Ditemukan di Database Desa)
          </label>
          <input
            type="text"
            value={aiConfig.fallbackMsg}
            onChange={(e) => setAiConfig({ ...aiConfig, fallbackMsg: e.target.value })}
            className="w-full rounded-xl border border-slate-300 p-3 font-medium focus:border-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* BUTTON ACTION */}
      <div className="pt-2">
        <button
          onClick={handleSaveConfig}
          className="rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
        >
          💾 Simpan Konfigurasi AI
        </button>
      </div>
    </div>
  );
};

export default TabKonfigurasiAI;