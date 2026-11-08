/**
 * Arcbuildr lead tracker: a web app that appends one row per lead.
 * The site's Worker posts JSON { token, lead }. The token must equal the TOKEN script property.
 * Setup steps: apps-script/README.md.
 */

const SHEET_NAME = "Leads";
const HEADERS = [
  "timestamp",
  "name",
  "email",
  "phone",
  "Instagram",
  "language",
  "channel",
  "budget",
  "decision maker",
  "need",
  "timing",
  "heard about us",
  "referred by",
  "time zone",
  "source page",
  "UTM",
  "status",
  "next call date",
  "notes",
];
// Keys sent by src/lib/sheets.ts, in column order (status, next call date and notes follow).
const KEYS = [
  "timestamp",
  "name",
  "email",
  "phone",
  "instagram",
  "language",
  "channel",
  "budget",
  "decisionMaker",
  "need",
  "timing",
  "heardAbout",
  "referredBy",
  "timeZone",
  "sourcePage",
  "utm",
];
const STATUSES = ["new", "booked", "showed", "closed", "no-show", "follow-up"];
const STATUS_COLUMN = HEADERS.indexOf("status") + 1;

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: "bad_json" });
  }
  const token = PropertiesService.getScriptProperties().getProperty("TOKEN");
  if (!token || !body || body.token !== token) return reply({ ok: false, error: "unauthorized" });

  const lead = body.lead || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = leadsSheet();
    sheet.appendRow(KEYS.map((key) => cell(lead[key])).concat(["new", "", ""]));
    sheet.getRange(sheet.getLastRow(), STATUS_COLUMN).setDataValidation(statusRule());
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

/** Run once from the editor: creates the Leads tab, headers and the status dropdown. */
function setup() {
  const sheet = leadsSheet();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  // Keeps phone numbers like +212... as text.
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, HEADERS.length).setNumberFormat("@");
  sheet.getRange(2, STATUS_COLUMN, sheet.getMaxRows() - 1, 1).setDataValidation(statusRule());
}

function leadsSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  return book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
}

function statusRule() {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUSES, true)
    .setAllowInvalid(false)
    .build();
}

/** Text only: a value starting with = + - @ would otherwise run as a formula. */
function cell(value) {
  const text = value == null ? "" : String(value).slice(0, 1000);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
