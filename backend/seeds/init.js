const { sequelize } = require('../models');

(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ SQLite connection verified');
        await sequelize.sync({ alter: true });
        console.log('✅ Tables synchronized');
        console.log('🎉 Seed complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
})();
