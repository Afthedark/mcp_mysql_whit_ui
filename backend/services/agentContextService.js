/**
 * Agent Context Service
 * Manages conversation memory and context for the AI agent
 */
const { Message, DatabaseConnection, AgentConfig } = require('../models');

/**
 * Build context for a chat session
 * Ahora busca agentConfig que incluya el connectionId en su array
 */
const buildContext = async (chatId, connectionId) => {
    const [conversationMemory, schemaContext, connection, allConfigs] = await Promise.all([
        getConversationMemory(chatId),
        getSchemaContext(connectionId),
        DatabaseConnection.findByPk(connectionId),
        AgentConfig.findAll({ where: { isActive: true } })
    ]);
    
    // Buscar config que incluya este connectionId
    const agentConfig = allConfigs.find(config => {
        const ids = config.connectionIds || [];
        return ids.includes(parseInt(connectionId));
    });

    const lastTopic = getLastTopicFromMemory(conversationMemory);
    const recentTables = getRecentTables(conversationMemory);

    return {
        chatId,
        connectionId,
        connectionName: connection?.name || 'Unknown',
        schemaDescription: connection?.description || '',
        agentConfig: agentConfig || null,
        lastTopic,
        recentTables,
        recentMessages: conversationMemory.slice(0, 5),
        messageCount: conversationMemory.length
    };
};

/**
 * Get last 10 messages with metadata for context
 */
const getConversationMemory = async (chatId) => {
    const messages = await Message.findAll({
        where: { chatId },
        order: [['createdAt', 'DESC']],
        limit: 10
    });
    return messages.reverse(); // Chronological order
};

/**
 * Get schema description for a connection
 */
const getSchemaContext = async (connectionId) => {
    const connection = await DatabaseConnection.findByPk(connectionId);
    return connection?.description || '';
};

/**
 * Extract last topic from conversation memory
 */
const getLastTopicFromMemory = (messages) => {
    if (!messages || messages.length === 0) return null;
    
    // Look for assistant messages with metadata
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === 'assistant' && msg.metadata?.topic) {
            return msg.metadata.topic;
        }
    }
    return null;
};

/**
 * Get recently used tables from conversation
 */
const getRecentTables = (messages) => {
    const tables = new Set();
    
    messages.forEach(msg => {
        if (msg.metadata?.tablesMentioned) {
            msg.metadata.tablesMentioned.forEach(table => tables.add(table));
        }
        // Also extract from SQL if available
        if (msg.sqlExecuted) {
            const tableMatches = msg.sqlExecuted.match(/FROM\s+(\w+)|JOIN\s+(\w+)/gi);
            if (tableMatches) {
                tableMatches.forEach(match => {
                    const table = match.replace(/FROM\s+|JOIN\s+/i, '');
                    tables.add(table);
                });
            }
        }
    });
    
    return Array.from(tables).slice(0, 5);
};

/**
 * Detect if question is a follow-up based on context
 */
const isFollowUpQuestion = (question, context) => {
    const lowerQuestion = question.toLowerCase().trim();
    
    // Follow-up indicators
    const followUpPatterns = [
        /^(y\s+|y\s+que\s+|y\s+como\s+|y\s+cuanto)/i,
        /^(tambien|también|ademas|además|igual)/i,
        /^(comparado|vs|versus|frente\s+a)/i,
        /^(el\s+mismo|la\s+misma|eso|esto|aquello)/i,
        /^(ahora\s+|entonces\s+|pero\s+)/i,
        /^(cuales|cuáles|cuantos|cuántos|donde|dónde)\s+(son|estan|están|fueron)/i,
        /^(y\s+)?(el|la|los|las)\s+(anterior|previo|pasado|otro)/i,
        /^(muestrame|muéstrame|dame|ver)\s+(mas|más|tambien|también)/i
    ];
    
    const isFollowUp = followUpPatterns.some(pattern => pattern.test(lowerQuestion));
    
    // Check if question lacks table reference but context has recent tables
    const hasTableReference = /\b(de\s+la\s+tabla|en\s+la\s+tabla|tabla\s+\w+|from\s+\w+)\b/i.test(lowerQuestion);
    const needsContext = isFollowUp || (!hasTableReference && context.recentTables.length > 0 && context.lastTopic);
    
    return {
        isFollowUp,
        needsContext,
        confidence: isFollowUp ? 'high' : (needsContext ? 'medium' : 'low')
    };
};

/**
 * Enrich question with context if needed
 */
const enrichQuestionWithContext = (question, context) => {
    const followUp = isFollowUpQuestion(question, context);
    
    if (!followUp.needsContext) {
        return { question, enriched: false, contextAdded: null };
    }
    
    let enrichedQuestion = question;
    let contextAdded = [];
    
    // Add topic context if missing
    if (context.lastTopic && !question.toLowerCase().includes(context.lastTopic.toLowerCase())) {
        const topicIndicators = ['ventas', 'pedidos', 'productos', 'clientes', 'inventario', 'stock'];
        const hasTopic = topicIndicators.some(topic => 
            question.toLowerCase().includes(topic)
        );
        
        if (!hasTopic) {
            enrichedQuestion = `Sobre ${context.lastTopic}: ${question}`;
            contextAdded.push(`topic:${context.lastTopic}`);
        }
    }
    
    // Add table context if missing
    if (context.recentTables.length > 0 && !enrichedQuestion.toLowerCase().includes('tabla')) {
        const recentTable = context.recentTables[0];
        // Only add if it seems relevant
        if (followUp.isFollowUp) {
            enrichedQuestion = `${enrichedQuestion} (referente a tabla ${recentTable})`;
            contextAdded.push(`table:${recentTable}`);
        }
    }
    
    return {
        question: enrichedQuestion,
        originalQuestion: question,
        enriched: contextAdded.length > 0,
        contextAdded,
        followUp
    };
};

/**
 * Extract metadata from SQL and question
 */
const extractMetadata = (question, sql, sqlResult) => {
    const metadata = {
        timestamp: new Date().toISOString()
    };
    
    // Detect topic/intent
    const topicPatterns = {
        ventas: /ventas|ingresos|revenue|sales/i,
        pedidos: /pedidos|ordenes|orders/i,
        productos: /productos|items|products|articulos/i,
        clientes: /clientes|customers|usuarios/i,
        inventario: /inventario|stock|existencias/i,
        empleados: /empleados|vendedores|staff/i,
        comparativa: /comparar|comparado|vs|diferencia|aumento|disminucion/i,
        agregacion: /total|suma|promedio|maximo|minimo|count|cuantos/i
    };
    
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
        if (pattern.test(question)) {
            metadata.topic = topic;
            break;
        }
    }
    
    // Extract tables from SQL
    const tableMatches = sql?.match(/FROM\s+(\w+)|JOIN\s+(\w+)/gi);
    if (tableMatches) {
        metadata.tablesMentioned = tableMatches.map(match => 
            match.replace(/FROM\s+|JOIN\s+/i, '').trim()
        );
    }
    
    // Detect time range
    const timePatterns = {
        hoy: /hoy|today/i,
        ayer: /ayer|yesterday/i,
        semana: /semana|week/i,
        mes: /mes|month/i,
        ano: /año|year|anual/i
    };
    
    for (const [timeRange, pattern] of Object.entries(timePatterns)) {
        if (pattern.test(question)) {
            metadata.timeRange = timeRange;
            break;
        }
    }
    
    // Detect aggregations
    const aggPatterns = {
        suma: /sum|total|suma/i,
        conteo: /count|cuantos|numero|número/i,
        promedio: /avg|average|promedio|media/i,
        maximo: /max|maximum|maximo|máximo/i,
        minimo: /min|minimum|minimo|mínimo/i
    };
    
    for (const [agg, pattern] of Object.entries(aggPatterns)) {
        if (pattern.test(sql || '')) {
            metadata.aggregations = metadata.aggregations || [];
            metadata.aggregations.push(agg);
        }
    }
    
    // Store result summary
    if (sqlResult) {
        metadata.rowCount = sqlResult.length;
        metadata.hasResults = sqlResult.length > 0;
    }
    
    return metadata;
};

/**
 * Generate suggestions based on context
 */
const generateSuggestions = (context, lastMetadata) => {
    const suggestions = [];
    
    if (!lastMetadata) return suggestions;
    
    // Based on topic
    switch (lastMetadata.topic) {
        case 'ventas':
            suggestions.push('¿Ver desglose por producto?');
            suggestions.push('¿Comparar con el mes anterior?');
            suggestions.push('¿Top 10 productos más vendidos?');
            break;
        case 'productos':
            suggestions.push('¿Ver productos con bajo stock?');
            suggestions.push('¿Productos más vendidos?');
            suggestions.push('¿Precios promedio por categoría?');
            break;
        case 'clientes':
            suggestions.push('¿Clientes más frecuentes?');
            suggestions.push('¿Compras por cliente?');
            break;
        case 'pedidos':
            suggestions.push('¿Estado de pedidos pendientes?');
            suggestions.push('¿Tiempo promedio de entrega?');
            break;
    }
    
    // Based on time range
    if (lastMetadata.timeRange === 'hoy' || lastMetadata.timeRange === 'ayer') {
        suggestions.push('¿Ver tendencia de la semana?');
    } else if (lastMetadata.timeRange === 'semana') {
        suggestions.push('¿Comparar con semana anterior?');
    }
    
    // Based on aggregations
    if (lastMetadata.aggregations?.includes('suma')) {
        suggestions.push('¿Ver promedio diario?');
    }
    
    return suggestions.slice(0, 3); // Max 3 suggestions
};

/**
 * Create context snapshot for a message
 */
const createContextSnapshot = (context) => {
    return {
        connectionId: context.connectionId,
        connectionName: context.connectionName,
        lastTopic: context.lastTopic,
        recentTables: context.recentTables,
        messageCount: context.messageCount,
        timestamp: new Date().toISOString()
    };
};

module.exports = {
    buildContext,
    getConversationMemory,
    getSchemaContext,
    getLastTopicFromMemory,
    getRecentTables,
    isFollowUpQuestion,
    enrichQuestionWithContext,
    extractMetadata,
    generateSuggestions,
    createContextSnapshot
};
