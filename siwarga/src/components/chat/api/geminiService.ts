export const callGeminiWithFailover = async (
  userPrompt: string,
  contextInfo: string
): Promise<string> => {
  const savedConfigStr = localStorage.getItem('svara_ai_config');
  let savedConfig: any = {};
  if (savedConfigStr) {
    try {
      savedConfig = JSON.parse(savedConfigStr);
    } catch (e) {
      console.error('Gagal parse svara_ai_config:', e);
    }
  }

  const directApiKey = localStorage.getItem('svara_gemini_api_key');
  const envApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

  const keyQueue: { key: string; model: string }[] = [];

  const validGeminiModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-pro'];

  const sanitizeModel = (m?: string): string => {
    if (!m || m.includes('1.5') || m.includes('2.0') || !validGeminiModels.includes(m)) {
      return 'gemini-2.5-flash';
    }
    return m;
  };

  const chosenDefaultModel = sanitizeModel(savedConfig.model);

  if (savedConfig.apiKey && savedConfig.apiKey.trim()) {
    keyQueue.push({ key: savedConfig.apiKey.trim(), model: chosenDefaultModel });
  }
  if (directApiKey && directApiKey.trim() && !keyQueue.some((k) => k.key === directApiKey.trim())) {
    keyQueue.push({ key: directApiKey.trim(), model: chosenDefaultModel });
  }
  if (savedConfig.backupKeys && Array.isArray(savedConfig.backupKeys)) {
    savedConfig.backupKeys.forEach((item: any) => {
      if (item.key && item.key.trim() && !keyQueue.some((k) => k.key === item.key.trim())) {
        keyQueue.push({ key: item.key.trim(), model: sanitizeModel(item.model) });
      }
    });
  }
  if (envApiKey && envApiKey.trim() && !keyQueue.some((k) => k.key === envApiKey.trim())) {
    keyQueue.push({ key: envApiKey.trim(), model: 'gemini-2.5-flash' });
  }

  const staticFallback =
    savedConfig.fallbackMsg ||
    'Mohon maaf, layanan AI sedang mengalami kendala jaringan. Silakan pilih menu di bawah ini.';

  if (keyQueue.length === 0) {
    return `${staticFallback}\n\n*(Catatan System: API Key LLM belum dikonfigurasi di Super Admin)*`;
  }

  const basePrompt =
    savedConfig.systemPrompt ||
    `Anda adalah Svara AI, Asisten Digital Resmi Pelayanan Publik Desa yang ramah, komunikatif, cerdas, dan solutif.
Tugas Anda adalah membantu warga terkait informasi dan administrasi desa (seperti syarat SKTM, SKU, Domisili, SKCK, KTP, KK, Akta, bansos/DTKS, jadwal kantor desa, pengumuman, dan aspirasi).
Jawab pertanyaan seputar administrasi desa secara lengkap, terstruktur, ramah, dan solutif menggunakan standar administrasi desa di Indonesia tanpa menolak kaku.`;

  const systemInstructionText = `${basePrompt}\n\n${contextInfo}`.trim();

  for (let i = 0; i < keyQueue.length; i++) {
    const currentKey = keyQueue[i].key;
    const dashboardModel = sanitizeModel(keyQueue[i].model);

    // Daftar model aktif Google Gemini dengan auto-failover
    const modelsToTry = Array.from(
      new Set([
        dashboardModel || 'gemini-2.5-flash',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-flash-latest',
        'gemini-2.5-pro'
      ])
    );

    for (const modelName of modelsToTry) {
      try {
        console.log(`📡 Memanggil API Google Gemini: [Model: ${modelName}]...`);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${currentKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemInstructionText}\n\nPertanyaan Warga: ${userPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: savedConfig.temperature ?? 0.7,
                maxOutputTokens: 2048,
              },
            }),
          }
        );

        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          console.log(`✅ RESPONSE GEMINI SUKSES DENGAN MODEL [${modelName}]!`);
          return data.candidates[0].content.parts[0].text;
        } else {
          console.error(`❌ GEMINI API REJECTED (${modelName}):`, data);
        }
      } catch (err) {
        console.error(`💥 KONEKSI API ERROR (${modelName}):`, err);
      }
    }
  }

  return staticFallback;
};