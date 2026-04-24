import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { diasParaVencer, TIPOS_DOC_VEHICULO, proximosCumpleanos } from './utils';

const LABELS_MANT_VEH = { mantencion: 'Mantención', neumaticos: 'Neumáticos', otro: 'Otro' };

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(String(fecha).substring(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.round((d - hoy) / 86400000);
}

function minDiasOf(arr, getD) {
  if (!arr.length) return null;
  const vals = arr.map(getD).filter(d => d !== null);
  return vals.length > 0 ? Math.min(...vals) : null;
}

function cardColors(count, minDias) {
  if (count === 0)
    return { card: 'border-gray-100 bg-white',        num: 'text-gray-300',  lbl: 'text-gray-300'  };
  if (minDias !== null && minDias <= 0)
    return { card: 'border-red-200 bg-red-50',         num: 'text-red-600',   lbl: 'text-red-500'   };
  if (minDias !== null && minDias === 1)
    return { card: 'border-orange-200 bg-orange-50',   num: 'text-orange-600',lbl: 'text-orange-500' };
  return   { card: 'border-gray-200 bg-white',         num: 'text-gray-800',  lbl: 'text-gray-500'  };
}

function semLabel(dias) {
  if (dias === null || dias === undefined)
    return { cls: 'text-gray-400', texto: 'Sin fecha' };
  if (dias < 0)
    return { cls: 'text-red-600',    texto: `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}` };
  if (dias === 0)
    return { cls: 'text-red-600',    texto: 'Hoy' };
  if (dias === 1)
    return { cls: 'text-orange-500', texto: 'Mañana' };
  return   { cls: 'text-gray-500',   texto: `en ${dias} días` };
}

export default function TabInicio({ hogarId, productos, onNavegar }) {
  const [citas, setCitas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [cumpleanos, setCumpleanos] = useState([]);
  const [docsVehiculos, setDocsVehiculos] = useState([]);
  const [mantPendientes, setMantPendientes] = useState([]);
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
      { data: tareasData },
      { count: comprasCount },
    ] = await Promise.all([
      supabase.from('citas')
        .select('*, personas(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .gte('fecha', hoy).lte('fecha', en14)
        .order('fecha'),

      supabase.from('documentos')
        .select('*, personas(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .gt('fecha_vencimiento', hoy).lte('fecha_vencimiento', en30)
        .order('fecha_vencimiento'),

      supabase.from('personas')
        .select('id, nombre, emoji, tipo, fecha_nac')
        .eq('hogar_id', hogarId)
        .not('fecha_nac', 'is', null),

      supabase.from('vehiculo_registros')
        .select('id, tipo, fecha_vencimiento, fecha_realizacion, vehiculos(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .in('tipo', Object.keys(TIPOS_DOC_VEHICULO)),

      supabase.from('equipo_registros')
        .select('id, equipo_id, proxima_mantencion, equipos(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .gt('proxima_mantencion', hoy).lte('proxima_mantencion', en30)
        .order('proxima_mantencion'),

      supabase.from('vehiculo_registros')
        .select('id, tipo, titulo, fecha_realizacion, vehiculos(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .in('tipo', ['mantencion', 'neumaticos', 'otro'])
        .gt('fecha_realizacion', hoy).lte('fecha_realizacion', en30)
        .order('fecha_realizacion'),

      supabase.from('tareas')
        .select('id, titulo, fecha_limite, categoria')
        .eq('hogar_id', hogarId)
        .eq('prioridad', 'alta')
        .eq('completada', false)
        .order('fecha_limite', { ascending: true, nullsFirst: false })
        .limit(10),

      supabase.from('lista_compras')
        .select('*', { count: 'exact', head: true })
        .eq('hogar_id', hogarId)
        .eq('completado', false),
    ]);

    setCitas(citasData || []);
    setDocumentos(docsData || []);
    setCumpleanos(proximosCumpleanos(personasData || [], 30));
    setTareasUrgentes(tareasData || []);
    setComprasPendientes(comprasCount || 0);

    const vehDocsFiltrados = (vehDocsRaw || [])
      .map(d => ({ ...d, fechaEfectiva: d.fecha_vencimiento || d.fecha_realizacion }))
      .filter(d => {
        if (!d.fechaEfectiva) return false;
        const f = String(d.fechaEfectiva).substring(0, 10);
        return f > hoy && f <= en60;
      })
      .sort((a, b) => String(a.fechaEfectiva).localeCompare(String(b.fechaEfectiva)));
    setDocsVehiculos(vehDocsFiltrados);

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

  // Fix 1: excluir agotados (cantidad=0) y pausados
  const alertasVenc = productos
    .filter(p => p.vencimiento && p.cantidad > 0 && p.modo_consumo !== 'pausado')
    .map(p => ({ ...p, venc: diasParaVencer(p.vencimiento) }))
    .filter(p => p.venc.dias !== null && p.venc.dias <= 7)
    .sort((a, b) => a.venc.dias - b.venc.dias);

  // Lista urgentes mezclada (todos los módulos), ordenada por días asc
  const urgentesAll = [
    ...alertasVenc
      .filter(p => p.venc.dias <= 3)
      .map(p => ({
        _key: `al-${p.id}`,
        dias: p.venc.dias,
        titulo: p.nombre,
        subtitulo: `${p.cantidad} ${p.unidad}`,
        tab: 'alimentos',
        icon: '🔔',
      })),
    ...citas
      .filter(c => (diasHasta(c.fecha) ?? 999) <= 3)
      .map(c => ({
        _key: `cita-${c.id}`,
        dias: diasHasta(c.fecha),
        titulo: c.titulo,
        subtitulo: c.personas?.nombre || '',
        tab: 'personas',
        icon: '📅',
      })),
    ...cumpleanos
      .filter(p => p.diasHastaCumple <= 3)
      .map(p => ({
        _key: `cumpl-${p.id}`,
        dias: p.diasHastaCumple,
        titulo: p.nombre,
        subtitulo: 'Cumpleaños',
        tab: 'personas',
        icon: '🎂',
      })),
    ...mantPendientes
      .filter(m => (diasHasta(m.fechaEfectiva) ?? 999) <= 7)
      .map(m => ({
        _key: m._key,
        dias: diasHasta(m.fechaEfectiva),
        titulo: `${m.emoji} ${m.nombre}`,
        subtitulo: m.subtitulo,
        tab: m._key.startsWith('veh-') ? 'vehiculos' : 'equipos',
        icon: '🔧',
      })),
    ...docsVehiculos
      .filter(d => (diasHasta(d.fechaEfectiva) ?? 999) <= 15)
      .map(d => ({
        _key: `vd-${d.id}`,
        dias: diasHasta(d.fechaEfectiva),
        titulo: `${d.vehiculos?.emoji || '🚗'} ${d.vehiculos?.nombre}`,
        subtitulo: TIPOS_DOC_VEHICULO[d.tipo] || d.tipo,
        tab: 'vehiculos',
        icon: '🚗',
      })),
    ...documentos
      .filter(d => {
        const r = diasParaVencer(d.fecha_vencimiento);
        return r.dias !== null && r.dias <= 7;
      })
      .map(d => {
        const r = diasParaVencer(d.fecha_vencimiento);
        return {
          _key: `doc-${d.id}`,
          dias: r.dias,
          titulo: d.nombre,
          subtitulo: d.personas?.nombre || '',
          tab: 'personas',
          icon: '📄',
        };
      }),
    ...tareasUrgentes
      .filter(t => t.fecha_limite && (diasHasta(t.fecha_limite) ?? 999) <= 1)
      .map(t => ({
        _key: `tarea-${t.id}`,
        dias: diasHasta(t.fecha_limite) ?? 0,
        titulo: t.titulo,
        subtitulo: 'Alta prioridad',
        tab: 'tareas',
        icon: '✅',
      })),
  ].sort((a, b) => (a.dias ?? 999) - (b.dias ?? 999));

  const urgentes = urgentesAll.slice(0, 5);

  // minDias por módulo para colorear las tarjetas
  const minDiasCitas  = minDiasOf(citas,         c => diasHasta(c.fecha));
  const minDiasCumpl  = minDiasOf(cumpleanos,     p => p.diasHastaCumple);
  const minDiasVeh    = minDiasOf(docsVehiculos,  d => diasHasta(d.fechaEfectiva));
  const minDiasMant   = minDiasOf(mantPendientes, m => diasHasta(m.fechaEfectiva));
  const minDiasTareas = minDiasOf(tareasUrgentes.filter(t => t.fecha_limite), t => diasHasta(t.fecha_limite));
  const minDiasDocs   = minDiasOf(documentos,     d => diasParaVencer(d.fecha_vencimiento).dias);
  const minDiasAlerta = urgentesAll.length > 0 ? (urgentesAll[0].dias ?? null) : null;

  const tarjetas = [
    { id: 'alertas',      icon: '🔔', label: 'Alertas',      tab: null,        count: urgentesAll.length,     minDias: minDiasAlerta },
    { id: 'citas',        icon: '📅', label: 'Citas',        tab: 'personas',  count: citas.length,           minDias: minDiasCitas  },
    { id: 'cumpleanos',   icon: '🎂', label: 'Cumpleaños',   tab: 'personas',  count: cumpleanos.length,      minDias: minDiasCumpl  },
    { id: 'vehiculos',    icon: '🚗', label: 'Vehículos',    tab: 'vehiculos', count: docsVehiculos.length,   minDias: minDiasVeh    },
    { id: 'mantenciones', icon: '🔧', label: 'Mantenciones', tab: 'equipos',   count: mantPendientes.length,  minDias: minDiasMant   },
    { id: 'compras',      icon: '🛒', label: 'Compras',      tab: 'compras',   count: comprasPendientes,      minDias: null          },
    { id: 'tareas',       icon: '✅', label: 'Tareas',       tab: 'tareas',    count: tareasUrgentes.length,  minDias: minDiasTareas },
    { id: 'documentos',   icon: '📄', label: 'Documentos',   tab: 'personas',  count: documentos.length,      minDias: minDiasDocs   },
  ];

  if (cargando) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm text-gray-400">Cargando...</div>
    </div>
  );

  return (
    <div className="p-4 space-y-6">

      {/* Tarjetas resumen 4x2 */}
      <section>
        <div className="grid grid-cols-4 gap-2">
          {tarjetas.map(t => {
            const { card, num, lbl } = cardColors(t.count, t.minDias);
            return (
              <button
                key={t.id}
                onClick={() => t.tab && onNavegar && onNavegar(t.tab)}
                disabled={!t.tab}
                className={`rounded-xl border-2 py-3 px-1 flex flex-col items-center justify-center text-center gap-0.5 transition-all ${card} ${t.tab ? 'active:scale-95' : ''}`}
              >
                <span className="text-xl leading-none">{t.icon}</span>
                <span className={`text-lg font-bold leading-tight ${num}`}>{t.count}</span>
                <span className={`text-[10px] font-medium leading-tight ${lbl}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Lista urgentes */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">⚡ Requiere atención pronto</h2>
        {urgentes.length === 0 ? (
          <div className="bg-green-50 rounded-xl border border-green-100 p-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm font-semibold text-green-700">Todo en orden en tu hogar</div>
            <div className="text-xs text-green-500 mt-1">No hay items urgentes</div>
          </div>
        ) : (
          <div className="space-y-2">
            {urgentes.map(u => {
              const sem = semLabel(u.dias);
              return (
                <div
                  key={u._key}
                  className={`bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between transition-colors ${u.tab ? 'cursor-pointer hover:border-gray-200' : ''}`}
                  onClick={() => u.tab && onNavegar && onNavegar(u.tab)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg flex-shrink-0">{u.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{u.titulo}</div>
                      {u.subtitulo && <div className="text-xs text-gray-400 mt-0.5 truncate">{u.subtitulo}</div>}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold flex-shrink-0 ml-3 ${sem.cls}`}>{sem.texto}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Vencimientos próximos (alimentos) */}
      {alertasVenc.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🔔 Vencimientos próximos</h2>
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
        </section>
      )}

    </div>
  );
}
