import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QrCameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
}

export const QrCameraScanner: React.FC<QrCameraScannerProps> = ({ onScanSuccess, onScanError }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader-container',
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        if (onScanSuccess) onScanSuccess(decodedText);
      },
      (errorMessage) => {
        if (onScanError) onScanError(errorMessage);
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => console.error('[Scanner Clear Error]:', err));
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="w-full max-w-sm mx-auto p-4 bg-white rounded-2xl border border-black/10 shadow-xs space-y-3 font-['Product_Sans',sans-serif]">
      <div className="text-center">
        <h4 className="text-xs font-bold text-black">Scanner Kamera HP / Laptop</h4>
        <p className="text-[10.5px] text-black/50">Arahkan kamera ke QR Code Tiket Bansos Warga</p>
      </div>
      <div id="qr-reader-container" className="overflow-hidden rounded-xl border border-black/10" />
    </div>
  );
};