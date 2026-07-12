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
                        <NATIVEMETHOD>NAME</NATIVEMETHOD>
                        <NATIVEMETHOD>GUID</NATIVEMETHOD>
                        <NATIVEMETHOD>ALTERID</NATIVEMETHOD>
                        <NATIVEMETHOD>PARENT</NATIVEMETHOD>
                        <NATIVEMETHOD>BASEUNITS</NATIVEMETHOD>
                        <NATIVEMETHOD>GSTAPPLICABLE</NATIVEMETHOD>
                        <NATIVEMETHOD>DESCRIPTION</NATIVEMETHOD>
                        <NATIVEMETHOD>ISBATCHWISEON</NATIVEMETHOD>
                        <NATIVEMETHOD>OPENINGBALANCE</NATIVEMETHOD>
                        <NATIVEMETHOD>CLOSINGBALANCE</NATIVEMETHOD>
                        <NATIVEMETHOD>OPENINGVALUE</NATIVEMETHOD>
                        <NATIVEMETHOD>CLOSINGVALUE</NATIVEMETHOD>
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
