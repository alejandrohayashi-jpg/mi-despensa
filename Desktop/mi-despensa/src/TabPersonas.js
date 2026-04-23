import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatearFecha as fmt, formatearFechaHora } from './utils';

const EMOJIS_PERSONAS = ['👶','👦','👧','👨','👩','👴','👵','🐶','🐱','🐾','🦜','🐠','🐰','🐹'];

const CAMPOS_FECHA = ['fecha', 'fecha_aplicacion', 'proxima_dosis', 'fecha_fin', 'fecha_inicio', 'fecha_vencimiento', 'fecha_emision'];

const TIPOS_DOCUMENTO = {
  carnet_identidad: 'Carnet de identidad',
  pasaporte: 'Pasaporte',
  licencia_conducir: 'Licencia de conducir',
  seguro_medico: 'Seguro médico',
  carnet_vacunas: 'Carnet de vacunas',
  otro: 'Otro',
};

export default function TabPersonas({ hogarId, userId }) {
  const [personas, setPersonas] = useState([]);
  const [personaActiva, setPersonaActiva] = useState(null);
  const [subTab, setSubTab] = useState('citas');
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [itemEditando, setItemEditando] = useState(null);
  const [errorForm, setErrorForm] = useState('');
  const [mostrarFormPersona, setMostrarFormPersona] = useState(false);
  const [formPersona, setFormPersona] = useState({ nombre: '', emoji: '👦', tipo: 'humano' });

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition mt-1';
  const labelCls = 'block text-xs font-medium text-gray-500 uppercase tracking-wide';

  useEffect(() => {
    if (hogarId) cargarPersonas();
  }, [hogarId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (personaActiva) cargarItems();
  }, [personaActiva, subTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargarPersonas = async () => {
    setCargando(true);
    const { data } = await supabase.from('personas').select('*').eq('hogar_id', hogarId).order('nombre');
    setPersonas(data || []);
    setCargando(false);
  };

  const cargarItems = async () => {
    setCargandoItems(true);
    const { data } = await supabase
      .from(subTab)
      .select('*')
      .eq('hogar_id', hogarId)
      .eq('persona_id', personaActiva.id)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setCargandoItems(false);
  };

  const handleAgregarPersona = async () => {
    if (!formPersona.nombre.trim()) return;
    await supabase.from('personas').insert([{ hogar_id: hogarId, nombre: formPersona.nombre.trim(), emoji: formPersona.emoji, tipo: formPersona.tipo }]);
    setMostrarFormPersona(false);
    setFormPersona({ nombre: '', emoji: '👦', tipo: 'humano' });
    cargarPersonas();
  };

  const handleGuardarItem = async () => {
    setErrorForm('');
    let datos = { ...formData };

    // Citas: combinar fecha + hora en ISO string
    if (subTab === 'citas' && datos.fecha) {
      datos.fecha = new Date(datos.fecha + 'T' + (datos.hora || '12:00')).toISOString();
      delete datos.hora;
    }

    // Medicamentos: activo por defecto true si es nuevo
    if (subTab === 'medicamentos' && !itemEditando) {
      datos.activo = datos.activo !== undefined ? datos.activo : true;
    }

    let error;
    if (itemEditando) {
      const { id, hogar_id, persona_id, created_at, created_by, ...campos } = datos; // eslint-disable-line no-unused-vars
      ({ error } = await supabase.from(subTab).update(campos).eq('id', itemEditando.id));
    } else {
      ({ error } = await supabase.from(subTab).insert([{
        ...datos,
        hogar_id: hogarId,
        persona_id: personaActiva.id,
        ...(userId ? { created_by: userId } : {}),
      }]));
    }

    if (error) {
      setErrorForm(error.message);
      return;
    }

    cerrarForm();
    cargarItems();
  };

  const handleEditarItem = (item) => {
    const data = { ...item };
    // Para citas: extraer hora del ISO antes de normalizar la fecha
    if (subTab === 'citas' && item.fecha) {
      const d = new Date(item.fecha);
      if (!isNaN(d.getTime())) {
        data.hora = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      }
    }
    // Normalizar fechas a YYYY-MM-DD para input[type=date]
    CAMPOS_FECHA.forEach(f => {
      if (data[f]) data[f] = String(data[f]).substring(0, 10);
    });
    setItemEditando(item);
    setFormData(data);
    setErrorForm('');
    setMostrarForm(true);
  };

  const handleEliminarItem = async (id) => {
    await supabase.from(subTab).delete().eq('id', id);
    cargarItems();
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setFormData({});
    setItemEditando(null);
    setErrorForm('');
  };

  const renderForm = () => {
    switch (subTab) {
      case 'citas': return (
        <div className="space-y-3">
          <div><label className={labelCls}>Título</label><input value={formData.titulo || ''} onChange={e => setFormData({...formData, titulo: e.target.value})} placeholder="Ej: Control médico" className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Fecha</label><input type="date" value={formData.fecha || ''} onChange={e => setFormData({...formData, fecha: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Hora</label><input type="time" value={formData.hora || ''} onChange={e => setFormData({...formData, hora: e.target.value})} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Lugar</label><input value={formData.lugar || ''} onChange={e => setFormData({...formData, lugar: e.target.value})} placeholder="Ej: Clínica Santa María" className={inputCls} /></div>
          <div><label className={labelCls}>Notas</label><input value={formData.notas || ''} onChange={e => setFormData({...formData, notas: e.target.value})} placeholder="Opcional" className={inputCls} /></div>
        </div>
      );
      case 'vacunas': return (
        <div className="space-y-3">
          <div><label className={labelCls}>Vacuna</label><input value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Influenza" className={inputCls} /></div>
          <div><label className={labelCls}>Fecha de aplicación</label><input type="date" value={formData.fecha_aplicacion || ''} onChange={e => setFormData({...formData, fecha_aplicacion: e.target.value})} className={inputCls} /></div>
          <div><label className={labelCls}>Próxima dosis</label><input type="date" value={formData.proxima_dosis || ''} onChange={e => setFormData({...formData, proxima_dosis: e.target.value})} className={inputCls} /></div>
          <div><label className={labelCls}>Notas</label><input value={formData.notas || ''} onChange={e => setFormData({...formData, notas: e.target.value})} placeholder="Opcional" className={inputCls} /></div>
        </div>
      );
      case 'medicamentos': return (
        <div className="space-y-3">
          <div><label className={labelCls}>Nombre</label><input value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Ibuprofeno" className={inputCls} /></div>
          <div><label className={labelCls}>Dosis</label><input value={formData.dosis || ''} onChange={e => setFormData({...formData, dosis: e.target.value})} placeholder="Ej: 400mg" className={inputCls} /></div>
          <div><label className={labelCls}>Frecuencia</label><input value={formData.frecuencia || ''} onChange={e => setFormData({...formData, frecuencia: e.target.value})} placeholder="Ej: Cada 8 horas" className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Fecha inicio</label><input type="date" value={formData.fecha_inicio || ''} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Fecha fin</label><input type="date" value={formData.fecha_fin || ''} onChange={e => setFormData({...formData, fecha_fin: e.target.value})} className={inputCls} /></div>
          </div>
        </div>
      );
      case 'documentos': return (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Tipo</label>
            <select value={formData.tipo || ''} onChange={e => setFormData({...formData, tipo: e.target.value})} className={inputCls}>
              <option value="">Selecciona...</option>
              {Object.entries(TIPOS_DOCUMENTO).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div><label className={labelCls}>Número / identificador</label><input value={formData.numero || ''} onChange={e => setFormData({...formData, numero: e.target.value})} placeholder="Ej: 12.345.678-9" className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Fecha emisión</label><input type="date" value={formData.fecha_emision || ''} onChange={e => setFormData({...formData, fecha_emision: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Fecha vencimiento</label><input type="date" value={formData.fecha_vencimiento || ''} onChange={e => setFormData({...formData, fecha_vencimiento: e.target.value})} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Notas</label><input value={formData.notas || ''} onChange={e => setFormData({...formData, notas: e.target.value})} placeholder="Opcional" className={inputCls} /></div>
        </div>
      );
      default: return null;
    }
  };

  const renderItem = (item) => {
    const acciones = (
      <div className="flex items-center gap-1 ml-2 shrink-0">
        <button onClick={() => handleEditarItem(item)} className="text-gray-300 hover:text-gray-500 text-sm p-0.5 transition-colors">✏️</button>
        <button onClick={() => handleEliminarItem(item.id)} className="text-gray-300 hover:text-red-400 text-sm p-0.5 transition-colors">✕</button>
      </div>
    );
    switch (subTab) {
      case 'citas': return (
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">{item.titulo}</div>
            <div className="text-xs text-gray-400 mt-0.5">{formatearFechaHora(item.fecha)}{item.lugar ? ` · ${item.lugar}` : ''}</div>
            {item.notas && <div className="text-xs text-gray-300 mt-0.5">{item.notas}</div>}
          </div>
          {acciones}
        </div>
      );
      case 'vacunas': return (
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">{item.nombre}</div>
            <div className="text-xs text-gray-400 mt-0.5">Aplicada: {fmt(item.fecha_aplicacion)}</div>
            {item.proxima_dosis && <div className="text-xs text-amber-500 mt-0.5">Próxima: {fmt(item.proxima_dosis)}</div>}
          </div>
          {acciones}
        </div>
      );
      case 'medicamentos': return (
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">{item.nombre}</div>
            <div className="text-xs text-gray-400 mt-0.5">{item.dosis}{item.frecuencia ? ` · ${item.frecuencia}` : ''}</div>
            {item.fecha_fin && <div className="text-xs text-gray-400 mt-0.5">Hasta: {fmt(item.fecha_fin)}</div>}
          </div>
          {acciones}
        </div>
      );
      case 'documentos': return (
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">{TIPOS_DOCUMENTO[item.tipo] || item.tipo}{item.numero ? ` · ${item.numero}` : ''}</div>
            {item.fecha_emision && <div className="text-xs text-gray-400 mt-0.5">Emitido: {fmt(item.fecha_emision)}</div>}
            {item.fecha_vencimiento && <div className="text-xs text-amber-500 mt-0.5">Vence: {fmt(item.fecha_vencimiento)}</div>}
            {item.notas && <div className="text-xs text-gray-300 mt-0.5">{item.notas}</div>}
          </div>
          {acciones}
        </div>
      );
      default: return null;
    }
  };

  const SUB_TABS = [
    { id: 'citas', label: '🗓️ Citas' },
    { id: 'vacunas', label: '💉 Vacunas' },
    { id: 'medicamentos', label: '💊 Medicamentos' },
    { id: 'documentos', label: '📄 Documentos' },
  ];

  if (personaActiva) {
    return (
      <div>
        <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
          <button onClick={() => { setPersonaActiva(null); cerrarForm(); }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3">← Volver</button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{personaActiva.emoji}</span>
            <div>
              <div className="text-base font-semibold text-gray-900">{personaActiva.nombre}</div>
              <div className="text-xs text-gray-400 capitalize">{personaActiva.tipo}</div>
            </div>
          </div>
        </div>
        <div className="flex bg-white border-b border-gray-100 overflow-x-auto">
          {SUB_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setSubTab(t.id); cerrarForm(); }}
              className={`flex-shrink-0 px-4 py-3 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                subTab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
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
                  {errorForm && (
                    <p className="text-xs text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {errorForm}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button onClick={cerrarForm} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                    <button onClick={handleGuardarItem} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                      {itemEditando ? 'Guardar cambios' : 'Guardar'}
                    </button>
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
      </div>
    );
  }

  return (
    <div className="p-4">
      {cargando ? (
        <div className="text-center py-10 text-sm text-gray-400">Cargando...</div>
      ) : (
        <>
          {personas.map(p => (
            <button
              key={p.id}
              onClick={() => { setPersonaActiva(p); setSubTab('citas'); setItems([]); cerrarForm(); }}
              className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 mb-2 hover:border-gray-200 transition-colors text-left"
            >
              <span className="text-2xl">{p.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{p.nombre}</div>
                <div className="text-xs text-gray-400 capitalize mt-0.5">{p.tipo}</div>
              </div>
              <span className="text-gray-300 text-base">›</span>
            </button>
          ))}
          {mostrarFormPersona ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 mt-2">
              <div className="space-y-3">
                <div><label className={labelCls}>Nombre</label><input value={formPersona.nombre} onChange={e => setFormPersona({...formPersona, nombre: e.target.value})} placeholder="Ej: Sofía" className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Tipo</label>
                  <div className="flex gap-2 mt-1">
                    {['humano', 'mascota'].map(tipo => (
                      <button key={tipo} onClick={() => setFormPersona({...formPersona, tipo})} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${formPersona.tipo === tipo ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {tipo === 'humano' ? '👤 Humano' : '🐾 Mascota'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Emoji</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {EMOJIS_PERSONAS.map(e => (
                      <button key={e} onClick={() => setFormPersona({...formPersona, emoji: e})} className={`w-9 h-9 text-lg rounded-lg transition-colors ${formPersona.emoji === e ? 'border-2 border-gray-900 bg-gray-100' : 'border border-gray-200 bg-white hover:bg-gray-50'}`}>{e}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setMostrarFormPersona(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleAgregarPersona} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">Guardar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setMostrarFormPersona(true)} className="w-full py-3 mt-1 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors">
              + Agregar persona
            </button>
          )}
        </>
      )}
    </div>
  );
}
