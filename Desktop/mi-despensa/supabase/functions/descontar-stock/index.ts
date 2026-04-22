import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // Permitir invocación manual vía POST con Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // 1. Traer todos los productos en modo automático con consumo definido
  const { data: productos, error } = await supabase
    .from('productos')
    .select('id, cantidad, frecuencia_consumo, unidad_consumo')
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

  // 2. Calcular y aplicar descuento para cada producto
  const actualizaciones = productos.map((p) => {
    const esSemanal = p.unidad_consumo?.includes('semana');
    const consumoDiario = esSemanal ? p.frecuencia_consumo / 7 : p.frecuencia_consumo;
    const nuevaCantidad = p.cantidad - consumoDiario;

    if (nuevaCantidad <= 0) {
      return { id: p.id, cantidad: 0, modo_consumo: 'pausado' };
    }
    return { id: p.id, cantidad: Math.round(nuevaCantidad * 1000) / 1000 };
  });

  // 3. Ejecutar updates en paralelo
  const resultados = await Promise.all(
    actualizaciones.map(({ id, ...campos }) =>
      supabase.from('productos').update(campos).eq('id', id)
    )
  );

  const errores = resultados.filter((r) => r.error).map((r) => r.error?.message);

  if (errores.length > 0) {
    console.error('Errores al actualizar:', errores);
    return new Response(
      JSON.stringify({ error: 'Algunos productos fallaron', detalle: errores }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const pausados = actualizaciones.filter((a) => a.modo_consumo === 'pausado').length;
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
