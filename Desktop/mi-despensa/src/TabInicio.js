import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  formatearFecha, formatearFechaHora, diasParaVencer,
  TIPOS_DOCUMENTO, TIPOS_DOC_VEHICULO, proximosCumpleanos,
} from './utils';

const LABELS_MANT_VEH = { mantencion: 'Mantención', neumaticos: 'Neumáticos', otro: 'Otro' };
const TIPOS_CITA = { medica: 'Médica', dental: 'Dental', veterinaria: 'Veterinaria', otro: 'Otro' };
const PRIO_LABEL = { alta: 'Alta', normal: 'Normal', baja: 'Baja' };
const PRIO_CLS   = { alta: 'bg-red-50 text-red-600', normal: 'bg-amber-50 text-amber-600', baja: 'bg-green-50 text-green-600' };

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
    return { card: 'border-gray-100 bg-white',      num: 'text-gray-300',   lbl: 'text-gray-300'  };
  if (minDias !== null && minDias <= 0)
    return { card: 'border-red-200 bg-red-50',       num: 'text-red-600',    lbl: 'text-red-500'   };
  if (minDias !== null && minDias === 1)
    return { card: 'border-orange-200 bg-orange-50', num: 'text-orange-600', lbl: 'text-orange-500' };
  return   { card: 'border-gray-200 bg-white',       num: 'text-gray-800',   lbl: 'text-gray-500'  };
}

function semLabel(dias) {
  if (dias === null || dias === undefined)
    return { cls: 'text-gray-400',   texto: 'Sin fecha' };
  if (dias < 0)
    return { cls: 'text-red-600',    texto: `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}` };
  if (dias === 0)
    return { cls: 'text-red-600',    texto: 'Hoy' };
  if (dias === 1)
    return { cls: 'text-orange-500', texto: 'Mañana' };
  return   { cls: 'text-gray-500',   texto: `en ${dias} días` };
}

export default function TabInicio({ hogarId, productos, userId, onNavegar }) {
  const [citas, setCitas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [cumpleanos, setCumpleanos] = useState([]);
  const [docsVehiculos, setDocsVehiculos] = useState([]);
  const [mantPendientes, setMantPendientes] = useState([]);
  const [tareasPendientes, setTareasPendientes] = useState([]);
  const [comprasItems, setComprasItems] = useState([]);
  const [inventarioUrgente, setInventarioUrgente] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tarjetaActiva, setTarjetaActiva] = useState(null);

  useEffect(() => {
    if (hogarId) cargar();
  }, [hogarId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargar = async () => {
    setCargando(true);
    const hoy = new Date().toISOString().split('T')[0];
    const en7  = new Date(Date.now() +  7 * 86400000).toISOString().split('T')[0];
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
      { data: comprasData },
      { data: inventarioData },
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
        .select('id, tipo, fecha_vencimiento, fecha_realizacion, vehiculos(nombre, emoji, patente)')
        .eq('hogar_id', hogarId)
        .in('tipo', Object.keys(TIPOS_DOC_VEHICULO)),

      supabase.from('equipo_registros')
        .select('id, equipo_id, proxima_mantencion, titulo, equipos(nombre, emoji)')
        .eq('hogar_id', hogarId)
        .gt('proxima_mantencion', hoy).lte('proxima_mantencion', en30)
        .order('proxima_mantencion'),

      supabase.from('vehiculo_registros')
        .select('id, tipo, titulo, fecha_realizacion, lugar, vehiculos(nombre, emoji, patente)')
        .eq('hogar_id', hogarId)
        .in('tipo', ['mantencion', 'neumaticos', 'otro'])
        .gt('fecha_realizacion', hoy).lte('fecha_realizacion', en30)
        .order('fecha_realizacion'),

      supabase.from('tareas')
        .select('id, titulo, fecha_limite, categoria, prioridad, asignado_a')
        .eq('hogar_id', hogarId)
        .eq('completada', false)
        .order('fecha_limite', { ascending: true, nullsFirst: false }),

      supabase.from('lista_compras')
        .select('id, nombre, cantidad, unidad, supermercado, urgente, categoria')
        .eq('hogar_id', hogarId)
        .eq('completado', false)
        .order('supermercado', { nullsFirst: false }),

      supabase.from('inventario')
        .select('*, destinos(nombre)')
        .eq('hogar_id', hogarId)
        .gt('cantidad', 0)
        .neq('modo_consumo', 'pausado')
        .gte('fecha_vencimiento', hoy)
        .lte('fecha_vencimiento', en7)
        .order('fecha_vencimiento'),
    ]);

    setCitas(citasData || []);
    setDocumentos(docsData || []);
    setCumpleanos(proximosCumpleanos(personasData || [], 30));
    setTareasPendientes(tareasData || []);
    setComprasItems(comprasData || []);
    setInventarioUrgente(inventarioData || []);

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
        descripcion: m.titulo || null,
        lugar: null,
        patente: null,
      }));

    const mantVehiculos = (mantVehRaw || []).map(m => ({
      _key: `veh-${m.id}`,
      fechaEfectiva: m.fecha_realizacion,
      nombre: m.vehiculos?.nombre,
      emoji: m.vehiculos?.emoji || '🚗',
      patente: m.vehiculos?.patente || null,
      subtitulo: LABELS_MANT_VEH[m.tipo] || m.tipo,
      descripcion: m.titulo || null,
      lugar: m.lugar || null,
    }));

    setMantPendientes(
      [...mantEquipos, ...mantVehiculos]
        .sort((a, b) => String(a.fechaEfectiva).localeCompare(String(b.fechaEfectiva)))
    );

    setCargando(false);
  };

  // Alimentos próximos a vencer (desde tabla inventario)
  const alertasVenc = inventarioUrgente
    .map(p => ({ ...p, venc: diasParaVencer(p.fecha_vencimiento) }))
    .filter(p => p.venc.dias !== null && p.venc.dias <= 7)
    .sort((a, b) => a.venc.dias - b.venc.dias);

  const tareasUrgentes  = tareasPendientes.filter(t => t.prioridad === 'alta');
  const comprasPendientes = comprasItems.length;

  const nombreAsignado = (uid) => {
    if (!uid) return null;
    return uid === userId ? 'Yo' : `...${String(uid).slice(-6)}`;
  };

  // Lista urgentes mezclada, con subtextos ricos
  const urgentesAll = [
    ...alertasVenc
      .filter(p => p.venc.dias <= 3)
      .map(p => {
        const subtParts = [p.destinos?.nombre, `${p.cantidad} ${p.unidad}`, p.ubicacion].filter(Boolean);
        return {
          _key: `al-${p.id}`, dias: p.venc.dias, icon: '🍽️', tab: 'alimentos',
          titulo: p.nombre,
          subtitulo: subtParts.join(' · '),
          semOverride: { cls: p.venc.cls, texto: p.venc.texto },
        };
      }),
    ...citas
      .filter(c => (diasHasta(c.fecha) ?? 999) <= 3)
      .map(c => {
        const hora = c.fecha ? new Date(c.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';
        return {
          _key: `cita-${c.id}`, dias: diasHasta(c.fecha), icon: '📅', tab: 'personas',
          titulo: c.titulo,
          subtitulo: [c.personas?.nombre, c.lugar, hora].filter(Boolean).join(' · '),
        };
      }),
    ...cumpleanos
      .filter(p => p.diasHastaCumple <= 3)
      .map(p => {
        const nac = new Date(String(p.fecha_nac).substring(0, 10) + 'T00:00:00');
        const proxAge = p.fechaCumple.getFullYear() - nac.getFullYear();
        return {
          _key: `cumpl-${p.id}`, dias: p.diasHastaCumple, icon: '🎂', tab: 'personas',
          titulo: `${p.emoji} ${p.nombre}`,
          subtitulo: `Cumple ${proxAge} años`,
        };
      }),
    ...mantPendientes
      .filter(m => (diasHasta(m.fechaEfectiva) ?? 999) <= 7)
      .map(m => {
        const subParts = m._key.startsWith('veh-')
          ? [m.descripcion, m.lugar].filter(Boolean)
          : [m.subtitulo];
        return {
          _key: m._key, dias: diasHasta(m.fechaEfectiva), icon: '🔧',
          tab: m._key.startsWith('veh-') ? 'vehiculos' : 'equipos',
          titulo: `${m.emoji} ${m.nombre}`,
          subtitulo: subParts.join(' · '),
        };
      }),
    ...docsVehiculos
      .filter(d => (diasHasta(d.fechaEfectiva) ?? 999) <= 15)
      .map(d => ({
        _key: `vd-${d.id}`, dias: diasHasta(d.fechaEfectiva), icon: '🚗', tab: 'vehiculos',
        titulo: `${d.vehiculos?.emoji || '🚗'} ${d.vehiculos?.nombre}`,
        subtitulo: TIPOS_DOC_VEHICULO[d.tipo] || d.tipo,
      })),
    ...documentos
      .filter(d => {
        const r = diasParaVencer(d.fecha_vencimiento);
        return r.dias !== null && r.dias <= 7;
      })
      .map(d => {
        const r = diasParaVencer(d.fecha_vencimiento);
        const tipoLabel = TIPOS_DOCUMENTO[d.tipo] || d.tipo;
        const venceStr = d.fecha_vencimiento
          ? `Vence el ${formatearFecha(d.fecha_vencimiento)}`
          : 'Sin vencimiento';
        return {
          _key: `doc-${d.id}`, dias: r.dias, icon: '📄', tab: 'personas',
          titulo: [d.personas?.emoji, d.personas?.nombre || d.nombre].filter(Boolean).join(' '),
          subtitulo: `${tipoLabel} · ${venceStr}`,
        };
      }),
    ...tareasUrgentes
      .filter(t => t.fecha_limite && (diasHasta(t.fecha_limite) ?? 999) <= 1)
      .map(t => {
        const asig = nombreAsignado(t.asignado_a);
        return {
          _key: `tarea-${t.id}`, dias: diasHasta(t.fecha_limite) ?? 0, icon: '✅', tab: 'tareas',
          titulo: t.titulo,
          subtitulo: asig ? `Alta prioridad · ${asig}` : 'Alta prioridad',
        };
      }),
  ].sort((a, b) => (a.dias ?? 999) - (b.dias ?? 999));

  const urgentes = urgentesAll.slice(0, 5);

  const minDiasCitas  = minDiasOf(citas,         c => diasHasta(c.fecha));
  const minDiasCumpl  = minDiasOf(cumpleanos,     p => p.diasHastaCumple);
  const minDiasVeh    = minDiasOf(docsVehiculos,  d => diasHasta(d.fechaEfectiva));
  const minDiasMant   = minDiasOf(mantPendientes, m => diasHasta(m.fechaEfectiva));
  const minDiasTareas = minDiasOf(tareasUrgentes.filter(t => t.fecha_limite), t => diasHasta(t.fecha_limite));
  const minDiasDocs   = minDiasOf(documentos,     d => diasParaVencer(d.fecha_vencimiento).dias);
  const minDiasAlerta = urgentesAll.length > 0 ? (urgentesAll[0].dias ?? null) : null;

  const tarjetas = [
    { id: 'alertas',      icon: '🔔', label: 'Alertas',      tab: null,        count: urgentesAll.length,    minDias: minDiasAlerta },
    { id: 'citas',        icon: '📅', label: 'Citas',        tab: 'personas',  count: citas.length,          minDias: minDiasCitas  },
    { id: 'cumpleanos',   icon: '🎂', label: 'Cumpleaños',   tab: 'personas',  count: cumpleanos.length,     minDias: minDiasCumpl  },
    { id: 'vehiculos',    icon: '🚗', label: 'Vehículos',    tab: 'vehiculos', count: docsVehiculos.length,  minDias: minDiasVeh    },
    { id: 'mantenciones', icon: '🔧', label: 'Mantenciones', tab: 'equipos',   count: mantPendientes.length, minDias: minDiasMant   },
    { id: 'compras',      icon: '🛒', label: 'Compras',      tab: 'compras',   count: comprasPendientes,     minDias: null          },
    { id: 'tareas',       icon: '✅', label: 'Tareas',       tab: 'tareas',    count: tareasUrgentes.length, minDias: minDiasTareas },
    { id: 'documentos',   icon: '📄', label: 'Documentos',   tab: 'personas',  count: documentos.length,     minDias: minDiasDocs   },
  ];

  const vacioMsg = (msg) => (
    <div className="px-4 py-6 text-sm text-gray-400 text-center">{msg}</div>
  );

  const renderDetalle = (id) => {
    switch (id) {

      case 'alertas':
        return urgentesAll.length === 0 ? vacioMsg('No hay items urgentes') : urgentesAll.map(u => {
          const sem = u.semOverride || semLabel(u.dias);
          return (
            <div key={u._key} className={`px-4 py-3 flex items-center justify-between gap-3 ${u.tab ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
              onClick={() => u.tab && onNavegar && onNavegar(u.tab)}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base flex-shrink-0">{u.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{u.titulo}</div>
                  {u.subtitulo && <div className="text-xs text-gray-400 mt-0.5 truncate">{u.subtitulo}</div>}
                </div>
              </div>
              <span className={`text-xs font-semibold flex-shrink-0 ${sem.cls}`}>{sem.texto}</span>
            </div>
          );
        });

      case 'citas':
        return citas.length === 0 ? vacioMsg('Sin citas próximas') : citas.map(c => {
          const sem = semLabel(diasHasta(c.fecha));
          const tipoLabel = c.tipo ? (TIPOS_CITA[c.tipo] || (c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1))) : null;
          return (
            <div key={c.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900">{c.titulo}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.personas?.emoji} {c.personas?.nombre}</div>
                  {c.lugar && <div className="text-xs text-gray-400 mt-0.5">{c.lugar}</div>}
                  <div className="text-xs text-gray-400 mt-0.5">{formatearFechaHora(c.fecha)}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {tipoLabel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{tipoLabel}</span>
                  )}
                  <span className={`text-xs font-semibold ${sem.cls}`}>{sem.texto}</span>
                </div>
              </div>
            </div>
          );
        });

      case 'cumpleanos':
        return cumpleanos.length === 0 ? vacioMsg('Sin cumpleaños próximos') : cumpleanos.map(p => {
          const nac = new Date(String(p.fecha_nac).substring(0, 10) + 'T00:00:00');
          const proxAge = p.fechaCumple.getFullYear() - nac.getFullYear();
          const sem = semLabel(p.diasHastaCumple);
          return (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{p.emoji}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{p.nombre}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Cumple {proxAge} años · {p.fechaCumple.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
              </div>
              <span className={`text-xs font-semibold flex-shrink-0 ${sem.cls}`}>{sem.texto}</span>
            </div>
          );
        });

      case 'vehiculos':
        return docsVehiculos.length === 0 ? vacioMsg('Sin documentos por vencer') : docsVehiculos.map(d => {
          const sem = semLabel(diasHasta(d.fechaEfectiva));
          return (
            <div key={d.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  {d.vehiculos?.emoji} {d.vehiculos?.nombre}
                  {d.vehiculos?.patente && <span className="text-xs font-normal text-gray-400 ml-1">· {d.vehiculos.patente}</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{TIPOS_DOC_VEHICULO[d.tipo] || d.tipo}</div>
                <div className="text-xs text-gray-400 mt-0.5">{formatearFecha(d.fechaEfectiva)}</div>
              </div>
              <span className={`text-xs font-semibold flex-shrink-0 ${sem.cls}`}>{sem.texto}</span>
            </div>
          );
        });

      case 'mantenciones':
        return mantPendientes.length === 0 ? vacioMsg('Sin mantenciones próximas') : mantPendientes.map(m => {
          const sem = semLabel(diasHasta(m.fechaEfectiva));
          return (
            <div key={m._key} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  {m.emoji} {m.nombre}
                  {m.patente && <span className="text-xs font-normal text-gray-400 ml-1">· {m.patente}</span>}
                </div>
                {m.descripcion && <div className="text-xs text-gray-500 mt-0.5">{m.descripcion}</div>}
                {m.lugar && <div className="text-xs text-gray-400 mt-0.5">{m.lugar}</div>}
                <div className="text-xs text-gray-400 mt-0.5">{formatearFecha(m.fechaEfectiva)}</div>
              </div>
              <span className={`text-xs font-semibold flex-shrink-0 ${sem.cls}`}>{sem.texto}</span>
            </div>
          );
        });

      case 'compras': {
        if (comprasItems.length === 0) return vacioMsg('Sin items pendientes');
        const supers = [...new Set(comprasItems.map(i => i.supermercado || 'Sin supermercado'))];
        return supers.map(s => (
          <div key={s}>
            <div className="px-4 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wide">{s}</div>
            {comprasItems.filter(i => (i.supermercado || 'Sin supermercado') === s).map(item => (
              <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-gray-900">
                    {item.urgente && <span className="text-red-500 mr-1">⚡</span>}
                    <span className="font-medium">{item.nombre}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {item.cantidad} {item.unidad}{item.categoria ? ` · ${item.categoria}` : ''}
                  </div>
                </div>
                {item.urgente && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium flex-shrink-0">Urgente</span>
                )}
              </div>
            ))}
          </div>
        ));
      }

      case 'tareas': {
        if (tareasPendientes.length === 0) return vacioMsg('Sin tareas pendientes');
        const pOrd = { alta: 0, normal: 1, baja: 2 };
        const sorted = [...tareasPendientes].sort((a, b) => {
          const pd = (pOrd[a.prioridad] ?? 1) - (pOrd[b.prioridad] ?? 1);
          return pd !== 0 ? pd : (diasHasta(a.fecha_limite) ?? 999) - (diasHasta(b.fecha_limite) ?? 999);
        });
        return sorted.map(t => {
          const d = t.fecha_limite ? diasHasta(t.fecha_limite) : null;
          const sem = semLabel(d);
          const asig = nombreAsignado(t.asignado_a);
          return (
            <div key={t.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900">{t.titulo}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {t.categoria && t.categoria !== 'general' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{t.categoria}</span>
                  )}
                  {t.prioridad && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIO_CLS[t.prioridad] || 'bg-gray-100 text-gray-500'}`}>
                      {PRIO_LABEL[t.prioridad] || t.prioridad}
                    </span>
                  )}
                  {asig && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">👤 {asig}</span>
                  )}
                </div>
              </div>
              <span className={`text-xs font-semibold flex-shrink-0 mt-0.5 ${d !== null ? sem.cls : 'text-gray-300'}`}>
                {d !== null ? sem.texto : 'Sin fecha'}
              </span>
            </div>
          );
        });
      }

      case 'documentos':
        return documentos.length === 0 ? vacioMsg('Sin documentos por vencer') : documentos.map(d => {
          const venc = diasParaVencer(d.fecha_vencimiento);
          const tipoLabel = TIPOS_DOCUMENTO[d.tipo] || d.tipo;
          const venceStr = d.fecha_vencimiento
            ? `Vence el ${formatearFecha(d.fecha_vencimiento)}`
            : 'Sin vencimiento';
          return (
            <div key={d.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">{d.personas?.emoji} {d.personas?.nombre}</div>
                <div className="text-xs text-gray-500 mt-0.5">{tipoLabel} · {venceStr}</div>
              </div>
              <span className={`text-xs font-semibold flex-shrink-0 ${venc.cls}`}>{venc.texto}</span>
            </div>
          );
        });

      default: return null;
    }
  };

  if (cargando) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm text-gray-400">Cargando...</div>
    </div>
  );

  const tarjetaActivaInfo = tarjetas.find(t => t.id === tarjetaActiva);

  return (
    <div className="p-4 space-y-6">

      {/* Tarjetas resumen 4x2 + panel detalle */}
      <section>
        <div className="grid grid-cols-4 gap-2">
          {tarjetas.map(t => {
            const { card, num, lbl } = cardColors(t.count, t.minDias);
            const isActive = tarjetaActiva === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTarjetaActiva(isActive ? null : t.id)}
                className={`rounded-xl border-2 py-3 px-1 flex flex-col items-center justify-center text-center gap-0.5 transition-all active:scale-95 ${card} ${isActive ? 'ring-2 ring-gray-900 ring-offset-1' : ''}`}
              >
                <span className="text-xl leading-none">{t.icon}</span>
                <span className={`text-lg font-bold leading-tight ${num}`}>{t.count}</span>
                <span className={`text-[10px] font-medium leading-tight ${lbl}`}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel detalle expandible */}
        {tarjetaActiva && (
          <div className="mt-3 bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                {tarjetaActivaInfo?.icon} {tarjetaActivaInfo?.label}
              </span>
              <div className="flex items-center gap-3">
                {tarjetaActivaInfo?.tab && (
                  <button
                    onClick={() => onNavegar && onNavegar(tarjetaActivaInfo.tab)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Ver todo →
                  </button>
                )}
                <button
                  onClick={() => setTarjetaActiva(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-base leading-none"
                >✕</button>
              </div>
            </div>
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {renderDetalle(tarjetaActiva)}
            </div>
          </div>
        )}
      </section>

      {/* Lista urgentes — se oculta cuando hay detalle expandido */}
      {!tarjetaActiva && <section>
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
              const sem = u.semOverride || semLabel(u.dias);
              return (
                <div
                  key={u._key}
                  className={`bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between transition-colors ${u.tab ? 'cursor-pointer hover:border-gray-200' : ''}`}
                  onClick={() => u.tab && onNavegar && onNavegar(u.tab)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg flex-shrink-0">{u.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{u.titulo}</div>
                      {u.subtitulo && <div className="text-xs text-gray-400 mt-0.5 truncate">{u.subtitulo}</div>}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold flex-shrink-0 ml-3 ${sem.cls}`}>{sem.texto}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>}

      {/* Vencimientos próximos (alimentos) */}
      {alertasVenc.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🔔 Vencimientos próximos</h2>
          <div className="space-y-2">
            {alertasVenc.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{p.nombre}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{p.destinos?.nombre} · {p.cantidad} {p.unidad}</div>
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