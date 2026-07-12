const TallyRequests = require("../tally/TallyRequests");
const SyncError = require("../errors/SyncError");

const ENTITY_CONFIGS = Object.freeze({
  STOCK_GROUP: {
    buildRequest: () => TallyRequests.buildStockGroupRequest(),
    parseXml: (parser, xml) => parser.parseStockGroups(xml),
    mapPayload: (entity) => ({
      tallyMasterId: entity.id || null,
      tallyGuid: entity.guid || null,
      tallyAlterId: entity.alterId ? parseInt(entity.alterId, 10) : null,
      name: entity.name || null,
      parentName: entity.parent || null,
      isActive: true,
    }),
  },
  UNIT: {
    buildRequest: () => TallyRequests.buildUnitRequest(),
    parseXml: (parser, xml) => parser.parseUnits(xml),
    mapPayload: (entity) => ({
      tallyMasterId: entity.id || null,
      tallyGuid: entity.guid || null,
      tallyAlterId: entity.alterId ? parseInt(entity.alterId, 10) : null,
      name: entity.name || null,
      symbol: entity.name || null,
      isActive: true,
    }),
  },
  STOCK_ITEM: {
    buildRequest: () => TallyRequests.buildStockItemRequest(),
    parseXml: (parser, xml) => parser.parseStockItems(xml),
    mapPayload: (entity) => ({
      tallyMasterId: entity.id || null,
      tallyGuid: entity.guid || null,
      tallyAlterId: entity.alterId ? parseInt(entity.alterId, 10) : null,
      sku: entity.id || null,
      name: entity.name || null,
      brand: null,
      category: entity.parent || null,
      costPrice: 0,
      stockQty: 0,
      tallyStockQty: (entity.closingBalance && !isNaN(parseFloat(entity.closingBalance))) ? parseFloat(entity.closingBalance) : 0,
      stockGroupId: entity.parent || null,
      unitId: entity.baseUnits || null,
      isActive: true,
    }),
  },
});

const ENTITY_ORDER = ["STOCK_GROUP", "UNIT", "STOCK_ITEM"];

class SyncEngine {
  constructor({ tallyClient, parser, hashEngine, apiClient, database }) {
    if (!tallyClient || !parser || !hashEngine || !apiClient || !database) {
      throw new SyncError(
        "SyncEngine requires tallyClient, parser, hashEngine, apiClient, and database",
      );
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
        error: null,
      };

      try {
        let displayType =
          entityType === "STOCK_ITEM"
            ? "Products"
            : entityType === "STOCK_GROUP"
              ? "Stock Groups"
              : "Units";
        console.log(`Start syncing ${displayType}`);
        // 1. Build XML request
        console.log("Building XML...");
        const xmlRequest = config.buildRequest();

        console.log("Sending request to Tally...");
        const xmlResponse = await this.tallyClient.sendRequest(xmlRequest);

        console.log("Received XML");
        console.log(xmlResponse.substring(0, 500));

        // 3. Parse XML response
        const entities = config.parseXml(this.parser, xmlResponse);

        console.log("Parsed entities:", entities.length);

        if (entities.length > 0) {
          console.log(entities[0]);
        }
        stats.total = entities.length;

        if (entityType === "STOCK_ITEM") {
          console.log("------------------------------------------------");
          console.log("Received Stock Item XML");
          console.log(`XML Length: ${Buffer.byteLength(xmlResponse, 'utf8')} bytes`);
          console.log(`Stock Items Found: ${entities.length}`);
          console.log("------------------------------------------------");

          console.log(`Total parsed products: ${entities.length}`);
          const limit = Math.min(entities.length, 3);
          for (let i = 0; i < limit; i++) {
            console.log(`Parsed Product #${i + 1}`);
            console.log(JSON.stringify({
              name: entities[i].name,
              guid: entities[i].guid,
              alterId: entities[i].alterId,
              parent: entities[i].parent,
              baseUnits: entities[i].baseUnits,
              gstApplicable: entities[i].gstApplicable,
              description: entities[i].description,
              isBatchWiseOn: entities[i].isBatchWiseOn,
              openingBalance: entities[i].openingBalance,
              closingBalance: entities[i].closingBalance,
              openingValue: entities[i].openingValue,
              closingValue: entities[i].closingValue
            }, null, 2));
          }
          console.log("");

          console.log("=====================================");
          console.log("Stock Item Sync");
          console.log("=====================================");
          console.log("\nReceived XML Successfully\n");
          console.log("XML Length:");
          console.log(`${Buffer.byteLength(xmlResponse, 'utf8')} bytes\n`);
          console.log("Stock Items Found:");
          console.log(`${entities.length}\n`);
          console.log("Parsed Products:");
          console.log(`${entities.length}\n`);
          console.log("Sample Parsed Product:\n");
          if (entities.length > 0) {
            console.log(JSON.stringify({
              name: entities[0].name,
              guid: entities[0].guid,
              alterId: entities[0].alterId,
              parent: entities[0].parent,
              baseUnits: entities[0].baseUnits,
              gstApplicable: entities[0].gstApplicable,
              description: entities[0].description,
              isBatchWiseOn: entities[0].isBatchWiseOn,
              openingBalance: entities[0].openingBalance,
              closingBalance: entities[0].closingBalance,
              openingValue: entities[0].openingValue,
              closingValue: entities[0].closingValue
            }, null, 2));
          } else {
            console.log("null");
          }
          console.log("");
        }

        // 4. Evaluate entities using HashEngine
        const evaluated = this.hashEngine.evaluateEntities(
          entityType,
          entities,
        );
        stats.new = evaluated.new.length;
        stats.changed = evaluated.changed.length;
        stats.unchanged = evaluated.unchanged.length;

        // 5. Filter for NEW and CHANGED entities
        const entitiesToUpload = [...evaluated.new, ...evaluated.changed];

        // 6. Upload only if there are changes
        const uploadPayload = entitiesToUpload.map((e) =>
          config.mapPayload(e.entity),
        );

        if (entityType === "STOCK_ITEM") {
          console.log(`Uploading ${uploadPayload.length} Products\n`);
          if (uploadPayload.length > 0) {
            console.log("Sample Payload:\n");
            console.log(JSON.stringify(uploadPayload[0], null, 2));
          } else {
            console.log("Sample Payload:\nnull\n");
          }
          console.log("------------------------------------------------");

          console.log("Products Ready for Upload:");
          console.log(`${uploadPayload.length}\n`);
          if (uploadPayload.length > 0) {
            console.log("Sample Payload:\n");
            console.log(JSON.stringify(uploadPayload[0], null, 2));
          } else {
            console.log("Sample Payload:\nnull\n");
          }
          console.log("");
        }

        if (entitiesToUpload.length > 0) {
          console.log("Upload payload count:", uploadPayload.length);

          if (uploadPayload.length > 0) {
            console.log("First payload:");
            console.dir(uploadPayload[0], { depth: null });
          }
          const apiResponse = await this.apiClient.uploadEntities(
            entityType,
            uploadPayload,
          );

          if (!apiResponse || apiResponse.success !== true) {
            throw new SyncError("API upload failed or rejected the payload.");
          }

          // 7. Update hashes in DB inside a transaction upon confirmed success
          this.database.transaction(() => {
            for (const evalResult of entitiesToUpload) {
              this.database.upsertHash({
                entityType: evalResult.entityType,
                entityId: evalResult.entityId,
                hash: evalResult.hash,
                alterId: evalResult.alterId,
              });
            }
          });

          stats.uploaded = entitiesToUpload.length;
        }

        // 8. Record successful summary
        stats.success = true;
        entityResults[entityType] = stats;
        console.log(`Finished ${displayType}`);
        console.log(`Uploaded ${stats.uploaded}`);
        console.log(`Skipped ${stats.unchanged}`);

        if (entityType === "STOCK_ITEM") {
          console.log("Upload Successful\n");
          console.log("Uploaded:");
          console.log(`${stats.uploaded}\n`);
          console.log("Skipped:");
          console.log(`${stats.unchanged}\n`);
          console.log("Failed:");
          console.log("0\n");
          console.log("=====================================");
        }
      } catch (error) {
        // 9. Record failure and continue with other entities
        overallSuccess = false;
        stats.success = false;
        stats.error = error.message;
        entityResults[entityType] = stats;

        if (entityType === "STOCK_ITEM") {
          console.log("Upload Failed\n");
          console.log("Uploaded:");
          console.log("0\n");
          console.log("Skipped:");
          console.log(`${stats.unchanged}\n`);
          console.log("Failed:");
          console.log(`${stats.total - stats.unchanged}\n`);
          console.log("=====================================");
        }

        let displayType =
          entityType === "STOCK_ITEM"
            ? "Products"
            : entityType === "STOCK_GROUP"
              ? "Stock Groups"
              : "Units";
        console.log(`Failed ${displayType}: ${error.message}`);
      }
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTimeMs;

    // 10. Return final summary
    return {
      startedAt,
      completedAt,
      duration: durationMs,
      groups: entityResults.STOCK_GROUP ? entityResults.STOCK_GROUP.total : 0,
      units: entityResults.UNIT ? entityResults.UNIT.total : 0,
      products: entityResults.STOCK_ITEM ? entityResults.STOCK_ITEM.total : 0,
      uploaded: Object.values(entityResults).reduce(
        (sum, r) => sum + r.uploaded,
        0,
      ),
      changed: Object.values(entityResults).reduce(
        (sum, r) => sum + r.changed,
        0,
      ),
      unchanged: Object.values(entityResults).reduce(
        (sum, r) => sum + r.unchanged,
        0,
      ),
      failed: Object.values(entityResults).filter((r) => !r.success).length,
      success: overallSuccess,
    };
  }
}

module.exports = SyncEngine;
