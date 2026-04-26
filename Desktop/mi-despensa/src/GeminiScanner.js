import React, { useRef, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PROMPT = `Analiza esta imagen y detecta todos los productos alimenticios que ves.
Para cada producto retorna SOLO un JSON array con este formato exacto, sin texto adicional:
[
  {
    "nombre": "Leche Entera",
    "cantidad": 2,
    "unidad": "L",
    "categoria": "Lácteos"
  }
]
Las categorías posibles son: Lácteos, Carnes, Verduras, Frutas, Bebidas, Snacks, Congelados, Conservas, Panadería, Limpieza, Higiene, Otros.
Si no detectas productos alimenticios retorna: []`;

async function imageFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function GeminiScanner({ destinos, tab, onConfirmar, onCerrar }) {
  const inputRef = useRef(null);
  const [estado, setEstado] = useState('idle'); // idle | analizando | confirmando | error
  const [productos, setProductos] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [vencimientos, setVencimientos] = useState({});
  const [destino, setDestino] = useState(destinos[0]?.nombre || 'Casa General');
  const [ubicacion, setUbicacion] = useState(tab === 'despensa' ? 'despensa' : 'refrigerador');

  const handleFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEstado('analizando');
    setErrorMsg('');

    try {
      const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
      if (!apiKey || apiKey === 'tu_clave_aqui') {
        throw new Error('Configura REACT_APP_GEMINI_API_KEY en el archivo .env');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const base64 = await imageFileToBase64(file);
      const result = await model.generateContent([
        PROMPT,
        { inlineData: { mimeType: file.type, data: base64 } },
      ]);

      const text = result.response.text().trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Respuesta inesperada de Gemini');

      const detectados = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(detectados) || detectados.length === 0) {
        setErrorMsg('No se detectaron productos. Intentá con otra foto o agregá manualmente.');
        setEstado('error');
        return;
      }

      setProductos(detectados.map((p, i) => ({ ...p, _id: i, cantidad: String(p.cantidad ?? 1) })));
      setVencimientos({});
      setEstado('confirmando');
    } catch (err) {
      setErrorMsg(err.message || 'Error al analizar la imagen.');
      setEstado('error');
    }
  };

  const handleCantidadChange = (id, delta) => {
    setProductos(prev => prev.map(p =>
      p._id === id ? { ...p, cantidad: String(Math.max(0, Number(p.cantidad) + delta)) } : p
    ));
  };

  const handleCantidadInput = (id, val) => {
    setProductos(prev => prev.map(p => p._id === id ? { ...p, cantidad: val } : p));
  };

  const handleEliminar = (id) => {
    setProductos(prev => prev.filter(p => p._id !== id));
  };

  const handleConfirmar = () => {
    const base = {
      destino,
      ubicacion,
      frecuencia_consumo: null,
      unidad_consumo: 'unidad/día',
      modo_consumo: 'manual',
    };
    const lista = productos.map(p => ({
      ...base,
      nombre: p.nombre,
      cantidad: Number(p.cantidad) || 1,
      unidad: p.unidad || 'un.',
      categoria: p.categoria || 'Otros',
      vencimiento: vencimientos[p._id] || '',
    }));
    onConfirmar(lista);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[60] px-0">
      <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-semibold text-gray-900">🤖 Escanear con IA</h3>
          <button type="button" onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* idle: botón para abrir cámara */}
          {estado === 'idle' && (
            <>
              <p className="text-xs text-gray-500">
                Toma una foto de tus productos y Gemini los detectará automáticamente.
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm flex flex-col items-center gap-2 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <span className="text-3xl">📸</span>
                <span>Tomar foto</span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFoto}
                className="hidden"
              />
            </>
          )}

          {/* analizando */}
          {estado === 'analizando' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Analizando imagen con Gemini...</p>
            </div>
          )}

          {/* error */}
          {estado === 'error' && (
            <>
              <p className="text-sm text-amber-600">{errorMsg}</p>
              <button
                type="button"
                onClick={() => { setEstado('idle'); inputRef.current && (inputRef.current.value = ''); }}
                className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Intentar de nuevo
              </button>
            </>
          )}

          {/* confirmando */}
          {estado === 'confirmando' && productos.length > 0 && (
            <>
              <p className="text-xs text-gray-500">{productos.length} producto{productos.length > 1 ? 's' : ''} detectado{productos.length > 1 ? 's' : ''}. Revisá y ajustá antes de guardar.</p>

              {/* Destino y ubicación */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Para quién es</label>
                <div className="flex gap-2 flex-wrap">
                  {destinos.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDestino(d.nombre)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        destino === d.nombre
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {d.emoji} {d.nombre}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {[{ value: 'refrigerador', label: '🧊 Refrigerador' }, { value: 'despensa', label: '🗄️ Despensa' }].map(op => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => setUbicacion(op.value)}
                    className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      ubicacion === op.value
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              {/* Lista de productos */}
              <div className="space-y-3">
                {productos.map(p => (
                  <div key={p._id} className="border border-gray-200 rounded-2xl p-3 space-y-2 card-ios">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                        <p className="text-xs text-gray-400">{p.categoria}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEliminar(p._id)}
                        className="text-gray-300 hover:text-red-400 text-sm leading-none flex-shrink-0 transition-colors"
                      >✕</button>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Stepper cantidad */}
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <button type="button" onClick={() => handleCantidadChange(p._id, -1)} className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 text-sm font-medium transition-colors">−</button>
                        <input
                          type="number"
                          value={p.cantidad}
                          onChange={e => handleCantidadInput(p._id, e.target.value)}
                          className="w-10 py-1.5 text-xs text-center text-gray-900 focus:outline-none bg-transparent"
                          style={{ MozAppearance: 'textfield' }}
                        />
                        <button type="button" onClick={() => handleCantidadChange(p._id, 1)} className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 text-sm font-medium transition-colors">+</button>
                      </div>
                      <span className="text-xs text-gray-400">{p.unidad}</span>
                      {/* Vencimiento */}
                      <input
                        type="date"
                        value={vencimientos[p._id] || ''}
                        onChange={e => setVencimientos(prev => ({ ...prev, [p._id]: e.target.value }))}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                        placeholder="Vencimiento"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {estado === 'confirmando' && productos.length > 0 && (
          <div className="flex gap-3 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              className="flex-1 py-2.5 px-4 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--color-alimentos)' }}
            >
              Agregar {productos.length} producto{productos.length > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
