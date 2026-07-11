const TallyRequests = require('../tally/TallyRequests');

const ENTITY_CONFIGS = Object.freeze({
    LEDGER: {
        buildRequest: () => TallyRequests.buildLedgerRequest(),
        parseXml: (parser, xml) => parser.parseLedgers(xml)
    },
    STOCK_GROUP: {
        buildRequest: () => TallyRequests.buildStockGroupRequest(),
        parseXml: (parser, xml) => parser.parseStockGroups(xml)
    },
    UNIT: {
        buildRequest: () => TallyRequests.buildUnitRequest(),
        parseXml: (parser, xml) => parser.parseUnits(xml)
    },
    STOCK_ITEM: {
        buildRequest: () => TallyRequests.buildStockItemRequest(),
        parseXml: (parser, xml) => parser.parseStockItems(xml)
    }
});

const ENTITY_ORDER = ['LEDGER', 'STOCK_GROUP', 'UNIT', 'STOCK_ITEM'];

class SyncEngine {
    constructor({ tallyClient, parser, hashEngine, apiClient, database }) {
        if (!tallyClient || !parser || !hashEngine || !apiClient || !database) {
            throw new Error('SyncEngine requires tallyClient, parser, hashEngine, apiClient, and database');
        }
        this.tallyClient = tallyClient;
        this.parser = parser;
        this.hashEngine = hashEngine;
        this.apiClient = apiClient;
        this.database = database;
    }

    /**
     * Executes a complete synchronization run across all entity types.
     * @returns {Promise<Object>} The summary of the sync run.
     */
    async run() {
        const startedAt = new Date().toISOString();
        const startTimeMs = Date.now();
        const entityResults = {};
        let overallSuccess = true;

        for (const entityType of ENTITY_ORDER) {
            const config = ENTITY_CONFIGS[entityType];
            
            const stats = {
                success: false,
                total: 0,
                new: 0,
                changed: 0,
                unchanged: 0,
                uploaded: 0,
                error: null
            };

            try {
                // 1. Build XML request
                const xmlRequest = config.buildRequest();
                
                // 2. Send request to Tally
                const xmlResponse = await this.tallyClient.sendRequest(xmlRequest);
                
                // 3. Parse XML response
                const entities = config.parseXml(this.parser, xmlResponse);
                stats.total = entities.length;
                
                // 4. Evaluate entities using HashEngine
                const evaluated = this.hashEngine.evaluateEntities(entityType, entities);
                stats.new = evaluated.new.length;
                stats.changed = evaluated.changed.length;
                stats.unchanged = evaluated.unchanged.length;
                
                // 5. Filter for NEW and CHANGED entities
                const entitiesToUpload = [...evaluated.new, ...evaluated.changed];
                
                // 6. Upload only if there are changes
                if (entitiesToUpload.length > 0) {
                    const uploadPayload = entitiesToUpload.map(e => e.entity);
                    const apiResponse = await this.apiClient.uploadEntities(entityType, uploadPayload);
                    
                    if (!apiResponse || apiResponse.success !== true) {
                        throw new Error('API upload failed or rejected the payload.');
                    }

                    // 7. Update hashes in DB inside a transaction upon confirmed success
                    this.database.transaction(() => {
                        for (const evalResult of entitiesToUpload) {
                            this.database.upsertHash({
                                entityType: evalResult.entityType,
                                entityId: evalResult.entityId,
                                hash: evalResult.hash,
                                alterId: evalResult.alterId
                            });
                        }
                    });
                    
                    stats.uploaded = entitiesToUpload.length;
                }
                
                // 8. Record successful summary
                stats.success = true;
                entityResults[entityType] = stats;
            } catch (error) {
                // 9. Record failure and continue with other entities
                overallSuccess = false;
                stats.success = false;
                stats.error = error.message;
                entityResults[entityType] = stats;
            }
        }

        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - startTimeMs;

        // 10. Return final summary
        return {
            startedAt,
            completedAt,
            durationMs,
            entityResults,
            success: overallSuccess
        };
    }
}

module.exports = SyncEngine;
