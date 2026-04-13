const { sequelize } = require('../models');
const { seedPvMchickenConfig } = require('./pvMchickenAgentConfig');

(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ SQLite connection verified');
        await sequelize.sync({ alter: true });
        console.log('✅ Tables synchronized');
        
        // Ejecutar seed de configuración McChicken
        await seedPvMchickenConfig();
        
        console.log('🎉 Seed complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
})();
