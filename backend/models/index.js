const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DatabaseConnection = require('./DatabaseConnection')(sequelize, DataTypes);
const Chat = require('./Chat')(sequelize, DataTypes);
const Message = require('./Message')(sequelize, DataTypes);
const AgentConfig = require('./AgentConfig')(sequelize, DataTypes);

// Relationships
Chat.hasMany(Message, { foreignKey: 'chatId', onDelete: 'CASCADE' });
Message.belongsTo(Chat, { foreignKey: 'chatId' });

DatabaseConnection.hasOne(AgentConfig, { foreignKey: 'connectionId', onDelete: 'CASCADE' });
AgentConfig.belongsTo(DatabaseConnection, { foreignKey: 'connectionId' });

module.exports = {
    sequelize,
    DatabaseConnection,
    Chat,
    Message,
    AgentConfig
};
