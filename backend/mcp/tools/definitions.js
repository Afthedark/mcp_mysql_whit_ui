/**
 * MCP Tool Definitions - READ ONLY
 */

const tools = [
    // Connection Management
    {
        name: 'chatdb_list_connections',
        description: 'List all configured database connections',
        inputSchema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'chatdb_create_connection',
        description: 'Create a new database connection',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Connection name' },
                host: { type: 'string', description: 'MySQL host' },
                port: { type: 'number', description: 'MySQL port', default: 3306 },
                user: { type: 'string', description: 'MySQL user' },
                password: { type: 'string', description: 'MySQL password' },
                database: { type: 'string', description: 'Database name' },
                description: { type: 'string', description: 'Schema description' }
            },
            required: ['name', 'host', 'user', 'database']
        }
    },
    {
        name: 'chatdb_test_connection',
        description: 'Test connectivity to a specific database',
        inputSchema: {
            type: 'object',
            properties: {
                connectionId: { type: 'number', description: 'The ID of the database connection' }
            },
            required: ['connectionId']
        }
    },
    {
        name: 'chatdb_delete_connection',
        description: 'Delete a database connection',
        inputSchema: {
            type: 'object',
            properties: {
                connectionId: { type: 'number', description: 'The ID of the database connection' }
            },
            required: ['connectionId']
        }
    },
    {
        name: 'chatdb_get_connection_schema',
        description: 'Get the schema description for a connection',
        inputSchema: {
            type: 'object',
            properties: {
                connectionId: { type: 'number', description: 'The ID of the database connection' }
            },
            required: ['connectionId']
        }
    },

    // Query Execution (READ-ONLY)
    {
        name: 'chatdb_query',
        description: 'Execute a read-only SQL query (SELECT/SHOW/DESCRIBE only)',
        inputSchema: {
            type: 'object',
            properties: {
                connectionId: { type: 'number', description: 'The ID of the database connection' },
                query: { type: 'string', description: 'The SQL query (SELECT/SHOW only)' },
                parameters: { type: 'array', description: 'Optional parameters', items: { type: 'string' } }
            },
            required: ['connectionId', 'query']
        }
    },

    // Schema Inspection
    {
        name: 'chatdb_list_tables',
        description: 'List all tables in the specified database',
        inputSchema: {
            type: 'object',
            properties: {
                connectionId: { type: 'number', description: 'The ID of the database connection' }
            },
            required: ['connectionId']
        }
    },
    {
        name: 'chatdb_describe_table',
        description: 'Get the structure/schema of a specific table',
        inputSchema: {
            type: 'object',
            properties: {
                connectionId: { type: 'number', description: 'The ID of the database connection' },
                table: { type: 'string', description: 'The name of the table' }
            },
            required: ['connectionId', 'table']
        }
    },
    {
        name: 'chatdb_show_indexes',
        description: 'Show all indexes for a specific table',
        inputSchema: {
            type: 'object',
            properties: {
                connectionId: { type: 'number', description: 'The ID of the database connection' },
                table: { type: 'string', description: 'The name of the table' }
            },
            required: ['connectionId', 'table']
        }
    },
    {
        name: 'chatdb_get_table_stats',
        description: 'Get statistics about a table',
        inputSchema: {
            type: 'object',
            properties: {
                connectionId: { type: 'number', description: 'The ID of the database connection' },
                table: { type: 'string', description: 'The name of the table' }
            },
            required: ['connectionId', 'table']
        }
    }
];

module.exports = { tools };
