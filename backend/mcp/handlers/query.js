/**
 * MCP Handlers - Query Execution (READ-ONLY)
 */
const dbManager = require('../../services/dbManager');
const sqlValidator = require('../../services/sqlValidator');

/**
 * Execute a read-only SQL query
 */
const executeQuery = async ({ connectionId, query, parameters }) => {
    // Validate SQL is read-only
    const validation = sqlValidator.validateReadOnly(query);
    if (!validation.isValid) {
        throw new Error(`SQL validation failed: ${validation.error}`);
    }

    // Execute query
    const result = await dbManager.executeQuery(connectionId, validation.cleanSQL);

    return {
        success: true,
        rowCount: result.rows.length,
        columns: result.fields,
        rows: result.rows
    };
};

module.exports = {
    executeQuery
};
