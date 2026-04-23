import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatearFecha, formatearFechaHora, diasParaVencer, semaforoDias, TIPOS_DOCUMENTO, TIPOS_DOC_VEHICULO, proximosCumpleanos } from './utils';

const LABELS_MANT_VEH = { mantencion: 'Mantención', neumaticos: 'Neumáticos', otro: 'Otro' };

export default function TabInicio({ hogarId, productos, onNavegar }) {
  const [citas, setCitas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [cumpleanos, setCumpleanos] = useState([]);
  const [docsVehiculos, setDocsVehiculos] = useState([]);
  const [mantPendientes, setMantPendientes] = useState([]);
  const [vacunas, setVacunas] = useState([]);
  const [garantias, setGarantias] = useState([]);
  const [tareasUrgentes, setTareasUrgentes] = useState([]);
  const [comprasPendientes, setComprasPendientes] = useState(0);
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
      { data: vehDocsRaw },
      { data: mantEquipoRaw },
      { data: mantVehRaw },
      { data: vacunasData },
      { data: garantiasData },
      { data: tareasData },
      { count: comprasCount },
    ] = await Promise.all([
      // Citas: >= hoy y <= hoy+14
      supabase.from('citas')
        .select('*, personas(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .gte('fecha', hoy).lte('fecha', en14)
        .order('fecha'),

      // Docs personas: > hoy y <= hoy+30
      supabase.from('documentos')
        .select('*, personas(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .gt('fecha_vencimiento', hoy).lte('fecha_vencimiento', en30)
        .order('fecha_vencimiento'),

      // Personas para cumpleaños
      supabase.from('personas')
        .select('id, nombre, emoji, tipo, fecha_nac')
        .eq('hogar_id', hogarId)
        .not('fecha_nac', 'is', null),

      // Docs vehículos: todos los de tipo doc (filtro de fecha en client-side)
      supabase.from('vehiculo_registros')
        .select('id, tipo, fecha_vencimiento, fecha_realizacion, vehiculos(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .in('tipo', Object.keys(TIPOS_DOC_VEHICULO)),

      // Mantenciones equipos: proxima_mantencion > hoy y <= hoy+30
      supabase.from('equipo_registros')
        .select('id, equipo_id, proxima_mantencion, equipos(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .gt('proxima_mantencion', hoy).lte('proxima_mantencion', en30)
        .order('proxima_mantencion'),

      // Mantenciones vehículos: fecha_realizacion futura <= hoy+30
      supabase.from('vehiculo_registros')
        .select('id, tipo, titulo, fecha_realizacion, vehiculos(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .in('tipo', ['mantencion', 'neumaticos', 'otro'])
        .gt('fecha_realizacion', hoy).lte('fecha_realizacion', en30)
        .order('fecha_realizacion'),

      // Vacunas: proxima_dosis > hoy y <= hoy+30
      supabase.from('vacunas')
        .select('id, nombre, proxima_dosis, personas(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .gt('proxima_dosis', hoy).lte('proxima_dosis', en30)
        .order('proxima_dosis'),

      // Garantías equipos: garantia_hasta > hoy y <= hoy+60
      supabase.from('equipos')
        .select('id, nombre, emoji, garantia_hasta')
        .eq('hogar_id', hogarId)
        .eq('activo', true)
        .gt('garantia_hasta', hoy).lte('garantia_hasta', en60)
        .order('garantia_hasta'),

      // Tareas urgentes: prioridad alta, sin completar
      supabase.from('tareas')
        .select('id, titulo, fecha_limite, categoria')
        .eq('hogar_id', hogarId)
        .eq('prioridad', 'alta')
        .eq('completada', false)
        .order('fecha_limite', { ascending: true, nullsFirst: false })
        .limit(5),

      // Compras pendientes: count
      supabase.from('lista_compras')
        .select('*', { count: 'exact', head: true })
        .eq('hogar_id', hogarId)
        .eq('completado', false),
    ]);

    setCitas(citasData || []);
    setDocumentos(docsData || []);
    setCumpleanos(proximosCumpleanos(personasData || [], 30));
    setVacunas(vacunasData || []);
    setGarantias(garantiasData || []);
    setTareasUrgentes(tareasData || []);
    setComprasPendientes(comprasCount || 0);

    // Docs vehículos: usar fecha_vencimiento si existe, sino fecha_realizacion
    // Filtrar client-side: fechaEfectiva > hoy y <= en60
    const vehDocsFiltrados = (vehDocsRaw || [])
      .map(d => ({ ...d, fechaEfectiva: d.fecha_vencimiento || d.fecha_realizacion }))
      .filter(d => {
        if (!d.fechaEfectiva) return false;
        const f = String(d.fechaEfectiva).substring(0, 10);
        return f > hoy && f <= en60;
      })
      .sort((a, b) => String(a.fechaEfectiva).localeCompare(String(b.fechaEfectiva)));
    setDocsVehiculos(vehDocsFiltrados);

    // Mantenciones: merge equipo (dedup por equipo_id) + vehículo, ordenar por fecha
    const seenEquipos = new Set();
    const mantEquipos = (mantEquipoRaw || [])
      .filter(r => {
        if (seenEquipos.has(r.equipo_id)) return false;
        seenEquipos.add(r.equipo_id);
        return true;
      })
      .map(m => ({
        _key: `eq-${m.id}`,
        fechaEfectiva: m.proxima_mantencion,
        nombre: m.equipos?.nombre,
        emoji: m.equipos?.emoji || '🔧',
        subtitulo: 'Próxima mantención',
      }));

    const mantVehiculos = (mantVehRaw || []).map(m => ({
      _key: `veh-${m.id}`,
      fechaEfectiva: m.fecha_realizacion,
      nombre: m.vehiculos?.nombre,
      emoji: m.vehiculos?.emoji || '🚗',
      subtitulo: LABELS_MANT_VEH[m.tipo] || m.tipo,
    }));

    setMantPendientes(
      [...mantEquipos, ...mantVehiculos]
        .sort((a, b) => String(a.fechaEfectiva).localeCompare(String(b.fechaEfectiva)))
    );

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

  const cardCls = 'bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between';

  return (
    <div className="p-4 space-y-6">

      {/* Alimentos — siempre visible */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🔔 Vencimientos próximos</h2>
        {alertasVenc.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-400 text-center">Sin alertas de vencimiento</div>
        ) : (
          <div className="space-y-2">
            {alertasVenc.map(p => (
              <div key={p.id} className={cardCls}>
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

      {/* Tareas urgentes */}
      {tareasUrgentes.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">✅ Tareas urgentes</h2>
          <div className="space-y-2">
            {tareasUrgentes.map(t => {
              const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
              let sem = null;
              if (t.fecha_limite) {
                const lim = new Date(String(t.fecha_limite).substring(0, 10) + 'T00:00:00');
                const dias = Math.round((lim - hoy) / 86400000);
                if (dias < 0)  sem = { cls: 'text-red-600',    texto: `Venció hace ${Math.abs(dias)}d` };
                else if (dias === 0) sem = { cls: 'text-red-600', texto: 'Hoy' };
                else if (dias === 1) sem = { cls: 'text-orange-500', texto: 'Mañana' };
                else sem = { cls: 'text-gray-400', texto: `en ${dias} días` };
              }
              return (
                <div key={t.id} className={cardCls}>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t.titulo}</div>
                    {t.categoria && t.categoria !== 'general' && (
                      <div className="text-xs text-gray-400 mt-0.5">{t.categoria}</div>
                    )}
                  </div>
                  {sem
                    ? <span className={`text-xs font-medium ${sem.cls}`}>{sem.texto}</span>
                    : <span className="text-xs text-gray-400">Sin fecha</span>
                  }
                </div>
              );
            })}
          </div>
          {onNavegar && (
            <button onClick={() => onNavegar('tareas')} className="mt-2 w-full text-xs text-gray-400 hover:text-gray-600 text-center py-1 transition-colors">
              Ver todas →
            </button>
          )}
        </section>
      )}

      {/* Compras pendientes */}
      {comprasPendientes > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🛒 Lista de compras</h2>
          <div className={`${cardCls} cursor-pointer hover:border-gray-200 transition-colors`} onClick={() => onNavegar && onNavegar('compras')}>
            <div>
              <div className="text-sm font-medium text-gray-900">Items pendientes</div>
              <div className="text-xs text-gray-400 mt-0.5">Toca para ver la lista</div>
            </div>
            <span className="text-sm font-semibold text-gray-700">{comprasPendientes} →</span>
          </div>
        </section>
      )}

      {/* Citas */}
      {citas.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🗓️ Próximas citas (14 días)</h2>
          <div className="space-y-2">
            {citas.map(c => (
              <div key={c.id} className={cardCls}>
                <div>
                  <div className="text-sm font-medium text-gray-900">{c.titulo}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {c.personas?.emoji} {c.personas?.nombre}{c.lugar ? ` · ${c.lugar}` : ''}
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap text-right">{formatearFechaHora(c.fecha)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cumpleaños */}
      {cumpleanos.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🎂 Próximos cumpleaños</h2>
          <div className="space-y-2">
            {cumpleanos.map(p => (
              <div key={p.id} className={cardCls}>
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

      {/* Vacunas */}
      {vacunas.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">💉 Vacunas próximas (30 días)</h2>
          <div className="space-y-2">
            {vacunas.map(v => {
              const sem = semaforoDias(v.proxima_dosis);
              return (
                <div key={v.id} className={cardCls}>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{v.personas?.emoji} {v.personas?.nombre}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{v.nombre} · {formatearFecha(v.proxima_dosis)}</div>
                  </div>
                  <span className={`text-xs font-medium ${sem.cls}`}>{sem.texto}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Documentos vehículos */}
      {docsVehiculos.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🚗 Documentos vehículos (60 días)</h2>
          <div className="space-y-2">
            {docsVehiculos.map(d => {
              const sem = semaforoDias(d.fechaEfectiva);
              return (
                <div key={d.id} className={cardCls}>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{d.vehiculos?.emoji} {d.vehiculos?.nombre}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {TIPOS_DOC_VEHICULO[d.tipo] || d.tipo} · {formatearFecha(d.fechaEfectiva)}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${sem.cls}`}>{sem.texto}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Mantenciones pendientes */}
      {mantPendientes.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🔧 Mantenciones pendientes (30 días)</h2>
          <div className="space-y-2">
            {mantPendientes.map(m => {
              const sem = semaforoDias(m.fechaEfectiva);
              return (
                <div key={m._key} className={cardCls}>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{m.emoji} {m.nombre}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{m.subtitulo} · {formatearFecha(m.fechaEfectiva)}</div>
                  </div>
                  <span className={`text-xs font-medium ${sem.cls}`}>{sem.texto}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Garantías por vencer */}
      {garantias.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🛡️ Garantías por vencer (60 días)</h2>
          <div className="space-y-2">
            {garantias.map(g => {
              const sem = semaforoDias(g.garantia_hasta);
              return (
                <div key={g.id} className={cardCls}>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{g.emoji || '🔧'} {g.nombre}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Garantía hasta {formatearFecha(g.garantia_hasta)}</div>
                  </div>
                  <span className={`text-xs font-medium ${sem.cls}`}>{sem.texto}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Documentos personas */}
      {documentos.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">📄 Documentos por vencer (30 días)</h2>
          <div className="space-y-2">
            {documentos.map(d => (
              <div key={d.id} className={cardCls}>
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
        </section>
      )}

    </div>
  );
}
