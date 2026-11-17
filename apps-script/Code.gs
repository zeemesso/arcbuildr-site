/**
 * Arcbuildr lead tracker: a web app that appends one row per lead.
 * The site's Worker posts JSON { token, lead }. The token must equal the TOKEN script property.
 * Setup steps: apps-script/README.md.
 */

const SHEET_NAME = "Leads";
const HEADERS = ["received_at", "name", "email", "src", "tz", "page", "utm", "status"];
const KEYS = HEADERS;
const STATUSES = ["opened", "applied", "booked", "held", "won", "lost"];
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

  const lead = body.lead;
  if (
    Object.keys(body).some((key) => key !== "token" && key !== "lead") ||
    !lead ||
    typeof lead !== "object" ||
    Array.isArray(lead) ||
    Object.keys(lead).some((key) => !KEYS.includes(key)) ||
    KEYS.some((key) => typeof lead[key] !== "string" || lead[key].length > 600) ||
    lead.status !== "opened"
  )
    return reply({ ok: false, error: "bad_lead" });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = leadsSheet();
    sheet.appendRow(KEYS.map((key) => cell(lead[key])));
    sheet.getRange(sheet.getLastRow(), STATUS_COLUMN).setDataValidation(statusRule());
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

/**
 * Run once from the editor: creates the Leads tab, headers, the status dropdown,
 * and the TOKEN script property if it is missing. Copy TOKEN from Project Settings,
 * Script Properties, into the Cloudflare secret SHEETS_TOKEN.
 */
function setup() {
  const sheet = leadsSheet();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  // Keep every inserted value as text.
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, HEADERS.length).setNumberFormat("@");
  sheet.getRange(2, STATUS_COLUMN, sheet.getMaxRows() - 1, 1).setDataValidation(statusRule());
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("TOKEN")) {
    props.setProperty(
      "TOKEN",
      Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, ""),
    );
  }
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
  const text = value == null ? "" : String(value);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
