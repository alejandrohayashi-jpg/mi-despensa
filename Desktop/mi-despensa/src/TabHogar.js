import React, { useState } from 'react';
import { supabase } from './supabase';

export default function TabHogar({
  hogarId, esAdmin, nombreHogar, codigoInvitacion: codigoInicial,
  solicitudes, miembros,
  onAprobar, onRechazar, onEliminarMiembro,
  onNombreHogarCambiado, onCodigoCambiado, onVerHistorial,
}) {
  const [password, setPassword] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState(nombreHogar);
  const [codigo, setCodigo] = useState(codigoInicial);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition mt-1';
  const labelCls = 'block text-xs font-medium text-gray-500 uppercase tracking-wide';
  const secTitle = 'text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3';

  const handleCambiarPassword = async () => {
    if (!password || password.length < 6) { setMensaje('Mínimo 6 caracteres'); return; }
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMensaje('Error: ' + error.message);
    else { setMensaje('✅ Contraseña actualizada'); setPassword(''); }
    setCargando(false);
  };

  const handleCambiarNombre = async () => {
    if (!nuevoNombre.trim()) { setMensaje('El nombre no puede estar vacío'); return; }
    setCargando(true);
    await supabase.from('hogares').update({ nombre: nuevoNombre.trim() }).eq('id', hogarId);
    onNombreHogarCambiado(nuevoNombre.trim());
    setMensaje('✅ Nombre actualizado');
    setCargando(false);
  };

  const handleRegenerarCodigo = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const nuevo = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setCargando(true);
    await supabase.from('hogares').update({ codigo_invitacion: nuevo }).eq('id', hogarId);
    setCodigo(nuevo);
    onCodigoCambiado(nuevo);
    setMensaje('✅ Código regenerado');
    setCargando(false);
  };

  return (
    <div className="p-4 space-y-6">
      {esAdmin && solicitudes.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
            Solicitudes pendientes ({solicitudes.length})
          </div>
          {solicitudes.map((s, i) => (
            <div key={s.user_id} className={`flex justify-between items-center py-3 ${i < solicitudes.length - 1 ? 'border-b border-amber-100' : ''}`}>
              <div className="text-sm font-medium text-gray-900">{s.nombre || 'Usuario'}</div>
              <div className="flex gap-2">
                <button onClick={() => onAprobar(s.user_id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-700 text-white hover:bg-green-800 transition-colors">✅ Aprobar</button>
                <button onClick={() => onRechazar(s.user_id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-700 text-white hover:bg-red-800 transition-colors">✕ Rechazar</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {esAdmin && (
        <section>
          <div className={secTitle}>🏠 Hogar</div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4 card-ios">
            <div>
              <label className={labelCls}>Nombre del hogar</label>
              <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} className={inputCls} />
              <button onClick={handleCambiarNombre} disabled={cargando} className="mt-2 py-2 px-4 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" style={{ backgroundColor: 'var(--color-hogar)' }}>
                {cargando ? 'Guardando...' : 'Cambiar nombre'}
              </button>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <label className={labelCls}>Código de invitación</label>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-sm font-bold tracking-widest bg-gray-100 text-gray-800 px-3 py-2 rounded-lg flex-1 text-center">{codigo || '—'}</span>
                <button onClick={handleRegenerarCodigo} disabled={cargando} className="py-2 px-3 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap" style={{ backgroundColor: 'var(--color-vehiculos)' }}>🔄 Regenerar</button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Comparte este código con quien quieras invitar.</p>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className={secTitle}>👥 Miembros ({miembros.length})</div>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden card-ios">
          {miembros.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">Sin miembros registrados</div>
          ) : (
            miembros.map((m, i) => (
              <div key={m.user_id} className={`flex justify-between items-center px-4 py-3 ${i < miembros.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900">{m.nombre || 'Usuario'}</span>
                  {m.rol === 'admin' && <span className="text-xs bg-gray-900 text-white rounded px-1.5 py-0.5 font-medium">Admin</span>}
                </div>
                {esAdmin && m.rol !== 'admin' && (
                  <button onClick={() => onEliminarMiembro(m.user_id)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-red-600 hover:bg-red-50 transition-colors">Eliminar</button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <div className={secTitle}>⚙️ Cuenta</div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 card-ios">
          <label className={labelCls}>Cambiar contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={inputCls} />
          <button onClick={handleCambiarPassword} disabled={cargando} className="mt-2 py-2 px-4 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50" style={{ backgroundColor: 'var(--color-hogar)' }}>
            {cargando ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </div>
      </section>

      <button
        onClick={onVerHistorial}
        className="w-full py-2.5 px-4 border border-gray-200 text-gray-600 rounded-2xl text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        📋 Ver historial
      </button>

      {mensaje && (
        <p className={`text-sm text-center ${mensaje.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{mensaje}</p>
      )}

      <button
        onClick={() => supabase.auth.signOut()}
        className="w-full py-2.5 px-4 border border-red-200 text-red-600 rounded-2xl text-sm font-medium hover:bg-red-50 transition-colors"
      >
        → Cerrar sesión
      </button>
    </div>
  );
}
