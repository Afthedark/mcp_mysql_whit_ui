module.exports = (sequelize, DataTypes) => {
    const Message = sequelize.define('Message', {
        role: {
            type: DataTypes.ENUM('user', 'assistant'),
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        sqlGenerated: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        sqlExecuted: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        connectionName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        chatId: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        indexes: [
            { fields: ['chatId'] },
            { fields: ['createdAt'] }
        ]
    });
    return Message;
};
