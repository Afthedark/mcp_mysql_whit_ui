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
        metadata: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('metadata');
                return rawValue ? JSON.parse(rawValue) : null;
            },
            set(value) {
                this.setDataValue('metadata', value ? JSON.stringify(value) : null);
            }
        },
        contextSnapshot: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('contextSnapshot');
                return rawValue ? JSON.parse(rawValue) : null;
            },
            set(value) {
                this.setDataValue('contextSnapshot', value ? JSON.stringify(value) : null);
            }
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
