// server/db.js
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'qr_stats.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_norm TEXT NOT NULL,
    prize TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    prized_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_submissions_phone ON submissions(phone_norm);
  CREATE INDEX IF NOT EXISTS idx_submissions_prize ON submissions(prize);
`);

function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name);
  if (!cols.includes(column)) db.exec(ddl);
}

// миграция: name
ensureColumn('submissions', 'name', `ALTER TABLE submissions ADD COLUMN name TEXT;`);

const stmtAddVisit = db.prepare(`INSERT INTO visits DEFAULT VALUES`);
const stmtCountVisits = db.prepare(`SELECT COUNT(*) AS c FROM visits`);

const stmtCreateSubmission = db.prepare(`
  INSERT INTO submissions (phone_norm, name) VALUES (?, ?)
`);

const stmtGetSubmissionById = db.prepare(`
  SELECT id, phone_norm, name, prize, created_at, prized_at
  FROM submissions
  WHERE id = ?
`);

const stmtGetLatestByPhone = db.prepare(`
  SELECT id, phone_norm, name, prize, created_at, prized_at
  FROM submissions
  WHERE phone_norm = ?
  ORDER BY id DESC
  LIMIT 1
`);

const stmtGetLatestByPhoneWithPrize = db.prepare(`
  SELECT id, phone_norm, name, prize, created_at, prized_at
  FROM submissions
  WHERE phone_norm = ? AND prize IS NOT NULL AND prize <> ''
  ORDER BY id DESC
  LIMIT 1
`);

const stmtSetPrize = db.prepare(`
  UPDATE submissions
  SET prize = ?, prized_at = datetime('now')
  WHERE id = ?
`);

const stmtSetName = db.prepare(`
  UPDATE submissions
  SET name = ?
  WHERE id = ?
`);

const stmtDeleteSubmission = db.prepare(`
  DELETE FROM submissions WHERE id = ?
`);

const stmtPrizeStats = db.prepare(`
  SELECT prize, COUNT(*) AS c
  FROM submissions
  WHERE prize IS NOT NULL AND prize <> ''
  GROUP BY prize
  ORDER BY c DESC, prize ASC
`);

function addVisit() {
  stmtAddVisit.run();
}

function countVisits() {
  return stmtCountVisits.get().c;
}

function createSubmission(phoneNorm, name) {
  const info = stmtCreateSubmission.run(phoneNorm, name || null);
  return info.lastInsertRowid;
}

function getSubmissionById(id) {
  return stmtGetSubmissionById.get(id);
}

function getLatestByPhone(phoneNorm) {
  return stmtGetLatestByPhone.get(phoneNorm);
}

function getLatestByPhoneWithPrize(phoneNorm) {
  return stmtGetLatestByPhoneWithPrize.get(phoneNorm);
}

function setPrize(submissionId, prize) {
  return stmtSetPrize.run(prize, submissionId).changes;
}

function setName(submissionId, name) {
  return stmtSetName.run(name || null, submissionId).changes;
}

function deleteSubmission(id) {
  return stmtDeleteSubmission.run(id).changes;
}

function prizeStats() {
  return stmtPrizeStats.all();
}

/**
 * prize:
 *  - '' => все
 *  - '__NO_PRIZE__' => только без приза
 *  - иначе конкретный приз
 *
 * sort:
 *  - id | created_at | prized_at | phone_norm | name | prize
 * order:
 *  - asc | desc
 */
function listSubmissions({ prize, sort, order } = {}) {
  const sortWhitelist = new Set(['id', 'created_at', 'prized_at', 'phone_norm', 'name', 'prize']);
  const orderWhitelist = new Set(['asc', 'desc']);

  const sortCol = sortWhitelist.has(String(sort)) ? String(sort) : 'id';
  const sortOrder = orderWhitelist.has(String(order).toLowerCase()) ? String(order).toLowerCase() : 'desc';

  let sql = `
    SELECT id, phone_norm, name, prize, created_at, prized_at
    FROM submissions
  `;

  const params = [];

  if (prize === '__NO_PRIZE__') {
    sql += ` WHERE (prize IS NULL OR prize = '') `;
  } else if (typeof prize === 'string' && prize.trim() !== '') {
    sql += ` WHERE prize = ? `;
    params.push(prize.trim());
  }

  sql += ` ORDER BY ${sortCol} ${sortOrder} `;

  return db.prepare(sql).all(...params);
}

// --- reset функции ---
// Сброс переходов (очистка + сброс авто-ID)
function resetVisits() {
  db.exec(`
    DELETE FROM visits;
    DELETE FROM sqlite_sequence WHERE name='visits';
  `);
}

// Сброс заявок/призов (очистка + сброс авто-ID)
function resetSubmissions() {
  db.exec(`
    DELETE FROM submissions;
    DELETE FROM sqlite_sequence WHERE name='submissions';
  `);
}

module.exports = {
  db,
  addVisit,
  countVisits,
  createSubmission,
  getSubmissionById,
  getLatestByPhone,
  getLatestByPhoneWithPrize,
  listSubmissions,
  setPrize,
  setName,
  deleteSubmission,
  prizeStats,
  resetVisits,
  resetSubmissions
};
