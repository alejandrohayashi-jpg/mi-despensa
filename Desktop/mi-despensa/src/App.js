import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import Auth from './Auth';
import TabInicio from './TabInicio';
import TabPersonas from './TabPersonas';
import TabVehiculos from './TabVehiculos';
import TabEquipos from './TabEquipos';
import TabHogar from './TabHogar';
import { diasParaVencer } from './utils';

const EMOJIS = ['🏠','👶','👦','👧','👨','👩','👴','👵','🐶','🐱','🐾','🍎','🥦','🥛','🍗','🛒','⭐','❤️','🌟','🎯'];

function getEstado(vencimiento) {
  const hoy = new Date();
  const vence = new Date(vencimiento);
  const dias = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { texto: 'Vencido', color: '#A32D2D', bg: '#FCEBEB' };
  if (dias <= 5) return { texto: 'Por vencer', color: '#854F0B', bg: '#FAEEDA' };
  return { texto: 'OK', color: '#3B6D11', bg: '#EAF3DE' };
}


function getDiasStock(producto) {
  const { cantidad, frecuencia_consumo, unidad_consumo } = producto;
  if (!frecuencia_consumo || frecuencia_consumo <= 0) return null;
  const consumoDiario = unidad_consumo?.includes('semana')
    ? frecuencia_consumo / 7
    : frecuencia_consumo;
  return Math.floor(cantidad / consumoDiario);
}

function ProductoItem({ producto, onEliminar, onEditar, onToggleModo, mostrarUbicacion }) {
  const [showDelete, setShowDelete] = useState(false);
  const longPressRef = useRef(null);

  const handleTouchStart = () => {
    longPressRef.current = setTimeout(() => setShowDelete(true), 600);
  };
  const handleTouchEnd = () => clearTimeout(longPressRef.current);

  const estado = getEstado(producto.vencimiento);
  const venc = diasParaVencer(producto.vencimiento);
  const diasStock = getDiasStock(producto);
  const tieneConsumo = producto.frecuencia_consumo > 0;
  const modo = producto.modo_consumo || 'manual';

  const estadoBadge =
    estado.texto === 'Vencido'
      ? 'bg-red-50 text-red-700'
      : estado.texto === 'Por vencer'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-green-50 text-green-700';

  return (
    <div
      className="group flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 mb-2 hover:border-gray-200 transition-colors"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{producto.nombre}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{producto.destino}</span>
          {mostrarUbicacion && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">
              {producto.ubicacion === 'refrigerador' ? '🧊 Refri' : '🗄️ Despensa'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{producto.categoria}</span>
          <span className={`text-xs ${venc.cls}`}>{venc.texto}</span>
          <span className="text-xs text-gray-300">({venc.fechaCorta})</span>
        </div>
        {diasStock !== null && diasStock <= 5 && (
          <div className="text-xs text-orange-600 mt-1 font-medium">
            ⚡ Se agota en ~{diasStock} día{diasStock !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-500 font-medium whitespace-nowrap">{producto.cantidad} {producto.unidad}</div>
      {tieneConsumo && (
        <button
          onClick={() => onToggleModo(producto)}
          title={modo === 'automatico' ? 'Pausar descuento automático' : 'Activar descuento automático'}
          className={`border rounded-lg px-2 py-1 text-xs cursor-pointer transition-colors ${
            modo === 'automatico'
              ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
              : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'
          }`}
        >
          {modo === 'automatico' ? '▶️' : '⏸️'}
        </button>
      )}
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${estadoBadge}`}>{estado.texto}</span>
      <button onClick={() => onEditar(producto)} className="text-gray-300 hover:text-gray-500 text-sm p-0.5 transition-colors">✏️</button>
      <button
        onClick={() => { onEliminar(producto.id); setShowDelete(false); }}
        className={`text-base p-0.5 transition-opacity duration-150 opacity-0 group-hover:opacity-100 hover:text-red-400 ${showDelete ? '!opacity-100 text-red-400' : 'text-gray-300'}`}
      >✕</button>
    </div>
  );
}

function ModalAlerta({ titulo, productos, onCerrar, onEliminar, onEditar }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center p-6 pb-4">
          <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors">✕</button>
        </div>
        <div className="px-6 pb-6">
          {productos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay productos en esta categoría</p>
          ) : (
            productos.map(p => (
              <ProductoItem key={p.id} producto={p} onEliminar={onEliminar} onEditar={onEditar} mostrarUbicacion={true} onToggleModo={() => {}} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ModalDestino({ hogarId, onCerrar, onGuardado }) {
  const [nombre, setNombre] = useState('');
  const [emoji, setEmoji] = useState('🏠');

  const handleGuardar = async () => {
    if (!nombre) return;
    await supabase.from('destinos').insert([{ hogar_id: hogarId, nombre, emoji }]);
    onGuardado();
    onCerrar();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-semibold text-gray-900">Nuevo destino</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors">✕</button>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</label>
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Agustín"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition mt-1"
          />
        </div>
        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Emoji</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-9 h-9 text-lg rounded-lg transition-colors ${
                  emoji === e
                    ? 'border-2 border-gray-900 bg-gray-100'
                    : 'border border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} className="flex-1 py-2.5 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function FormularioProducto({ onGuardar, onCerrar, productoEditar, destinos, tab }) {
  const [form, setForm] = useState(
    productoEditar
      ? {
          ...productoEditar,
          cantidad: String(productoEditar.cantidad),
          frecuencia_consumo: String(productoEditar.frecuencia_consumo || ''),
          unidad_consumo: productoEditar.unidad_consumo || 'unidad/día',
          modo_consumo: productoEditar.modo_consumo || 'manual',
        }
      : {
          nombre: '', categoria: '', cantidad: '', unidad: 'un.', vencimiento: '',
          destino: destinos[0]?.nombre || 'Casa General',
          ubicacion: tab === 'despensa' ? 'despensa' : 'refrigerador',
          frecuencia_consumo: '', unidad_consumo: 'unidad/día', modo_consumo: 'manual',
        }
  );

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleGuardar = () => {
    if (!form.nombre || !form.categoria || !form.cantidad || !form.vencimiento) {
      alert('Por favor completa todos los campos');
      return;
    }
    onGuardar({
      ...form,
      cantidad: Number(form.cantidad),
      frecuencia_consumo: form.frecuencia_consumo ? Number(form.frecuencia_consumo) : null,
    });
    onCerrar();
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition mt-1';
  const labelCls = 'block text-xs font-medium text-gray-500 uppercase tracking-wide';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center p-6 pb-4">
          <h2 className="text-base font-semibold text-gray-900">{productoEditar ? 'Editar producto' : 'Agregar producto'}</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors">✕</button>
        </div>
        <div className="px-6 pb-2 space-y-4">
          <div>
            <label className={labelCls}>Nombre del producto</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Leche entera" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Para quién es</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {destinos.map(d => (
                <button
                  key={d.id}
                  onClick={() => setForm({ ...form, destino: d.nombre })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.destino === d.nombre
                      ? 'bg-gray-900 text-white border-2 border-gray-900'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {d.emoji} {d.nombre}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Categoría</label>
            <select name="categoria" value={form.categoria} onChange={handleChange} className={inputCls}>
              <option value="">Selecciona una categoría</option>
              <option>Lácteos</option>
              <option>Verduras</option>
              <option>Frutas</option>
              <option>Carnes</option>
              <option>Enlatados</option>
              <option>Pastas</option>
              <option>Cereales</option>
              <option>Bebidas</option>
              <option>Snacks</option>
              <option>Alimento mascotas</option>
              <option>Otros</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Ubicación</label>
            <div className="flex gap-2 mt-2">
              {[
                { value: 'refrigerador', label: '🧊 Refrigerador' },
                { value: 'despensa',     label: '🗄️ Despensa' },
              ].map(op => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setForm({ ...form, ubicacion: op.value })}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.ubicacion === op.value
                      ? 'bg-gray-900 text-white border-2 border-gray-900'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cantidad</label>
              <input name="cantidad" type="number" value={form.cantidad} onChange={handleChange} placeholder="Ej: 3" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Unidad</label>
              <select name="unidad" value={form.unidad} onChange={handleChange} className={inputCls}>
                <option>un.</option>
                <option>kg.</option>
                <option>g.</option>
                <option>lt.</option>
                <option>ml.</option>
                <option>pkg.</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Fecha de vencimiento</label>
            <input name="vencimiento" type="date" value={form.vencimiento} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Consumo diario (opcional)</label>
            <div className="grid grid-cols-[1fr_2fr] gap-2 mt-1">
              <input
                name="frecuencia_consumo"
                type="number"
                min="0"
                value={form.frecuencia_consumo}
                onChange={handleChange}
                placeholder="Ej: 2"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
              <select
                name="unidad_consumo"
                value={form.unidad_consumo}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              >
                <option>unidad/día</option>
                <option>unidad/semana</option>
                <option>kg/día</option>
                <option>kg/semana</option>
                <option>lt/día</option>
                <option>lt/semana</option>
              </select>
            </div>
          </div>
          {Number(form.frecuencia_consumo) > 0 && (
            <div>
              <label className={labelCls}>Modo de consumo</label>
              <div className="flex gap-2 mt-2">
                {[
                  { value: 'manual', label: '✋ Manual' },
                  { value: 'automatico', label: '▶️ Automático' },
                  { value: 'pausado', label: '⏸️ Pausado' },
                ].map(op => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => setForm({ ...form, modo_consumo: op.value })}
                    className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
                      form.modo_consumo === op.value
                        ? 'bg-gray-900 text-white border-2 border-gray-900'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-6 pt-4">
          <button onClick={onCerrar} className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} className="flex-1 py-2.5 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            {productoEditar ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TIPO_LABEL = {
  agregado:             { label: 'Agregado',      cls: 'bg-green-50 text-green-700' },
  edicion_manual:       { label: 'Editado',        cls: 'bg-blue-50 text-blue-700' },
  eliminado:            { label: 'Eliminado',      cls: 'bg-red-50 text-red-700' },
  cambio_modo:          { label: 'Modo',           cls: 'bg-purple-50 text-purple-700' },
  descuento_automatico: { label: 'Descuento auto', cls: 'bg-amber-50 text-amber-700' },
  reversion:            { label: 'Reversión',      cls: 'bg-gray-100 text-gray-600' },
};

function ModalHistorial({ hogarId, onCerrar, onDeshacer }) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    const { data } = await supabase
      .from('historial')
      .select('*')
      .eq('hogar_id', hogarId)
      .order('created_at', { ascending: false })
      .limit(50);
    setHistorial(data || []);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeshacer = async (h) => {
    await onDeshacer(h);
    await cargar();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex justify-between items-center p-6 pb-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">📋 Historial</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors">✕</button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">
          {cargando ? (
            <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
          ) : historial.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin movimientos aún</p>
          ) : (
            historial.map((h, i) => {
              const tipo = TIPO_LABEL[h.tipo] || { label: h.tipo, cls: 'bg-gray-100 text-gray-600' };
              const fecha = new Date(h.created_at).toLocaleString('es-CL', {
                day: '2-digit', month: '2-digit', year: '2-digit',
                hour: '2-digit', minute: '2-digit',
              });
              return (
                <div key={h.id} className={`py-3 ${i < historial.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-900">{h.producto_nombre}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipo.cls}`}>{tipo.label}</span>
                      </div>
                      <div className="text-xs text-gray-400 flex flex-wrap gap-x-2">
                        <span>{fecha}</span>
                        {h.cantidad_antes !== null && h.cantidad_despues !== null && (
                          <span>{h.cantidad_antes} → {h.cantidad_despues}</span>
                        )}
                        {h.descripcion && <span className="text-gray-300">· {h.descripcion}</span>}
                      </div>
                    </div>
                    {h.tipo === 'descuento_automatico' && (
                      <button
                        onClick={() => handleDeshacer(h)}
                        className="shrink-0 text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        ↩ Deshacer
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [hogarId, setHogarId] = useState(null);
  const [nombreHogar, setNombreHogar] = useState('');
  const [codigoInvitacion, setCodigoInvitacion] = useState('');
  const [tabPrincipal, setTabPrincipal] = useState('inicio');
  const [tab, setTab] = useState('todos');
  const [filtroDestino, setFiltroDestino] = useState('Todos');
  const [productos, setProductos] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [estadoMiembro, setEstadoMiembro] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);
  const [modalAlerta, setModalAlerta] = useState(null);
  const [mostrarModalDestino, setMostrarModalDestino] = useState(false);
  const [modalActivo, setModalActivo] = useState(null);
  const [categoriasColapsadas, setCategoriasColapsadas] = useState({});
  const [filtroEstado, setFiltroEstado] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const toggleCategoria = (cat) =>
    setCategoriasColapsadas(prev => ({ ...prev, [cat]: prev[cat] === false }));

  const toggleFiltroEstado = (key) =>
    setFiltroEstado(prev => prev === key ? null : key);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  useEffect(() => {
    if (session) cargarHogar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const cargarHogar = async () => {
    const { data, error } = await supabase
      .from('miembros_hogar')
      .select('hogar_id, rol, estado')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error || !data) { setCargando(false); return; }

    const estado = data.estado || 'activo';
    setEstadoMiembro(estado);
    setEsAdmin(data.rol === 'admin');

    if (estado === 'activo') {
      setHogarId(data.hogar_id);
      const { data: hogar } = await supabase.from('hogares').select('nombre, codigo_invitacion').eq('id', data.hogar_id).single();
      if (hogar) { setNombreHogar(hogar.nombre); setCodigoInvitacion(hogar.codigo_invitacion || ''); }
      cargarProductos(data.hogar_id);
      cargarDestinos(data.hogar_id);
      if (data.rol === 'admin') {
        cargarSolicitudes(data.hogar_id);
        cargarMiembros(data.hogar_id);
      }
    } else {
      setCargando(false);
    }
  };

  const cargarProductos = async (hid) => {
    setCargando(true);
    const { data } = await supabase.from('productos').select('*').eq('hogar_id', hid || hogarId);
    setProductos(data || []);
    setCargando(false);
  };

  const cargarDestinos = async (hid) => {
    const { data } = await supabase.from('destinos').select('*').eq('hogar_id', hid || hogarId);
    setDestinos(data || []);
  };

  const cargarSolicitudes = async (hid) => {
    const { data } = await supabase
      .from('miembros_hogar')
      .select('*')
      .eq('hogar_id', hid || hogarId)
      .eq('estado', 'pendiente')
      .neq('user_id', session.user.id);
    setSolicitudes(data || []);
  };

  const cargarMiembros = async (hid) => {
    const { data } = await supabase
      .from('miembros_hogar')
      .select('*')
      .eq('hogar_id', hid || hogarId)
      .eq('estado', 'activo');
    setMiembros(data || []);
  };

  const registrarHistorial = async (producto, tipo, cantidadAntes, cantidadDespues, descripcion) => {
    await supabase.from('historial').insert([{
      hogar_id: hogarId,
      producto_id: producto.id || null,
      producto_nombre: producto.nombre,
      tipo,
      cantidad_antes: cantidadAntes,
      cantidad_despues: cantidadDespues,
      descripcion,
    }]);
  };

  const handleDeshacer = async (movimiento) => {
    await supabase
      .from('productos')
      .update({ cantidad: movimiento.cantidad_antes })
      .eq('id', movimiento.producto_id);
    await registrarHistorial(
      { id: movimiento.producto_id, nombre: movimiento.producto_nombre },
      'reversion',
      movimiento.cantidad_despues,
      movimiento.cantidad_antes,
      'Reversión de descuento automático',
    );
    cargarProductos();
  };

  const handleAprobar = async (userId) => {
    await supabase.from('miembros_hogar').update({ estado: 'activo' }).eq('hogar_id', hogarId).eq('user_id', userId);
    cargarSolicitudes();
    cargarMiembros();
  };

  const handleRechazar = async (userId) => {
    await supabase.from('miembros_hogar').update({ estado: 'rechazado' }).eq('hogar_id', hogarId).eq('user_id', userId);
    cargarSolicitudes();
  };

  const handleEliminarMiembro = async (userId) => {
    await supabase.from('miembros_hogar').delete().eq('hogar_id', hogarId).eq('user_id', userId);
    cargarMiembros();
  };

  const handleToggleModo = async (producto) => {
    const nuevoModo = producto.modo_consumo === 'automatico' ? 'pausado' : 'automatico';
    await supabase.from('productos').update({ modo_consumo: nuevoModo }).eq('id', producto.id);
    await registrarHistorial(producto, 'cambio_modo', producto.cantidad, producto.cantidad, `Modo → ${nuevoModo}`);
    cargarProductos();
  };

  const handleGuardar = async (producto) => {
    if (productoEditar) {
      await supabase.from('productos').update(producto).eq('id', producto.id);
      await registrarHistorial(producto, 'edicion_manual', productoEditar.cantidad, producto.cantidad, 'Edición manual');
    } else {
      const { data: nuevo } = await supabase
        .from('productos')
        .insert([{ ...producto, hogar_id: hogarId }])
        .select()
        .single();
      await registrarHistorial(
        nuevo || { id: null, nombre: producto.nombre },
        'agregado', null, producto.cantidad, 'Producto agregado',
      );
    }
    cargarProductos();
  };

  const handleEliminar = async (id) => {
    const producto = productos.find(p => p.id === id);
    await supabase.from('productos').delete().eq('id', id);
    if (producto) {
      await registrarHistorial(producto, 'eliminado', producto.cantidad, null, 'Producto eliminado');
    }
    cargarProductos();
    setModalAlerta(null);
  };

  const handleEditar = (producto) => {
    setProductoEditar(producto);
    setMostrarFormulario(true);
    setModalAlerta(null);
  };

  const handleCerrar = () => {
    setMostrarFormulario(false);
    setProductoEditar(null);
  };

  if (!session) return <Auth />;

  if (cargando) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
      <div className="text-sm text-gray-400">Cargando...</div>
    </div>
  );

  if (estadoMiembro === 'pendiente') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 font-sans">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Solicitud pendiente</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-8">
          Tu solicitud para unirte al hogar está siendo revisada por el administrador. Vuelve a intentar más tarde.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  if (estadoMiembro === 'rechazado') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 font-sans">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Solicitud rechazada</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-8">
          Tu solicitud para unirte al hogar fue rechazada. Contacta al administrador si crees que es un error.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  if (!hogarId) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 font-sans">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🏠</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No estás en ningún hogar</h2>
        <p className="text-sm text-gray-400 mb-8">Crea uno nuevo o solicita unirte desde el registro</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  const listaBase = tab === 'todos' ? productos : productos.filter(p => p.ubicacion === tab);
  const listaDestino = filtroDestino === 'Todos' ? listaBase : listaBase.filter(p => p.destino === filtroDestino);

  const vencidos = listaDestino.filter(p => getEstado(p.vencimiento).texto === 'Vencido');
  const porVencer = listaDestino.filter(p => getEstado(p.vencimiento).texto === 'Por vencer');
  const ok = listaDestino.filter(p => getEstado(p.vencimiento).texto === 'OK');
  const porAgotar = listaDestino.filter(p => { const d = getDiasStock(p); return d !== null && d <= 3; });

  const listaEstado = filtroEstado
    ? listaDestino.filter(p => {
        if (filtroEstado === 'vencidos') return getEstado(p.vencimiento).texto === 'Vencido';
        if (filtroEstado === 'porVencer') return getEstado(p.vencimiento).texto === 'Por vencer';
        if (filtroEstado === 'ok') return getEstado(p.vencimiento).texto === 'OK';
        if (filtroEstado === 'porAgotar') { const d = getDiasStock(p); return d !== null && d <= 3; }
        return true;
      })
    : listaDestino;

  const terminoBusqueda = busqueda.trim().toLowerCase();
  const lista = terminoBusqueda
    ? listaEstado.filter(p => p.nombre.toLowerCase().includes(terminoBusqueda))
    : listaEstado;

  const categorias = [...new Set(lista.map(p => p.categoria))];

  const TABS = [
    { id: 'todos', label: '✨ Todos' },
    { id: 'refrigerador', label: '🧊 Refrigerador' },
    { id: 'despensa', label: '🗄️ Despensa' },
  ];

  const NAV = [
    { id: 'inicio',    label: 'Inicio',    emoji: '🏠' },
    { id: 'alimentos', label: 'Alimentos', emoji: '🥗' },
    { id: 'personas',  label: 'Personas',  emoji: '👨‍👩‍👧' },
    { id: 'vehiculos', label: 'Vehículos', emoji: '🚗' },
    { id: 'equipos',   label: 'Equipos',   emoji: '🔧' },
    { id: 'hogar',     label: 'Hogar',     emoji: '⚙️' },
  ];

  return (
    <div className="max-w-xl mx-auto bg-gray-50 min-h-screen font-sans pb-20">
      {/* Header */}
      <div className="bg-white px-5 py-4 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <h1 className="text-base font-semibold text-gray-900 tracking-tight">{nombreHogar || '🏠'}</h1>
        <div className="text-xs text-gray-400 mt-0.5">MiHogar</div>
      </div>

      {/* Tab: Inicio */}
      {tabPrincipal === 'inicio' && (
        <TabInicio hogarId={hogarId} productos={productos} />
      )}

      {/* Tab: Alimentos */}
      {tabPrincipal === 'alimentos' && (
        <>
          <div className="flex bg-white border-b border-gray-100">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                  tab === t.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto items-center">
            <button
              onClick={() => setFiltroDestino('Todos')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                filtroDestino === 'Todos'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              ✨ Todos
            </button>
            {destinos.map(d => (
              <button
                key={d.id}
                onClick={() => setFiltroDestino(d.nombre)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  filtroDestino === d.nombre
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {d.emoji} {d.nombre}
              </button>
            ))}
            <button
              onClick={() => setMostrarModalDestino(true)}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-400 border border-dashed border-gray-300 hover:border-gray-400 whitespace-nowrap transition-colors"
            >
              + Agregar
            </button>
          </div>

          <div className="px-4 py-2 bg-white border-b border-gray-100">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm">🔍</span>
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-8 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
                >×</button>
              )}
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { key: 'vencidos',  num: vencidos.length,  label: 'Vencidos',       numCls: 'text-red-600'    },
                { key: 'porVencer', num: porVencer.length, label: 'Por vencer',     numCls: 'text-amber-600'  },
                { key: 'porAgotar', num: porAgotar.length, label: 'Por agotar',     numCls: 'text-orange-600' },
                { key: 'ok',        num: ok.length,        label: 'En buen estado', numCls: 'text-green-700'  },
              ].map(m => {
                const activo = filtroEstado === m.key;
                const activeCls =
                  m.key === 'vencidos'  ? 'border-red-300 bg-red-50' :
                  m.key === 'porVencer' ? 'border-amber-300 bg-amber-50' :
                  m.key === 'porAgotar' ? 'border-orange-300 bg-orange-50' :
                                          'border-green-300 bg-green-50';
                return (
                  <div
                    key={m.key}
                    onClick={() => toggleFiltroEstado(m.key)}
                    className={`rounded-xl border-2 p-3 text-center cursor-pointer transition-all ${
                      activo ? activeCls : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className={`text-xl font-semibold ${m.numCls}`}>{m.num}</div>
                    <div className="text-xs text-gray-400 mt-1 leading-tight">{m.label}</div>
                  </div>
                );
              })}
            </div>

            {cargando ? (
              <div className="text-center py-10 text-sm text-gray-400">Cargando productos...</div>
            ) : (
              <>
                {categorias.map(cat => {
                  const colapsada = terminoBusqueda ? false : categoriasColapsadas[cat] !== false;
                  const items = lista.filter(p => p.categoria === cat);
                  return (
                    <div key={cat} className="mb-4">
                      <button
                        onClick={() => toggleCategoria(cat)}
                        className="w-full flex items-center gap-2 mb-2 group"
                      >
                        <span className={`text-gray-400 text-xs transition-transform duration-200 ${colapsada ? '' : 'rotate-90'}`}>▶</span>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{cat}</span>
                        <span className="text-xs text-gray-300 font-medium">{items.length}</span>
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${colapsada ? 'max-h-0' : 'max-h-[2000px]'}`}>
                        {items.map(p => (
                          <ProductoItem
                            key={p.id}
                            producto={p}
                            onEliminar={handleEliminar}
                            onEditar={handleEditar}
                            onToggleModo={handleToggleModo}
                            mostrarUbicacion={tab === 'todos'}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {lista.length === 0 && (
                  <div className="text-center py-10 text-sm text-gray-400">
                    {terminoBusqueda
                      ? `Sin resultados para "${busqueda}"`
                      : 'No hay productos aquí todavía'}
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => { setProductoEditar(null); setMostrarFormulario(true); }}
              className="w-full py-3 mt-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
            >
              + Agregar producto
            </button>
          </div>
        </>
      )}

      {/* Tab: Personas */}
      {tabPrincipal === 'personas' && (
        <TabPersonas hogarId={hogarId} userId={session.user.id} />
      )}

      {/* Tab: Vehículos */}
      {tabPrincipal === 'vehiculos' && (
        <TabVehiculos hogarId={hogarId} userId={session.user.id} />
      )}

      {/* Tab: Equipos */}
      {tabPrincipal === 'equipos' && (
        <TabEquipos hogarId={hogarId} userId={session.user.id} />
      )}

      {/* Tab: Hogar */}
      {tabPrincipal === 'hogar' && (
        <TabHogar
          hogarId={hogarId}
          esAdmin={esAdmin}
          nombreHogar={nombreHogar}
          codigoInvitacion={codigoInvitacion}
          solicitudes={solicitudes}
          miembros={miembros}
          onAprobar={handleAprobar}
          onRechazar={handleRechazar}
          onEliminarMiembro={handleEliminarMiembro}
          onNombreHogarCambiado={setNombreHogar}
          onCodigoCambiado={setCodigoInvitacion}
          onVerHistorial={() => setModalActivo('historial')}
        />
      )}

      {/* Modales */}
      {modalAlerta && (
        <ModalAlerta
          titulo={modalAlerta.titulo}
          productos={modalAlerta.lista}
          onCerrar={() => setModalAlerta(null)}
          onEliminar={handleEliminar}
          onEditar={handleEditar}
        />
      )}
      {mostrarFormulario && (
        <FormularioProducto
          onGuardar={handleGuardar}
          onCerrar={handleCerrar}
          productoEditar={productoEditar}
          destinos={destinos}
          tab={tab}
        />
      )}
      {mostrarModalDestino && (
        <ModalDestino
          hogarId={hogarId}
          onCerrar={() => setMostrarModalDestino(false)}
          onGuardado={() => cargarDestinos()}
        />
      )}
      {modalActivo === 'historial' && (
        <ModalHistorial
          hogarId={hogarId}
          onCerrar={() => setModalActivo(null)}
          onDeshacer={handleDeshacer}
        />
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="max-w-xl mx-auto bg-white border-t border-gray-100 flex">
          {NAV.map(t => (
            <button
              key={t.id}
              onClick={() => setTabPrincipal(t.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-2.5 text-xs font-medium transition-colors ${
                tabPrincipal === t.id ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              <span className="text-xl mb-0.5">{t.emoji}</span>
              {t.label}
              {t.id === 'hogar' && esAdmin && solicitudes.length > 0 && (
                <span className="absolute top-1.5 right-[calc(50%-14px)] bg-red-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold leading-none">
                  {solicitudes.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
