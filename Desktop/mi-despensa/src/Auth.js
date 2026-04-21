import React, { useState } from 'react';
import { supabase } from './supabase';

export default function Auth() {
  const [modo, setModo] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [codigoInvitacion, setCodigoInvitacion] = useState('');
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
    if (!email || !password || !nombre) {
      setMensaje('Completa todos los campos');
      return;
    }
    setCargando(true);
    setMensaje('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setMensaje(error.message); setCargando(false); return; }

    if (flujo === 'crear') {
      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: hogar } = await supabase.from('hogares').insert([{
        nombre,
        codigo_invitacion: codigo,
        admin_id: data.user.id
      }]).select().single();

      await supabase.from('miembros_hogar').insert([{
        hogar_id: hogar.id,
        user_id: data.user.id,
        rol: 'admin'
      }]);
      setMensaje(`✅ Hogar creado. Tu código de invitación es: ${codigo} — compártelo con tu familia`);
    } else {
      const { data: hogar } = await supabase.from('hogares').select('*').eq('codigo_invitacion', codigoInvitacion.toUpperCase()).single();
      if (!hogar) { setMensaje('Código de invitación inválido'); setCargando(false); return; }
      await supabase.from('miembros_hogar').insert([{
        hogar_id: hogar.id,
        user_id: data.user.id,
        rol: 'miembro'
      }]);
      setMensaje('✅ Te uniste al hogar correctamente. Revisa tu email para confirmar tu cuenta.');
    }
    setCargando(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40 }}>🏠</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 4px' }}>Coco&Milo House</h1>
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
            <button onClick={() => setFlujo('unirse')} style={btnSecondary}>🔑 Unirme con código de invitación</button>
            <button onClick={() => { setModo('login'); setFlujo('inicio'); setMensaje(''); }} style={{ ...btnSecondary, color: '#888', border: 'none' }}>← Volver al login</button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>
              {flujo === 'crear' ? '🏠 Crear hogar' : '🔑 Unirme a un hogar'}
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
              {flujo === 'crear' ? (
                <div>
                  <div style={labelStyle}>Nombre del hogar</div>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Familia García" style={inputStyle} />
                </div>
              ) : (
                <div>
                  <div style={labelStyle}>Código de invitación</div>
                  <input value={codigoInvitacion} onChange={e => setCodigoInvitacion(e.target.value)} placeholder="Ej: ABC123" style={inputStyle} />
                </div>
              )}
            </div>
            {mensaje && <p style={{ fontSize: 13, color: mensaje.startsWith('✅') ? '#3B6D11' : '#A32D2D', marginTop: 8 }}>{mensaje}</p>}
            <button onClick={handleRegistro} disabled={cargando} style={btnPrimary}>{cargando ? 'Creando...' : flujo === 'crear' ? 'Crear hogar' : 'Unirme al hogar'}</button>
            <button onClick={() => { setFlujo('inicio'); setMensaje(''); }} style={{ ...btnSecondary, color: '#888', border: 'none' }}>← Volver</button>
          </>
        )}
      </div>
    </div>
  );
}