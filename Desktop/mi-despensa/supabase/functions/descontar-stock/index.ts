import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const cronSecret = req.headers.get('x-internal-secret');
  if (!cronSecret || cronSecret !== Deno.env.get('CRON_SECRET')) {
    return new Response('Forbidden', { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // 1. Traer todos los productos en modo automático con consumo definido
  const { data: productos, error } = await supabase
    .from('productos')
    .select('id, nombre, cantidad, vencimiento, unidad, categoria, frecuencia_consumo, unidad_consumo, hogar_id')
    .eq('modo_consumo', 'automatico')
    .gt('frecuencia_consumo', 0);

  if (error) {
    console.error('Error al obtener productos:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!productos || productos.length === 0) {
    return new Response(JSON.stringify({ mensaje: 'Sin productos para procesar', actualizados: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Calcular descuentos
  const hoy = new Date().toISOString().split('T')[0];
  const actualizaciones = productos.map((p) => {
    const esSemanal = p.unidad_consumo?.includes('semana');
    const consumoDiario = esSemanal ? p.frecuencia_consumo / 7 : p.frecuencia_consumo;
    const cantidadAntes = p.cantidad;
    const nuevaCantidad = parseFloat((p.cantidad - consumoDiario).toFixed(2));

    if (nuevaCantidad <= 0) {
      const vencido = p.vencimiento && p.vencimiento < hoy;
      return {
        id: p.id, nombre: p.nombre, unidad: p.unidad, categoria: p.categoria,
        hogar_id: p.hogar_id, cantidadAntes,
        campos: { cantidad: 0, modo_consumo: 'pausado', ...(vencido && { archivado: true }) },
      };
    }
    return { id: p.id, nombre: p.nombre, unidad: p.unidad, categoria: p.categoria, hogar_id: p.hogar_id, cantidadAntes, campos: { cantidad: nuevaCantidad } };
  });

  // 3. Ejecutar updates e inserts en historial en paralelo
  const resultados = await Promise.all(
    actualizaciones.map(async ({ id, nombre, unidad, categoria, hogar_id, cantidadAntes, campos }) => {
      const updateResult = await supabase.from('productos').update(campos).eq('id', id);
      if (!updateResult.error) {
        await supabase.from('historial').insert([{
          hogar_id,
          producto_id: id,
          producto_nombre: nombre,
          tipo: 'descuento_automatico',
          cantidad_antes: cantidadAntes,
          cantidad_despues: campos.cantidad,
          descripcion: campos.modo_consumo === 'pausado' ? 'Stock agotado, pausado automáticamente' : 'Descuento automático diario',
        }]);

        // Auto-agregar a lista de compras cuando se agota
        if (campos.modo_consumo === 'pausado') {
          const { data: enLista } = await supabase
            .from('lista_compras')
            .select('id')
            .eq('hogar_id', hogar_id)
            .eq('nombre', nombre)
            .eq('completado', false)
            .maybeSingle();
          if (!enLista) {
            await supabase.from('lista_compras').insert({
              hogar_id,
              nombre,
              cantidad: 1,
              unidad: unidad || 'un.',
              categoria: categoria || null,
              completado: false,
              notas: 'Agregado automáticamente al agotarse',
            });
          }
        }
      }
      return updateResult;
    })
  );

  const errores = resultados.filter((r) => r.error).map((r) => r.error?.message);

  if (errores.length > 0) {
    console.error('Errores al actualizar:', errores);
    return new Response(
      JSON.stringify({ error: 'Algunos productos fallaron', detalle: errores }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const pausados = actualizaciones.filter((a) => a.campos.modo_consumo === 'pausado').length;
  console.log(`Procesados: ${actualizaciones.length}, pausados por stock agotado: ${pausados}`);

  return new Response(
    JSON.stringify({
      mensaje: 'Stock descontado correctamente',
      actualizados: actualizaciones.length,
      pausados,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
