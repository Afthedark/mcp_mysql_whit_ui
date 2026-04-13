const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const sqlitePath = path.join(__dirname, '..', process.env.SQLITE_PATH || './data/mcp_memory.sqlite');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqlitePath,
    logging: false,
    dialectOptions: {
        // Enable foreign key constraints for SQLite
        foreignKeys: true
    }
});

module.exports = sequelize;
