import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = 'onboarding@resend.dev';
const APP_URL = 'https://mi-despensa-vert.vercel.app';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  const secret = req.headers.get('x-internal-secret');
  if (!secret || secret !== Deno.env.get('CRON_SECRET')) {
    return new Response('Forbidden', { status: 403 });
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // 1. Obtener todos los hogares
  const { data: hogares, error: errHogares } = await supabase
    .from('hogares')
    .select('id, nombre, notification_days_before');

  if (errHogares || !hogares?.length) {
    return new Response(JSON.stringify({ error: errHogares?.message ?? 'Sin hogares' }), { status: 500 });
  }

  const resultados: string[] = [];

  for (const hogar of hogares) {
    const dias = hogar.notification_days_before ?? 3;
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + dias);
    const limiteStr = limite.toISOString().split('T')[0];
    const hoyStr = hoy.toISOString().split('T')[0];

    // 2. Consultas paralelas
    const [
      { data: productos },
      { data: citas },
      { data: mantVehiculos },
      { data: mantEquipos },
    ] = await Promise.all([
      supabase
        .from('productos')
        .select('nombre, cantidad, unidad, vencimiento, destino')
        .eq('hogar_id', hogar.id)
        .eq('archivado', false)
        .not('vencimiento', 'is', null)
        .lte('vencimiento', limiteStr)
        .gte('vencimiento', hoyStr)
        .order('vencimiento'),

      supabase
        .from('citas')
        .select('titulo, fecha, lugar, personas(nombre)')
        .eq('hogar_id', hogar.id)
        .gte('fecha', hoy.toISOString())
        .lte('fecha', new Date(limite.getTime() + 86400000).toISOString())
        .order('fecha'),

      supabase
        .from('vehiculo_registros')
        .select('titulo, tipo, fecha_vencimiento, vehiculos(nombre, patente)')
        .eq('hogar_id', hogar.id)
        .in('tipo', ['revision_tecnica', 'permiso_circulacion', 'seguro', 'soap'])
        .not('fecha_vencimiento', 'is', null)
        .lte('fecha_vencimiento', limiteStr)
        .gte('fecha_vencimiento', hoyStr)
        .order('fecha_vencimiento'),

      supabase
        .from('equipo_registros')
        .select('titulo, proxima_mantencion, equipos(nombre)')
        .eq('hogar_id', hogar.id)
        .not('proxima_mantencion', 'is', null)
        .lte('proxima_mantencion', limiteStr)
        .gte('proxima_mantencion', hoyStr)
        .order('proxima_mantencion'),
    ]);

    const hayItems =
      (productos?.length ?? 0) > 0 ||
      (citas?.length ?? 0) > 0 ||
      (mantVehiculos?.length ?? 0) > 0 ||
      (mantEquipos?.length ?? 0) > 0;

    if (!hayItems) {
      resultados.push(`${hogar.nombre}: sin items`);
      continue;
    }

    // 3. Obtener emails de miembros activos
    const { data: miembros } = await supabase
      .from('miembros_hogar')
      .select('user_id')
      .eq('hogar_id', hogar.id)
      .eq('estado', 'activo');

    if (!miembros?.length) {
      resultados.push(`${hogar.nombre}: sin miembros activos`);
      continue;
    }

    const emails: string[] = [];
    for (const m of miembros) {
      const { data: userData } = await supabase.auth.admin.getUserById(m.user_id);
      if (userData?.user?.email) emails.push(userData.user.email);
    }

    if (!emails.length) {
      resultados.push(`${hogar.nombre}: sin emails`);
      continue;
    }

    // 4. Construir HTML del email
    const html = buildEmailHtml(hogar.nombre, dias, {
      productos: productos ?? [],
      citas: citas ?? [],
      mantVehiculos: mantVehiculos ?? [],
      mantEquipos: mantEquipos ?? [],
    });

    // 5. Enviar email vía Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `MiHogar <${FROM_EMAIL}>`,
        to: emails,
        subject: `📋 Resumen MiHogar: ${hogar.nombre}`,
        html,
      }),
    });

    const resJson = await res.json();
    if (!res.ok) {
      console.error(`Error Resend para ${hogar.nombre}:`, resJson);
      resultados.push(`${hogar.nombre}: error email — ${resJson.message}`);
    } else {
      resultados.push(`${hogar.nombre}: email enviado a ${emails.length} miembro(s)`);
    }
  }

  console.log('Resultados:', resultados);
  return new Response(JSON.stringify({ ok: true, resultados }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// ---------------------------------------------------------------------------

function fmt(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDatetime(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long' }) +
    ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function section(emoji: string, titulo: string, rows: string[]): string {
  if (!rows.length) return '';
  return `
    <div style="margin-bottom:24px;">
      <div style="font-size:14px;font-weight:700;color:#111;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #f0f0f0;">
        ${emoji} ${titulo}
      </div>
      ${rows.map(r => `<div style="font-size:13px;color:#444;padding:6px 0;border-bottom:1px solid #f8f8f8;">${r}</div>`).join('')}
    </div>`;
}

function buildEmailHtml(nombreHogar: string, dias: number, items: {
  productos: any[], citas: any[], mantVehiculos: any[], mantEquipos: any[]
}): string {

  const filasProductos = items.productos.map(p =>
    `<strong>${p.nombre}</strong> · ${p.cantidad} ${p.unidad} · Vence: <strong>${fmt(p.vencimiento)}</strong>${p.destino ? ` · ${p.destino}` : ''}`
  );

  const filasCitas = items.citas.map(c =>
    `<strong>${c.titulo}</strong>${c.personas?.nombre ? ` · ${c.personas.nombre}` : ''} · ${fmtDatetime(c.fecha)}${c.lugar ? ` · ${c.lugar}` : ''}`
  );

  const filasMantVehiculos = items.mantVehiculos.map(v => {
    const veh = v.vehiculos;
    const tipo = ({ revision_tecnica: 'Revisión técnica', permiso_circulacion: 'Permiso', seguro: 'Seguro', soap: 'SOAP' } as Record<string,string>)[v.tipo] ?? v.tipo;
    return `<strong>${veh?.nombre ?? ''}${veh?.patente ? ` (${veh.patente})` : ''}</strong> · ${tipo} · Vence: <strong>${fmt(v.fecha_vencimiento)}</strong>`;
  });

  const filasMantEquipos = items.mantEquipos.map(e =>
    `<strong>${e.equipos?.nombre ?? ''}</strong> · ${e.titulo ?? 'Mantención'} · <strong>${fmt(e.proxima_mantencion)}</strong>`
  );

  const cuerpo =
    section('🍎', 'Alimentos por vencer', filasProductos) +
    section('🏥', 'Citas médicas próximas', filasCitas) +
    section('🚗', 'Documentos de vehículos', filasMantVehiculos) +
    section('🔧', 'Mantenciones de equipos', filasMantEquipos);

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#34c759;padding:24px 28px;">
            <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🏠 MiHogar</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">${nombreHogar} · Resumen de los próximos ${dias} días</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:24px 28px;">
            ${cuerpo}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px 24px;border-top:1px solid #f0f0f0;">
            <a href="${APP_URL}" style="display:inline-block;background:#34c759;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 20px;border-radius:10px;">
              Ir a la app →
            </a>
            <p style="font-size:11px;color:#aaa;margin-top:16px;margin-bottom:0;">
              Recibís este email porque sos miembro del hogar <strong>${nombreHogar}</strong> en MiHogar.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
