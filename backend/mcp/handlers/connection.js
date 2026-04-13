/**
 * MCP Handlers - Connection Management
 */
const { DatabaseConnection } = require('../../models');
const dbManager = require('../../services/dbManager');

/**
 * List all configured database connections
 */
const listConnections = async () => {
    const connections = await DatabaseConnection.findAll({
        order: [['name', 'ASC']]
    });

    return {
        success: true,
        count: connections.length,
        connections: connections.map(c => ({
            id: c.id,
            name: c.name,
            host: c.host,
            port: c.port,
            database: c.database,
            user: c.user,
            isActive: c.isActive,
            hasDescription: !!c.description
        }))
    };
};

/**
 * Create a new database connection
 */
const createConnection = async ({ name, host, port, user, password, database, description, isActive }) => {
    if (!name || !host || !user || !database) {
        throw new Error('Name, host, user, and database are required');
    }

    const connection = await DatabaseConnection.create({
        name, host, port: port || 3306, user, password, database, description, isActive: isActive !== false
    });

    return {
        success: true,
        connection: {
            id: connection.id,
            name: connection.name,
            host: connection.host,
            port: connection.port,
            database: connection.database
        }
    };
};

/**
 * Test a database connection
 */
const testConnection = async (connectionId) => {
    const conn = await DatabaseConnection.findByPk(connectionId);
    if (!conn) {
        throw new Error(`Connection with ID ${connectionId} not found`);
    }

    const result = await dbManager.testConnection(conn);
    return {
        success: true,
        message: result.message,
        connection: {
            id: conn.id,
            name: conn.name,
            host: conn.host,
            port: conn.port,
            database: conn.database
        }
    };
};

/**
 * Delete a database connection
 */
const deleteConnection = async (connectionId) => {
    const conn = await DatabaseConnection.findByPk(connectionId);
    if (!conn) {
        throw new Error(`Connection with ID ${connectionId} not found`);
    }

    // Remove cached pool
    dbManager.removePool(connectionId);
    await conn.destroy();

    return {
        success: true,
        message: `Connection "${conn.name}" deleted`
    };
};

/**
 * Get connection schema description
 */
const getConnectionSchema = async (connectionId) => {
    const conn = await DatabaseConnection.findByPk(connectionId);
    if (!conn) {
        throw new Error(`Connection with ID ${connectionId} not found`);
    }

    return {
        success: true,
        connectionId: conn.id,
        name: conn.name,
        hasDescription: !!conn.description,
        description: conn.description || null
    };
};

module.exports = {
    listConnections,
    createConnection,
    testConnection,
    deleteConnection,
    getConnectionSchema
};
