import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, HelpCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  showConfirm: (options: ConfirmOptions) => void;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // STATE CUSTOM MODAL CONFIRM
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    resolvePromise?: (val: boolean) => void;
    onConfirmCallback?: () => void | Promise<void>;
    onCancelCallback?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya, Lanjutkan',
    cancelText: 'Batal',
    type: 'warning',
  });

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    // Bersihkan prefix emoji / teks bawaan alert kaku jika ada
    const formattedMessage = message
      .replace(/^(✅|⚠️|❌|📋)\s*(SUCCESS:\s*|GAGAL:\s*|PERINGATAN:\s*)?/i, '')
      .trim();

    const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message: formattedMessage || message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
      const lower = (opts.message + ' ' + (opts.title || '')).toLowerCase();
      
      const defaultType: 'danger' | 'warning' | 'info' | 'success' = 
        lower.includes('hapus') || lower.includes('keluar') || lower.includes('tolak') || lower.includes('bersihkan') || lower.includes('nonaktif')
          ? 'danger'
          : lower.includes('setujui') || lower.includes('verifikasi') || lower.includes('aktif')
          ? 'success'
          : 'warning';

      setConfirmDialog({
        isOpen: true,
        title: opts.title || (defaultType === 'danger' ? 'Konfirmasi Tindakan' : 'Konfirmasi'),
        message: opts.message,
        confirmText: opts.confirmText || (defaultType === 'danger' ? 'Ya, Lanjutkan' : defaultType === 'success' ? 'Ya, Setujui' : 'Lanjutkan'),
        cancelText: opts.cancelText || 'Batal',
        type: opts.type || defaultType,
        resolvePromise: resolve,
        onConfirmCallback: opts.onConfirm,
        onCancelCallback: opts.onCancel,
      });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    confirm(options);
  }, [confirm]);

  const handleModalConfirm = async () => {
    const cb = confirmDialog.onConfirmCallback;
    const res = confirmDialog.resolvePromise;
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    if (cb) {
      await cb();
    }
    if (res) {
      res(true);
    }
  };

  const handleModalCancel = () => {
    const cb = confirmDialog.onCancelCallback;
    const res = confirmDialog.resolvePromise;
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    if (cb) {
      cb();
    }
    if (res) {
      res(false);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast, showConfirm, confirm }}>
      {children}

      {/* 1. Modal Dialog Konfirmasi Kustom Modern */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Product_Sans',sans-serif] animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-2xl shrink-0 ${
                  confirmDialog.type === 'danger'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : confirmDialog.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}
              >
                {confirmDialog.type === 'danger' && <AlertTriangle className="w-5 h-5" />}
                {confirmDialog.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {confirmDialog.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {confirmDialog.type === 'info' && <HelpCircle className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-neutral-100 tracking-wide mb-1">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed break-words">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={handleModalCancel}
                className="px-4 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-neutral-300 transition-colors cursor-pointer"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={handleModalConfirm}
                className={`px-5 py-2 rounded-2xl text-xs font-semibold text-white shadow-lg transition-colors cursor-pointer ${
                  confirmDialog.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-950/40'
                    : confirmDialog.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/40'
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-950/40'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Container Toast Mengambang di Pojok Kanan Atas */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none font-['Product_Sans',sans-serif]">
        {toasts.map((toast) => {
          let bgBorder = 'bg-neutral-900/95 border-neutral-700/80 text-white';
          let icon = <Info className="w-4 h-4 text-blue-400 shrink-0" />;

          if (toast.type === 'success') {
            bgBorder = 'bg-neutral-950/95 border-emerald-500/40 text-neutral-100 shadow-2xl shadow-emerald-950/30';
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
          } else if (toast.type === 'error') {
            bgBorder = 'bg-neutral-950/95 border-red-500/40 text-neutral-100 shadow-2xl shadow-red-950/30';
            icon = <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
          } else if (toast.type === 'warning') {
            bgBorder = 'bg-neutral-950/95 border-amber-500/40 text-neutral-100 shadow-2xl shadow-amber-950/30';
            icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
          } else if (toast.type === 'info') {
            bgBorder = 'bg-neutral-950/95 border-blue-500/40 text-neutral-100 shadow-2xl shadow-blue-950/30';
            icon = <Info className="w-4 h-4 text-blue-400 shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${bgBorder}`}
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 text-xs leading-relaxed font-medium break-words">
                {toast.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-0.5 -mr-1 -mt-0.5 rounded-md hover:bg-neutral-800"
                aria-label="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
