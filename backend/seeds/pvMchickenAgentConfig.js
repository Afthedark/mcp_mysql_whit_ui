const { AgentConfig, DatabaseConnection } = require('../models');

const pvMchickenConfig = {
  schemaDefinition: {
    description: "Base de datos del sistema de punto de venta McChicken - Restaurante de comida rápida",
    tables: [
      {
        name: "pedidos",
        description: "Pedidos de clientes en el restaurante",
        columns: [
          { name: "pedido_id", type: "INT", pk: true, description: "ID único del pedido" },
          { name: "cliente_id", type: "INT", description: "ID del cliente (FK a clientes)" },
          { name: "fecha", type: "DATETIME", description: "Fecha y hora del pedido" },
          { name: "estado", type: "VARCHAR", description: "Estado: pendiente, preparando, listo, entregado" },
          { name: "llevar", type: "TINYINT", description: "1=Para llevar, 0=Consumir en mesa" },
          { name: "observaciones", type: "TEXT", description: "Notas generales del pedido" },
          { name: "nom_pedido_cliente", type: "VARCHAR", description: "Nombre del cliente en el pedido" }
        ]
      },
      {
        name: "lin_pedidos",
        description: "Líneas de detalle de cada pedido (items solicitados)",
        columns: [
          { name: "lin_pedido_id", type: "INT", pk: true },
          { name: "pedido_id", type: "INT", description: "ID del pedido (FK)" },
          { name: "item_id", type: "INT", description: "ID del producto (FK a items)" },
          { name: "cantidad", type: "DECIMAL", description: "Cantidad solicitada" },
          { name: "precio", type: "DECIMAL", description: "Precio unitario al momento del pedido" },
          { name: "observaciones", type: "TEXT", description: "Notas específicas del item (ej: sin cebolla)" }
        ]
      },
      {
        name: "facturas",
        description: "Facturas emitidas para los pedidos",
        columns: [
          { name: "factura_id", type: "INT", pk: true },
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
        description: "Clientes registrados del restaurante",
        columns: [
          { name: "cliente_id", type: "INT", pk: true },
          { name: "nit", type: "VARCHAR", description: "NIT o CI del cliente" },
          { name: "complemento", type: "VARCHAR", description: "Complemento del CI" },
          { name: "nombre_razon_social", type: "VARCHAR", description: "Nombre completo o razón social" },
          { name: "direccion", type: "VARCHAR", description: "Dirección del cliente" },
          { name: "telefono", type: "VARCHAR", description: "Teléfono de contacto" },
          { name: "email", type: "VARCHAR", description: "Correo electrónico" }
        ]
      },
      {
        name: "items",
        description: "Productos del menú (hamburguesas, bebidas, complementos)",
        columns: [
          { name: "item_id", type: "INT", pk: true },
          { name: "descripcion", type: "VARCHAR", description: "Nombre del producto" },
          { name: "precio", type: "DECIMAL", description: "Precio de venta" },
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
    {
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
    },
    {
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
    {
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
