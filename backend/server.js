const { sequelize } = require('./models');
const path = require('path');
const cors = require('cors');
const express = require('express');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const chatRoutes = require('./routes/chatRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const mcpGatewayRoutes = require('./routes/mcpGateway');

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/mcp', mcpGatewayRoutes);

// System info
app.get('/api/system/info', (req, res) => {
    res.json({
        success: true,
        aiProvider: process.env.AI_PROVIDER || 'ollama',
        model: process.env.AI_PROVIDER === 'openrouter' ? process.env.OPENROUTER_MODEL : process.env.OLLAMA_MODEL
    });
});

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// SPA catch-all route - serve index.html only for page routes (not static files)
app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // Skip static files (files with extensions)
    if (req.path.match(/\.[^/]+$/)) {
        return next();
    }
    // Serve index.html for all other routes (SPA navigation)
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

sequelize.sync({ force: false, alter: false }).then(() => {
    console.log('📦 SQLite memory database ready');
    app.listen(PORT, () => {
        console.log(`🚀 MCP MySQL Explorer running at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('❌ SQLite error:', err);
});

process.on('SIGINT', async () => {
    const { closeAll } = require('./services/dbManager');
    await closeAll();
    console.log('\n😴 Shutdown complete');
    process.exit(0);
});
