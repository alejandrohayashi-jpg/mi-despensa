import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Auth from './Auth';

const EMOJIS = ['🏠','👶','👦','👧','👨','👩','👴','👵','🐶','🐱','🐾','🍎','🥦','🥛','🍗','🛒','⭐','❤️','🌟','🎯'];

function getEstado(vencimiento) {
  const hoy = new Date();
  const vence = new Date(vencimiento);
  const dias = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { texto: 'Vencido', color: '#A32D2D', bg: '#FCEBEB' };
  if (dias <= 5) return { texto: 'Por vencer', color: '#854F0B', bg: '#FAEEDA' };
  return { texto: 'OK', color: '#3B6D11', bg: '#EAF3DE' };
}

function ProductoItem({ producto, onEliminar, onEditar, mostrarUbicacion }) {
  const estado = getEstado(producto.vencimiento);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '1px solid #eee', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{producto.nombre}</span>
          <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, fontWeight: 500, background: '#f0f0f0', color: '#555' }}>{producto.destino}</span>
          {mostrarUbicacion && (
            <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: '#e8e8e8', color: '#666' }}>
              {producto.ubicacion === 'refrigerador' ? '🧊 Refri' : '🗄️ Despensa'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>{producto.categoria} · Vence {producto.vencimiento}</div>
      </div>
      <div style={{ fontSize: 13, color: '#666', marginRight: 6 }}>{producto.cantidad} {producto.unidad}</div>
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: estado.bg, color: estado.color, marginRight: 6 }}>{estado.texto}</span>
      <button onClick={() => onEditar(producto)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 14, padding: '0 2px' }}>✏️</button>
      <button onClick={() => onEliminar(producto.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, padding: '0 2px' }}>✕</button>
    </div>
  );
}

function ModalAlerta({ titulo, productos, onCerrar, onEliminar, onEditar }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: 14, padding: 24, width: '90%', maxWidth: 420, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{titulo}</h2>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#999' }}>✕</button>
        </div>
        {productos.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: 20 }}>No hay productos en esta categoría</p>
        ) : (
          productos.map(p => <ProductoItem key={p.id} producto={p} onEliminar={onEliminar} onEditar={onEditar} mostrarUbicacion={true} />)
        )}
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'white', borderRadius: 14, padding: 24, width: '90%', maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Nuevo destino</h2>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#999' }}>✕</button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 4 }}>Nombre</div>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Agustín" style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 8 }}>Elige un emoji</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} style={{ width: 40, height: 40, fontSize: 20, borderRadius: 8, border: emoji === e ? '2px solid #333' : '1px solid #eee', background: emoji === e ? '#f5f5f5' : 'white', cursor: 'pointer' }}>{e}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCerrar} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
          <button onClick={handleGuardar} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, background: '#333', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function FormularioProducto({ onGuardar, onCerrar, productoEditar, destinos }) {
  const [form, setForm] = useState(
    productoEditar
      ? { ...productoEditar, cantidad: String(productoEditar.cantidad) }
      : { nombre: '', categoria: '', cantidad: '', unidad: 'un.', vencimiento: '', destino: destinos[0]?.nombre || 'Casa General' }
  );
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleGuardar = () => {
    if (!form.nombre || !form.categoria || !form.cantidad || !form.vencimiento) {
      alert('Por favor completa todos los campos');
      return;
    }
    onGuardar({ ...form, cantidad: Number(form.cantidad) });
    onCerrar();
  };
  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginTop: 4 };
  const labelStyle = { fontSize: 12, color: '#666', fontWeight: 500 };
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'white', borderRadius: 14, padding: 24, width: '90%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{productoEditar ? 'Editar producto' : 'Agregar producto'}</h2>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#999' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={labelStyle}>Nombre del producto</div>
            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Leche entera" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Para quién es</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {destinos.map(d => (
                <button key={d.id} onClick={() => setForm({ ...form, destino: d.nombre })} style={{ padding: '8px 12px', borderRadius: 8, border: form.destino === d.nombre ? '2px solid #333' : '1px solid #ddd', background: form.destino === d.nombre ? '#333' : 'white', color: form.destino === d.nombre ? 'white' : '#666', fontSize: 12, cursor: 'pointer', fontWeight: form.destino === d.nombre ? 600 : 400 }}>
                  {d.emoji} {d.nombre}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Categoría</div>
            <select name="categoria" value={form.categoria} onChange={handleChange} style={inputStyle}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={labelStyle}>Cantidad</div>
              <input name="cantidad" type="number" value={form.cantidad} onChange={handleChange} placeholder="Ej: 3" style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>Unidad</div>
              <select name="unidad" value={form.unidad} onChange={handleChange} style={inputStyle}>
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
            <div style={labelStyle}>Fecha de vencimiento</div>
            <input name="vencimiento" type="date" value={form.vencimiento} onChange={handleChange} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onCerrar} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
          <button onClick={handleGuardar} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, background: '#333', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
            {productoEditar ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [hogarId, setHogarId] = useState(null);
  const [tab, setTab] = useState('todos');
  const [filtroDestino, setFiltroDestino] = useState('Todos');
  const [productos, setProductos] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);
  const [modalAlerta, setModalAlerta] = useState(null);
  const [mostrarModalDestino, setMostrarModalDestino] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  useEffect(() => {
    if (session) cargarHogar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const cargarHogar = async () => {
    const { data } = await supabase.from('miembros_hogar').select('hogar_id').eq('user_id', session.user.id).single();
    if (data) {
      setHogarId(data.hogar_id);
      cargarProductos(data.hogar_id);
      cargarDestinos(data.hogar_id);
    } else setCargando(false);
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

  const handleGuardar = async (producto) => {
    const ubicacion = tab === 'todos' ? 'refrigerador' : tab;
    if (productoEditar) {
      await supabase.from('productos').update(producto).eq('id', producto.id);
    } else {
      await supabase.from('productos').insert([{ ...producto, ubicacion, hogar_id: hogarId }]);
    }
    cargarProductos();
  };

  const handleEliminar = async (id) => {
    await supabase.from('productos').delete().eq('id', id);
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
  if (cargando) return <div style={{ textAlign: 'center', padding: 60, fontFamily: 'sans-serif', color: '#888' }}>Cargando...</div>;

  if (!hogarId) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 40 }}>🏠</div>
      <h2 style={{ fontSize: 18, margin: '16px 0 8px' }}>No estás en ningún hogar</h2>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>Crea uno nuevo o únete con un código</p>
      <button onClick={async () => {
        const nombreHogar = prompt('¿Cómo se llama tu hogar?');
        if (!nombreHogar) return;
        const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: hogar } = await supabase.from('hogares').insert([{ nombre: nombreHogar, codigo_invitacion: codigo, admin_id: session.user.id }]).select().single();
        await supabase.from('miembros_hogar').insert([{ hogar_id: hogar.id, user_id: session.user.id, rol: 'admin' }]);
        await supabase.from('destinos').insert([{ hogar_id: hogar.id, nombre: 'Casa General', emoji: '🏠' }]);
        alert(`✅ Hogar creado. Código de invitación: ${codigo}`);
        cargarHogar();
      }} style={{ padding: '12px 24px', border: 'none', borderRadius: 8, background: '#333', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
        🏠 Crear hogar nuevo
      </button>
      <br />
      <button onClick={() => supabase.auth.signOut()} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer', marginTop: 12 }}>Cerrar sesión</button>
    </div>
  );

  const listaBase = tab === 'todos' ? productos : productos.filter(p => p.ubicacion === tab);
  const lista = filtroDestino === 'Todos' ? listaBase : listaBase.filter(p => p.destino === filtroDestino);
  const vencidos = lista.filter(p => getEstado(p.vencimiento).texto === 'Vencido');
  const porVencer = lista.filter(p => getEstado(p.vencimiento).texto === 'Por vencer');
  const ok = lista.filter(p => getEstado(p.vencimiento).texto === 'OK');
  const categorias = [...new Set(lista.map(p => p.categoria))];

  const TABS = [
    { id: 'todos', label: '✨ Todos' },
    { id: 'refrigerador', label: '🧊 Refrigerador' },
    { id: 'closet', label: '🗄️ Despensa' },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ background: 'white', padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Coco&Milo House</h1>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Inventario del hogar</div>
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{ fontSize: 12, color: '#888', background: 'none', border: '1px solid #eee', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>Salir</button>
      </div>

      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #eee' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '10px 4px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === t.id ? 600 : 400, borderBottom: tab === t.id ? '2px solid #333' : '2px solid transparent', fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: 'white', borderBottom: '1px solid #eee', overflowX: 'auto', alignItems: 'center' }}>
        <button onClick={() => setFiltroDestino('Todos')} style={{ padding: '5px 14px', borderRadius: 20, border: filtroDestino === 'Todos' ? '2px solid #333' : '1px solid #ddd', background: filtroDestino === 'Todos' ? '#333' : 'white', color: filtroDestino === 'Todos' ? 'white' : '#666', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: filtroDestino === 'Todos' ? 600 : 400 }}>
          ✨ Todos
        </button>
        {destinos.map(d => (
          <button key={d.id} onClick={() => setFiltroDestino(d.nombre)} style={{ padding: '5px 14px', borderRadius: 20, border: filtroDestino === d.nombre ? '2px solid #333' : '1px solid #ddd', background: filtroDestino === d.nombre ? '#333' : 'white', color: filtroDestino === d.nombre ? 'white' : '#666', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: filtroDestino === d.nombre ? 600 : 400 }}>
            {d.emoji} {d.nombre}
          </button>
        ))}
        <button onClick={() => setMostrarModalDestino(true)} style={{ padding: '5px 12px', borderRadius: 20, border: '1px dashed #ccc', background: 'white', color: '#aaa', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Agregar
        </button>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { num: vencidos.length, label: 'Vencidos', color: '#A32D2D', lista: vencidos, titulo: '🔴 Productos vencidos' },
            { num: porVencer.length, label: 'Por vencer', color: '#854F0B', lista: porVencer, titulo: '🟡 Por vencer pronto' },
            { num: ok.length, label: 'En buen estado', color: '#3B6D11', lista: ok, titulo: '🟢 En buen estado' },
          ].map(m => (
            <div key={m.label} onClick={() => setModalAlerta({ titulo: m.titulo, lista: m.lista })}
              style={{ background: 'white', borderRadius: 10, padding: '12px', textAlign: 'center', border: '1px solid #eee', cursor: 'pointer' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: m.color }}>{m.num}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Cargando productos...</div>
        ) : (
          <>
            {categorias.map(cat => (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{cat}</div>
                {lista.filter(p => p.categoria === cat).map(p => (
                  <ProductoItem key={p.id} producto={p} onEliminar={handleEliminar} onEditar={handleEditar} mostrarUbicacion={tab === 'todos'} />
                ))}
              </div>
            ))}
            {lista.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontSize: 14 }}>No hay productos aquí todavía</div>
            )}
          </>
        )}

        <button onClick={() => { setProductoEditar(null); setMostrarFormulario(true); }} style={{ width: '100%', padding: '12px', border: '1.5px dashed #ccc', borderRadius: 10, background: 'transparent', color: '#888', fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
          + Agregar producto
        </button>
      </div>

      {modalAlerta && <ModalAlerta titulo={modalAlerta.titulo} productos={modalAlerta.lista} onCerrar={() => setModalAlerta(null)} onEliminar={handleEliminar} onEditar={handleEditar} />}
      {mostrarFormulario && <FormularioProducto onGuardar={handleGuardar} onCerrar={handleCerrar} productoEditar={productoEditar} destinos={destinos} />}
      {mostrarModalDestino && <ModalDestino hogarId={hogarId} onCerrar={() => setMostrarModalDestino(false)} onGuardado={() => cargarDestinos()} />}
    </div>
  );
}

export default App;