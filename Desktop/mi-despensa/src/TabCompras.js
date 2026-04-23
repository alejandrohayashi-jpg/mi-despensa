import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const FORM_VACIO = { nombre: '', cantidad: '1', unidad: 'un.', categoria: '', supermercado: '', urgente: false, notas: '' };
const UNIDADES = ['un.', 'kg.', 'g.', 'lt.', 'ml.', 'pkg.', 'caja', 'bolsa'];
const CATEGORIAS = ['Lácteos', 'Verduras', 'Frutas', 'Carnes', 'Enlatados', 'Pastas', 'Cereales', 'Bebidas', 'Snacks', 'Limpieza', 'Higiene', 'Mascotas', 'Otros'];

export default function TabCompras({ hogarId }) {
  const [items, setItems] = useState([]);
  const [sugeridos, setSugeridos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('pendientes');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState('');
  const [mostrarSugeridos, setMostrarSugeridos] = useState(false);

  useEffect(() => {
    if (hogarId) cargar();
  }, [hogarId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargar = async () => {
    setCargando(true);
    const [{ data: comprasData }, { data: prodData }] = await Promise.all([
      supabase.from('lista_compras').select('*').eq('hogar_id', hogarId).order('created_at', { ascending: false }),
      supabase.from('productos').select('id, nombre, categoria, unidad').eq('hogar_id', hogarId).or('cantidad.eq.0,modo_consumo.eq.pausado'),
    ]);
    const compras = comprasData || [];
    setItems(compras);
    const yaEnLista = new Set(compras.map(c => c.inventario_id).filter(Boolean));
    setSugeridos((prodData || []).filter(p => !yaEnLista.has(p.id)));
    setCargando(false);
  };

  const abrirForm = (item = null) => {
    setItemEditando(item);
    setForm(item
      ? { nombre: item.nombre, cantidad: String(item.cantidad || 1), unidad: item.unidad || 'un.', categoria: item.categoria || '', supermercado: item.supermercado || '', urgente: item.urgente || false, notas: item.notas || '' }
      : FORM_VACIO
    );
    setErrorForm('');
    setMostrarForm(true);
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setErrorForm('El nombre es obligatorio'); return; }
    const payload = {
      nombre: form.nombre.trim(),
      cantidad: form.cantidad ? Number(form.cantidad) : 1,
      unidad: form.unidad,
      categoria: form.categoria || null,
      supermercado: form.supermercado.trim() || null,
      urgente: form.urgente,
      notas: form.notas.trim() || null,
    };
    const { error } = itemEditando
      ? await supabase.from('lista_compras').update(payload).eq('id', itemEditando.id)
      : await supabase.from('lista_compras').insert([{ ...payload, hogar_id: hogarId, completado: false }]);
    if (error) { setErrorForm(error.message); return; }
    setMostrarForm(false);
    cargar();
  };

  const handleToggle = async (item) => {
    await supabase.from('lista_compras').update({ completado: !item.completado }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completado: !i.completado } : i));
  };

  const handleEliminar = async (id) => {
    await supabase.from('lista_compras').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleLimpiarCompletados = async () => {
    await supabase.from('lista_compras').delete().eq('hogar_id', hogarId).eq('completado', true);
    setItems(prev => prev.filter(i => !i.completado));
  };

  const handleAgregarSugerido = async (prod) => {
    const { error } = await supabase.from('lista_compras').insert([{
      hogar_id: hogarId,
      nombre: prod.nombre,
      cantidad: 1,
      unidad: prod.unidad || 'un.',
      categoria: prod.categoria || null,
      urgente: false,
      completado: false,
      inventario_id: prod.id,
    }]);
    if (!error) cargar();
  };

  const listaFiltrada = filtro === 'pendientes'
    ? items.filter(i => !i.completado)
    : filtro === 'completados'
    ? items.filter(i => i.completado)
    : items;

  const supermercados = [...new Set(listaFiltrada.map(i => i.supermercado || 'Sin supermercado'))];
  const completadosCount = items.filter(i => i.completado).length;

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
          {[['pendientes', 'Pendientes'], ['todos', 'Todos'], ['completados', 'Completados']].map(([id, label]) => (
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

      {/* Sugeridos del inventario */}
      {sugeridos.length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 px-4 py-3">
          <button
            onClick={() => setMostrarSugeridos(v => !v)}
            className="flex items-center gap-1.5 w-full text-left"
          >
            <span className={`text-blue-400 text-xs transition-transform duration-200 ${mostrarSugeridos ? 'rotate-90' : ''}`}>▶</span>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Sugeridos del inventario ({sugeridos.length})</span>
          </button>
          {mostrarSugeridos && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sugeridos.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleAgregarSugerido(p)}
                  className="px-3 py-1.5 bg-white text-blue-700 border border-blue-200 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  + {p.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lista agrupada por supermercado */}
      {listaFiltrada.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-sm text-gray-400 text-center">
          {filtro === 'pendientes' ? 'No hay items pendientes' : 'No hay items aquí'}
        </div>
      ) : (
        supermercados.map(super_ => {
          const grupo = listaFiltrada.filter(i => (i.supermercado || 'Sin supermercado') === super_);
          return (
            <div key={super_}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">🛒 {super_}</div>
              <div className="space-y-2">
                {grupo.map(item => (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(item)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.completado ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white'}`}
                    >
                      {item.completado && <span className="text-white text-xs leading-none">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${item.completado ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.urgente && !item.completado && <span className="text-red-500 mr-1">⚡</span>}
                        {item.nombre}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {item.cantidad} {item.unidad}{item.categoria ? ` · ${item.categoria}` : ''}{item.notas ? ` · ${item.notas}` : ''}
                      </div>
                    </div>
                    <button onClick={() => abrirForm(item)} className="text-gray-300 hover:text-gray-500 text-sm p-0.5 transition-colors flex-shrink-0">✏️</button>
                    <button onClick={() => handleEliminar(item.id)} className="text-gray-300 hover:text-red-400 text-base p-0.5 transition-colors flex-shrink-0">✕</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Limpiar completados */}
      {completadosCount > 0 && (
        <button
          onClick={handleLimpiarCompletados}
          className="w-full py-2.5 border border-dashed border-gray-300 rounded-xl text-xs text-gray-400 hover:border-red-300 hover:text-red-400 transition-colors"
        >
          Limpiar {completadosCount} completado{completadosCount !== 1 ? 's' : ''}
        </button>
      )}

      {/* Modal formulario */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{itemEditando ? 'Editar item' : 'Agregar a la lista'}</h2>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {errorForm && <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{errorForm}</div>}
              <div>
                <label className={labelCls}>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Leche entera" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Cantidad</label>
                  <input type="number" min="0" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Unidad</label>
                  <select value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} className={inputCls}>
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Categoría</label>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className={inputCls}>
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Supermercado</label>
                <input value={form.supermercado} onChange={e => setForm({ ...form, supermercado: e.target.value })} placeholder="Ej: Jumbo, Líder..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notas</label>
                <input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Opcional" className={inputCls} />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, urgente: !form.urgente })}
                  className={`relative w-10 h-6 rounded-full transition-colors ${form.urgente ? 'bg-red-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.urgente ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm text-gray-700">⚡ Urgente</span>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setMostrarForm(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleGuardar} className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                {itemEditando ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
