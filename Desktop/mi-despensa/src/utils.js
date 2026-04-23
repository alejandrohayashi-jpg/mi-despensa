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
