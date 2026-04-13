const express = require('express');
const router = express.Router();
const {
    getConfig,
    createConfig,
    updateConfig,
    deleteConfig,
    listConfigs,
    getOrCreateDefault
} = require('../controllers/agentConfigController');

// List all configurations
router.get('/', listConfigs);

// Get config by connection ID
router.get('/connection/:connectionId', getConfig);

// Get or create default config
router.get('/connection/:connectionId/default', getOrCreateDefault);

// Create new config
router.post('/', createConfig);

// Update config
router.put('/:id', updateConfig);

// Delete config
router.delete('/:id', deleteConfig);

module.exports = router;
