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
  return buildGenericExportRequest('Stock Items');
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
