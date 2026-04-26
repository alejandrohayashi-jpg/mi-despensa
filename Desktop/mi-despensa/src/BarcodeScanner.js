import React, { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

export default function BarcodeScanner({ onResult, onCerrar }) {
  const scannerRef = useRef(null);
  const stoppedRef = useRef(false);
  const containerId = 'barcode-scanner-container';
  const onResultRef = useRef(onResult);
  const onCerrarRef = useRef(onCerrar);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onCerrarRef.current = onCerrar; }, [onCerrar]);

  useEffect(() => {
    stoppedRef.current = false;
    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;

    const config = isIOS
      ? {
          fps: 5,
          qrbox: { width: 250, height: 100 },
          aspectRatio: 1.7777778,
          formatsToSupport: FORMATS,
          experimentalFeatures: { useBarCodeDetectorIfSupported: false },
          videoConstraints: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        }
      : {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.7777778,
          formatsToSupport: FORMATS,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          videoConstraints: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

    html5QrCode.start(
      { facingMode: { exact: 'environment' } },
      config,
      (decodedText) => {
        if (stoppedRef.current) return;
        stoppedRef.current = true;
        html5QrCode.stop().catch(() => {}).finally(() => {
          onResultRef.current(decodedText);
        });
      },
      () => {}
    ).catch(() => {
      if (!stoppedRef.current) onCerrarRef.current();
    });

    return () => {
      if (!stoppedRef.current) {
        stoppedRef.current = true;
        html5QrCode.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[60] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Escanear código de barras</h3>
          <button
            type="button"
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >✕</button>
        </div>
        <div
          id={containerId}
          style={{ width: '100%', height: 300 }}
        />
        <p className="text-xs text-gray-400 text-center py-3 px-4">
          Apunta la cámara al código de barras del producto
        </p>
      </div>
    </div>
  );
}
