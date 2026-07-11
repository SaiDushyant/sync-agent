const DatabaseLib = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const DatabaseError = require('../errors/DatabaseError');

class Database {
    constructor() {
        this.db = null;
        this.statements = {};
    }

    /**
     * Initializes the database connection, creates it if it doesn't exist,
     * and sets up the required schema and prepared statements.
     */
    initialize() {
        if (this.db) {
            return; // Already initialized
        }

        const dbPath = process.env.DATABASE_PATH;
        if (!dbPath) {
            throw new DatabaseError('DATABASE_PATH is not set in environment.');
        }
        
        // Ensure the directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Open/Create database
        this.db = new DatabaseLib(dbPath);

        // Initialize schema
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS schema_version (
                id INTEGER PRIMARY KEY CHECK(id = 1),
                version INTEGER NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS entity_hashes (
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                hash TEXT NOT NULL,
                alter_id TEXT,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (entity_type, entity_id)
            );
        `);

        // Manage schema version
        const versionRow = this.db.prepare('SELECT version FROM schema_version WHERE id = 1').get();
        if (!versionRow) {
            this.db.prepare('INSERT INTO schema_version (id, version) VALUES (?, ?)').run(1, 1);
        }

        this._prepareStatements();
    }

    /**
     * Precompiles SQL statements for efficient reuse.
     */
    _prepareStatements() {
        this.statements.getHash = this.db.prepare(`
            SELECT hash, alter_id, updated_at 
            FROM entity_hashes 
            WHERE entity_type = ? AND entity_id = ?
        `);

        this.statements.upsertHash = this.db.prepare(`
            INSERT INTO entity_hashes (entity_type, entity_id, hash, alter_id, updated_at)
            VALUES (@entity_type, @entity_id, @hash, @alter_id, @updated_at)
            ON CONFLICT(entity_type, entity_id) DO UPDATE SET
                hash = excluded.hash,
                alter_id = excluded.alter_id,
                updated_at = excluded.updated_at
        `);

        this.statements.deleteHash = this.db.prepare(`
            DELETE FROM entity_hashes 
            WHERE entity_type = ? AND entity_id = ?
        `);
    }

    /**
     * Retrieves the stored hash and metadata for a given entity.
     * @param {string} entityType - The type of the entity (e.g., 'LEDGER')
     * @param {string} entityId - The unique ID of the entity
     * @returns {Object|undefined} The hash record if found
     */
    getHash(entityType, entityId) {
        this._checkInitialized();
        return this.statements.getHash.get(entityType, entityId);
    }

    /**
     * Inserts or updates the hash record for a given entity.
     * @param {Object} record - The record to upsert
     * @param {string} record.entityType - The type of the entity
     * @param {string} record.entityId - The unique ID of the entity
     * @param {string} record.hash - The computed hash of the entity data
     * @param {string|null} record.alterId - The Tally alterId if available
     */
    upsertHash(record) {
        this._checkInitialized();
        const { entityType, entityId, hash, alterId } = record;
        const updatedAt = new Date().toISOString();
        
        return this.statements.upsertHash.run({
            entity_type: entityType,
            entity_id: entityId,
            hash: hash,
            alter_id: alterId || null,
            updated_at: updatedAt
        });
    }

    /**
     * Deletes the hash record for a given entity.
     * @param {string} entityType - The type of the entity
     * @param {string} entityId - The unique ID of the entity
     */
    deleteHash(entityType, entityId) {
        this._checkInitialized();
        return this.statements.deleteHash.run(entityType, entityId);
    }

    /**
     * Executes a callback function inside a database transaction.
     * @param {Function} callback - The function to execute
     * @returns {*} The result of the callback
     */
    transaction(callback) {
        this._checkInitialized();
        const tx = this.db.transaction(callback);
        return tx();
    }

    /**
     * Closes the database connection gracefully.
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.statements = {};
        }
    }

    /**
     * Internal guard to ensure the database is initialized before operating.
     */
    _checkInitialized() {
        if (!this.db) {
            throw new DatabaseError('Database not initialized. Call initialize() first.');
        }
    }
}

module.exports = new Database();
