/**
 * MCP Handlers - Schema Inspection (READ-ONLY)
 */
const dbManager = require('../../services/dbManager');

/**
 * List all tables in a database
 */
const listTables = async (connectionId) => {
    const tables = await dbManager.listTables(connectionId);
    return {
        success: true,
        tableCount: tables.length,
        tables
    };
};

/**
 * Describe table structure
 */
const describeTable = async ({ connectionId, table }) => {
    const columns = await dbManager.describeTable(connectionId, table);
    return {
        success: true,
        table,
        columnCount: columns.length,
        columns
    };
};

/**
 * Show indexes for a table
 */
const showIndexes = async ({ connectionId, table }) => {
    const indexes = await dbManager.showIndexes(connectionId, table);
    return {
        success: true,
        table,
        indexCount: indexes.length,
        indexes
    };
};

/**
 * Get table statistics
 */
const getTableStats = async ({ connectionId, table }) => {
    const stats = await dbManager.getTableStats(connectionId, table);
    return {
        success: true,
        table,
        statistics: stats
    };
};

module.exports = {
    listTables,
    describeTable,
    showIndexes,
    getTableStats
};
