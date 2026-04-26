import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ onResult, onCerrar }) {
  const scannerRef = useRef(null);
  const containerId = 'barcode-scanner-container';
  const onResultRef = useRef(onResult);
  const onCerrarRef = useRef(onCerrar);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onCerrarRef.current = onCerrar; }, [onCerrar]);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;

    Html5Qrcode.getCameras()
      .then(cameras => {
        if (!cameras || cameras.length === 0) {
          onCerrarRef.current();
          return;
        }
        const cam = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1];
        html5QrCode.start(
          cam.id,
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            html5QrCode.stop().catch(() => {});
            onResultRef.current(decodedText);
          },
          () => {}
        ).catch(() => onCerrarRef.current());
      })
      .catch(() => onCerrarRef.current());

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[60] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Escanear código de barras</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div id={containerId} className="w-full" style={{ minHeight: 260 }} />
        <p className="text-xs text-gray-400 text-center py-3 px-4">
          Apunta la cámara al código de barras del producto
        </p>
      </div>
    </div>
  );
}
