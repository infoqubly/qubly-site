const SYNC_TOKEN = "56856c2360a0bf397005ddd3413873ca";

// Se questo script e' collegato direttamente al Google Sheet puoi lasciarlo vuoto.
// Se invece crei uno script separato, incolla qui l'ID del Google Sheet.
const SPREADSHEET_ID = "";

const SHEETS = {
  votes: "votes",
  rankings: "rankings",
  voterNames: "voter_names",
};

const HEADERS = {
  votes: ["manifestId", "itemId", "voterId", "score", "note", "updatedAt", "deviceId"],
  rankings: ["manifestId", "subjectKey", "voterId", "orderJson", "touched", "updatedAt", "deviceId"],
  voterNames: ["manifestId", "voterId", "name", "updatedAt", "deviceId"],
};

function doGet(event) {
  const params = event.parameter || {};
  const callback = safeCallback_(params.callback);

  try {
    if (params.token !== SYNC_TOKEN) {
      return output_(callback, { ok: false, error: "Token non valido" });
    }

    const action = params.action || "load";
    if (action === "load") return output_(callback, load_(params));
    if (action === "saveVote") return output_(callback, saveVote_(params));
    if (action === "saveRanking") return output_(callback, saveRanking_(params));
    if (action === "saveVoterName") return output_(callback, saveVoterName_(params));

    return output_(callback, { ok: false, error: "Azione non riconosciuta" });
  } catch (error) {
    return output_(callback, { ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function load_(params) {
  const manifestId = required_(params.manifestId, "manifestId");
  const ss = spreadsheet_();
  ensureSheets_(ss);

  return {
    ok: true,
    manifestId,
    votes: rows_(ss.getSheetByName(SHEETS.votes), HEADERS.votes)
      .filter((row) => row.manifestId === manifestId)
      .map((row) => ({
        itemId: row.itemId,
        voterId: row.voterId,
        score: row.score === "" ? null : Number(row.score),
        note: row.note || "",
        updatedAt: row.updatedAt || "",
        deviceId: row.deviceId || "",
      })),
    rankings: rows_(ss.getSheetByName(SHEETS.rankings), HEADERS.rankings)
      .filter((row) => row.manifestId === manifestId)
      .map((row) => ({
        subjectKey: row.subjectKey,
        voterId: row.voterId,
        order: parseOrder_(row.orderJson),
        touched: String(row.touched) === "true",
        updatedAt: row.updatedAt || "",
        deviceId: row.deviceId || "",
      })),
    voterNames: rows_(ss.getSheetByName(SHEETS.voterNames), HEADERS.voterNames)
      .filter((row) => row.manifestId === manifestId)
      .reduce((names, row) => {
        names[row.voterId] = row.name || "";
        return names;
      }, {}),
    loadedAt: new Date().toISOString(),
  };
}

function saveVote_(params) {
  const record = {
    manifestId: required_(params.manifestId, "manifestId"),
    itemId: required_(params.itemId, "itemId"),
    voterId: required_(params.voterId, "voterId"),
    score: params.score === "" || params.score == null ? "" : Number(params.score),
    note: params.note || "",
    updatedAt: params.updatedAt || new Date().toISOString(),
    deviceId: params.deviceId || "",
  };

  withLock_(() => {
    const sheet = sheet_(SHEETS.votes, HEADERS.votes);
    upsert_(sheet, HEADERS.votes, [record.manifestId, record.itemId, record.voterId], record);
  });

  return { ok: true, saved: "vote", updatedAt: record.updatedAt };
}

function saveRanking_(params) {
  const order = parseOrder_(params.orderJson || "[]");
  const record = {
    manifestId: required_(params.manifestId, "manifestId"),
    subjectKey: required_(params.subjectKey, "subjectKey"),
    voterId: required_(params.voterId, "voterId"),
    orderJson: JSON.stringify(order),
    touched: String(params.touched) === "true",
    updatedAt: params.updatedAt || new Date().toISOString(),
    deviceId: params.deviceId || "",
  };

  withLock_(() => {
    const sheet = sheet_(SHEETS.rankings, HEADERS.rankings);
    upsert_(sheet, HEADERS.rankings, [record.manifestId, record.subjectKey, record.voterId], record);
  });

  return { ok: true, saved: "ranking", updatedAt: record.updatedAt };
}

function saveVoterName_(params) {
  const record = {
    manifestId: required_(params.manifestId, "manifestId"),
    voterId: required_(params.voterId, "voterId"),
    name: required_(params.name, "name"),
    updatedAt: params.updatedAt || new Date().toISOString(),
    deviceId: params.deviceId || "",
  };

  withLock_(() => {
    const sheet = sheet_(SHEETS.voterNames, HEADERS.voterNames);
    upsert_(sheet, HEADERS.voterNames, [record.manifestId, record.voterId], record);
  });

  return { ok: true, saved: "voterName", updatedAt: record.updatedAt };
}

function spreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error("Nessun Google Sheet collegato. Imposta SPREADSHEET_ID.");
  return active;
}

function sheet_(name, headers) {
  const ss = spreadsheet_();
  ensureSheets_(ss);
  return ss.getSheetByName(name);
}

function ensureSheets_(ss) {
  Object.keys(SHEETS).forEach((key) => {
    const name = SHEETS[key];
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const headers = HEADERS[key];
    const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    if (current.join("|") !== headers.join("|")) {
      sheet.clear();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  });
}

function rows_(sheet, headers) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map((values) => {
    return headers.reduce((row, header, index) => {
      row[header] = values[index];
      return row;
    }, {});
  });
}

function upsert_(sheet, headers, keyValues, record) {
  const keyIndexes = keyValues.map((_, index) => index);
  const lastRow = sheet.getLastRow();
  let targetRow = lastRow + 1;

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
      const row = values[rowIndex];
      const matches = keyIndexes.every((keyIndex) => String(row[keyIndex]) === String(keyValues[keyIndex]));
      if (matches) {
        targetRow = rowIndex + 2;
        break;
      }
    }
  }

  const output = headers.map((header) => record[header] == null ? "" : record[header]);
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([output]);
}

function withLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function parseOrder_(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value || "[]") : value;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) {
    return [];
  }
}

function required_(value, name) {
  if (value == null || value === "") throw new Error("Parametro mancante: " + name);
  return String(value);
}

function safeCallback_(value) {
  const fallback = "renderReviewSyncCallback";
  const callback = value || fallback;
  return /^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback) ? callback : fallback;
}

function output_(callback, payload) {
  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(payload) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
