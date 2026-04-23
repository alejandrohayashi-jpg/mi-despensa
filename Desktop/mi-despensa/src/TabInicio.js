import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatearFecha, formatearFechaHora, diasParaVencer, semaforoDias, TIPOS_DOCUMENTO, TIPOS_DOC_VEHICULO, proximosCumpleanos } from './utils';

export default function TabInicio({ hogarId, productos }) {
  const [citas, setCitas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [cumpleanos, setCumpleanos] = useState([]);
  const [docsVehiculos, setDocsVehiculos] = useState([]);
  const [mantEquipos, setMantEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (hogarId) cargar();
  }, [hogarId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargar = async () => {
    setCargando(true);
    const hoy = new Date().toISOString().split('T')[0];
    const en14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const en30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const en60 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];

    const [
      { data: citasData },
      { data: docsData },
      { data: personasData },
      { data: vehDocsData },
      { data: mantData },
    ] = await Promise.all([
      supabase.from('citas').select('*, personas(nombre, emoji)').eq('hogar_id', hogarId).gte('fecha', hoy).lte('fecha', en14).order('fecha'),
      supabase.from('documentos').select('*, personas(nombre, emoji)').eq('hogar_id', hogarId).lte('fecha_vencimiento', en30).order('fecha_vencimiento'),
      supabase.from('personas').select('id, nombre, emoji, tipo, fecha_nac').eq('hogar_id', hogarId).not('fecha_nac', 'is', null),
      supabase.from('vehiculo_registros')
        .select('id, tipo, fecha_vencimiento, vehiculos(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .in('tipo', Object.keys(TIPOS_DOC_VEHICULO))
        .lte('fecha_vencimiento', en60)
        .order('fecha_vencimiento'),
      supabase.from('equipo_registros')
        .select('id, tipo, proxima_mantencion, equipos(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .gte('proxima_mantencion', hoy)
        .lte('proxima_mantencion', en30)
        .order('proxima_mantencion'),
    ]);

    setCitas(citasData || []);
    setDocumentos(docsData || []);
    setCumpleanos(proximosCumpleanos(personasData || [], 30));

    // Deduplica vehDocsData (mantener el más reciente por tipo+vehiculo_id si hay varios)
    setDocsVehiculos(vehDocsData || []);

    // Deduplica mantEquipos: solo la más próxima por equipo
    const seen = new Set();
    const mantUnicas = (mantData || []).filter(r => {
      if (seen.has(r.equipo_id)) return false;
      seen.add(r.equipo_id);
      return true;
    });
    setMantEquipos(mantUnicas);

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
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🚗 Documentos vehículos (60 días)</h2>
        {docsVehiculos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-400 text-center">Sin documentos por vencer</div>
        ) : (
          <div className="space-y-2">
            {docsVehiculos.map(d => {
              const sem = semaforoDias(d.fecha_vencimiento);
              return (
                <div key={d.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{d.vehiculos?.emoji} {d.vehiculos?.nombre}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {TIPOS_DOC_VEHICULO[d.tipo] || d.tipo} · {formatearFecha(d.fecha_vencimiento)}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${sem.cls}`}>{sem.texto}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🔧 Mantenciones pendientes (30 días)</h2>
        {mantEquipos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-400 text-center">Sin mantenciones próximas</div>
        ) : (
          <div className="space-y-2">
            {mantEquipos.map(m => {
              const sem = semaforoDias(m.proxima_mantencion);
              return (
                <div key={m.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{m.equipos?.emoji} {m.equipos?.nombre}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Próxima mantención · {formatearFecha(m.proxima_mantencion)}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${sem.cls}`}>{sem.texto}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
