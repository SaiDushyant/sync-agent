const crypto = require('crypto');
const HashEngineError = require('../errors/HashEngineError');

const HASH_STATUS = Object.freeze({
    NEW: "NEW",
    CHANGED: "CHANGED",
    UNCHANGED: "UNCHANGED"
});

const ALLOWED_ENTITY_TYPES = Object.freeze(new Set([
    'LEDGER',
    'STOCK_ITEM',
    'STOCK_GROUP',
    'UNIT'
]));

class HashEngine {
    constructor(database) {
        if (!database) {
            throw new HashEngineError('Database dependency is required');
        }
        this.database = database;
    }

    /**
     * Stably serializes an object to a JSON string.
     * Recursively sorts object keys, preserves arrays, ignores undefined, preserves null.
     */
    _serialize(obj) {
        if (obj === null) {
            return 'null';
        }
        
        if (typeof obj === 'undefined') {
            return undefined;
        }

        if (typeof obj !== 'object') {
            return JSON.stringify(obj);
        }

        if (Array.isArray(obj)) {
            const arr = obj.map(item => {
                const serialized = this._serialize(item);
                // JSON.stringify converts undefined in arrays to null
                return serialized === undefined ? 'null' : serialized;
            });
            return `[${arr.join(',')}]`;
        }

        const keys = Object.keys(obj).sort();
        const parts = [];
        for (const key of keys) {
            const val = this._serialize(obj[key]);
            if (val !== undefined) {
                parts.push(`${JSON.stringify(key)}:${val}`);
            }
        }
        return `{${parts.join(',')}}`;
    }

    /**
     * Generates a deterministic SHA-256 hash for the given entity.
     */
    _generateHash(entity) {
        const serialized = this._serialize(entity);
        return crypto.createHash('sha256').update(serialized).digest('hex');
    }

    /**
     * Evaluates a single entity against the database to determine its change status.
     * @param {string} entityType - The type of entity (e.g. 'LEDGER')
     * @param {Object} entity - The parsed entity object
     * @returns {Object} Evaluation result mapping
     */
    evaluateEntity(entityType, entity) {
        if (!entityType) {
            throw new HashEngineError('entityType is missing');
        }
        if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
            throw new HashEngineError(`Unsupported entity type: ${entityType}`);
        }
        if (!entity || !entity.id) {
            throw new HashEngineError('entity.id is missing');
        }

        let previousRecord;
        try {
            previousRecord = this.database.getHash(entityType, String(entity.id));
        } catch (error) {
            throw new HashEngineError(`Database access failed: ${error.message}`, { cause: error });
        }

        if (previousRecord && typeof previousRecord.hash !== 'string') {
            throw new HashEngineError(`Invalid database record: missing valid hash property for ${entityType} ${entity.id}`);
        }

        const hash = this._generateHash(entity);
        const previousHash = previousRecord ? previousRecord.hash : null;
        
        let status;
        if (!previousRecord) {
            status = HASH_STATUS.NEW;
        } else if (previousHash !== hash) {
            status = HASH_STATUS.CHANGED;
        } else {
            status = HASH_STATUS.UNCHANGED;
        }

        return {
            entityType,
            entityId: String(entity.id),
            alterId: entity.alterId || null,
            hash,
            previousHash,
            status,
            entity
        };
    }

    /**
     * Evaluates an array of entities and groups them by their change status.
     * @param {string} entityType - The type of entity (e.g. 'LEDGER')
     * @param {Array<Object>} entities - The array of parsed entity objects
     * @returns {Object} Grouped evaluation results
     */
    evaluateEntities(entityType, entities) {
        if (!entityType) {
            throw new HashEngineError('entityType is missing');
        }
        if (!Array.isArray(entities)) {
            throw new HashEngineError('entities must be an array');
        }

        const result = {
            new: [],
            changed: [],
            unchanged: []
        };

        for (const entity of entities) {
            const evaluation = this.evaluateEntity(entityType, entity);
            if (evaluation.status === HASH_STATUS.NEW) {
                result.new.push(evaluation);
            } else if (evaluation.status === HASH_STATUS.CHANGED) {
                result.changed.push(evaluation);
            } else {
                result.unchanged.push(evaluation);
            }
        }

        return result;
    }
}

module.exports = HashEngine;
