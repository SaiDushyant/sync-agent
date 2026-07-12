const { XMLParser } = require("fast-xml-parser");
const ParserError = require("../errors/ParserError");

class XmlParser {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: false, // Keep values as strings to avoid data loss
      trimValues: true,
      textNodeName: "#text",
    });
  }

  /**
   * Parses raw XML and validates the basic Tally ENVELOPE structure.
   * @param {string} xml - Raw XML string from Tally
   * @returns {Array} Array of TALLYMESSAGE objects
   */
  _parseXml(xml) {
    if (typeof xml !== "string") {
      throw new ParserError("Invalid XML: input must be a string");
    }

    if (xml.trim() === "") {
      throw new ParserError("Invalid XML: input is empty");
    }

    try {
      return this.parser.parse(xml);
    } catch (e) {
      throw new ParserError(`Invalid XML: ${e.message}`, { cause: e });
    }
  }

  /**
   * Extracts specific entities (like LEDGER, STOCKITEM) from TALLYMESSAGE array.
   */
  _extractEntities(messages, entityName) {
    const entities = [];
    for (const msg of messages) {
      let entityData = msg[entityName];
      if (!entityData) continue;

      if (!Array.isArray(entityData)) {
        entityData = [entityData];
      }

      for (const item of entityData) {
        entities.push(item);
      }
    }
    return entities;
  }

  /**
   * Maps parsed Tally XML object to normalized domain object fields.
   */
  _mapEntity(item, fields, entityTag) {
    const result = {};
    for (const field of fields) {
      let val = null;

      if (field === "id") {
        val =
          item.MASTERID ||
          item.ID ||
          item["@_ID"] ||
          item.GUID ||
          item["@_NAME"] ||
          item.NAME ||
          null;
      } else if (field === "name") {
        // Tally often stores name in attribute, direct child, or inside NAME.LIST
        val =
          item.NAME ||
          item["@_NAME"] ||
          (item["NAME.LIST"] && item["NAME.LIST"].NAME) ||
          null;
      } else if (field === "parent") {
        val = item.PARENT || null;
      } else if (field === "guid") {
        val = item.GUID || null;
      } else if (field === "alterId") {
        val = item.ALTERID || null;
      }

      // Handle cases where empty tags are parsed as empty objects or objects with attributes
      if (val !== null && typeof val === "object") {
        if (val["#text"]) {
          val = val["#text"];
        } else if (Array.isArray(val)) {
          val =
            val.length > 0
              ? typeof val[0] === "object"
                ? val[0]["#text"] || null
                : val[0]
              : null;
        } else {
          val = null;
        }
      }

      // Empty strings should become null if we consider them optional/missing
      if (val === "") {
        val = null;
      }

      result[field] = val;
    }

    const missing = [];
    if (!result.id) missing.push("id");
    if (!result.name) missing.push("name");

    if (missing.length > 0) {
      throw new ParserError(
        `Invalid XML: ${entityTag} missing mandatory field(s): ${missing.join(", ")}`,
      );
    }

    return result;
  }

  /**
   * Internal reusable helper to parse a collection of entities.
   */
  _parseEntityCollection(xml, entityTag, fields) {
    const messages = this._parseAndValidate(xml);
    const entities = this._extractEntities(messages, entityTag);
    return entities.map((entity) => this._mapEntity(entity, fields, entityTag));
  }

  /**
   * Parse and map Ledgers from XML.
   * @param {string} xml
   * @returns {Array<Object>}
   */
  parseLedgers(xml) {
    return this._parseEntityCollection(xml, "LEDGER", [
      "id",
      "name",
      "parent",
      "guid",
      "alterId",
    ]);
  }

  /**
   * Parse and map Stock Items from XML.
   * @param {string} xml
   * @returns {Array<Object>}
   */
  parseStockItems(xml) {
    const parsed = this._parseXml(xml);

    let items = parsed?.ENVELOPE?.BODY?.DATA?.COLLECTION?.STOCKITEM;

    if (!items) {
      return [];
    }

    if (!Array.isArray(items)) {
      items = [items];
    }

    return items.map((item) =>
      this._mapEntity(item, ["id", "name", "parent"], "STOCKITEM"),
    );
  }

  /**
   * Parse and map Stock Groups from XML.
   * @param {string} xml
   * @returns {Array<Object>}
   */
  parseStockGroups(xml) {
    const parsed = this._parseXml(xml);

    let messages =
      parsed?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE;

    if (!messages) {
      return [];
    }

    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    const groups = [];

    for (const msg of messages) {
      let items = msg.STOCKGROUP;

      if (!items) continue;

      if (!Array.isArray(items)) {
        items = [items];
      }

      for (const item of items) {
        groups.push(
          this._mapEntity(
            item,
            ["id", "name", "parent", "guid", "alterId"],
            "STOCKGROUP",
          ),
        );
      }
    }

    return groups;
  }

  /**
   * Parse and map Units from XML.
   * @param {string} xml
   * @returns {Array<Object>}
   */
  parseUnits(xml) {
    const parsed = this._parseXml(xml);

    let messages =
      parsed?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE;

    if (!messages) {
      return [];
    }

    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    const units = [];

    for (const msg of messages) {
      let items = msg.UNIT;

      if (!items) continue;

      if (!Array.isArray(items)) {
        items = [items];
      }

      for (const item of items) {
        units.push(
          this._mapEntity(item, ["id", "name", "guid", "alterId"], "UNIT"),
        );
      }
    }

    return units;
  }
}

module.exports = new XmlParser();
