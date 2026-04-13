const mysql = require('mysql2/promise');
const { DatabaseConnection } = require('../models');

// Pool cache para reutilizar conexiones
const pools = new Map();

/**
 * Get or create a connection pool for a specific database
 */
const getConnection = async (databaseId) => {
    if (pools.has(databaseId)) {
        return pools.get(databaseId);
    }

    const dbConfig = await DatabaseConnection.findByPk(databaseId);
    if (!dbConfig) {
        throw new Error('Database connection not found');
    }

    if (!dbConfig.isActive) {
        throw new Error('Database connection is inactive');
    }

    try {
        const pool = mysql.createPool({
            host: dbConfig.host,
            port: dbConfig.port || 3306,
            user: dbConfig.user,
            password: dbConfig.password || '',
            database: dbConfig.database,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            multipleStatements: false
        });

        pools.set(databaseId, pool);
        return pool;
    } catch (error) {
        throw new Error(`Error creating connection pool: ${error.message}`);
    }
};

/**
 * Execute a query on a specific database
 */
const executeQuery = async (databaseId, sql) => {
    const pool = await getConnection(databaseId);

    try {
        const [rows, fields] = await pool.query({ sql, timeout: 30000 });
        return { rows, fields: fields.map(f => f.name) };
    } catch (error) {
        throw new Error(`Query execution failed: ${error.message}`);
    }
};

/**
 * Test a database connection with given config
 */
const testConnection = async (dbConfig) => {
    let pool = null;
    try {
        pool = mysql.createPool({
            host: dbConfig.host,
            port: dbConfig.port || 3306,
            user: dbConfig.user,
            password: dbConfig.password || '',
            database: dbConfig.database,
            connectionLimit: 1
        });

        await pool.query('SELECT 1');
        return { success: true, message: `Connected to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}` };
    } catch (error) {
        throw new Error(error.message);
    } finally {
        if (pool) await pool.end();
    }
};

/**
 * List tables in a database
 */
const listTables = async (databaseId) => {
    const { rows } = await executeQuery(databaseId, 'SHOW TABLES');
    // MySQL returns tables with key like "Tables_in_dbname"
    const tables = rows.map(row => Object.values(row)[0]);
    return tables;
};

/**
 * Describe table structure
 */
const describeTable = async (databaseId, tableName) => {
    const { rows } = await executeQuery(databaseId, `DESCRIBE \`${tableName}\``);
    return rows;
};

/**
 * Show indexes for a table
 */
const showIndexes = async (databaseId, tableName) => {
    const { rows } = await executeQuery(databaseId, `SHOW INDEX FROM \`${tableName}\``);
    return rows;
};

/**
 * Get table statistics
 */
const getTableStats = async (databaseId, tableName) => {
    const { rows } = await executeQuery(databaseId, 
        `SELECT TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, CREATE_TIME, UPDATE_TIME 
         FROM information_schema.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}'`
    );
    return rows[0] || {};
};

/**
 * Remove a cached pool
 */
const removePool = (databaseId) => {
    if (pools.has(databaseId)) {
        const pool = pools.get(databaseId);
        pool.end();
        pools.delete(databaseId);
    }
};

/**
 * Close all pools
 */
const closeAll = async () => {
    for (const pool of pools.values()) {
        await pool.end();
    }
    pools.clear();
};

module.exports = {
    getConnection,
    executeQuery,
    testConnection,
    listTables,
    describeTable,
    showIndexes,
    getTableStats,
    removePool,
    closeAll
};
