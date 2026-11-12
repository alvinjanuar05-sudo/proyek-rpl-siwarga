import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface NotificationItem {
  id_notifikasi: string;
  tipe: 'PENGUMUMAN' | 'ASPIRASI' | 'SURAT';
  judul: string;
  pesan: string;
  is_read: number;
  created_at: string;
  link_url?: string;
}

interface NotificationBellProps {
  user?: {
    nik?: string;
    id_user?: string;
    id_desa?: string;
    nomor_rt?: string;
    nomor_rw?: string;
  };
  align?: 'left' | 'right';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ user, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENGUMUMAN' | 'SURAT' | 'ASPIRASI'>('ALL');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast, confirm } = useToast();

  const getActiveUser = () => {
    if (user && (user.nik || user.id_user)) return user;
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : user;
    } catch {
      return user;
    }
  };

  const activeUser = getActiveUser();
  const userIdentifier = activeUser?.nik || activeUser?.id_user || 'warga';
  const storageKey = `svara_notif_${userIdentifier}`;
  const clearedStorageKey = `svara_cleared_notif_${userIdentifier}`;

  // FETCH NOTIFIKASI DARI API MYSQL + PERSISTENSI KONDISI DIBERSIHKAN
  const fetchNotif = async () => {
    try {
      setLoading(true);
      let apiNotifs: NotificationItem[] = [];

      // 1. Coba panggil REST API MySQL
      try {
        const res = await apiService.getNotifikasi({
          nik: activeUser?.nik,
          id_desa: activeUser?.id_desa || 'DESA-001',
          nomor_rt: activeUser?.nomor_rt,
          nomor_rw: activeUser?.nomor_rw,
        });
        if (res && res.success && Array.isArray(res.data)) {
          apiNotifs = res.data;
        }
      } catch (e) {
        console.warn('API Notifikasi MySQL offline/kosong, membaca storage lokal...');
      }

      // 2. Baca data Lokal & Daftar ID yang pernah dibersihkan
      const localNotifs: NotificationItem[] = JSON.parse(
        localStorage.getItem(storageKey) || '[]'
      );
      const clearedIds: string[] = JSON.parse(
        localStorage.getItem(clearedStorageKey) || '[]'
      );

      // 3. Gabungkan data dengan memprioritaskan status is_read: 1 dari lokal
      const combinedMap = new Map<string, NotificationItem>();

      // Masukkan data API terlebih dahulu
      apiNotifs.forEach((item) => {
        const id = item.id_notifikasi || `NOTIF-${Date.now()}`;
        if (!clearedIds.includes(id)) {
          combinedMap.set(id, { ...item, id_notifikasi: id });
        }
      });

      // Tindih/gabungkan dengan data lokal (jika lokal sudah dibaca, pertahankan is_read = 1)
      localNotifs.forEach((item) => {
        const id = item.id_notifikasi;
        if (id && !clearedIds.includes(id)) {
          const existing = combinedMap.get(id);
          const isReadFinal = Number(item.is_read) === 1 || Number(existing?.is_read) === 1 ? 1 : 0;
          combinedMap.set(id, {
            ...(existing || item),
            ...item,
            id_notifikasi: id,
            is_read: isReadFinal,
          });
        }
      });

      const mergedList = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(mergedList);
    } catch (err) {
      console.error('Gagal mengambil notifikasi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotif();
    const interval = setInterval(fetchNotif, 10000); // Poll setiap 10 detik

    const handleStorageChange = () => fetchNotif();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('svara_notif_updated', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('svara_notif_updated', handleStorageChange);
    };
  }, [user]);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => Number(n.is_read) === 0).length;

  const saveToStorage = (updatedList: NotificationItem[]) => {
    setNotifications(updatedList);
    localStorage.setItem(storageKey, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('svara_notif_updated'));
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiService.markNotifikasiRead(id);
    } catch (err) {
      console.warn('Gagal update status dibaca ke server, update lokal...');
    }
    const updated = notifications.map((n) =>
      n.id_notifikasi === id ? { ...n, is_read: 1 } : n
    );
    saveToStorage(updated);
  };

  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotifikasiRead(activeUser?.nik || '', activeUser?.id_desa || 'DESA-001');
    } catch (err) {
      console.warn('Gagal tandai semua dibaca ke server, update lokal...');
    }
    const updated = notifications.map((n) => ({ ...n, is_read: 1 }));
    saveToStorage(updated);
  };

  const handleClearAllNotif = async () => {
    const isConfirmed = await confirm({
      title: 'Bersihkan Notifikasi',
      message: 'Apakah Anda yakin ingin membersihkan seluruh riwayat notifikasi?',
      confirmText: 'Ya, Bersihkan',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (isConfirmed) {
      const allIds = notifications.map((n) => n.id_notifikasi);
      const existingCleared: string[] = JSON.parse(
        localStorage.getItem(clearedStorageKey) || '[]'
      );
      const updatedCleared = Array.from(new Set([...existingCleared, ...allIds]));

      localStorage.setItem(clearedStorageKey, JSON.stringify(updatedCleared));
      localStorage.removeItem(storageKey);
      setNotifications([]);
      window.dispatchEvent(new Event('svara_notif_updated'));
      showToast('Semua notifikasi berhasil dibersihkan', 'info');
    }
  };

  const handleDeleteSingleNotif = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const existingCleared: string[] = JSON.parse(
      localStorage.getItem(clearedStorageKey) || '[]'
    );
    if (!existingCleared.includes(id)) {
      existingCleared.push(id);
      localStorage.setItem(clearedStorageKey, JSON.stringify(existingCleared));
    }

    const updated = notifications.filter((n) => n.id_notifikasi !== id);
    saveToStorage(updated);
  };

  const filteredNotif = notifications.filter((n) => {
    if (filter === 'ALL') return true;
    return n.tipe === filter;
  });

  const getBadgeColor = (tipe: string) => {
    switch (tipe) {
      case 'PENGUMUMAN':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'SURAT':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'ASPIRASI':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Tombol Lonceng */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all duration-200 focus:outline-none cursor-pointer flex items-center justify-center"
        title="Notifikasi"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[9999] overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header Popover */}
          <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-800 text-xs">Notifikasi Warga</h3>
              {unreadCount > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} baru
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium transition cursor-pointer"
                >
                  Tandai dibaca
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllNotif}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-medium transition cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex px-3 pt-2 border-b border-gray-100 gap-1 bg-white text-xs">
            {(['ALL', 'PENGUMUMAN', 'SURAT', 'ASPIRASI'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-lg font-medium transition text-[11px] cursor-pointer ${
                  filter === tab
                    ? 'bg-emerald-50 text-emerald-600 font-bold'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {tab === 'ALL' ? 'Semua' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* List Notifikasi */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">Memuat notifikasi...</div>
            ) : filteredNotif.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-gray-400">Belum ada notifikasi.</p>
              </div>
            ) : (
              filteredNotif.map((item) => (
                <div
                  key={item.id_notifikasi}
                  onClick={() => handleMarkRead(item.id_notifikasi)}
                  className={`p-3.5 hover:bg-gray-50 transition cursor-pointer flex gap-3 relative group ${
                    Number(item.is_read) === 0 ? 'bg-emerald-50/20' : ''
                  }`}
                >
                  <div className="flex-1 space-y-1 pr-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-md border ${getBadgeColor(
                          item.tipe
                        )}`}
                      >
                        {item.tipe}
                      </span>
                      <span className="text-[9.5px] text-gray-400">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Baru saja'}
                      </span>
                    </div>
                    <p
                      className={`text-xs ${
                        Number(item.is_read) === 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                      }`}
                    >
                      {item.judul}
                    </p>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {item.pesan}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {Number(item.is_read) === 0 && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 self-center shrink-0"></div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSingleNotif(e, item.id_notifikasi)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 transition-opacity cursor-pointer rounded-full hover:bg-rose-50"
                      title="Hapus notifikasi ini"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};