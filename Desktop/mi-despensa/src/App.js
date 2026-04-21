import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

function getEstado(vencimiento) {
  const hoy = new Date();
  const vence = new Date(vencimiento);
  const dias = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { texto: 'Vencido', color: '#A32D2D', bg: '#FCEBEB' };
  if (dias <= 3) return { texto: 'Pronto', color: '#854F0B', bg: '#FAEEDA' };
  return { texto: 'OK', color: '#3B6D11', bg: '#EAF3DE' };
}

function ProductoItem({ producto, onEliminar, onEditar }) {
  const estado = getEstado(producto.vencimiento);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1px solid #eee', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{producto.nombre}</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{producto.categoria} · Vence {producto.vencimiento}</div>
      </div>
      <div style={{ fontSize: 13, color: '#666', marginRight: 8 }}>{producto.cantidad} {producto.unidad}</div>
      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 500, background: estado.bg, color: estado.color, marginRight: 8 }}>{estado.texto}</span>
      <button onClick={() => onEditar(producto)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 14, padding: '0 4px' }}>✏️</button>
      <button onClick={() => onEliminar(producto.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, padding: '0 4px' }}>✕</button>
    </div>
  );
}

function FormularioProducto({ onGuardar, onCerrar, productoEditar }) {
  const [form, setForm] = useState(
    productoEditar
      ? { ...productoEditar, cantidad: String(productoEditar.cantidad) }
      : { nombre: '', categoria: '', cantidad: '', unidad: 'un.', vencimiento: '' }
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
      <div style={{ background: 'white', borderRadius: 14, padding: 24, width: '90%', maxWidth: 420 }}>
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
  const [tab, setTab] = useState('refrigerador');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setCargando(true);
    const { data, error } = await supabase.from('productos').select('*');
    if (error) console.error('Error cargando:', error);
    else setProductos(data);
    setCargando(false);
  };

  const handleGuardar = async (producto) => {
    if (productoEditar) {
      const { error } = await supabase.from('productos').update(producto).eq('id', producto.id);
      if (error) console.error('Error editando:', error);
    } else {
      const { error } = await supabase.from('productos').insert([{ ...producto, ubicacion: tab }]);
      if (error) console.error('Error guardando:', error);
    }
    cargarProductos();
  };

  const handleEliminar = async (id) => {
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) console.error('Error eliminando:', error);
    else cargarProductos();
  };

  const handleEditar = (producto) => {
    setProductoEditar(producto);
    setMostrarFormulario(true);
  };

  const handleCerrar = () => {
    setMostrarFormulario(false);
    setProductoEditar(null);
  };

  const lista = productos.filter(p => p.ubicacion === tab);
  const vencidos = lista.filter(p => getEstado(p.vencimiento).texto === 'Vencido').length;
  const ok = lista.filter(p => getEstado(p.vencimiento).texto === 'OK').length;
  const categorias = [...new Set(lista.map(p => p.categoria))];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ background: 'white', padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Mi Despensa</h1>
        <span style={{ fontSize: 13, color: '#888' }}>Familia</span>
      </div>

      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #eee' }}>
        {['refrigerador', 'closet'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === t ? 600 : 400, borderBottom: tab === t ? '2px solid #333' : '2px solid transparent', fontSize: 14 }}>
            {t === 'refrigerador' ? '🧊 Refrigerador' : '🗄️ Closet'}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[{ num: lista.length, label: 'Productos', color: '#333' }, { num: vencidos, label: 'Vencidos', color: '#A32D2D' }, { num: ok, label: 'En buen estado', color: '#3B6D11' }].map(m => (
            <div key={m.label} style={{ background: 'white', borderRadius: 10, padding: '12px', textAlign: 'center', border: '1px solid #eee' }}>
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
                  <ProductoItem key={p.id} producto={p} onEliminar={handleEliminar} onEditar={handleEditar} />
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

      {mostrarFormulario && (
        <FormularioProducto
          onGuardar={handleGuardar}
          onCerrar={handleCerrar}
          productoEditar={productoEditar}
        />
      )}
    </div>
  );
}

export default App;