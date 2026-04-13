const { DatabaseConnection } = require('../models');

/**
 * Build prompt for natural language to SQL conversion
 */
const buildNaturalQueryPrompt = async (question, connectionId) => {
    // Get schema description if available
    const conn = await DatabaseConnection.findByPk(connectionId);
    const schemaDescription = conn?.description || '';

    const systemPrompt = `Eres un experto en MySQL y analista de datos. Tu tarea es convertir preguntas en lenguaje natural a consultas SQL válidas y eficientes.

REGLAS DE SEGURIDAD:
- Solo genera sentencias SELECT
- NUNCA uses INSERT, UPDATE, DELETE, DROP o cualquier comando que modifique datos

FORMATO DE RESPUESTA:
- Responde ÚNICAMENTE con la consulta SQL
- Sin explicaciones ni bloques de código
- Devuelve solo la cadena SQL pura

${schemaDescription ? `=== ESTRUCTURA DE LA BASE DE DATOS ===\n${schemaDescription}\n` : ''}

IMPORTANTE:
- Usa EXACTAMENTE los nombres de tablas y columnas del esquema
- Si no tienes información del esquema, usa nombres comunes en español (pedidos, productos, ventas, etc.)
- Usa sintaxis MySQL válida`;

    return {
        systemPrompt,
        userPrompt: `Pregunta: ${question}`
    };
};

/**
 * Build prompt for interpreting SQL results
 */
const buildResultsInterpretationPrompt = async (question, sql, results) => {
    let jsonString = JSON.stringify(results);
    if (jsonString.length > 100000) {
        jsonString = JSON.stringify(results.slice(0, 500)) + '\n... [resultados truncados]';
    }

    return {
        systemPrompt: `Eres un analista de datos experto. Interpreta los resultados de una consulta SQL y responde en lenguaje natural de forma clara y concisa.

INSTRUCCIONES:
- Responde en español
- Usa formato legible con viñetas o tablas si hay varios datos
- Sé directo y útil
- Si no hay datos, dilo claramente`,
        userPrompt: `Pregunta: "${question}"

SQL ejecutado:
${sql}

Resultados:
${jsonString}

Interpreta estos datos y responde de forma clara.`
    };
};

/**
 * Build prompt for general chat (no database)
 */
const buildGeneralChatPrompt = async (question, history = []) => {
    const historyContext = history.map(m => `${m.role}: ${m.content}`).join('\n');

    return {
        systemPrompt: `Eres un asistente de IA experto y amigable. Puedes ayudar con consultas sobre bases de datos MySQL usando el explorador MCP.

Si el usuario hace preguntas específicas de datos, recuérdale que use la pestaña "Natural Query" con una conexión de base de datos seleccionada.`,
        userPrompt: `Historial:\n${historyContext}\n\nPregunta: ${question}`
    };
};

module.exports = {
    buildNaturalQueryPrompt,
    buildResultsInterpretationPrompt,
    buildGeneralChatPrompt
};
