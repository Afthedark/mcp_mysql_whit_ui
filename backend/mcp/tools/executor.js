/**
 * MCP Tool Executor
 * Maps tool names to their respective handlers
 */
const connectionHandler = require('../handlers/connection');
const queryHandler = require('../handlers/query');
const schemaHandler = require('../handlers/schema');

const toolMap = {
    'chatdb_list_connections': () => connectionHandler.listConnections(),
    'chatdb_create_connection': (args) => connectionHandler.createConnection(args),
    'chatdb_test_connection': (args) => connectionHandler.testConnection(args.connectionId),
    'chatdb_delete_connection': (args) => connectionHandler.deleteConnection(args.connectionId),
    'chatdb_get_connection_schema': (args) => connectionHandler.getConnectionSchema(args.connectionId),
    'chatdb_query': (args) => queryHandler.executeQuery(args),
    'chatdb_list_tables': (args) => schemaHandler.listTables(args.connectionId),
    'chatdb_describe_table': (args) => schemaHandler.describeTable(args),
    'chatdb_show_indexes': (args) => schemaHandler.showIndexes(args),
    'chatdb_get_table_stats': (args) => schemaHandler.getTableStats(args),
};

/**
 * Execute a tool by name with the given arguments
 */
const executeTool = async (toolName, args = {}) => {
    const handler = toolMap[toolName];
    if (!handler) {
        throw new Error(`Unknown tool: ${toolName}`);
    }

    try {
        const result = await handler(args);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ success: false, error: error.message }, null, 2)
                }
            ],
            isError: true
        };
    }
};

module.exports = { executeTool };
