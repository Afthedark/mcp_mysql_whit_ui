module.exports = (sequelize, DataTypes) => {
    const AgentConfig = sequelize.define('AgentConfig', {
        connectionIds: {
            type: DataTypes.TEXT,
            allowNull: false,
            get() {
                const rawValue = this.getDataValue('connectionIds');
                return rawValue ? JSON.parse(rawValue) : [];
            },
            set(value) {
                this.setDataValue('connectionIds', value ? JSON.stringify(value) : null);
            }
        },
        schemaDefinition: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('schemaDefinition');
                return rawValue ? JSON.parse(rawValue) : null;
            },
            set(value) {
                this.setDataValue('schemaDefinition', value ? JSON.stringify(value) : null);
            }
        },
        personality: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('personality');
                return rawValue ? JSON.parse(rawValue) : null;
            },
            set(value) {
                this.setDataValue('personality', value ? JSON.stringify(value) : null);
            }
        },
        businessContext: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        mcpPreferences: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('mcpPreferences');
                return rawValue ? JSON.parse(rawValue) : null;
            },
            set(value) {
                this.setDataValue('mcpPreferences', value ? JSON.stringify(value) : null);
            }
        },
        sqlExamples: {
            type: DataTypes.TEXT,
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('sqlExamples');
                return rawValue ? JSON.parse(rawValue) : [];
            },
            set(value) {
                this.setDataValue('sqlExamples', value ? JSON.stringify(value) : null);
            }
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        indexes: [
            { fields: ['isActive'] }
        ]
    });

    return AgentConfig;
};
