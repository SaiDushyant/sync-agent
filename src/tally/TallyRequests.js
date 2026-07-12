function buildGenericExportRequest(accountType) {
  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <ACCOUNTTYPE>${accountType}</ACCOUNTTYPE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function buildLedgerRequest() {
  return buildGenericExportRequest('Ledgers');
}

function buildStockItemRequest() {
    return `
<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Stock Item Collection</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="Stock Item Collection">
                        <TYPE>Stock Item</TYPE>
                        <FETCH>
                            NAME
                            PARENT
                            BASEUNITS
                        </FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>`;
}

function buildStockGroupRequest() {
  return buildGenericExportRequest('Stock Groups');
}

function buildUnitRequest() {
  return buildGenericExportRequest('Units');
}

module.exports = {
  buildLedgerRequest,
  buildStockItemRequest,
  buildStockGroupRequest,
  buildUnitRequest
};
