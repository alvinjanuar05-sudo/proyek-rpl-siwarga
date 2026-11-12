import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
}

export const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({ value, size = 180 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 1.5,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('[QR Render Error]:', err);
        }
      );
    }
  }, [value, size]);

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-black/10 shadow-xs">
      <canvas ref={canvasRef} className="rounded-lg" />
      <span className="text-[10px] font-mono text-black/50 mt-1 uppercase tracking-wider">
        Kode Tiket: {value}
      </span>
    </div>
  );
};