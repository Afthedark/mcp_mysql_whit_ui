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
 * Build prompt for agent mode with memory context
 */
const buildAgentQueryPrompt = async (question, context) => {
    const { connectionName, schemaDescription, lastTopic, recentTables, enriched, agentConfig } = context;
    
    let contextSection = '';
    
    if (lastTopic) {
        contextSection += `\n- Último tema conversado: ${lastTopic}`;
    }
    
    if (recentTables && recentTables.length > 0) {
        contextSection += `\n- Tablas usadas recientemente: ${recentTables.join(', ')}`;
    }
    
    if (enriched?.isFollowUp) {
        contextSection += `\n- Esta pregunta parece ser un seguimiento de la conversación anterior`;
    }

    // Build personality section from config
    let personalitySection = '';
    let agentName = 'DataBot';
    let tone = 'profesional';
    let responseStyle = 'detallada';
    let specialInstructions = '';
    
    if (agentConfig?.personality) {
        agentName = agentConfig.personality.name || 'DataBot';
        tone = agentConfig.personality.tone || 'professional';
        responseStyle = agentConfig.personality.responseStyle || 'detailed';
        specialInstructions = agentConfig.personality.specialInstructions || '';
        
        const toneMap = {
            'professional': 'profesional',
            'casual': 'casual/amigable',
            'technical': 'técnico',
            'enthusiastic': 'entusiasta'
        };
        
        const styleMap = {
            'concise': 'concisa',
            'detailed': 'detallada',
            'with-examples': 'con ejemplos'
        };
        
        personalitySection = `\nPERSONALIDAD:
- Nombre: ${agentName}
- Tono: ${toneMap[tone] || tone}
- Estilo de respuesta: ${styleMap[responseStyle] || responseStyle}`;
        
        if (specialInstructions) {
            personalitySection += `\n- Instrucciones especiales: ${specialInstructions}`;
        }
    }

    // Build schema section from config
    let schemaSection = '';
    if (agentConfig?.schemaDefinition) {
        const schema = agentConfig.schemaDefinition;
        schemaSection = '\n=== ESTRUCTURA EXACTA DE LA BASE DE DATOS ===\n';
        
        if (schema.description) {
            schemaSection += `Descripción: ${schema.description}\n\n`;
        }
        
        if (schema.tables && schema.tables.length > 0) {
            schema.tables.forEach(table => {
                schemaSection += `TABLA: ${table.name}\n`;
                if (table.description) {
                    schemaSection += `Descripción: ${table.description}\n`;
                }
                if (table.columns && table.columns.length > 0) {
                    schemaSection += 'Columnas:\n';
                    table.columns.forEach(col => {
                        const pkFlag = col.pk ? ' [PK]' : '';
                        schemaSection += `  - ${col.name}: ${col.type}${pkFlag}${col.description ? ' - ' + col.description : ''}\n`;
                    });
                }
                schemaSection += '\n';
            });
        }
        schemaSection += '=== FIN DEL ESQUEMA ===\n';
    } else if (schemaDescription) {
        schemaSection = `=== ESTRUCTURA DE LA BASE DE DATOS ===\n${schemaDescription}\n`;
    }

    // Build business context section
    let businessSection = '';
    if (agentConfig?.businessContext) {
        businessSection = `\n=== CONTEXTO DE NEGOCIO ===\n${agentConfig.businessContext}\n`;
    }

    // Build SQL examples section
    let examplesSection = '';
    if (agentConfig?.sqlExamples && agentConfig.sqlExamples.length > 0) {
        examplesSection = '\n=== EJEMPLOS DE CONSULTAS SQL ===\n';
        examplesSection += 'Usa estos ejemplos como referencia para generar SQL similar:\n\n';
        
        agentConfig.sqlExamples.forEach((example, index) => {
            examplesSection += `Ejemplo ${index + 1}: ${example.description}\n`;
            examplesSection += `Pregunta: ${example.question}\n`;
            examplesSection += `SQL:\n${example.sql}\n\n`;
        });
        
        examplesSection += '=== FIN EJEMPLOS ===\n';
    }

    const systemPrompt = `Eres ${agentName}, un agente de datos experto y conversacional para la sucursal "${connectionName}".${personalitySection}

CONTEXTO ACTUAL:${contextSection || '\n- Inicio de nueva conversación'}

${schemaSection}
${businessSection}
${examplesSection}
INSTRUCCIONES:
- Eres un analista de datos amigable y conversacional
- Responde en español de forma natural y ${tone === 'professional' ? 'profesional' : 'amigable'}
- Usa EXACTAMENTE los nombres de tablas y columnas del esquema proporcionado
- Si la pregunta es un seguimiento, usa el contexto previo para entender mejor
- Sugiere insights relevantes basados en los datos cuando sea apropiado
- Si detectas anomalías o patrones interesantes, menciónalos

REGLAS DE SEGURIDAD:
- Solo genera sentencias SELECT
- NUNCA uses INSERT, UPDATE, DELETE, DROP o cualquier comando que modifique datos

FORMATO DE RESPUESTA:
- Responde ÚNICAMENTE con la consulta SQL válida
- Sin explicaciones ni bloques de código markdown
- Devuelve solo la cadena SQL pura`;

    const userPrompt = enriched?.enriched 
        ? `Pregunta del usuario: ${question}\n\n(Nota: Esta pregunta ha sido enriquecida con contexto previo)`
        : `Pregunta: ${question}`;

    return {
        systemPrompt,
        userPrompt
    };
};

/**
 * Build prompt for results interpretation with agent personality
 */
const buildAgentInterpretationPrompt = async (question, sql, results, context) => {
    let jsonString = JSON.stringify(results);
    if (jsonString.length > 8000) {
        jsonString = JSON.stringify(results.slice(0, 200)) + '\n... [resultados truncados]';
    }

    const { connectionName, lastTopic, agentConfig } = context;
    
    // Get personality settings
    let agentName = 'DataBot';
    let tone = 'profesional';
    let responseStyle = 'detallada';
    let specialInstructions = '';
    
    if (agentConfig?.personality) {
        agentName = agentConfig.personality.name || 'DataBot';
        tone = agentConfig.personality.tone || 'professional';
        responseStyle = agentConfig.personality.responseStyle || 'detailed';
        specialInstructions = agentConfig.personality.specialInstructions || '';
    }
    
    const toneMap = {
        'professional': 'profesional',
        'casual': 'casual y amigable',
        'technical': 'técnico pero accesible',
        'enthusiastic': 'entusiasta y energético'
    };
    
    const styleMap = {
        'concise': 'Sé conciso y directo.',
        'detailed': 'Sé detallado y explicativo.',
        'with-examples': 'Incluye ejemplos concretos cuando sea posible.'
    };

    return {
        systemPrompt: `Eres ${agentName}, un agente de datos experto para la sucursal "${connectionName}".

Estás analizando datos para responder a la pregunta del usuario. Interpreta los resultados de forma ${toneMap[tone] || 'profesional'}.

INSTRUCCIONES:
- Responde en español de forma natural, como un analista de datos
- ${styleMap[responseStyle] || 'Sé claro y útil.'}
- Sé directo y útil
- Si no hay datos, dilo claramente
- Destaca insights interesantes o patrones
- Si es relevante, sugiere próximos pasos o preguntas relacionadas
${specialInstructions ? '- ' + specialInstructions : ''}
- Mantén un tono ${toneMap[tone] || 'profesional'}`,
        userPrompt: `Pregunta del usuario: "${question}"

SQL ejecutado:
${sql}

Resultados obtenidos:
${jsonString}

Interpreta estos datos y responde de forma clara y conversacional.`
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
    buildGeneralChatPrompt,
    buildAgentQueryPrompt,
    buildAgentInterpretationPrompt
};
