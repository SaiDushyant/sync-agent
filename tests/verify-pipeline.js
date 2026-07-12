const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Use an in-memory database for testing so we don't modify the production sync.db
process.env.DATABASE_PATH = ":memory:";

const database = require("../src/database/Database");
const parser = require("../src/parser/XmlParser");
const HashEngine = require("../src/hashing/HashEngine");
const SyncEngine = require("../src/sync/SyncEngine");
const ApiClient = require("../src/api/ApiClient");
const TallyClient = require("../src/tally/TallyClient");

// --- Simulated Tally XML Data ---
const MOCK_STOCK_GROUP_XML = `
<ENVELOPE>
  <BODY>
    <IMPORTDATA>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <STOCKGROUP NAME="Electronics" RESERVEDNAME="">
            <GUID>sg-guid-1111</GUID>
            <ALTERID>1001</ALTERID>
            <PARENT></PARENT>
          </STOCKGROUP>
        </TALLYMESSAGE>
        <TALLYMESSAGE>
          <STOCKGROUP NAME="Mobile Phones" RESERVEDNAME="">
            <GUID>sg-guid-2222</GUID>
            <ALTERID>1002</ALTERID>
            <PARENT>Electronics</PARENT>
          </STOCKGROUP>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
`;

const MOCK_UNIT_XML = `
<ENVELOPE>
  <BODY>
    <IMPORTDATA>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <UNIT NAME="Pieces" RESERVEDNAME="">
            <GUID>unit-guid-1111</GUID>
            <ALTERID>2001</ALTERID>
          </UNIT>
        </TALLYMESSAGE>
        <TALLYMESSAGE>
          <UNIT NAME="Box" RESERVEDNAME="">
            <GUID>unit-guid-2222</GUID>
            <ALTERID>2002</ALTERID>
          </UNIT>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
`;

const MOCK_STOCK_ITEM_XML = `
<ENVELOPE>
  <BODY>
    <DATA>
      <COLLECTION>
        <STOCKITEM NAME="iPhone 15 Pro" RESERVEDNAME="">
          <GUID>item-guid-1111</GUID>
          <ALTERID>3001</ALTERID>
          <PARENT>Mobile Phones</PARENT>
          <BASEUNITS>Pieces</BASEUNITS>
          <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
          <DESCRIPTION>Latest iPhone 15 Pro model</DESCRIPTION>
          <ISBATCHWISEON>Yes</ISBATCHWISEON>
          <OPENINGBALANCE>10.00 Pcs</OPENINGBALANCE>
          <CLOSINGBALANCE>8.00 Pcs</CLOSINGBALANCE>
          <OPENINGVALUE>100000.00</OPENINGVALUE>
          <CLOSINGVALUE>80000.00</CLOSINGVALUE>
        </STOCKITEM>
        <STOCKITEM NAME="USB-C Cable" RESERVEDNAME="">
          <GUID>item-guid-2222</GUID>
          <ALTERID>3002</ALTERID>
          <PARENT>Electronics</PARENT>
          <BASEUNITS>Box</BASEUNITS>
          <GSTAPPLICABLE></GSTAPPLICABLE>
          <DESCRIPTION/>
          <ISBATCHWISEON>No</ISBATCHWISEON>
          <OPENINGBALANCE></OPENINGBALANCE>
          <CLOSINGBALANCE></CLOSINGBALANCE>
          <OPENINGVALUE>0.00</OPENINGVALUE>
          <CLOSINGVALUE>0.00</CLOSINGVALUE>
        </STOCKITEM>
      </COLLECTION>
    </DATA>
  </BODY>
</ENVELOPE>
`;

// --- Mocks ---
class MockTallyClient {
  constructor() {
    this.requests = [];
  }
  async sendRequest(xmlRequest) {
    this.requests.push(xmlRequest);
    if (xmlRequest.includes("Stock Groups")) {
      return MOCK_STOCK_GROUP_XML;
    } else if (xmlRequest.includes("Units")) {
      return MOCK_UNIT_XML;
    } else if (xmlRequest.includes("Stock Item Collection")) {
      return MOCK_STOCK_ITEM_XML;
    }
    throw new Error("Unknown Tally request: " + xmlRequest);
  }
}

class MockApiClient {
  constructor() {
    this.uploads = [];
  }
  async uploadEntities(entityType, entities) {
    this.uploads.push({ entityType, entities });
    return { success: true };
  }
}

async function runTests() {
  console.log("=== STARTING AUDIT & PIPELINE TESTS ===");

  // 1. Initialize DB
  database.initialize();
  console.log("✓ Database initialized in-memory");

  const hashEngine = new HashEngine(database);
  const mockTally = new MockTallyClient();
  const mockApi = new MockApiClient();

  const syncEngine = new SyncEngine({
    tallyClient: mockTally,
    parser,
    hashEngine,
    apiClient: mockApi,
    database
  });

  // ==========================================
  // Test Stage 1: XML Parser Audit
  // ==========================================
  console.log("\n--- Stage 1: Auditing XML Parser ---");

  // Stock Groups
  const parsedGroups = parser.parseStockGroups(MOCK_STOCK_GROUP_XML);
  assert.strictEqual(parsedGroups.length, 2);
  assert.strictEqual(parsedGroups[0].name, "Electronics");
  assert.strictEqual(parsedGroups[0].guid, "sg-guid-1111");
  assert.strictEqual(parsedGroups[0].alterId, "1001");
  assert.strictEqual(parsedGroups[0].id, "sg-guid-1111"); // id falls back to GUID if present
  assert.strictEqual(parsedGroups[1].name, "Mobile Phones");
  assert.strictEqual(parsedGroups[1].parent, "Electronics");
  console.log("✓ Stock Groups parsed correctly");

  // Units
  const parsedUnits = parser.parseUnits(MOCK_UNIT_XML);
  assert.strictEqual(parsedUnits.length, 2);
  assert.strictEqual(parsedUnits[0].name, "Pieces");
  assert.strictEqual(parsedUnits[0].guid, "unit-guid-1111");
  assert.strictEqual(parsedUnits[0].alterId, "2001");
  console.log("✓ Units parsed correctly");

  // Stock Items (Products)
  const parsedItems = parser.parseStockItems(MOCK_STOCK_ITEM_XML);
  assert.strictEqual(parsedItems.length, 2);
  
  // Verify that GUID, ALTERID, and BASEUNITS are correctly parsed
  assert.strictEqual(parsedItems[0].name, "iPhone 15 Pro");
  assert.strictEqual(parsedItems[0].guid, "item-guid-1111");
  assert.strictEqual(parsedItems[0].alterId, "3001");
  assert.strictEqual(parsedItems[0].baseUnits, "Pieces");
  assert.strictEqual(parsedItems[0].parent, "Mobile Phones");
  assert.strictEqual(parsedItems[0].gstApplicable, "Applicable");
  assert.strictEqual(parsedItems[0].description, "Latest iPhone 15 Pro model");
  assert.strictEqual(parsedItems[0].isBatchWiseOn, "Yes");
  assert.strictEqual(parsedItems[0].openingBalance, "10.00 Pcs");
  assert.strictEqual(parsedItems[0].closingBalance, "8.00 Pcs");
  assert.strictEqual(parsedItems[0].openingValue, "100000.00");
  assert.strictEqual(parsedItems[0].closingValue, "80000.00");
  
  assert.strictEqual(parsedItems[1].name, "USB-C Cable");
  assert.strictEqual(parsedItems[1].guid, "item-guid-2222");
  assert.strictEqual(parsedItems[1].alterId, "3002");
  assert.strictEqual(parsedItems[1].baseUnits, "Box");
  assert.strictEqual(parsedItems[1].gstApplicable, null);
  assert.strictEqual(parsedItems[1].description, null);
  assert.strictEqual(parsedItems[1].isBatchWiseOn, "No");
  assert.strictEqual(parsedItems[1].openingBalance, null);
  assert.strictEqual(parsedItems[1].closingBalance, null);
  assert.strictEqual(parsedItems[1].openingValue, "0.00");
  assert.strictEqual(parsedItems[1].closingValue, "0.00");
  console.log("✓ Stock Items parsed correctly (including GUID, ALTERID, baseUnits, and NativeMethod fields)");

  // ==========================================
  // Test Stage 2: E2E Sync & Payload Verification
  // ==========================================
  console.log("\n--- Stage 2: Performing E2E Sync (First Run - All New) ---");
  const result1 = await syncEngine.run();
  
  assert.strictEqual(result1.success, true);
  assert.strictEqual(result1.groups, 2);
  assert.strictEqual(result1.units, 2);
  assert.strictEqual(result1.products, 2);
  assert.strictEqual(result1.uploaded, 6);
  assert.strictEqual(result1.changed, 0); // initial is evaluated as "new"
  console.log("✓ Sync run 1 completed. Sync Engine reports all 6 records uploaded.");

  // Inspect the exact payloads sent to API Client
  assert.strictEqual(mockApi.uploads.length, 3);
  
  // 1. Stock Groups payload
  const groupUpload = mockApi.uploads.find(u => u.entityType === "STOCK_GROUP");
  assert.ok(groupUpload);
  assert.strictEqual(groupUpload.entities.length, 2);
  assert.deepStrictEqual(groupUpload.entities[0], {
    tallyMasterId: "sg-guid-1111",
    tallyGuid: "sg-guid-1111",
    tallyAlterId: 1001,
    name: "Electronics",
    parentName: null,
    isActive: true
  });
  console.log("✓ Stock Groups API payload matches contract exactly");

  // 2. Units payload
  const unitUpload = mockApi.uploads.find(u => u.entityType === "UNIT");
  assert.ok(unitUpload);
  assert.strictEqual(unitUpload.entities.length, 2);
  assert.deepStrictEqual(unitUpload.entities[0], {
    tallyMasterId: "unit-guid-1111",
    tallyGuid: "unit-guid-1111",
    tallyAlterId: 2001,
    name: "Pieces",
    symbol: "Pieces",
    isActive: true
  });
  console.log("✓ Units API payload matches contract exactly");

  // 3. Products payload (STOCK_ITEM)
  const productUpload = mockApi.uploads.find(u => u.entityType === "STOCK_ITEM");
  assert.ok(productUpload);
  assert.strictEqual(productUpload.entities.length, 2);
  
  // Verify product fields: tallyGuid, tallyAlterId, unitId (from baseUnits)
  assert.deepStrictEqual(productUpload.entities[0], {
    tallyMasterId: "item-guid-1111",
    tallyGuid: "item-guid-1111",
    tallyAlterId: 3001,
    sku: "item-guid-1111",
    name: "iPhone 15 Pro",
    brand: null,
    category: "Mobile Phones",
    costPrice: 0,
    stockQty: 0,
    tallyStockQty: 8,
    stockGroupId: "Mobile Phones",
    unitId: "Pieces",
    isActive: true
  });
  console.log("✓ Products API payload matches contract exactly (including tallyGuid, tallyAlterId, unitId)");

  // ==========================================
  // Test Stage 3: Hash Engine & SQLite Verification
  // ==========================================
  console.log("\n--- Stage 3: Verifying SQLite State ---");
  const storedGroupHash = database.getHash("STOCK_GROUP", "sg-guid-1111");
  assert.ok(storedGroupHash);
  assert.strictEqual(storedGroupHash.alter_id, "1001");

  const storedProductHash = database.getHash("STOCK_ITEM", "item-guid-1111");
  assert.ok(storedProductHash);
  assert.strictEqual(storedProductHash.alter_id, "3001");
  console.log("✓ DB states verified. alter_id and hash recorded for all types.");

  // ==========================================
  // Test Stage 4: Sync Engine - Unchanged Skip
  // ==========================================
  console.log("\n--- Stage 4: Sync Run 2 (Unchanged data) ---");
  mockApi.uploads = []; // clear uploads
  const result2 = await syncEngine.run();
  assert.strictEqual(result2.success, true);
  assert.strictEqual(result2.uploaded, 0);
  assert.strictEqual(result2.unchanged, 6);
  assert.strictEqual(mockApi.uploads.length, 0);
  console.log("✓ Correctly skipped all 6 unchanged records. No API uploads triggered.");

  // ==========================================
  // Test Stage 5: Sync Engine - Changed Upload
  // ==========================================
  console.log("\n--- Stage 5: Sync Run 3 (Changed item alterId) ---");
  
  // Simulate a change in Tally for iPhone 15 Pro by updating its ALTERID in XML
  const alteredStockItemXml = MOCK_STOCK_ITEM_XML.replace("<ALTERID>3001</ALTERID>", "<ALTERID>3005</ALTERID>");
  
  // Custom tally client to return the changed stock items
  const mockTallyAltered = {
    async sendRequest(xmlRequest) {
      if (xmlRequest.includes("Stock Groups")) return MOCK_STOCK_GROUP_XML;
      if (xmlRequest.includes("Units")) return MOCK_UNIT_XML;
      if (xmlRequest.includes("Stock Item Collection")) return alteredStockItemXml;
      throw new Error("Unknown");
    }
  };

  const syncEngineAltered = new SyncEngine({
    tallyClient: mockTallyAltered,
    parser,
    hashEngine,
    apiClient: mockApi,
    database
  });

  const result3 = await syncEngineAltered.run();
  assert.strictEqual(result3.success, true);
  assert.strictEqual(result3.uploaded, 1); // Only the changed product gets uploaded
  assert.strictEqual(result3.unchanged, 5); // 2 groups, 2 units, 1 product remain unchanged
  
  assert.strictEqual(mockApi.uploads.length, 1);
  assert.strictEqual(mockApi.uploads[0].entityType, "STOCK_ITEM");
  assert.strictEqual(mockApi.uploads[0].entities[0].tallyAlterId, 3005);
  console.log("✓ Correctly identified changed record and synced only the change.");

  // Clean up database
  database.close();
  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
}

runTests().catch(err => {
  console.error("\n❌ TEST FAILED:");
  console.error(err);
  process.exit(1);
});
