/**
 * SQL Validator - STRICT READ-ONLY
 * Only allows SELECT, SHOW, DESCRIBE, EXPLAIN, WITH
 * Blocks ALL write operations
 */

const validateReadOnly = (sql) => {
    if (!sql || typeof sql !== 'string') {
        return { isValid: false, error: 'SQL query is required' };
    }

    const cleaned = sql.trim();

    // Remove comments
    const noComments = cleaned
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');

    const upper = noComments.trim().toUpperCase();

    // Check allowed starting keywords
    const allowedStart = /^(SELECT|SHOW|DESCRIBE|EXPLAIN|WITH)\s/i;
    if (!allowedStart.test(upper)) {
        return {
            isValid: false,
            error: `Operation blocked: only read queries allowed (SELECT, SHOW, DESCRIBE). Detected: ${upper.split(/[\s;(]/)[0]}`
        };
    }

    // Block write keywords anywhere in the query
    const writeKeywords = /\b(INSERT|UPDATE\s+SET|DELETE\s+FROM|DROP|TRUNCATE|ALTER|CREATE|REPLACE|GRANT|REVOKE|SET\s+@)\b/i;
    const writeMatch = upper.match(writeKeywords);
    if (writeMatch) {
        return {
            isValid: false,
            error: `Write command detected within query: ${writeMatch[0]}`
        };
    }

    // Block multi-statement (semicolon-separated multiple queries)
    const statements = cleaned.split(';').filter(s => s.trim().replace(/--.*$/gm, '').trim());
    if (statements.length > 1) {
        return { isValid: false, error: 'Multiple statements not allowed' };
    }

    return { isValid: true, cleanSQL: cleaned };
};

/**
 * Validate an array of SQL statements
 */
const validateBatch = (queries) => {
    const results = queries.map(q => validateReadOnly(q));
    const allValid = results.every(r => r.isValid);
    
    if (!allValid) {
        const errors = results.filter(r => !r.isValid).map(r => r.error);
        return { isValid: false, errors };
    }
    
    return { isValid: true, queries: results.map(r => r.cleanSQL) };
};

module.exports = {
    validateReadOnly,
    validateBatch
};
