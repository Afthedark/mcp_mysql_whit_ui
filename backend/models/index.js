const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DatabaseConnection = require('./DatabaseConnection')(sequelize, DataTypes);
const Chat = require('./Chat')(sequelize, DataTypes);
const Message = require('./Message')(sequelize, DataTypes);

// Relationships
Chat.hasMany(Message, { foreignKey: 'chatId', onDelete: 'CASCADE' });
Message.belongsTo(Chat, { foreignKey: 'chatId' });

module.exports = {
    sequelize,
    DatabaseConnection,
    Chat,
    Message
};
