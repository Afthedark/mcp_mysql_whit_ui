const { AgentConfig, DatabaseConnection } = require('../models');

const pvMchickenConfig = {
  schemaDefinition: {
    description: "Base de datos del sistema de punto de venta McChicken - Restaurante de comida rápida (MySQL 5.7)",
    tables: [
      {
        name: "pedidos",
        description: "Cabecera de intención de compra. Estado: 'PENDIENTE', 'CONCLUIDO', 'ANULADO'. Solo 'CONCLUIDO' cuenta para ventas.",
        columns: [
          { name: "pedido_id", type: "INT", pk: true, description: "ID único del pedido" },
          { name: "fecha", type: "DATETIME", description: "Fecha y hora exacta de la transacción" },
          { name: "cliente_id", type: "INT", description: "ID del cliente (FK a clientes)" },
          { name: "total", type: "DECIMAL(14,2)", description: "Monto total del pedido" },
          { name: "estado", type: "CHAR(15)", description: "'PENDIENTE', 'CONCLUIDO', 'ANULADO'. Solo contabilizar 'CONCLUIDO'" },
          { name: "nom_pedido_cliente", type: "VARCHAR(45)", description: "Nombre del cliente que dejó el pedido" },
          { name: "metodoPago", type: "VARCHAR(5)", description: "'EFE'=Efectivo, 'TAR'=Tarjeta, 'QR'=QR" },
          { name: "observaciones", type: "TEXT", description: "Notas generales del pedido" }
        ]
      },
      {
        name: "facturas",
        description: "Venta consolidada, cobrada y fiscal. Estado: 'VALIDADA', 'ANULADA'. Filtro obligatorio: 'VALIDADA'",
        columns: [
          { name: "factura_id", type: "INT", pk: true, description: "ID único de la factura" },
          { name: "pedido_id", type: "INT", description: "ID del pedido (FK). Puede ser NULL si no viene de pedido" },
          { name: "turno_id", type: "INT", description: "Turno en que se operó la caja" },
          { name: "montoTotal", type: "DECIMAL(14,2)", description: "Monto total pagado por el cliente" },
          { name: "estado", type: "VARCHAR", description: "'VALIDADA' o 'ANULADA'. SIEMPRE filtrar 'VALIDADA' para ingresos" },
          { name: "fechaEmision", type: "TIMESTAMP", description: "Fecha de facturación" }
        ]
      },
      {
        name: "lin_facturas",
        description: "DETALLE de productos cobrados - FUENTE DE LA VERDAD para cantidades vendidas",
        columns: [
          { name: "lin_factura_id", type: "INT", pk: true, description: "ID único de la línea" },
          { name: "factura_id", type: "INT", description: "ID de la factura (FK)" },
          { name: "item_id", type: "INT", description: "ID del producto (FK a items)" },
          { name: "cantidad", type: "DECIMAL", description: "Cantidad REAL vendida del ítem" },
          { name: "precio_unitario", type: "DECIMAL", description: "Precio unitario al momento de la venta" },
          { name: "total", type: "DECIMAL", description: "cantidad * precio_unitario" }
        ]
      },
      {
        name: "clientes",
        description: "Directorio de compradores",
        columns: [
          { name: "cliente_id", type: "INT", pk: true, description: "ID único del cliente" },
          { name: "nit", type: "VARCHAR", description: "NIT o CI del cliente para facturación" },
          { name: "nombre_razon_social", type: "VARCHAR", description: "Nombre completo o razón social" }
        ]
      },
      {
        name: "items",
        description: "Catálogo maestro de productos",
        columns: [
          { name: "item_id", type: "INT", pk: true, description: "ID único del producto" },
          { name: "descripcion", type: "VARCHAR", description: "Nombre del producto (ej. 'Broaster Mixto', 'Gaseosa 2L')" },
          { name: "precio", type: "DECIMAL", description: "Precio base del producto" },
          { name: "grupo_producto_id", type: "INT", description: "Categoría del producto" }
        ]
      },
      {
        name: "turnos",
        description: "Control de sesiones de cajeros",
        columns: [
          { name: "turno_id", type: "INT", pk: true, description: "ID único del turno" },
          { name: "fecha_inicio", type: "DATETIME", description: "Inicio del turno" },
          { name: "fecha_fin", type: "DATETIME", description: "Fin del turno" },
          { name: "cajero_id", type: "INT", description: "ID del cajero" }
        ]
      },
      {
        name: "resumen_turnos",
        description: "Acumulados e inventario rápido por turno",
        columns: [
          { name: "resumen_turno_id", type: "INT", pk: true, description: "ID único" },
          { name: "turno_id", type: "INT", description: "ID del turno (FK)" },
          { name: "item_id", type: "INT", description: "ID del producto (FK)" },
          { name: "saldo_ant", type: "DECIMAL", description: "Stock de apertura del ítem" },
          { name: "cant_vendida", type: "DECIMAL", description: "Total acumulado vendido en el turno" },
          { name: "saldo", type: "DECIMAL", description: "Stock final calculado" }
        ]
      },
      {
        name: "cajas",
        description: "Cajas registradoras del restaurante",
        columns: [
          { name: "caja_id", type: "INT", pk: true, description: "ID único de la caja" },
          { name: "codigo", type: "VARCHAR", description: "Código de la caja" },
          { name: "nombre", type: "VARCHAR", description: "Nombre descriptivo" }
        ]
      }
    ],
    relationships: [
      {
        from: "pedidos",
        to: "facturas",
        type: "one-to-one",
        on: "pedido_id",
        description: "Un pedido puede tener una factura. Usar LEFT JOIN para incluir todos los pedidos"
      },
      {
        from: "facturas",
        to: "lin_facturas",
        type: "one-to-many",
        on: "factura_id",
        description: "Una factura tiene múltiples líneas de productos"
      },
      {
        from: "lin_facturas",
        to: "items",
        type: "many-to-one",
        on: "item_id",
        description: "Cada línea de factura referencia un producto"
      },
      {
        from: "pedidos",
        to: "clientes",
        type: "many-to-one",
        on: "cliente_id",
        description: "Un pedido pertenece a un cliente"
      },
      {
        from: "facturas",
        to: "turnos",
        type: "many-to-one",
        on: "turno_id",
        description: "Una factura se emitió en un turno específico"
      },
      {
        from: "resumen_turnos",
        to: "turnos",
        type: "many-to-one",
        on: "turno_id",
        description: "Resumen por turno"
      },
      {
        from: "resumen_turnos",
        to: "items",
        type: "many-to-one",
        on: "item_id",
        description: "Resumen por producto"
      }
    ],
    importantNotes: [
      "REGLA CRÍTICA: pedidos.estado = 'CONCLUIDO' para ventas válidas. NUNCA usar 'PENDIENTE' o 'ANULADO'",
      "REGLA CRÍTICA: facturas.estado = 'VALIDADA' para ingresos reales. NUNCA incluir 'ANULADA'",
      "Para cantidades vendidas, SIEMPRE usar lin_facturas.cantidad (no lin_pedidos)",
      "Para ingresos totales: SUM(pedidos.total) donde estado='CONCLUIDO'",
      "Para ingresos facturados: SUM(facturas.montoTotal) donde estado='VALIDADA'",
      "Las facturas se unen a pedidos con LEFT JOIN porque no todos los pedidos generan factura",
      "pedidos.nom_pedido_cliente puede tener el nombre del cliente que dejó el pedido, diferente al cliente registrado",
      "Para productos más vendidos: JOIN facturas→lin_facturas→items, filtrar facturas.estado='VALIDADA'",
      "Para ventas por hora: usar HOUR(pedidos.fecha)"
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
- Pedido: Orden completa realizada por un cliente. Estado: PENDIENTE/CONCLUIDO/ANULADO
- Factura: Documento fiscal generado. Estado: VALIDADA/ANULADA. FUENTE DE LA VERDAD para cantidades vendidas
- Lin_facturas: Detalle de productos facturados - AQUÍ están las cantidades reales vendidas
- Item: Producto individual del menú (hamburguesa, bebida, papas, etc.)
- Cliente: Persona que realiza el pedido
- Turno: Sesión de caja donde se operan las ventas

REGLAS DE NEGOCIO CRÍTICAS:
1. pedidos.estado = 'CONCLUIDO' para ventas válidas (NUNCA 'PENDIENTE' ni 'ANULADO')
2. facturas.estado = 'VALIDADA' para ingresos reales (NUNCA 'ANULADA')
3. Las cantidades vendidas SIEMPRE se obtienen de lin_facturas.cantidad
4. No todos los pedidos tienen factura - usar LEFT JOIN
5. El total del pedido está en pedidos.total
6. El total facturado está en facturas.montoTotal

KPIs IMPORTANTES:
- Ventas diarias: Total de pedidos con estado='CONCLUIDO' por día (en Bs.)
- Ticket promedio: AVG(pedidos.total) donde estado='CONCLUIDO'
- Productos más vendidos: SUM(lin_facturas.cantidad) agrupado por items.descripcion
- Ventas por turno: SUM(facturas.montoTotal) agrupado por turnos

NOTAS SOBRE CONSULTAS:
- Para ventas completas: FROM pedidos WHERE estado='CONCLUIDO'
- Para productos vendidos: FROM facturas f JOIN lin_facturas lf ON f.factura_id=lf.factura_id WHERE f.estado='VALIDADA'
- Para ventas por fecha: usar pedidos.fecha (DATETIME)
- Para unir pedidos con facturas: LEFT JOIN porque no todos los pedidos generan factura`,
  
  sqlExamples: [
    // ═══════════════════════════════════════════════════════════════
    // CATEGORÍA: Ventas - Resumen Financiero
    // ═══════════════════════════════════════════════════════════════
    {
      category: "Ventas",
      description: "Resumen total de ventas separando facturado vs no facturado",
      question: "Dame el resumen total de ventas del día, separando lo facturado de lo no facturado.",
      sql: `SELECT 
    SUM(p.total) AS Total_General,
    SUM(CASE WHEN f.factura_id IS NOT NULL THEN p.total ELSE 0 END) AS Total_Con_Factura,
    SUM(CASE WHEN f.factura_id IS NULL THEN p.total ELSE 0 END) AS Total_Sin_Factura,
    COUNT(p.pedido_id) AS Total_Transacciones
FROM pedidos p
LEFT JOIN facturas f ON p.pedido_id = f.pedido_id AND f.estado = 'VALIDADA'
WHERE p.estado = 'CONCLUIDO' 
  AND DATE(p.fecha) = CURDATE()`,
      explanation: "REGLA DE NEGOCIO: Usar pedidos como base, LEFT JOIN con facturas (estado='VALIDADA'), filtrar pedidos.estado='CONCLUIDO'"
    },
    {
      category: "Ventas",
      description: "Ventas por día con totales",
      question: "¿Cuántas ventas tuvimos hoy y cuál es el monto total?",
      sql: `SELECT 
    COUNT(DISTINCT p.pedido_id) as total_pedidos,
    SUM(p.total) as monto_total,
    AVG(p.total) as ticket_promedio
FROM pedidos p
WHERE p.estado = 'CONCLUIDO'
  AND DATE(p.fecha) = CURDATE()`,
      explanation: "Las ventas válidas son pedidos con estado='CONCLUIDO'"
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CATEGORÍA: Productos - Más Vendidos
    // ═══════════════════════════════════════════════════════════════
    {
      category: "Productos",
      description: "Top productos más vendidos (usa lin_facturas - fuente de la verdad)",
      question: "¿Cuáles son los productos más vendidos?",
      sql: `SELECT 
    i.descripcion as producto,
    SUM(lf.cantidad) as total_vendido
FROM facturas f
JOIN lin_facturas lf ON f.factura_id = lf.factura_id
JOIN items i ON lf.item_id = i.item_id
WHERE f.estado = 'VALIDADA'
GROUP BY i.item_id, i.descripcion
ORDER BY total_vendido DESC
LIMIT 10`,
      explanation: "IMPORTANTE: Las cantidades vendidas SIEMPRE se obtienen de lin_facturas, no de lin_pedidos. Filtrar facturas.estado='VALIDADA'"
    },
    {
      category: "Productos",
      description: "Productos más vendidos ayer por hora",
      question: "¿Cuántos productos se vendieron por hora ayer?",
      sql: `SELECT 
    CONCAT(LPAD(HOUR(p.fecha), 2, '0'), ':00 - ', LPAD(HOUR(p.fecha) + 1, 2, '0'), ':00') AS intervalo_hora,
    i.descripcion AS producto,
    SUM(lf.cantidad) AS vendido_en_esta_hora
FROM pedidos p
JOIN facturas f ON p.pedido_id = f.pedido_id
JOIN lin_facturas lf ON f.factura_id = lf.factura_id
JOIN items i ON lf.item_id = i.item_id
WHERE p.estado = 'CONCLUIDO' 
  AND f.estado = 'VALIDADA'
  AND DATE(p.fecha) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
GROUP BY HOUR(p.fecha), i.item_id, i.descripcion
HAVING vendido_en_esta_hora > 0
ORDER BY HOUR(p.fecha) ASC, vendido_en_esta_hora DESC`,
      explanation: "Para ventas por hora, unir pedidos→facturas→lin_facturas→items. Filtrar ambos estados."
    },
    {
      category: "Productos",
      description: "Productos Broaster más vendidos",
      question: "¿Cuántas porciones de productos Broaster se vendieron?",
      sql: `SELECT 
    i.descripcion,
    SUM(lf.cantidad) as cantidad_vendida,
    SUM(lf.total) as ingresos
FROM facturas f
JOIN lin_facturas lf ON f.factura_id = lf.factura_id
JOIN items i ON lf.item_id = i.item_id
WHERE f.estado = 'VALIDADA'
  AND i.descripcion LIKE '%Broaster%'
GROUP BY i.item_id, i.descripcion
ORDER BY cantidad_vendida DESC`,
      explanation: "Filtrar productos por nombre usando LIKE. Las cantidades vienen de lin_facturas."
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CATEGORÍA: Clientes
    // ═══════════════════════════════════════════════════════════════
    {
      category: "Clientes",
      description: "Mejores clientes por gasto total",
      question: "¿Quiénes son nuestros mejores clientes?",
      sql: `SELECT 
    COALESCE(NULLIF(TRIM(p.nom_pedido_cliente), ''), c.nombre_razon_social) as cliente,
    c.nit,
    COUNT(DISTINCT p.pedido_id) as num_pedidos,
    SUM(p.total) as total_gastado
FROM pedidos p
LEFT JOIN clientes c ON p.cliente_id = c.cliente_id
WHERE p.estado = 'CONCLUIDO'
GROUP BY COALESCE(NULLIF(TRIM(p.nom_pedido_cliente), ''), c.nombre_razon_social), c.nit
ORDER BY total_gastado DESC
LIMIT 10`,
      explanation: "Usar COALESCE para mostrar nom_pedido_cliente si existe, sino nombre_razon_social"
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CATEGORÍA: Turnos y Cajas
    // ═══════════════════════════════════════════════════════════════
    {
      category: "Turnos",
      description: "Ventas por turno con acumulados",
      question: "¿Cuánto se vendió en el turno actual?",
      sql: `SELECT 
    t.turno_id,
    t.fecha_inicio,
    t.fecha_fin,
    SUM(f.montoTotal) as total_vendido,
    COUNT(f.factura_id) as num_facturas
FROM turnos t
LEFT JOIN facturas f ON t.turno_id = f.turno_id AND f.estado = 'VALIDADA'
WHERE DATE(t.fecha_inicio) = CURDATE()
GROUP BY t.turno_id, t.fecha_inicio, t.fecha_fin`,
      explanation: "Unir turnos con facturas para obtener ventas por turno"
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
