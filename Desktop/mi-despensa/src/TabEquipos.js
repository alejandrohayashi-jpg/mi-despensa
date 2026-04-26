import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatearFecha, semaforoDias } from './utils';

const TIPOS_EQUIPO = {
  aire_acondicionado: '❄️ Aire acondicionado',
  calefaccion: '🔥 Calefacción',
  calefont: '🚿 Calefont',
  lavadora: '🫧 Lavadora',
  secadora: '💨 Secadora',
  refrigerador: '🧊 Refrigerador',
  lavavajillas: '🍽️ Lavavajillas',
  televisor: '📺 Televisor',
  computador: '💻 Computador',
  otro: '🔧 Otro',
};

const EMOJI_EQUIPO = {
  aire_acondicionado: '❄️', calefaccion: '🔥', calefont: '🚿', lavadora: '🫧',
  secadora: '💨', refrigerador: '🧊', lavavajillas: '🍽️', televisor: '📺',
  computador: '💻', otro: '🔧',
};

const EMOJIS_PICKER = ['❄️','🔥','🚿','🫧','💨','🧊','🍽️','📺','💻','🔧','💡','🔌','📱','🖥️','⚙️','🏠','🛁','🎮','🧹','🔑'];

const TIPOS_REGISTRO = {
  mantencion: 'Mantención',
  reparacion: 'Reparación',
  limpieza: 'Limpieza',
  otro: 'Otro',
};

const FORM_EQUIPO_VACIO = { nombre: '', tipo: 'otro', marca: '', modelo: '', numero_serie: '', anio_compra: '', garantia_hasta: '', emoji: '🔧', notas: '' };

export default function TabEquipos({ hogarId, userId, esAdmin }) {
  const [equipos, setEquipos] = useState([]);
  const [proximaMap, setProximaMap] = useState({});
  const [equipoActivo, setEquipoActivo] = useState(null);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [mostrarFormEquipo, setMostrarFormEquipo] = useState(false);
  const [formEquipo, setFormEquipo] = useState(FORM_EQUIPO_VACIO);
  const [equipoEditando, setEquipoEditando] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [itemEditando, setItemEditando] = useState(null);
  const [errorForm, setErrorForm] = useState('');

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition mt-1';
  const labelCls = 'block text-xs font-medium text-gray-500 uppercase tracking-wide';

  useEffect(() => {
    if (hogarId) cargarEquipos();
  }, [hogarId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (equipoActivo) cargarItems();
  }, [equipoActivo]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargarEquipos = async () => {
    setCargando(true);
    const [{ data: equiposData }, { data: mantData }] = await Promise.all([
      supabase.from('equipos').select('*').eq('hogar_id', hogarId).eq('activo', true).order('nombre'),
      supabase.from('equipo_registros').select('equipo_id, proxima_mantencion').eq('hogar_id', hogarId).not('proxima_mantencion', 'is', null).order('proxima_mantencion'),
    ]);
    // Keep earliest proxima_mantencion per equipo
    const mapa = {};
    (mantData || []).forEach(r => {
      if (!mapa[r.equipo_id]) mapa[r.equipo_id] = r.proxima_mantencion;
    });
    setEquipos(equiposData || []);
    setProximaMap(mapa);
    setCargando(false);
  };

  const cargarItems = async () => {
    setCargandoItems(true);
    const { data } = await supabase
      .from('equipo_registros')
      .select('*')
      .eq('hogar_id', hogarId)
      .eq('equipo_id', equipoActivo.id)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setCargandoItems(false);
  };

  const abrirFormEquipo = (eq = null) => {
    if (eq) {
      setFormEquipo({
        nombre: eq.nombre, tipo: eq.tipo, marca: eq.marca || '', modelo: eq.modelo || '',
        numero_serie: eq.numero_serie || '', anio_compra: eq.anio_compra ? String(eq.anio_compra) : '',
        garantia_hasta: eq.garantia_hasta ? String(eq.garantia_hasta).substring(0, 10) : '',
        emoji: eq.emoji || EMOJI_EQUIPO[eq.tipo] || '🔧',
        notas: eq.notas || '',
      });
      setEquipoEditando(eq);
    } else {
      setFormEquipo(FORM_EQUIPO_VACIO);
      setEquipoEditando(null);
    }
    setMostrarFormEquipo(true);
  };

  const cerrarFormEquipo = () => {
    setMostrarFormEquipo(false);
    setFormEquipo(FORM_EQUIPO_VACIO);
    setEquipoEditando(null);
  };

  const handleGuardarEquipo = async () => {
    if (!formEquipo.nombre.trim()) return;
    const datos = {
      nombre: formEquipo.nombre.trim(),
      tipo: formEquipo.tipo,
      marca: formEquipo.marca || null,
      modelo: formEquipo.modelo || null,
      numero_serie: formEquipo.numero_serie || null,
      anio_compra: formEquipo.anio_compra ? Number(formEquipo.anio_compra) : null,
      garantia_hasta: formEquipo.garantia_hasta || null,
      emoji: formEquipo.emoji || EMOJI_EQUIPO[formEquipo.tipo] || '🔧',
      notas: formEquipo.notas || null,
    };
    if (equipoEditando) {
      await supabase.from('equipos').update(datos).eq('id', equipoEditando.id);
      if (equipoActivo?.id === equipoEditando.id) setEquipoActivo(prev => ({ ...prev, ...datos }));
    } else {
      await supabase.from('equipos').insert([{
        hogar_id: hogarId, activo: true, ...datos,
        ...(userId ? { created_by: userId } : {}),
      }]);
    }
    cerrarFormEquipo();
    cargarEquipos();
  };

  const handleGuardarItem = async () => {
    setErrorForm('');
    let datos = { ...formData };
    ['costo'].forEach(f => { if (datos[f] === '') datos[f] = null; });
    ['fecha_realizacion', 'proxima_mantencion'].forEach(f => { if (datos[f] === '') datos[f] = null; });
    let error;
    if (itemEditando) {
      const { id, hogar_id, equipo_id, created_at, created_by, ...campos } = datos; // eslint-disable-line no-unused-vars
      ({ error } = await supabase.from('equipo_registros').update(campos).eq('id', itemEditando.id));
    } else {
      ({ error } = await supabase.from('equipo_registros').insert([{
        ...datos, hogar_id: hogarId, equipo_id: equipoActivo.id,
        ...(userId ? { created_by: userId } : {}),
      }]));
    }
    if (error) { setErrorForm(error.message); return; }
    cerrarForm();
    cargarItems();
    cargarEquipos();
  };

  const handleEditarItem = (item) => {
    const data = { ...item };
    ['fecha_realizacion', 'proxima_mantencion'].forEach(f => {
      if (data[f]) data[f] = String(data[f]).substring(0, 10);
    });
    setItemEditando(item);
    setFormData(data);
    setErrorForm('');
    setMostrarForm(true);
  };

  const handleEliminarItem = async (id) => {
    await supabase.from('equipo_registros').delete().eq('id', id);
    cargarItems();
    cargarEquipos();
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setFormData({});
    setItemEditando(null);
    setErrorForm('');
  };

  const handleEliminarEquipo = async (equipo) => {
    if (!window.confirm(`¿Eliminar ${equipo.nombre}? Esto eliminará también todo su historial de mantenciones.`)) return;
    const { error } = await supabase.from('equipos').delete().eq('id', equipo.id);
    if (error) { alert('Error al eliminar: ' + error.message); return; }
    if (equipoActivo?.id === equipo.id) setEquipoActivo(null);
    cargarEquipos();
  };

  const renderForm = () => (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Tipo</label>
        <select value={formData.tipo || ''} onChange={e => setFormData({...formData, tipo: e.target.value})} className={inputCls}>
          <option value="">Selecciona...</option>
          {Object.entries(TIPOS_REGISTRO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div><label className={labelCls}>Título</label><input value={formData.titulo || ''} onChange={e => setFormData({...formData, titulo: e.target.value})} placeholder="Ej: Limpieza filtros" className={inputCls} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Fecha realización</label><input type="date" value={formData.fecha_realizacion || ''} onChange={e => setFormData({...formData, fecha_realizacion: e.target.value})} className={inputCls} /></div>
        <div><label className={labelCls}>Próxima mantención</label><input type="date" value={formData.proxima_mantencion || ''} onChange={e => setFormData({...formData, proxima_mantencion: e.target.value})} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Técnico</label><input value={formData.tecnico || ''} onChange={e => setFormData({...formData, tecnico: e.target.value})} placeholder="Ej: Juan Técnico" className={inputCls} /></div>
      <div><label className={labelCls}>Costo</label><input type="number" value={formData.costo || ''} onChange={e => setFormData({...formData, costo: e.target.value})} placeholder="Ej: 25000" className={inputCls} /></div>
      <div><label className={labelCls}>Notas</label><input value={formData.notas || ''} onChange={e => setFormData({...formData, notas: e.target.value})} placeholder="Opcional" className={inputCls} /></div>
    </div>
  );

  const renderItem = (item) => {
    const sem = semaforoDias(item.proxima_mantencion);
    const acciones = (
      <div className="flex items-center gap-1 ml-2 shrink-0">
        <button onClick={() => handleEditarItem(item)} className="text-gray-300 hover:text-gray-500 text-sm p-0.5 transition-colors">✏️</button>
        <button onClick={() => handleEliminarItem(item.id)} className="text-gray-300 hover:text-red-400 text-sm p-0.5 transition-colors">✕</button>
      </div>
    );
    return (
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-gray-900">{item.titulo || TIPOS_REGISTRO[item.tipo] || item.tipo}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {TIPOS_REGISTRO[item.tipo]}{item.fecha_realizacion ? ` · ${formatearFecha(item.fecha_realizacion)}` : ''}
          </div>
          {item.tecnico && <div className="text-xs text-gray-300 mt-0.5">{item.tecnico}</div>}
          {item.costo && <div className="text-xs text-gray-400 mt-0.5">${Number(item.costo).toLocaleString('es-CL')}</div>}
          {item.notas && <div className="text-xs text-gray-300 mt-0.5">{item.notas}</div>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          {item.proxima_mantencion && <span className={`text-xs font-medium ${sem.cls}`}>{sem.texto}</span>}
          <div className="flex gap-1">{acciones}</div>
        </div>
      </div>
    );
  };

  if (equipoActivo) {
    const eq = equipoActivo;
    return (
      <div>
        <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { setEquipoActivo(null); cerrarForm(); }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Volver</button>
            <button onClick={() => abrirFormEquipo(eq)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">✏️ Editar</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{eq.emoji || EMOJI_EQUIPO[eq.tipo] || '🔧'}</span>
            <div>
              <div className="text-base font-semibold text-gray-900">{eq.nombre}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {TIPOS_EQUIPO[eq.tipo]?.replace(/^.+? /, '')}{eq.marca ? ` · ${eq.marca}` : ''}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4">
          {cargandoItems ? (
            <div className="text-center py-10 text-sm text-gray-400">Cargando...</div>
          ) : (
            <>
              {items.length === 0 && !mostrarForm && (
                <div className="text-center py-8 text-sm text-gray-400">Sin registros aún</div>
              )}
              {items.map(item => (
                <div key={item.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-2 card-ios" style={itemEditando?.id === item.id ? { borderLeft: '3px solid var(--color-equipos)' } : undefined}>
                  {renderItem(item)}
                </div>
              ))}
              {mostrarForm ? (
                <div className="bg-white border border-gray-200 rounded-xl p-4 mt-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    {itemEditando ? 'Editar registro' : 'Nuevo registro'}
                  </div>
                  {renderForm()}
                  {errorForm && <p className="text-xs text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorForm}</p>}
                  <div className="flex gap-2 mt-4">
                    <button onClick={cerrarForm} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                    <button onClick={handleGuardarItem} className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-equipos)' }}>{itemEditando ? 'Guardar cambios' : 'Guardar'}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setMostrarForm(true); setFormData({}); setItemEditando(null); }} className="w-full py-3 mt-1 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-equipos)' }}>
                  + Agregar registro
                </button>
              )}
            </>
          )}
        </div>

        {mostrarFormEquipo && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={cerrarFormEquipo}>
            <div className="bg-white rounded-t-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Editar equipo</div>
              <FormCamposEquipo form={formEquipo} setForm={setFormEquipo} inputCls={inputCls} labelCls={labelCls} />
              <div className="flex gap-2 mt-4">
                <button onClick={cerrarFormEquipo} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleGuardarEquipo} className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-equipos)' }}>Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="text-sm font-bold mb-3" style={{ color: 'var(--color-equipos)' }}>🔧 Equipos</div>
      {cargando ? (
        <div className="text-center py-10 text-sm text-gray-400">Cargando...</div>
      ) : (
        <>
          {equipos.map(eq => {
            const proxima = proximaMap[eq.id];
            const sem = proxima ? semaforoDias(proxima) : null;
            return (
              <div key={eq.id} className="group flex items-center bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-2 hover:border-gray-200 transition-colors card-ios">
                <button onClick={() => { setEquipoActivo(eq); setItems([]); cerrarForm(); }} className="flex items-center gap-3 flex-1 text-left min-w-0">
                  <span className="text-2xl shrink-0 w-10 h-10 flex items-center justify-center rounded-xl" style={{ backgroundColor: '#5ac8fa18' }}>{eq.emoji || EMOJI_EQUIPO[eq.tipo] || '🔧'}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">{eq.nombre}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {TIPOS_EQUIPO[eq.tipo]?.replace(/^.+? /, '')}{eq.marca ? ` · ${eq.marca}` : ''}
                    </div>
                    {sem && <div className={`text-xs mt-0.5 ${sem.cls}`}>Mant. {sem.texto.toLowerCase()}</div>}
                  </div>
                </button>
                <button onClick={() => abrirFormEquipo(eq)} className="text-gray-300 hover:text-gray-500 text-sm p-1 transition-colors ml-2 shrink-0">✏️</button>
                {esAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEliminarEquipo(eq); }}
                    className="opacity-0 group-hover:opacity-100 text-base p-0.5 text-gray-300 hover:text-red-400 transition-opacity duration-150 ml-1 shrink-0"
                  >✕</button>
                )}
                <span className="text-gray-300 text-base ml-1 shrink-0">›</span>
              </div>
            );
          })}
          {mostrarFormEquipo ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 mt-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {equipoEditando ? 'Editar equipo' : 'Nuevo equipo'}
              </div>
              <FormCamposEquipo form={formEquipo} setForm={setFormEquipo} inputCls={inputCls} labelCls={labelCls} />
              <div className="flex gap-2 mt-4">
                <button onClick={cerrarFormEquipo} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleGuardarEquipo} className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-equipos)' }}>Guardar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => abrirFormEquipo()} className="w-full py-3 mt-1 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-equipos)' }}>
              + Agregar equipo
            </button>
          )}
        </>
      )}
    </div>
  );
}

function FormCamposEquipo({ form, setForm, inputCls, labelCls }) {
  return (
    <div className="space-y-3">
      <div><label className={labelCls}>Nombre</label><input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Aire sala" className={inputCls} /></div>
      <div>
        <label className={labelCls}>Tipo</label>
        <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value, emoji: EMOJI_EQUIPO[e.target.value] || '🔧'})} className={inputCls}>
          {Object.entries(TIPOS_EQUIPO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Emoji</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {EMOJIS_PICKER.map(e => (
            <button key={e} type="button" onClick={() => setForm({...form, emoji: e})}
              className={`w-9 h-9 text-lg rounded-lg transition-colors ${form.emoji === e ? 'border-2 border-gray-900 bg-gray-100' : 'border border-gray-200 bg-white hover:bg-gray-50'}`}>{e}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Marca</label><input value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} placeholder="Ej: LG" className={inputCls} /></div>
        <div><label className={labelCls}>Modelo</label><input value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} placeholder="Ej: WM1234" className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Número de serie</label><input value={form.numero_serie} onChange={e => setForm({...form, numero_serie: e.target.value})} placeholder="Opcional" className={inputCls} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Año compra</label><input type="number" value={form.anio_compra} onChange={e => setForm({...form, anio_compra: e.target.value})} placeholder="Ej: 2022" className={inputCls} /></div>
        <div><label className={labelCls}>Garantía hasta</label><input type="date" value={form.garantia_hasta} onChange={e => setForm({...form, garantia_hasta: e.target.value})} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Notas</label><input value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} placeholder="Opcional" className={inputCls} /></div>
    </div>
  );
}
