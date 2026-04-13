const { AgentConfig, DatabaseConnection } = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get agent configuration for a connection
 * Busca en todas las configs cuál incluye este connectionId
 */
const getConfig = async (req, res, next) => {
    try {
        const { connectionId } = req.params;
        const targetId = parseInt(connectionId);
        
        // Buscar todas las configs activas
        const configs = await AgentConfig.findAll({ where: { isActive: true } });
        
        // Encontrar la config que incluya este connectionId
        const config = configs.find(c => {
            const ids = c.connectionIds || [];
            return ids.includes(targetId);
        });
        
        if (!config) {
            return res.json({ 
                success: true, 
                data: null,
                message: 'No configuration found for this connection' 
            });
        }
        
        res.json({ success: true, data: config });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new agent configuration
 * Ahora acepta array de connectionIds
 */
const createConfig = async (req, res, next) => {
    try {
        const { connectionIds, schemaDefinition, personality, businessContext, mcpPreferences } = req.body;
        
        // Validar que connectionIds sea un array no vacío
        if (!connectionIds || !Array.isArray(connectionIds) || connectionIds.length === 0) {
            throw new AppError('At least one connection ID is required', 400);
        }
        
        // Check if all connections exist
        for (const connId of connectionIds) {
            const connection = await DatabaseConnection.findByPk(connId);
            if (!connection) {
                throw new AppError(`Database connection ${connId} not found`, 404);
            }
        }
        
        // Check if any of these connections already have a config
        const existingConfigs = await AgentConfig.findAll({});
        for (const existing of existingConfigs) {
            const existingIds = existing.connectionIds || [];
            const hasOverlap = connectionIds.some(id => existingIds.includes(id));
            if (hasOverlap) {
                throw new AppError('One or more connections already have a configuration', 409);
            }
        }
        
        const config = await AgentConfig.create({
            connectionIds,
            schemaDefinition,
            personality,
            businessContext,
            mcpPreferences,
            isActive: true
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'Agent configuration created successfully',
            data: config 
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update agent configuration
 * Ahora permite actualizar también connectionIds
 */
const updateConfig = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { connectionIds, schemaDefinition, personality, businessContext, mcpPreferences, isActive } = req.body;
        
        const config = await AgentConfig.findByPk(id);
        if (!config) {
            throw new AppError('Configuration not found', 404);
        }
        
        // Si se actualizan connectionIds, validar que no haya conflictos
        if (connectionIds !== undefined) {
            if (!Array.isArray(connectionIds) || connectionIds.length === 0) {
                throw new AppError('At least one connection ID is required', 400);
            }
            
            // Verificar que no haya overlap con otras configs (excepto esta)
            const existingConfigs = await AgentConfig.findAll({
                where: { id: { [require('sequelize').Op.ne]: id } }
            });
            
            for (const existing of existingConfigs) {
                const existingIds = existing.connectionIds || [];
                const hasOverlap = connectionIds.some(connId => existingIds.includes(connId));
                if (hasOverlap) {
                    throw new AppError('One or more connections already have a configuration', 409);
                }
            }
            
            config.connectionIds = connectionIds;
        }
        
        // Update only provided fields
        if (schemaDefinition !== undefined) config.schemaDefinition = schemaDefinition;
        if (personality !== undefined) config.personality = personality;
        if (businessContext !== undefined) config.businessContext = businessContext;
        if (mcpPreferences !== undefined) config.mcpPreferences = mcpPreferences;
        if (isActive !== undefined) config.isActive = isActive;
        
        await config.save();
        
        res.json({ 
            success: true, 
            message: 'Agent configuration updated successfully',
            data: config 
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete agent configuration
 */
const deleteConfig = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const config = await AgentConfig.findByPk(id);
        if (!config) {
            throw new AppError('Configuration not found', 404);
        }
        
        await config.destroy();
        
        res.json({ 
            success: true, 
            message: 'Agent configuration deleted successfully' 
        });
    } catch (error) {
        next(error);
    }
};

/**
 * List all configurations with connection info
 * Ahora incluye las conexiones asociadas a cada config
 */
const listConfigs = async (req, res, next) => {
    try {
        const configs = await AgentConfig.findAll({
            order: [['updatedAt', 'DESC']]
        });
        
        // Obtener todas las conexiones para mapear
        const allConnections = await DatabaseConnection.findAll({
            attributes: ['id', 'name', 'host', 'database']
        });
        
        // Enriquecer cada config con info de sus conexiones
        const enrichedConfigs = configs.map(config => {
            const configData = config.toJSON();
            const connectionIds = configData.connectionIds || [];
            configData.connections = allConnections.filter(conn => 
                connectionIds.includes(conn.id)
            );
            return configData;
        });
        
        res.json({ success: true, data: enrichedConfigs });
    } catch (error) {
        next(error);
    }
};

/**
 * Get or create default config for a connection
 * Busca en todas las configs cuál incluye este connectionId
 */
const getOrCreateDefault = async (req, res, next) => {
    try {
        const { connectionId } = req.params;
        const targetId = parseInt(connectionId);
        
        // Buscar config que incluya este connectionId
        const configs = await AgentConfig.findAll({ where: { isActive: true } });
        const config = configs.find(c => {
            const ids = c.connectionIds || [];
            return ids.includes(targetId);
        });
        
        if (!config) {
            // Return default template
            const connection = await DatabaseConnection.findByPk(connectionId);
            
            const defaultConfig = {
                connectionIds: [targetId],
                schemaDefinition: {
                    tables: [],
                    description: ''
                },
                personality: {
                    name: 'DataBot',
                    tone: 'professional',
                    responseStyle: 'detailed',
                    greeting: `¡Hola! Soy tu asistente de datos para ${connection?.name || 'esta base de datos'}.`,
                    specialInstructions: ''
                },
                businessContext: '',
                mcpPreferences: {
                    preferredTools: ['chatdb_query', 'chatdb_list_tables', 'chatdb_describe_table'],
                    autoSuggest: true
                },
                isActive: true
            };
            
            return res.json({ 
                success: true, 
                data: null,
                defaultTemplate: defaultConfig,
                message: 'No configuration found. Use the template to create one.' 
            });
        }
        
        res.json({ success: true, data: config });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getConfig,
    createConfig,
    updateConfig,
    deleteConfig,
    listConfigs,
    getOrCreateDefault
};
