const { AgentConfig, DatabaseConnection } = require('../models');

const pvMchickenConfig = {
  schemaDefinition: {
    description: "Base de datos del sistema de punto de venta McChicken - Restaurante de comida rápida",
    tables: [
      {
        name: "pedidos",
        description: "Tabla principal de pedidos/órdenes de clientes",
        columns: [
          { name: "pedido_id", type: "INT", pk: true, description: "ID único del pedido" },
          { name: "cliente_id", type: "INT", description: "ID del cliente (FK a clientes)" },
          { name: "nom_pedido_cliente", type: "VARCHAR", description: "Nombre del cliente que dejó el pedido (puede ser diferente al cliente registrado)" },
          { name: "fecha", type: "DATETIME", description: "Fecha y hora del pedido" },
          { name: "estado", type: "VARCHAR", description: "Estado del pedido: 'FACTURADO', 'ANULADO', etc. Filtrar != 'ANULADO' para ventas válidas" },
          { name: "metodoPago", type: "VARCHAR", description: "Método de pago utilizado" },
          { name: "llevar", type: "TINYINT", description: "1=Para llevar, 0=Para mesa" },
          { name: "observaciones", type: "TEXT", description: "Notas generales del pedido" }
        ]
      },
      {
        name: "lin_pedidos",
        description: "Líneas de detalle de cada pedido - contiene los productos individuales vendidos",
        columns: [
          { name: "lin_pedido_id", type: "INT", pk: true, description: "ID único de la línea" },
          { name: "pedido_id", type: "INT", description: "ID del pedido padre (FK)" },
          { name: "item_id", type: "INT", description: "ID del producto (FK a items)" },
          { name: "cantidad", type: "DECIMAL", description: "Cantidad base del producto" },
          { name: "cant_total", type: "DECIMAL", description: "Cantidad total (TIENE PRIORIDAD sobre cantidad para cálculos de venta)" },
          { name: "precio_unitario", type: "DECIMAL", description: "Precio unitario del producto" },
          { name: "llevar", type: "TINYINT", description: "1=Producto para llevar, 0=Para mesa" },
          { name: "observaciones", type: "TEXT", description: "Notas específicas del item (ej: sin cebolla)" }
        ]
      },
      {
        name: "facturas",
        description: "Facturas emitidas para los pedidos. NOTA: No todos los pedidos tienen factura - usar LEFT JOIN",
        columns: [
          { name: "factura_id", type: "INT", pk: true, description: "ID único de la factura" },
          { name: "pedido_id", type: "INT", description: "ID del pedido facturado (FK)" },
          { name: "caja_id", type: "INT", description: "ID de la caja que emitió (FK)" },
          { name: "fecha", type: "DATETIME", description: "Fecha de emisión" },
          { name: "total", type: "DECIMAL", description: "Monto total de la factura" },
          { name: "nit", type: "VARCHAR", description: "NIT del cliente para factura" }
        ]
      },
      {
        name: "lin_facturas",
        description: "Líneas de detalle de cada factura",
        columns: [
          { name: "lin_factura_id", type: "INT", pk: true },
          { name: "factura_id", type: "INT", description: "ID de la factura (FK)" },
          { name: "item_id", type: "INT", description: "ID del producto (FK)" },
          { name: "cantidad", type: "DECIMAL", description: "Cantidad facturada" },
          { name: "precio", type: "DECIMAL", description: "Precio unitario" },
          { name: "total", type: "DECIMAL", description: "Total de la línea" }
        ]
      },
      {
        name: "clientes",
        description: "Catálogo de clientes registrados del restaurante",
        columns: [
          { name: "cliente_id", type: "INT", pk: true, description: "ID único del cliente" },
          { name: "nit", type: "VARCHAR", description: "NIT o CI del cliente para facturación" },
          { name: "complemento", type: "VARCHAR", description: "Complemento del CI" },
          { name: "nombre_razon_social", type: "VARCHAR", description: "Nombre completo o razón social del cliente" },
          { name: "direccion", type: "VARCHAR", description: "Dirección del cliente" },
          { name: "telefono", type: "VARCHAR", description: "Teléfono de contacto" },
          { name: "email", type: "VARCHAR", description: "Correo electrónico" }
        ]
      },
      {
        name: "items",
        description: "Catálogo de productos y servicios del menú (hamburguesas, bebidas, complementos)",
        columns: [
          { name: "item_id", type: "INT", pk: true, description: "ID único del producto" },
          { name: "descripcion", type: "VARCHAR", description: "Nombre/descripción del producto" },
          { name: "precio", type: "DECIMAL", description: "Precio base del producto" },
          { name: "categoria_id", type: "INT", description: "Categoría del producto" }
        ]
      },
      {
        name: "combos",
        description: "Items que forman parte de combos/promociones",
        columns: [
          { name: "combo_id", type: "INT", pk: true },
          { name: "lin_factura_id", type: "INT", description: "Línea de factura padre" },
          { name: "item_id", type: "INT", description: "Item incluido en el combo" },
          { name: "cantidad", type: "DECIMAL", description: "Cantidad del item en el combo" },
          { name: "precio_unitario", type: "DECIMAL", description: "Precio del item dentro del combo" }
        ]
      },
      {
        name: "cajas",
        description: "Cajas registradoras del restaurante",
        columns: [
          { name: "caja_id", type: "INT", pk: true },
          { name: "codigo", type: "VARCHAR", description: "Código de la caja" },
          { name: "nombre", type: "VARCHAR", description: "Nombre descriptivo" }
        ]
      },
      {
        name: "empleados",
        description: "Empleados del restaurante",
        columns: [
          { name: "empleado_id", type: "INT", pk: true },
          { name: "nombre", type: "VARCHAR", description: "Nombre completo" },
          { name: "cargo", type: "VARCHAR", description: "Cargo: cajero, cocinero, mesero" }
        ]
      },
      {
        name: "turnos",
        description: "Turnos de trabajo",
        columns: [
          { name: "turno_id", type: "INT", pk: true },
          { name: "descripcion", type: "VARCHAR", description: "Nombre del turno" },
          { name: "hora_inicio", type: "TIME", description: "Hora de inicio" },
          { name: "hora_fin", type: "TIME", description: "Hora de fin" }
        ]
      },
      {
        name: "area_produccion",
        description: "Áreas de producción de la cocina",
        columns: [
          { name: "area_produccion_id", type: "INT", pk: true },
          { name: "nombre", type: "VARCHAR", description: "Nombre del área" },
          { name: "parent_id", type: "INT", description: "ID del área padre (para jerarquías)" }
        ]
      }
    ],
    relationships: [
      {
        from: "pedidos",
        to: "lin_pedidos",
        type: "one-to-many",
        on: "pedido_id",
        description: "Un pedido tiene múltiples líneas de productos"
      },
      {
        from: "pedidos",
        to: "facturas",
        type: "one-to-one",
        on: "pedido_id",
        description: "Un pedido puede tener una factura asociada (LEFT JOIN) - no todos los pedidos están facturados"
      },
      {
        from: "pedidos",
        to: "clientes",
        type: "many-to-one",
        on: "cliente_id",
        description: "Un pedido pertenece a un cliente registrado"
      },
      {
        from: "lin_pedidos",
        to: "items",
        type: "many-to-one",
        on: "item_id",
        description: "Cada línea referencia un producto del catálogo"
      },
      {
        from: "lin_facturas",
        to: "facturas",
        type: "many-to-one",
        on: "factura_id",
        description: "Líneas de detalle de una factura"
      },
      {
        from: "combos",
        to: "items",
        type: "many-to-one",
        on: "item_id",
        description: "Items que forman parte de combos"
      }
    ],
    importantNotes: [
      "El campo pedidos.estado puede ser 'FACTURADO', 'ANULADO', etc. SIEMPRE filtrar != 'ANULADO' para ventas válidas",
      "El campo lin_pedidos.cant_total TIENE PRIORIDAD sobre cantidad para cálculos de venta - usar CASE WHEN cant_total > 0 THEN cant_total ELSE cantidad END",
      "pedidos.nom_pedido_cliente puede tener el nombre del cliente que dejó el pedido, diferente al cliente registrado (cliente_id)",
      "Para calcular ingresos usar: SUM((CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) * lp.precio_unitario)",
      "lin_pedidos.llevar indica si el producto es para llevar (1) o mesa (0)",
      "No todos los pedidos tienen factura - usar LEFT JOIN con facturas",
      "LAS VENTAS TOTALES incluyen TODOS los pedidos válidos (con y sin factura) - el total es el conjunto completo",
      "Para reportes comparativos de facturación vs no facturación, separar pero el total general siempre incluye ambos",
      "Los pedidos ANULADOS no cuentan para ventas - filtrar con estado != 'ANULADO'"
    ]
  },
  
  personality: {
    name: "Asistente McChicken",
    tone: "professional",
    responseStyle: "detailed",
    greeting: "¡Hola! Soy tu asistente de datos para McChicken. ¿En qué puedo ayudarte con las ventas hoy?",
    specialInstructions: "Esta es una sola tienda McChicken en Bolivia. No menciones sucursales ni hagas comparativos entre ubicaciones. Usa 'la tienda' o 'el local' para referirte al negocio. Los pedidos con llevar=1 son 'para llevar', llevar=0 son 'para mesa'. SIEMPRE expresa montos en BOLIVIANOS (Bs.) y usa el formato de moneda boliviana. Nunca uses dólares ($) para referirte a precios o montos."
  },
  
  businessContext: `McChicken - Restaurante de Comida Rápida (Bolivia)

Somos un restaurante de comida rápida con operación en una sola ubicación en Bolivia.

MONEDA:
- Todos los montos, precios y totales están en BOLIVIANOS (Bs.)
- El símbolo de moneda es "Bs." (Bolivianos)
- NUNCA uses $ o USD para referirte a montos monetarios
- Ejemplo correcto: Bs. 150.00, 250 Bolivianos, 1,500 Bs.
- Ejemplo incorrecto: $150, 250 dólares

TÉRMINOS IMPORTANTES:
- Pedido: Orden completa realizada por un cliente. Un pedido puede tener múltiples items.
- Llevar: Campo en pedidos. Cuando vale 1, el pedido es "para llevar"; cuando es 0, es "para mesa/comer aquí"
- Factura: Documento fiscal generado. Un pedido puede tener una factura asociada.
- Item: Producto individual del menú (hamburguesa, bebida, papas, etc.)
- Combo: Promoción que agrupa varios items a precio especial
- Cliente: Persona que realiza el pedido. Puede ser cliente genérico para ventas de mostrador.
- Caja: Punto de cobro donde se registra la venta
- Lin_pedidos: Cada línea representa un item dentro de un pedido

KPIs IMPORTANTES:
- Ventas diarias: Total de pedidos facturados por día (en Bs.)
- Ticket promedio: Monto promedio por pedido en BOLIVIANOS (total de factura / número de pedidos)
- Productos más vendidos: Items con mayor cantidad vendida (sumar cantidad en lin_pedidos)
- Pedidos para llevar vs mesa: Distribución del tipo de servicio (contar pedidos donde llevar=1 vs llevar=0)
- Ventas por caja: Distribución entre cajas registradoras (montos en Bs.)
- Horarios pico: Momentos del día con más ventas

NOTAS SOBRE CONSULTAS:
- Para ventas completas, unir pedidos con facturas
- Los productos vendidos están en lin_pedidos unido con items
- El campo llevar indica si es para llevar (1) o mesa (0)
- Todos los montos en la base de datos están en BOLIVIANOS`,
  
  sqlExamples: [
    // ═══════════════════════════════════════════════════════════════
    // CATEGORÍA: Ventas
    // ═══════════════════════════════════════════════════════════════
    {
      category: "Ventas",
      description: "Ventas detalladas con productos (consulta principal)",
      question: "Muéstrame las ventas detalladas con los productos vendidos",
      sql: `SELECT 
    COALESCE(NULLIF(TRIM(p.nom_pedido_cliente), ''), c.nombre_razon_social) AS cliente,
    lp.producto,
    p.fecha,
    lp.cantidad,
    lp.llevar,
    f.factura_id AS 'Factura ID',
    p.estado,
    p.observaciones AS 'observacion general',
    lp.observaciones_por_pedido
FROM 
    pedidos p
JOIN 
    clientes c ON p.cliente_id = c.cliente_id
LEFT JOIN 
    facturas f ON p.pedido_id = f.pedido_id
LEFT JOIN (
    SELECT 
        lp_sub.pedido_id,
        GROUP_CONCAT(i.descripcion SEPARATOR ', ') AS producto,
        GROUP_CONCAT(lp_sub.cantidad SEPARATOR ', ') AS cantidad,
        MAX(lp_sub.llevar) AS llevar,
        NULLIF(TRIM(BOTH FROM GROUP_CONCAT(DISTINCT lp_sub.observaciones SEPARATOR ' | ')), '') AS observaciones_por_pedido
    FROM 
        lin_pedidos lp_sub
    LEFT JOIN 
        items i ON lp_sub.item_id = i.item_id
    GROUP BY 
        lp_sub.pedido_id
) lp ON p.pedido_id = lp.pedido_id
ORDER BY p.fecha ASC`,
      explanation: "Consulta compleja que une pedidos con clientes, facturas y agrupa productos usando GROUP_CONCAT. Usa COALESCE para mostrar el nombre del cliente."
    },
    {
      category: "Ventas",
      description: "Ventas por día",
      question: "¿Cuántas ventas tuvimos hoy?",
      sql: `SELECT 
    COUNT(DISTINCT p.pedido_id) as total_pedidos, 
    COUNT(f.factura_id) as pedidos_facturados,
    SUM(f.total) as monto_total
FROM pedidos p
LEFT JOIN facturas f ON p.pedido_id = f.pedido_id
WHERE DATE(p.fecha) = CURDATE()`
    },
    {
      category: "Ventas",
      description: "Ventas por período",
      question: "¿Cuánto vendimos ayer?",
      sql: `SELECT 
    COUNT(DISTINCT p.pedido_id) as total_pedidos,
    SUM(f.total) as monto_total,
    AVG(f.total) as ticket_promedio
FROM pedidos p
LEFT JOIN facturas f ON p.pedido_id = f.pedido_id
WHERE DATE(p.fecha) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`
    },
    {
      category: "Ventas",
      description: "Análisis por caja",
      question: "¿Cuánto vendió cada caja hoy?",
      sql: `SELECT 
    c.nombre as caja,
    c.codigo,
    COUNT(f.factura_id) as num_facturas,
    SUM(f.total) as total_vendido,
    AVG(f.total) as ticket_promedio
FROM cajas c
LEFT JOIN facturas f ON c.caja_id = f.caja_id AND DATE(f.fecha) = CURDATE()
GROUP BY c.caja_id, c.nombre, c.codigo
ORDER BY total_vendido DESC`
    },
    {
      category: "Ventas",
      description: "Ventas totales e ingreso del día",
      question: "¿Cuáles son las ventas totales y el ingreso generado en el día de hoy?",
      sql: `SELECT SUM(CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) as total_productos, SUM((CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) * lp.precio_unitario) as ingreso_total FROM pedidos p JOIN lin_pedidos lp ON p.pedido_id = lp.pedido_id WHERE p.estado != 'ANULADO' AND DATE(p.fecha) = CURDATE()`
    },
    {
      category: "Ventas",
      description: "Top 5 productos más vendidos históricamente",
      question: "¿Cuáles son los 5 productos más vendidos históricamente (top 5)?",
      sql: `SELECT i.descripcion, SUM(CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) as cantidad_vendida FROM pedidos p JOIN lin_pedidos lp ON p.pedido_id = lp.pedido_id JOIN items i ON lp.item_id = i.item_id WHERE p.estado != 'ANULADO' GROUP BY i.descripcion ORDER BY cantidad_vendida DESC LIMIT 5`
    },
    {
      category: "Ventas",
      description: "Reporte de ingresos con vs sin factura",
      question: "¿Cuál es el reporte de ingresos comparando las ventas que tienen factura contra las que no tienen factura?",
      sql: `SELECT CASE WHEN f.factura_id IS NOT NULL THEN 'Con Factura' ELSE 'Sin Factura' END AS tipo_venta, SUM((CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) * lp.precio_unitario) AS ingresos FROM pedidos p JOIN lin_pedidos lp ON p.pedido_id = lp.pedido_id LEFT JOIN facturas f ON p.pedido_id = f.pedido_id WHERE p.estado != 'ANULADO' GROUP BY CASE WHEN f.factura_id IS NOT NULL THEN 'Con Factura' ELSE 'Sin Factura' END`
    },
    {
      category: "Ventas",
      description: "Gasto total de cliente por nombre",
      question: '¿Cuánto dinero ha gastado en total el cliente con nombre "Juan" o que haya dejado el pedido a nombre de "Juan"?',
      sql: `SELECT COALESCE(NULLIF(TRIM(p.nom_pedido_cliente), ''), c.nombre_razon_social) AS cliente, SUM((CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) * lp.precio_unitario) AS total_gastado FROM pedidos p JOIN lin_pedidos lp ON p.pedido_id = lp.pedido_id JOIN clientes c ON p.cliente_id = c.cliente_id WHERE p.estado != 'ANULADO' AND (c.nombre_razon_social LIKE '%Juan%' OR p.nom_pedido_cliente LIKE '%Juan%') GROUP BY COALESCE(NULLIF(TRIM(p.nom_pedido_cliente), ''), c.nombre_razon_social)`
    },
    {
      category: "Ventas",
      description: "Productos vendidos por modalidad (llevar vs mesa)",
      question: "Muestra el total de productos vendidos divididos entre los pedidos para llevar y los pedidos para consumir en el local.",
      sql: `SELECT CASE WHEN lp.llevar = 1 THEN 'Para Llevar' ELSE 'En Mesa' END as modalidad, SUM(CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) as total_productos FROM pedidos p JOIN lin_pedidos lp ON p.pedido_id = lp.pedido_id WHERE p.estado != 'ANULADO' GROUP BY CASE WHEN lp.llevar = 1 THEN 'Para Llevar' ELSE 'En Mesa' END`
    },
    {
      category: "Ventas",
      description: "Top 5 tickets con mayor ingreso",
      question: "¿Cuáles son los 5 tickets individuales (pedidos) que nos han generado la mayor cantidad de dinero?",
      sql: `SELECT p.pedido_id, DATE(p.fecha) as fecha_pedido, SUM((CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) * lp.precio_unitario) as monto_total FROM pedidos p JOIN lin_pedidos lp ON p.pedido_id = lp.pedido_id WHERE p.estado != 'ANULADO' GROUP BY p.pedido_id, DATE(p.fecha) ORDER BY monto_total DESC LIMIT 5`
    },
    {
      category: "Ventas",
      description: "Ventas de productos Broaster",
      question: "¿Cuántas porciones de cualquier producto que contenga la palabra 'Broaster' se han vendido y cuánto ingreso generaron?",
      sql: `SELECT i.descripcion, SUM(CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) as cantidad_vendida, SUM((CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) * lp.precio_unitario) as ingresos FROM pedidos p JOIN lin_pedidos lp ON p.pedido_id = lp.pedido_id JOIN items i ON lp.item_id = i.item_id WHERE p.estado != 'ANULADO' AND i.descripcion LIKE '%Broaster%' GROUP BY i.descripcion`
    },
    {
      category: "Ventas",
      description: "Ingresos diarios primera semana de abril 2026",
      question: "¿Cuáles fueron los ingresos totales y la cantidad de productos vendidos agrupados por día durante la primera semana de abril (del 1 al 7 de abril de 2026)?",
      sql: `SELECT DATE(p.fecha) as fecha, SUM(CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) as cantidad_diaria, SUM((CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) * lp.precio_unitario) as ingreso_diario FROM pedidos p JOIN lin_pedidos lp ON p.pedido_id = lp.pedido_id WHERE p.estado != 'ANULADO' AND DATE(p.fecha) BETWEEN '2026-04-01' AND '2026-04-07' GROUP BY DATE(p.fecha) ORDER BY fecha ASC`
    },
    {
      category: "Ventas",
      description: "Top 5 productos con peor rendimiento",
      question: "¿Cuáles son los 5 productos con el peor rendimiento en ventas (los menos vendidos)?",
      sql: `SELECT i.descripcion, SUM(CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) as cantidad_vendida FROM pedidos p JOIN lin_pedidos lp ON p.pedido_id = lp.pedido_id JOIN items i ON lp.item_id = i.item_id WHERE p.estado != 'ANULADO' GROUP BY i.descripcion ORDER BY cantidad_vendida ASC LIMIT 5`
    },
    {
      category: "Ventas",
      description: "Resumen de ventas por método de pago",
      question: "Dame el resumen de ventas e ingresos agrupados según el método de pago utilizado.",
      sql: `SELECT p.metodoPago as metodo_pago, SUM(CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) as total_productos, SUM((CASE WHEN lp.cant_total > 0 THEN lp.cant_total ELSE lp.cantidad END) * lp.precio_unitario) as ingreso_total FROM pedidos p JOIN lin_pedidos lp ON p.pedido_id = lp.pedido_id WHERE p.estado != 'ANULADO' AND p.metodoPago IS NOT NULL GROUP BY p.metodoPago ORDER BY ingreso_total DESC`
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CATEGORÍA: Productos
    // ═══════════════════════════════════════════════════════════════
    {
      category: "Productos",
      description: "Top 10 productos más vendidos",
      question: "¿Cuáles son los productos más vendidos?",
      sql: `SELECT 
    i.descripcion as producto,
    SUM(lp.cantidad) as total_vendido,
    COUNT(DISTINCT lp.pedido_id) as num_pedidos,
    SUM(lp.cantidad * lp.precio) as ingresos_totales
FROM lin_pedidos lp
JOIN items i ON lp.item_id = i.item_id
GROUP BY i.item_id, i.descripcion
ORDER BY total_vendido DESC
LIMIT 10`
    },
    {
      category: "Productos",
      description: "Productos en combos",
      question: "¿Qué productos se venden más en combos?",
      sql: `SELECT 
    i.descripcion as producto,
    COUNT(*) as veces_en_combo,
    SUM(c.cantidad) as cantidad_total
FROM combos c
JOIN items i ON c.item_id = i.item_id
GROUP BY i.item_id, i.descripcion
ORDER BY veces_en_combo DESC
LIMIT 10`
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CATEGORÍA: Clientes
    // ═══════════════════════════════════════════════════════════════
    {
      category: "Clientes",
      description: "Clientes frecuentes",
      question: "¿Quiénes son nuestros mejores clientes?",
      sql: `SELECT 
    c.nombre_razon_social as cliente,
    c.nit,
    COUNT(DISTINCT p.pedido_id) as num_pedidos,
    SUM(f.total) as total_comprado,
    AVG(f.total) as ticket_promedio
FROM clientes c
JOIN pedidos p ON c.cliente_id = p.cliente_id
LEFT JOIN facturas f ON p.pedido_id = f.pedido_id
GROUP BY c.cliente_id, c.nombre_razon_social, c.nit
ORDER BY total_comprado DESC
LIMIT 10`
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CATEGORÍA: Operaciones
    // ═══════════════════════════════════════════════════════════════
    {
      category: "Operaciones",
      description: "Pedidos para llevar vs mesa",
      question: "¿Cuántos pedidos son para llevar y cuántos para mesa?",
      sql: `SELECT 
    CASE WHEN p.llevar = 1 THEN 'Para llevar' ELSE 'En mesa' END as tipo_servicio,
    COUNT(*) as cantidad_pedidos,
    SUM(f.total) as total_ventas
FROM pedidos p
LEFT JOIN facturas f ON p.pedido_id = f.pedido_id
WHERE DATE(p.fecha) = CURDATE()
GROUP BY p.llevar`
    }
  ]
};

async function seedPvMchickenConfig() {
  try {
    // Buscar conexión con database = 'pv_mchicken'
    const connection = await DatabaseConnection.findOne({
      where: { database: 'pv_mchicken' }
    });
    
    if (!connection) {
      console.log('⚠️  No se encontró conexión con database pv_mchicken');
      console.log('   La configuración se creará cuando exista la conexión');
      return;
    }
    
    // Verificar si ya existe config para esta conexión
    const existingConfigs = await AgentConfig.findAll({ where: { isActive: true } });
    
    for (const existing of existingConfigs) {
      const ids = existing.connectionIds || [];
      if (ids.includes(connection.id)) {
        console.log('✅ Ya existe configuración para pv_mchicken');
        return;
      }
    }
    
    // Crear configuración
    const config = await AgentConfig.create({
      connectionIds: [connection.id],
      schemaDefinition: pvMchickenConfig.schemaDefinition,
      personality: pvMchickenConfig.personality,
      businessContext: pvMchickenConfig.businessContext,
      sqlExamples: pvMchickenConfig.sqlExamples,
      isActive: true
    });
    
    console.log('✅ Configuración del agente McChicken creada exitosamente');
    console.log(`   Conexión: ${connection.name} (ID: ${connection.id})`);
    console.log(`   Tablas configuradas: ${pvMchickenConfig.schemaDefinition.tables.length}`);
    console.log(`   Ejemplos SQL: ${pvMchickenConfig.sqlExamples.length}`);
    
  } catch (error) {
    console.error('❌ Error creando configuración:', error.message);
  }
}

module.exports = { seedPvMchickenConfig };

// Si se ejecuta directamente
if (require.main === module) {
  const { sequelize } = require('../models');
  seedPvMchickenConfig().then(() => {
    sequelize.close();
  });
}
