export const TIPOS_DOCUMENTO = {
  chip: 'Número de chip',
  carnet_identidad: 'Carnet de identidad',
  pasaporte: 'Pasaporte',
  licencia_conducir: 'Licencia de conducir',
  seguro_medico: 'Seguro médico',
  carnet_vacunas: 'Carnet de vacunas',
  otro: 'Otro',
};

// Formatea cualquier fecha (date string 'YYYY-MM-DD' o ISO timestamp completo)
// en formato local es-CL. Devuelve 'Sin fecha' ante null o valor inválido.
export function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha';
  // Tomar solo los primeros 10 chars para manejar tanto 'YYYY-MM-DD'
  // como ISO completos ('2026-05-15T00:00:00+00:00'). Fuerza hora local
  // con T00:00:00 para evitar desfase de zona horaria.
  const soloFecha = String(fecha).substring(0, 10);
  const d = new Date(soloFecha + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Formatea fecha + hora juntas desde un ISO string o timestamp de Supabase.
export function formatearFechaHora(fecha) {
  if (!fecha) return 'Sin fecha';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return 'Sin fecha';
  const fechaStr = d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  const horaStr = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return `${fechaStr} · ${horaStr}`;
}

// Calcula y formatea la edad a partir de fecha de nacimiento.
// Para mascotas muestra meses si < 12, para humanos solo años.
export function calcularEdad(fechaNac, tipo) {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nac = new Date(String(fechaNac).substring(0, 10) + 'T00:00:00');
  if (isNaN(nac.getTime())) return null;
  const years = hoy.getFullYear() - nac.getFullYear();
  const months = hoy.getMonth() - nac.getMonth();
  const totalMonths = years * 12 + months;
  if (tipo === 'mascota' && totalMonths < 12) return `${totalMonths} meses`;
  if (tipo === 'mascota') return `${Math.floor(totalMonths / 12)} años y ${totalMonths % 12} meses`;
  return `${years} años`;
}

// Devuelve personas con cumpleaños en los próximos `dias` días, ordenadas por proximidad.
export function proximosCumpleanos(personas, dias = 30) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return personas
    .filter(p => p.fecha_nac)
    .map(p => {
      const nac = new Date(String(p.fecha_nac).substring(0, 10) + 'T00:00:00');
      let cumple = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate());
      if (cumple < hoy) cumple = new Date(hoy.getFullYear() + 1, nac.getMonth(), nac.getDate());
      const diasHasta = Math.round((cumple - hoy) / (1000 * 60 * 60 * 24));
      return { ...p, diasHastaCumple: diasHasta, fechaCumple: cumple };
    })
    .filter(p => p.diasHastaCumple <= dias)
    .sort((a, b) => a.diasHastaCumple - b.diasHastaCumple);
}

export const TIPOS_DOC_VEHICULO = {
  revision_tecnica: 'Revisión técnica',
  permiso_circulacion: 'Permiso de circulación',
  seguro: 'Seguro',
  soap: 'SOAP',
};

// Semáforo para fechas de vehículos/equipos: rojo <30d, amarillo <90d, verde resto.
export function semaforoDias(fecha) {
  if (!fecha) return { cls: 'text-gray-400', texto: 'Sin fecha' };
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const vence = new Date(String(fecha).substring(0, 10) + 'T00:00:00');
  if (isNaN(vence.getTime())) return { cls: 'text-gray-400', texto: 'Sin fecha' };
  const dias = Math.round((vence - hoy) / 86400000);
  if (dias < 0)  return { cls: 'text-red-600',   texto: `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}` };
  if (dias === 0) return { cls: 'text-red-600',   texto: 'Vence hoy' };
  if (dias < 30)  return { cls: 'text-red-500',   texto: `Vence en ${dias} día${dias !== 1 ? 's' : ''}` };
  if (dias < 90)  return { cls: 'text-amber-500', texto: `Vence en ${dias} días` };
  return            { cls: 'text-green-600',  texto: `Vence en ${dias} días` };
}

// Devuelve días hasta el vencimiento + texto + clase CSS de color.
// Acepta tanto 'YYYY-MM-DD' como ISO timestamp completo.
export function diasParaVencer(fechaVencimiento) {
  if (!fechaVencimiento) return { texto: 'Sin fecha', cls: 'text-gray-400', dias: null, fechaCorta: '' };
  const soloFecha = String(fechaVencimiento).substring(0, 10);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(soloFecha + 'T00:00:00');
  if (isNaN(vence.getTime())) return { texto: 'Sin fecha', cls: 'text-gray-400', dias: null, fechaCorta: '' };
  const dias = Math.round((vence - hoy) / (1000 * 60 * 60 * 24));
  const fechaCorta = vence.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  if (dias < 0)  return { texto: `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`, cls: 'text-red-600',    dias, fechaCorta };
  if (dias === 0) return { texto: 'Vence hoy',     cls: 'text-red-600',    dias, fechaCorta };
  if (dias === 1) return { texto: 'Vence mañana',  cls: 'text-orange-500', dias, fechaCorta };
  if (dias <= 7)  return { texto: `Vence en ${dias} días`, cls: 'text-amber-500',  dias, fechaCorta };
  return           { texto: `Vence en ${dias} días`, cls: 'text-gray-400',   dias, fechaCorta };
}
