import React, { useState } from 'react';

interface AILogItem {
  id: string;
  topik: string;
  status: 'SUCCESS' | 'FALLBACK';
  waktu: string;
  feedback?: 'Positif' | 'Netral' | 'Negatif';
}

export const TabAnalyticsAI: React.FC = () => {
  // MEMBACA LOG RESPONSE AI DARI LOCALSTORAGE
  const [aiLogs] = useState<AILogItem[]>(() => {
    const saved = localStorage.getItem('svara_ai_analytics_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse AI analytics logs', e);
      }
    }
    // Dummy log awal khusus 1 Desa jika localStorage masih kosong
    return [
      { id: '1', topik: 'Persyaratan Pembuatan SKTM', status: 'SUCCESS', waktu: 'Hari ini, 10:15', feedback: 'Positif' },
      { id: '2', topik: 'Jadwal Posyandu Balita RW 02', status: 'SUCCESS', waktu: 'Hari ini, 09:30', feedback: 'Positif' },
      { id: '3', topik: 'Prosedur Izin Keramaian Pernikahan', status: 'FALLBACK', waktu: 'Kemarin, 14:20', feedback: 'Netral' },
      { id: '4', topik: 'Jam Operasional Kantor Desa', status: 'SUCCESS', waktu: 'Kemarin, 11:05', feedback: 'Positif' },
    ];
  });

  const totalInteraksi = aiLogs.length;
  const totalBerhasil = aiLogs.filter((log) => log.status === 'SUCCESS').length;
  const totalFallback = aiLogs.filter((log) => log.status === 'FALLBACK').length;
  const accuracyRate = totalInteraksi > 0 ? Math.round((totalBerhasil / totalInteraksi) * 100) : 100;

  // PERHITUNGAN DINAMIS RATING FEEDBACK POSITIF
  const totalPositif = aiLogs.filter((log) => log.feedback === 'Positif').length;
  const positiveRate = totalInteraksi > 0 ? Math.round((totalPositif / totalInteraksi) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6 select-none font-['Product_Sans',sans-serif]">
      {/* HEADER */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          📈 AI Analytics & Citizen Intent
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Statistik efektivitas interaksi AI Chatbot dan tingkat kepuasan warga di wilayah desa.
        </p>
      </div>

      {/* METRIK STATISTIK DINAMIS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Jawaban Berhasil
          </span>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">{totalBerhasil} Chat</p>
          <p className="text-[10px] text-slate-400 font-medium">{accuracyRate}% Accuracy Rate</p>
        </div>

        <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Tidak Terjawab / Fallback
          </span>
          <p className="text-2xl md:text-3xl font-extrabold text-amber-600">{totalFallback} Chat</p>
          <p className="text-[10px] text-slate-400 font-medium">Perlu Pembaruan Dokumen Desa</p>
        </div>

        <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 text-center space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Feedback Positif Warga
          </span>
          <p className="text-2xl md:text-3xl font-extrabold text-blue-600">
            {positiveRate}%
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Rating "Sangat Membantu"</p>
        </div>
      </div>

      {/* DAFTAR INTENT & PERTANYAAN TERBARU WARGA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            💬 Log Interaksi & Topik Pertanyaan Warga
          </h3>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
            Total {totalInteraksi} Interaksi
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {aiLogs.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {aiLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-800">{log.topik}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Waktu: {log.waktu}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.feedback && (
                      <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                        Feedback: {log.feedback}
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {log.status === 'SUCCESS' ? 'Terjawab' : 'Fallback'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50">
              Belum ada log interaksi warga dengan AI Chatbot.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabAnalyticsAI;