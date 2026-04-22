import React, { useState } from 'react';
import { supabase } from './supabase';

export default function Auth() {
  const [modo, setModo] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [nombreHogar, setNombreHogar] = useState('');
  const [flujo, setFlujo] = useState('inicio');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginTop: 4 };
  const labelStyle = { fontSize: 12, color: '#666', fontWeight: 500 };
  const btnPrimary = { width: '100%', padding: '12px', border: 'none', borderRadius: 8, background: '#333', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginTop: 8 };
  const btnSecondary = { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14, marginTop: 8 };

  const handleLogin = async () => {
    setCargando(true);
    setMensaje('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMensaje('Email o contraseña incorrectos');
    setCargando(false);
  };

  const handleRegistro = async () => {
    if (!email || !password || !nombre || !nombreHogar) {
      setMensaje('Completa todos los campos');
      return;
    }
    setCargando(true);
    setMensaje('');

    if (flujo === 'crear') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setMensaje(error.message); setCargando(false); return; }
      if (!data.user) { setMensaje('Este email ya está registrado. Intentá iniciar sesión.'); setCargando(false); return; }

      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: hogar, error: errorHogar } = await supabase.from('hogares').insert([{
        nombre: nombreHogar,
        codigo_invitacion: codigo,
        admin_id: data.user.id
      }]).select().single();

      if (errorHogar) { setMensaje('Error al crear el hogar'); setCargando(false); return; }

      await supabase.from('miembros_hogar').insert([{
        hogar_id: hogar.id,
        user_id: data.user.id,
        rol: 'admin',
        nombre,
        estado: 'activo'
      }]);
      await supabase.from('destinos').insert([{ hogar_id: hogar.id, nombre: 'Casa General', emoji: '🏠' }]);
      setMensaje('✅ Hogar creado. Ya puedes iniciar sesión.');
    } else {
      // Buscar el hogar ANTES de crear la cuenta, para no dejar usuarios huérfanos en auth
      console.log('[unirse] Buscando hogar:', nombreHogar.trim());
      const { data: hogares, error: errorBusqueda } = await supabase
        .from('hogares')
        .select('*')
        .ilike('nombre', nombreHogar.trim());

      console.log('[unirse] Resultado búsqueda:', { hogares, errorBusqueda });

      if (errorBusqueda) {
        setMensaje('Error al buscar el hogar. Intenta de nuevo.');
        setCargando(false);
        return;
      }
      if (!hogares || hogares.length === 0) {
        setMensaje('No se encontró un hogar con ese nombre. Verifica con el administrador.');
        setCargando(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      console.log('[unirse] signUp resultado:', { user: data?.user?.id ?? null, error });
      if (error) { setMensaje(error.message); setCargando(false); return; }
      if (!data.user) {
        setMensaje('Este email ya está registrado. Intentá iniciar sesión.');
        setCargando(false);
        return;
      }

      console.log('[unirse] Insertando miembro en hogar:', hogares[0].id, '— estado: pendiente');
      const { error: errorInsert } = await supabase.from('miembros_hogar').insert([{
        hogar_id: hogares[0].id,
        user_id: data.user.id,
        rol: 'miembro',
        nombre,
        estado: 'pendiente'
      }]);

      console.log('[unirse] Resultado insert miembro:', errorInsert ? `ERROR ${errorInsert.code}: ${errorInsert.message}` : 'OK');

      if (errorInsert) {
        setMensaje('Error al enviar la solicitud. Intenta de nuevo.');
        setCargando(false);
        return;
      }

      setMensaje('✅ Solicitud enviada. El administrador del hogar deberá aprobarte para que puedas acceder.');
    }
    setCargando(false);
  };

  const resetRegistro = () => { setModo('login'); setFlujo('inicio'); setMensaje(''); };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40 }}>🏠</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 4px' }}>MiDespensa</h1>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Inventario del hogar</p>
      </div>

      <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #eee' }}>
        {modo === 'login' ? (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>Iniciar sesión</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={labelStyle}>Email</div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Contraseña</div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </div>
            </div>
            {mensaje && <p style={{ fontSize: 13, color: '#A32D2D', marginTop: 8 }}>{mensaje}</p>}
            <button onClick={handleLogin} disabled={cargando} style={btnPrimary}>{cargando ? 'Ingresando...' : 'Ingresar'}</button>
            <button onClick={() => { setModo('registro'); setMensaje(''); }} style={btnSecondary}>Crear cuenta nueva</button>
          </>
        ) : flujo === 'inicio' ? (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Crear cuenta</h2>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>¿Cómo quieres unirte?</p>
            <button onClick={() => setFlujo('crear')} style={{ ...btnPrimary, marginTop: 0 }}>🏠 Crear un hogar nuevo</button>
            <button onClick={() => setFlujo('unirse')} style={btnSecondary}>🔍 Solicitar unirme a un hogar</button>
            <button onClick={resetRegistro} style={{ ...btnSecondary, color: '#888', border: 'none' }}>← Volver al login</button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>
              {flujo === 'crear' ? '🏠 Crear hogar' : '🔍 Solicitar unirme a un hogar'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={labelStyle}>Tu nombre</div>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Alejandro" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Email</div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Contraseña</div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>{flujo === 'crear' ? 'Nombre del hogar' : 'Nombre del hogar al que quieres unirte'}</div>
                <input
                  value={nombreHogar}
                  onChange={e => setNombreHogar(e.target.value)}
                  placeholder={flujo === 'crear' ? 'Ej: Familia Coco y Milo' : 'Ej: Familia Coco y Milo'}
                  style={inputStyle}
                />
                {flujo === 'unirse' && (
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Escribe el nombre exacto. El admin deberá aprobar tu solicitud.</div>
                )}
              </div>
            </div>
            {mensaje && (
              <p style={{ fontSize: 13, color: mensaje.startsWith('✅') ? '#3B6D11' : '#A32D2D', marginTop: 8 }}>{mensaje}</p>
            )}
            <button onClick={handleRegistro} disabled={cargando} style={btnPrimary}>
              {cargando ? 'Enviando...' : flujo === 'crear' ? 'Crear hogar' : 'Enviar solicitud'}
            </button>
            <button onClick={() => { setFlujo('inicio'); setMensaje(''); }} style={{ ...btnSecondary, color: '#888', border: 'none' }}>← Volver</button>
          </>
        )}
      </div>
    </div>
  );
}
