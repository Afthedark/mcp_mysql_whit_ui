/**
 * MCP Server - Standalone stdio server
 * Can be used by VS Code, Claude Desktop, or other MCP clients
 */
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { tools } = require('./tools/definitions');
const { executeTool } = require('./tools/executor');

function createMCPServer() {
    const server = new Server(
        { name: 'mcp-mysql-server', version: '1.0.0' },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            console.error(`[MCP] Executing: ${name}`);
            const result = await executeTool(name, args);
            console.error(`[MCP] Done: ${name}`);
            return result;
        } catch (error) {
            console.error(`[MCP] Error: ${name}`, error);
            return {
                content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message, tool: name }, null, 2) }],
                isError: true
            };
        }
    });

    return server;
}

async function startMCPServer() {
    const { sequelize } = require('../../models');
    try {
        await sequelize.authenticate();
        console.error('[MCP] SQLite connection established');
    } catch (error) {
        console.error('[MCP] SQLite connection failed:', error);
        process.exit(1);
    }

    const server = createMCPServer();
    const transport = new StdioServerTransport();
    console.error('[MCP] Server starting on stdio...');
    await server.connect(transport);
    console.error('[MCP] Server ready');
}

process.on('SIGINT', async () => {
    console.error('[MCP] Shutting down...');
    const { closeAll } = require('../../services/dbManager');
    await closeAll();
    process.exit(0);
});

module.exports = { createMCPServer, startMCPServer };

if (require.main === module) {
    startMCPServer().catch(err => { console.error('[MCP] Fatal:', err); process.exit(1); });
}
