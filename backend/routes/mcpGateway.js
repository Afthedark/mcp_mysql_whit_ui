const express = require('express');
const router = express.Router();
const { executeTool } = require('../mcp/tools/executor');

/**
 * MCP Gateway - Exposes MCP tools as HTTP REST endpoints
 * Allows the frontend web app to use MCP tools without stdio protocol
 */

// List all available MCP tools
router.get('/tools', (req, res) => {
    const { tools } = require('../mcp/tools/definitions');
    res.json({ success: true, tools: tools.map(t => ({ name: t.name, description: t.description })) });
});

// Execute any MCP tool
router.post('/call', async (req, res) => {
    try {
        const { tool, args } = req.body;
        if (!tool) return res.status(400).json({ success: false, error: 'Tool name required' });

        const result = await executeTool(tool, args || {});
        
        // Parse the text content and return
        const textContent = result.content?.find(c => c.type === 'text')?.text;
        const parsed = textContent ? JSON.parse(textContent) : result;
        
        res.json({ success: true, data: parsed, isError: result.isError || false });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
