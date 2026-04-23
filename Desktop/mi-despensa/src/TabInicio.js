import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatearFechaHora, diasParaVencer, TIPOS_DOCUMENTO, proximosCumpleanos } from './utils';

export default function TabInicio({ hogarId, productos }) {
  const [citas, setCitas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [cumpleanos, setCumpleanos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (hogarId) cargar();
  }, [hogarId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargar = async () => {
    setCargando(true);
    const hoy = new Date().toISOString().split('T')[0];
    const en14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const en30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const [{ data: citasData }, { data: docsData }, { data: personasData }] = await Promise.all([
      supabase.from('citas').select('*, personas(nombre, emoji)').eq('hogar_id', hogarId).gte('fecha', hoy).lte('fecha', en14).order('fecha'),
      supabase.from('documentos').select('*, personas(nombre, emoji)').eq('hogar_id', hogarId).lte('fecha_vencimiento', en30).order('fecha_vencimiento'),
      supabase.from('personas').select('id, nombre, emoji, tipo, fecha_nac').eq('hogar_id', hogarId).not('fecha_nac', 'is', null),
    ]);

    setCitas(citasData || []);
    setDocumentos(docsData || []);
    setCumpleanos(proximosCumpleanos(personasData || [], 30));
    setCargando(false);
  };

  const alertasVenc = productos
    .filter(p => p.vencimiento)
    .map(p => ({ ...p, venc: diasParaVencer(p.vencimiento) }))
    .filter(p => p.venc.dias !== null && p.venc.dias <= 7)
    .sort((a, b) => a.venc.dias - b.venc.dias);

  if (cargando) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm text-gray-400">Cargando...</div>
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🔔 Vencimientos próximos</h2>
        {alertasVenc.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-400 text-center">Sin alertas de vencimiento</div>
        ) : (
          <div className="space-y-2">
            {alertasVenc.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{p.nombre}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{p.destino} · {p.cantidad} {p.unidad}</div>
                </div>
                <span className={`text-xs font-medium ${p.venc.cls}`}>{p.venc.texto}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🗓️ Próximas citas (14 días)</h2>
        {citas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-400 text-center">Sin citas próximas</div>
        ) : (
          <div className="space-y-2">
            {citas.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{c.titulo}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {c.personas?.emoji} {c.personas?.nombre}{c.lugar ? ` · ${c.lugar}` : ''}
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap text-right">
                  {formatearFechaHora(c.fecha)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {cumpleanos.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🎂 Próximos cumpleaños</h2>
          <div className="space-y-2">
            {cumpleanos.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{p.emoji} {p.nombre}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {p.fechaCumple.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <span className={`text-xs font-medium ${p.diasHastaCumple === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                  {p.diasHastaCumple === 0 ? '¡Es hoy!' : `en ${p.diasHastaCumple} día${p.diasHastaCumple !== 1 ? 's' : ''}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">📄 Documentos por vencer (30 días)</h2>
        {documentos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-400 text-center">Sin documentos por vencer</div>
        ) : (
          <div className="space-y-2">
            {documentos.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{d.nombre}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {d.personas?.emoji} {d.personas?.nombre}{d.tipo ? ` · ${TIPOS_DOCUMENTO[d.tipo] || d.tipo}` : ''}
                  </div>
                </div>
                <span className={`text-xs font-medium ${diasParaVencer(d.fecha_vencimiento).cls}`}>
                  {diasParaVencer(d.fecha_vencimiento).texto}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
