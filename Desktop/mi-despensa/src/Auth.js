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

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition mt-1';
  const labelCls = 'block text-xs font-medium text-gray-500 uppercase tracking-wide';
  const btnPrimary = 'w-full py-2.5 px-4 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2';
  const btnSecondary = 'w-full py-2.5 px-4 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors mt-2';
  const btnGhost = 'w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1';

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
      const codigoNorm = nombreHogar.trim().toUpperCase();
      const { data: hogar, error: errorBusqueda } = await supabase
        .from('hogares')
        .select('*')
        .eq('codigo_invitacion', codigoNorm)
        .maybeSingle();

      if (errorBusqueda) {
        setMensaje('Error al buscar el hogar. Intenta de nuevo.');
        setCargando(false);
        return;
      }
      if (!hogar) {
        setMensaje('Código inválido. Verifica con el administrador.');
        setCargando(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setMensaje(error.message); setCargando(false); return; }
      if (!data.user) {
        setMensaje('Este email ya está registrado. Intentá iniciar sesión.');
        setCargando(false);
        return;
      }

      const payload = {
        hogar_id: hogar.id,
        user_id: data.user.id,
        rol: 'miembro',
        nombre,
        estado: 'pendiente'
      };
      console.log('[unirse] Payload insert miembro:', payload);
      const { data: insertData, error: errorInsert } = await supabase
        .from('miembros_hogar')
        .insert([payload])
        .select();

      console.log('[unirse] Insert miembro — data:', insertData);
      console.log('[unirse] Insert miembro — error:', errorInsert);

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

  const handleGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://mi-despensa-vert.vercel.app' },
    });

  const divisor = (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400">o</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );

  const btnGoogle = (
    <button
      onClick={handleGoogle}
      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mt-2"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      Continuar con Google
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3 w-16 h-16 flex items-center justify-center rounded-2xl mx-auto" style={{ backgroundColor: 'var(--color-alimentos)', opacity: 0.9 }}>🏠</div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mt-3">MiHogar</h1>
          <p className="text-sm text-gray-400 mt-1">Gestión del hogar</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {modo === 'login' ? (
            <>
              <h2 className="text-sm font-semibold text-gray-900 mb-5">Iniciar sesión</h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Contraseña</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
                </div>
              </div>
              {mensaje && <p className="text-xs text-red-600 mt-3">{mensaje}</p>}
              <button onClick={handleLogin} disabled={cargando} className={btnPrimary} style={{ backgroundColor: 'var(--color-alimentos)' }}>
                {cargando ? 'Ingresando...' : 'Ingresar'}
              </button>
              {divisor}
              {btnGoogle}
              <button onClick={() => { setModo('registro'); setMensaje(''); }} className={`${btnSecondary} mt-4`}>
                Crear cuenta nueva
              </button>
            </>
          ) : flujo === 'inicio' ? (
            <>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Crear cuenta</h2>
              <p className="text-xs text-gray-400 mb-5">¿Cómo quieres unirte?</p>
              <button onClick={() => setFlujo('crear')} className={`${btnPrimary} mt-0`} style={{ backgroundColor: 'var(--color-alimentos)' }}>
                🏠 Crear un hogar nuevo
              </button>
              <button onClick={() => setFlujo('unirse')} className={btnSecondary}>
                🔍 Solicitar unirme a un hogar
              </button>
              {divisor}
              {btnGoogle}
              <button onClick={resetRegistro} className={btnGhost}>← Volver al login</button>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-gray-900 mb-5">
                {flujo === 'crear' ? '🏠 Crear hogar' : '🔍 Solicitar unirme'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Tu nombre</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Alejandro" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Contraseña</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>
                    {flujo === 'crear' ? 'Nombre del hogar' : 'Código de invitación'}
                  </label>
                  <input
                    value={nombreHogar}
                    onChange={e => setNombreHogar(e.target.value)}
                    placeholder={flujo === 'crear' ? 'Ej: Familia García' : 'Ej: AB12CD34'}
                    className={inputCls}
                  />
                  {flujo === 'unirse' && (
                    <p className="text-xs text-gray-400 mt-1.5">El administrador puede ver el código en Gestión de cuenta.</p>
                  )}
                </div>
              </div>
              {mensaje && (
                <p className={`text-xs mt-3 ${mensaje.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{mensaje}</p>
              )}
              <button onClick={handleRegistro} disabled={cargando} className={btnPrimary} style={{ backgroundColor: 'var(--color-alimentos)' }}>
                {cargando ? 'Enviando...' : flujo === 'crear' ? 'Crear hogar' : 'Enviar solicitud'}
              </button>
              <button onClick={() => { setFlujo('inicio'); setMensaje(''); }} className={btnGhost}>← Volver</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
