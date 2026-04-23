import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { formatearFecha } from './utils';

const FORM_VACIO = { titulo: '', descripcion: '', categoria: 'general', prioridad: 'normal', fecha_limite: '', asignado_a: '', recurrente: false, frecuencia: 'semanal' };
const PRIORIDADES = { alta: 'Alta', normal: 'Normal', baja: 'Baja' };
const CATEGORIAS = ['general', 'limpieza', 'mantenimiento', 'compras', 'jardín', 'mascotas', 'otro'];
const FRECUENCIAS = { diaria: 'Diaria', semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual' };
const DIAS_FRECUENCIA = { diaria: 1, semanal: 7, quincenal: 15, mensual: 30 };

function semaforoTarea(fecha) {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const lim = new Date(String(fecha).substring(0, 10) + 'T00:00:00');
  if (isNaN(lim.getTime())) return null;
  const dias = Math.round((lim - hoy) / 86400000);
  if (dias < 0)  return { cls: 'text-red-600',    texto: `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}` };
  if (dias === 0) return { cls: 'text-red-600',    texto: 'Vence hoy' };
  if (dias === 1) return { cls: 'text-orange-500', texto: 'Vence mañana' };
  return { cls: 'text-gray-400', texto: formatearFecha(fecha) };
}

export default function TabTareas({ hogarId, userId, miembros }) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('pendientes');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState('');

  useEffect(() => {
    if (hogarId) cargar();
  }, [hogarId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargar = async () => {
    setCargando(true);
    const { data } = await supabase
      .from('tareas')
      .select('*')
      .eq('hogar_id', hogarId)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setCargando(false);
  };

  const abrirForm = (item = null) => {
    setItemEditando(item);
    setForm(item
      ? {
          titulo: item.titulo,
          descripcion: item.descripcion || '',
          categoria: item.categoria || 'general',
          prioridad: item.prioridad || 'normal',
          fecha_limite: item.fecha_limite ? String(item.fecha_limite).substring(0, 10) : '',
          asignado_a: item.asignado_a || '',
          recurrente: item.recurrente || false,
          frecuencia: item.frecuencia || 'semanal',
        }
      : FORM_VACIO
    );
    setErrorForm('');
    setMostrarForm(true);
  };

  const handleGuardar = async () => {
    if (!form.titulo.trim()) { setErrorForm('El título es obligatorio'); return; }
    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      categoria: form.categoria,
      prioridad: form.prioridad,
      fecha_limite: form.fecha_limite || null,
      asignado_a: form.asignado_a || null,
      recurrente: form.recurrente,
      frecuencia: form.recurrente ? form.frecuencia : null,
    };
    const { error } = itemEditando
      ? await supabase.from('tareas').update(payload).eq('id', itemEditando.id)
      : await supabase.from('tareas').insert([{ ...payload, hogar_id: hogarId, completada: false }]);
    if (error) { setErrorForm(error.message); return; }
    setMostrarForm(false);
    cargar();
  };

  const handleToggle = async (item) => {
    if (!item.completada && item.recurrente && item.fecha_limite) {
      const dias = DIAS_FRECUENCIA[item.frecuencia] || 7;
      const proxima = new Date(String(item.fecha_limite).substring(0, 10) + 'T00:00:00');
      proxima.setDate(proxima.getDate() + dias);
      await supabase.from('tareas').insert([{
        hogar_id: item.hogar_id,
        titulo: item.titulo,
        descripcion: item.descripcion,
        categoria: item.categoria,
        prioridad: item.prioridad,
        fecha_limite: proxima.toISOString().split('T')[0],
        asignado_a: item.asignado_a,
        recurrente: true,
        frecuencia: item.frecuencia,
        completada: false,
      }]);
    }
    await supabase.from('tareas').update({ completada: !item.completada }).eq('id', item.id);
    cargar();
  };

  const handleEliminar = async (id) => {
    await supabase.from('tareas').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const listaFiltrada = filtro === 'pendientes'
    ? items.filter(i => !i.completada)
    : filtro === 'completadas'
    ? items.filter(i => i.completada)
    : items;

  const grupos = [
    { key: 'alta',   label: '🔴 Alta prioridad' },
    { key: 'normal', label: '🟡 Normal' },
    { key: 'baja',   label: '🟢 Baja prioridad' },
  ]
    .map(g => ({ ...g, items: listaFiltrada.filter(i => (i.prioridad || 'normal') === g.key) }))
    .filter(g => g.items.length > 0);

  const nombreMiembro = (uid) => {
    if (!uid) return null;
    if (uid === userId) return 'Yo';
    return `...${String(uid).slice(-6)}`;
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition mt-1';
  const labelCls = 'block text-xs font-medium text-gray-500 uppercase tracking-wide';

  if (cargando) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm text-gray-400">Cargando...</div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">

      {/* Filtros + agregar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {[['pendientes', 'Pendientes'], ['todas', 'Todas'], ['completadas', 'Completadas']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filtro === id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => abrirForm()}
          className="flex-shrink-0 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
        >
          + Agregar
        </button>
      </div>

      {/* Lista agrupada por prioridad */}
      {listaFiltrada.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-sm text-gray-400 text-center">
          {filtro === 'pendientes' ? 'No hay tareas pendientes' : 'No hay tareas aquí'}
        </div>
      ) : (
        grupos.map(grupo => (
          <div key={grupo.key}>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{grupo.label}</div>
            <div className="space-y-2">
              {grupo.items.map(item => {
                const sem = semaforoTarea(item.fecha_limite);
                const asignado = nombreMiembro(item.asignado_a);
                return (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3">
                    <button
                      onClick={() => handleToggle(item)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.completada ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white'}`}
                    >
                      {item.completada && <span className="text-white text-xs leading-none">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${item.completada ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.titulo}
                        {item.recurrente && <span className="ml-1.5 text-xs text-blue-400">↻</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                        {item.categoria && item.categoria !== 'general' && (
                          <span className="text-xs text-gray-400">{item.categoria}</span>
                        )}
                        {asignado && <span className="text-xs text-gray-400">👤 {asignado}</span>}
                        {sem && <span className={`text-xs font-medium ${sem.cls}`}>{sem.texto}</span>}
                      </div>
                      {item.descripcion && (
                        <div className="text-xs text-gray-400 mt-1 truncate">{item.descripcion}</div>
                      )}
                    </div>
                    <button onClick={() => abrirForm(item)} className="text-gray-300 hover:text-gray-500 text-sm p-0.5 transition-colors flex-shrink-0">✏️</button>
                    <button onClick={() => handleEliminar(item.id)} className="text-gray-300 hover:text-red-400 text-base p-0.5 transition-colors flex-shrink-0">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Modal formulario */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{itemEditando ? 'Editar tarea' : 'Nueva tarea'}</h2>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {errorForm && <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{errorForm}</div>}
              <div>
                <label className={labelCls}>Título *</label>
                <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Limpiar baño" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Descripción</label>
                <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Opcional" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Categoría</label>
                  <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className={inputCls}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Prioridad</label>
                  <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })} className={inputCls}>
                    {Object.entries(PRIORIDADES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Fecha límite</label>
                <input type="date" value={form.fecha_limite} onChange={e => setForm({ ...form, fecha_limite: e.target.value })} className={inputCls} />
              </div>
              {miembros && miembros.length > 0 && (
                <div>
                  <label className={labelCls}>Asignado a</label>
                  <select value={form.asignado_a} onChange={e => setForm({ ...form, asignado_a: e.target.value })} className={inputCls}>
                    <option value="">Sin asignar</option>
                    {miembros.map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user_id === userId ? 'Yo' : `...${String(m.user_id).slice(-6)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, recurrente: !form.recurrente })}
                  className={`relative w-10 h-6 rounded-full transition-colors ${form.recurrente ? 'bg-blue-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.recurrente ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm text-gray-700">↻ Recurrente</span>
              </div>
              {form.recurrente && (
                <div>
                  <label className={labelCls}>Frecuencia</label>
                  <select value={form.frecuencia} onChange={e => setForm({ ...form, frecuencia: e.target.value })} className={inputCls}>
                    {Object.entries(FRECUENCIAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setMostrarForm(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleGuardar} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                {itemEditando ? 'Guardar cambios' : 'Crear tarea'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
