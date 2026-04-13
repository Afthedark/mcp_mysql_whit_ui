const { DatabaseConnection } = require('../models');
const dbManager = require('../services/dbManager');
const { AppError } = require('../middleware/errorHandler');

const getAll = async (req, res, next) => {
    try {
        const connections = await DatabaseConnection.findAll({ order: [['name', 'ASC']] });
        const safeData = connections.map(c => {
            const data = c.toJSON();
            if (data.password) data.password = '********';
            return data;
        });
        res.json({ success: true, data: safeData });
    } catch (error) { next(error); }
};

const create = async (req, res, next) => {
    try {
        const { name, host, port, user, password, database, description, isActive } = req.body;
        if (!name || !host || !user || !database) {
            throw new AppError('Name, host, user, and database are required', 400);
        }
        const newConn = await DatabaseConnection.create({ name, host, port: port || 3306, user, password, database, description, isActive: isActive !== false });
        const safe = newConn.toJSON();
        if (safe.password) safe.password = '********';
        res.status(201).json({ success: true, data: safe });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') next(new AppError('Connection name already exists', 400));
        else next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const { name, host, port, user, password, database, description, isActive } = req.body;
        const conn = await DatabaseConnection.findByPk(req.params.id);
        if (!conn) throw new AppError('Connection not found', 404);

        const updateData = { name, host, port, user, database, description, isActive };
        if (password && password !== '********') updateData.password = password;

        await conn.update(updateData);
        dbManager.removePool(conn.id);

        const safe = conn.toJSON();
        if (safe.password) safe.password = '********';
        res.json({ success: true, data: safe });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') next(new AppError('Connection name already exists', 400));
        else next(error);
    }
};

const remove = async (req, res, next) => {
    try {
        const conn = await DatabaseConnection.findByPk(req.params.id);
        if (!conn) throw new AppError('Connection not found', 404);
        dbManager.removePool(conn.id);
        await conn.destroy();
        res.json({ success: true, message: 'Connection deleted' });
    } catch (error) { next(error); }
};

const testConnection = async (req, res, next) => {
    try {
        const conn = await DatabaseConnection.findByPk(req.params.id);
        if (!conn) throw new AppError('Connection not found', 404);
        const result = await dbManager.testConnection(conn);
        res.json({ success: true, message: result.message });
    } catch (error) { res.status(400).json({ success: false, message: `Connection failed: ${error.message}` }); }
};

module.exports = { getAll, create, update, remove, testConnection };
