import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatearFecha, semaforoDias, TIPOS_DOC_VEHICULO } from './utils';

const TIPOS_VEHICULO = {
  auto: '🚗 Auto',
  moto: '🏍️ Moto',
  camioneta: '🚙 Camioneta',
  furgon: '🚐 Furgón',
  otro: '🚘 Otro',
};

const EMOJI_VEHICULO = {
  auto: '🚗', moto: '🏍️', camioneta: '🚙', furgon: '🚐', otro: '🚘',
};

const TIPOS_MANTENCION = {
  mantencion: 'Mantención',
  neumaticos: 'Neumáticos',
  otro: 'Otro',
};

const TIPOS_MANTENCION_IDS = Object.keys(TIPOS_MANTENCION);
const TIPOS_DOC_IDS = Object.keys(TIPOS_DOC_VEHICULO);

const FORM_VEHICULO_VACIO = { nombre: '', tipo: 'auto', marca: '', modelo: '', anio: '', patente: '', color: '' };

function FormCamposVehiculo({ form, setForm, inputCls, labelCls }) {
  return (
    <div className="space-y-3">
      <div><label className={labelCls}>Nombre</label><input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Mi auto" className={inputCls} /></div>
      <div>
        <label className={labelCls}>Tipo</label>
        <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className={inputCls}>
          {Object.entries(TIPOS_VEHICULO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Marca</label><input value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} placeholder="Ej: Toyota" className={inputCls} /></div>
        <div><label className={labelCls}>Modelo</label><input value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} placeholder="Ej: Corolla" className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Año</label><input type="number" value={form.anio} onChange={e => setForm({...form, anio: e.target.value})} placeholder="Ej: 2020" className={inputCls} /></div>
        <div><label className={labelCls}>Color</label><input value={form.color} onChange={e => setForm({...form, color: e.target.value})} placeholder="Ej: Blanco" className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Patente</label><input value={form.patente} onChange={e => setForm({...form, patente: e.target.value.toUpperCase()})} placeholder="Ej: ABCD12" className={inputCls} /></div>
    </div>
  );
}

export default function TabVehiculos({ hogarId, userId, esAdmin }) {
  const [vehiculos, setVehiculos] = useState([]);
  const [vehiculoActivo, setVehiculoActivo] = useState(null);
  const [subTab, setSubTab] = useState('mantenciones');
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [mostrarFormVehiculo, setMostrarFormVehiculo] = useState(false);
  const [formVehiculo, setFormVehiculo] = useState(FORM_VEHICULO_VACIO);
  const [vehiculoEditando, setVehiculoEditando] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [itemEditando, setItemEditando] = useState(null);
  const [errorForm, setErrorForm] = useState('');

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition mt-1';
  const labelCls = 'block text-xs font-medium text-gray-500 uppercase tracking-wide';

  useEffect(() => {
    if (hogarId) cargarVehiculos();
  }, [hogarId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (vehiculoActivo) cargarItems();
  }, [vehiculoActivo]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargarVehiculos = async () => {
    setCargando(true);
    const { data } = await supabase.from('vehiculos').select('*').eq('hogar_id', hogarId).eq('activo', true).order('nombre');
    setVehiculos(data || []);
    setCargando(false);
  };

  const cargarItems = async () => {
    setCargandoItems(true);
    const { data } = await supabase
      .from('vehiculo_registros')
      .select('*')
      .eq('hogar_id', hogarId)
      .eq('vehiculo_id', vehiculoActivo.id)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setCargandoItems(false);
  };

  const abrirFormVehiculo = (v = null) => {
    if (v) {
      setFormVehiculo({
        nombre: v.nombre, tipo: v.tipo, marca: v.marca || '', modelo: v.modelo || '',
        anio: v.anio ? String(v.anio) : '', patente: v.patente || '', color: v.color || '',
      });
      setVehiculoEditando(v);
    } else {
      setFormVehiculo(FORM_VEHICULO_VACIO);
      setVehiculoEditando(null);
    }
    setMostrarFormVehiculo(true);
  };

  const cerrarFormVehiculo = () => {
    setMostrarFormVehiculo(false);
    setFormVehiculo(FORM_VEHICULO_VACIO);
    setVehiculoEditando(null);
  };

  const handleGuardarVehiculo = async () => {
    if (!formVehiculo.nombre.trim()) return;
    const datos = {
      nombre: formVehiculo.nombre.trim(),
      tipo: formVehiculo.tipo,
      marca: formVehiculo.marca || null,
      modelo: formVehiculo.modelo || null,
      anio: formVehiculo.anio ? Number(formVehiculo.anio) : null,
      patente: formVehiculo.patente || null,
      color: formVehiculo.color || null,
      emoji: EMOJI_VEHICULO[formVehiculo.tipo] || '🚗',
    };
    if (vehiculoEditando) {
      await supabase.from('vehiculos').update(datos).eq('id', vehiculoEditando.id);
      if (vehiculoActivo?.id === vehiculoEditando.id) setVehiculoActivo(prev => ({ ...prev, ...datos }));
    } else {
      await supabase.from('vehiculos').insert([{
        hogar_id: hogarId, activo: true, ...datos,
        ...(userId ? { created_by: userId } : {}),
      }]);
    }
    cerrarFormVehiculo();
    cargarVehiculos();
  };

  const handleGuardarItem = async () => {
    setErrorForm('');
    let datos = { ...formData };
    ['kilometraje', 'costo'].forEach(f => { if (datos[f] === '') datos[f] = null; });
    ['fecha_realizacion', 'fecha_vencimiento'].forEach(f => { if (datos[f] === '') datos[f] = null; });
    if (!datos.titulo) {
      datos.titulo = subTab === 'mantenciones'
        ? (TIPOS_MANTENCION[datos.tipo] || datos.tipo || 'Registro')
        : (TIPOS_DOC_VEHICULO[datos.tipo] || datos.tipo || 'Documento');
    }
    let error;
    if (itemEditando) {
      const { id, hogar_id, vehiculo_id, created_at, created_by, ...campos } = datos; // eslint-disable-line no-unused-vars
      ({ error } = await supabase.from('vehiculo_registros').update(campos).eq('id', itemEditando.id));
    } else {
      ({ error } = await supabase.from('vehiculo_registros').insert([{
        ...datos, hogar_id: hogarId, vehiculo_id: vehiculoActivo.id,
        ...(userId ? { created_by: userId } : {}),
      }]));
    }
    if (error) { setErrorForm(error.message); return; }
    cerrarForm();
    cargarItems();
  };

  const handleEditarItem = (item) => {
    const data = { ...item };
    ['fecha_realizacion', 'fecha_vencimiento'].forEach(f => {
      if (data[f]) data[f] = String(data[f]).substring(0, 10);
    });
    setItemEditando(item);
    setFormData(data);
    setErrorForm('');
    setMostrarForm(true);
  };

  const handleEliminarItem = async (id) => {
    await supabase.from('vehiculo_registros').delete().eq('id', id);
    cargarItems();
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setFormData({});
    setItemEditando(null);
    setErrorForm('');
  };

  const handleEliminarVehiculo = async (vehiculo) => {
    if (!window.confirm(`¿Eliminar ${vehiculo.nombre}? Esto eliminará también todos sus registros de mantención y documentos.`)) return;
    const { error } = await supabase.from('vehiculos').delete().eq('id', vehiculo.id);
    if (error) { alert('Error al eliminar: ' + error.message); return; }
    if (vehiculoActivo?.id === vehiculo.id) setVehiculoActivo(null);
    cargarVehiculos();
  };

  const itemsFiltrados = items.filter(i =>
    subTab === 'mantenciones' ? TIPOS_MANTENCION_IDS.includes(i.tipo) : TIPOS_DOC_IDS.includes(i.tipo)
  );

  const renderForm = () => {
    if (subTab === 'mantenciones') return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Tipo</label>
          <select value={formData.tipo || ''} onChange={e => setFormData({...formData, tipo: e.target.value})} className={inputCls}>
            <option value="">Selecciona...</option>
            {Object.entries(TIPOS_MANTENCION).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Título</label><input value={formData.titulo || ''} onChange={e => setFormData({...formData, titulo: e.target.value})} placeholder="Ej: Cambio de aceite" className={inputCls} /></div>
        <div><label className={labelCls}>Fecha realización</label><input type="date" value={formData.fecha_realizacion || ''} onChange={e => setFormData({...formData, fecha_realizacion: e.target.value})} className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Kilometraje</label><input type="number" value={formData.kilometraje || ''} onChange={e => setFormData({...formData, kilometraje: e.target.value})} placeholder="Ej: 50000" className={inputCls} /></div>
          <div><label className={labelCls}>Costo</label><input type="number" value={formData.costo || ''} onChange={e => setFormData({...formData, costo: e.target.value})} placeholder="Ej: 45000" className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Lugar</label><input value={formData.lugar || ''} onChange={e => setFormData({...formData, lugar: e.target.value})} placeholder="Ej: Taller Midas" className={inputCls} /></div>
        <div><label className={labelCls}>Notas</label><input value={formData.notas || ''} onChange={e => setFormData({...formData, notas: e.target.value})} placeholder="Opcional" className={inputCls} /></div>
      </div>
    );
    return (
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Tipo</label>
          <select value={formData.tipo || ''} onChange={e => setFormData({...formData, tipo: e.target.value})} className={inputCls}>
            <option value="">Selecciona...</option>
            {Object.entries(TIPOS_DOC_VEHICULO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Fecha realización</label><input type="date" value={formData.fecha_realizacion || ''} onChange={e => setFormData({...formData, fecha_realizacion: e.target.value})} className={inputCls} /></div>
          <div><label className={labelCls}>Fecha vencimiento</label><input type="date" value={formData.fecha_vencimiento || ''} onChange={e => setFormData({...formData, fecha_vencimiento: e.target.value})} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Costo</label><input type="number" value={formData.costo || ''} onChange={e => setFormData({...formData, costo: e.target.value})} placeholder="Ej: 30000" className={inputCls} /></div>
        <div><label className={labelCls}>Notas</label><input value={formData.notas || ''} onChange={e => setFormData({...formData, notas: e.target.value})} placeholder="Opcional" className={inputCls} /></div>
      </div>
    );
  };

  const renderItem = (item) => {
    const acciones = (
      <div className="flex items-center gap-1 ml-2 shrink-0">
        <button onClick={() => handleEditarItem(item)} className="text-gray-300 hover:text-gray-500 text-sm p-0.5 transition-colors">✏️</button>
        <button onClick={() => handleEliminarItem(item.id)} className="text-gray-300 hover:text-red-400 text-sm p-0.5 transition-colors">✕</button>
      </div>
    );
    if (subTab === 'mantenciones') return (
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-gray-900">{item.titulo || TIPOS_MANTENCION[item.tipo] || item.tipo}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {TIPOS_MANTENCION[item.tipo]}{item.fecha_realizacion ? ` · ${formatearFecha(item.fecha_realizacion)}` : ''}
          </div>
          {item.kilometraje && <div className="text-xs text-gray-400 mt-0.5">{Number(item.kilometraje).toLocaleString('es-CL')} km</div>}
          {item.lugar && <div className="text-xs text-gray-300 mt-0.5">{item.lugar}</div>}
          {item.costo && <div className="text-xs text-gray-400 mt-0.5">${Number(item.costo).toLocaleString('es-CL')}</div>}
        </div>
        {acciones}
      </div>
    );
    const sem = semaforoDias(item.fecha_vencimiento);
    return (
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-gray-900">{TIPOS_DOC_VEHICULO[item.tipo] || item.tipo}</div>
          {item.fecha_realizacion && <div className="text-xs text-gray-400 mt-0.5">Realizado: {formatearFecha(item.fecha_realizacion)}</div>}
          {item.costo && <div className="text-xs text-gray-400 mt-0.5">${Number(item.costo).toLocaleString('es-CL')}</div>}
          {item.notas && <div className="text-xs text-gray-300 mt-0.5">{item.notas}</div>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          {item.fecha_vencimiento && <span className={`text-xs font-medium ${sem.cls}`}>{sem.texto}</span>}
          <div className="flex gap-1">{acciones}</div>
        </div>
      </div>
    );
  };

  const SUB_TABS = [
    { id: 'mantenciones', label: '🔧 Mantenciones' },
    { id: 'documentos', label: '📄 Documentos' },
  ];

  if (vehiculoActivo) {
    const veh = vehiculoActivo;
    return (
      <div>
        <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { setVehiculoActivo(null); cerrarForm(); }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Volver</button>
            <button onClick={() => abrirFormVehiculo(veh)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">✏️ Editar</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{veh.emoji || EMOJI_VEHICULO[veh.tipo] || '🚗'}</span>
            <div>
              <div className="text-base font-semibold text-gray-900">{veh.nombre}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {[veh.marca, veh.modelo].filter(Boolean).join(' ')}{veh.patente ? ` · ${veh.patente}` : ''}
              </div>
            </div>
          </div>
        </div>
        <div className="flex bg-white border-b border-gray-100">
          {SUB_TABS.map(t => (
            <button key={t.id} onClick={() => { setSubTab(t.id); cerrarForm(); }}
              className={`flex-1 px-4 py-3 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${subTab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {cargandoItems ? (
            <div className="text-center py-10 text-sm text-gray-400">Cargando...</div>
          ) : (
            <>
              {itemsFiltrados.length === 0 && !mostrarForm && (
                <div className="text-center py-8 text-sm text-gray-400">Sin registros aún</div>
              )}
              {itemsFiltrados.map(item => (
                <div key={item.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 mb-2">
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
                    <button onClick={cerrarForm} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                    <button onClick={handleGuardarItem} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">{itemEditando ? 'Guardar cambios' : 'Guardar'}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setMostrarForm(true); setFormData({}); setItemEditando(null); }} className="w-full py-3 mt-1 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors">
                  + Agregar
                </button>
              )}
            </>
          )}
        </div>

        {mostrarFormVehiculo && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={cerrarFormVehiculo}>
            <div className="bg-white rounded-t-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Editar vehículo</div>
              <FormCamposVehiculo form={formVehiculo} setForm={setFormVehiculo} inputCls={inputCls} labelCls={labelCls} />
              <div className="flex gap-2 mt-4">
                <button onClick={cerrarFormVehiculo} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleGuardarVehiculo} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      {cargando ? (
        <div className="text-center py-10 text-sm text-gray-400">Cargando...</div>
      ) : (
        <>
          {vehiculos.map(v => (
            <div key={v.id} className="group flex items-center bg-white border border-gray-100 rounded-xl px-4 py-3 mb-2 hover:border-gray-200 transition-colors">
              <button onClick={() => { setVehiculoActivo(v); setSubTab('mantenciones'); setItems([]); cerrarForm(); }} className="flex items-center gap-3 flex-1 text-left min-w-0">
                <span className="text-2xl shrink-0">{v.emoji || EMOJI_VEHICULO[v.tipo] || '🚗'}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{v.nombre}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {[v.marca, v.modelo].filter(Boolean).join(' ')}{v.patente ? ` · ${v.patente}` : ''}
                  </div>
                </div>
              </button>
              <button onClick={() => abrirFormVehiculo(v)} className="text-gray-300 hover:text-gray-500 text-sm p-1 transition-colors ml-2 shrink-0">✏️</button>
              {esAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleEliminarVehiculo(v); }}
                  className="opacity-0 group-hover:opacity-100 text-base p-0.5 text-gray-300 hover:text-red-400 transition-opacity duration-150 ml-1 shrink-0"
                >✕</button>
              )}
              <span className="text-gray-300 text-base ml-1 shrink-0">›</span>
            </div>
          ))}
          {mostrarFormVehiculo ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 mt-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {vehiculoEditando ? 'Editar vehículo' : 'Nuevo vehículo'}
              </div>
              <FormCamposVehiculo form={formVehiculo} setForm={setFormVehiculo} inputCls={inputCls} labelCls={labelCls} />
              <div className="flex gap-2 mt-4">
                <button onClick={cerrarFormVehiculo} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleGuardarVehiculo} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">Guardar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => abrirFormVehiculo()} className="w-full py-3 mt-1 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors">
              + Agregar vehículo
            </button>
          )}
        </>
      )}
    </div>
  );
}
