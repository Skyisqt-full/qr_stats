// server/db.js (Postgres)
const { Pool } = require('pg');

function makePool() {
  const cs = process.env.DATABASE_URL;
  if (!cs) {
    throw new Error('DATABASE_URL is not set. For local dev use .env or docker-compose.');
  }

  // На Render часто нужен SSL при внешних подключениях; внутри Render может быть и без,
  // но rejectUnauthorized:false безопаснее для managed PG.
  const isProd = process.env.NODE_ENV === 'production';

  return new Pool({
    connectionString: cs,
    ssl: isProd ? { rejectUnauthorized: false } : undefined
  });
}

const pool = makePool();

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visits (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id BIGSERIAL PRIMARY KEY,
      phone_norm TEXT NOT NULL,
      name TEXT,
      prize TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      prized_at TIMESTAMPTZ
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_submissions_phone ON submissions(phone_norm);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_submissions_prize ON submissions(prize);`);
}

async function addVisit() {
  await pool.query(`INSERT INTO visits DEFAULT VALUES;`);
}

async function countVisits() {
  const r = await pool.query(`SELECT COUNT(*)::int AS c FROM visits;`);
  return r.rows[0]?.c ?? 0;
}

async function createSubmission(phoneNorm, name) {
  const r = await pool.query(
    `INSERT INTO submissions (phone_norm, name) VALUES ($1, $2) RETURNING id;`,
    [phoneNorm, name || null]
  );
  return r.rows[0].id;
}

async function getSubmissionById(id) {
  const r = await pool.query(
    `SELECT id, phone_norm, name, prize, created_at, prized_at
     FROM submissions
     WHERE id = $1`,
    [id]
  );
  return r.rows[0] || null;
}

async function getLatestByPhone(phoneNorm) {
  const r = await pool.query(
    `SELECT id, phone_norm, name, prize, created_at, prized_at
     FROM submissions
     WHERE phone_norm = $1
     ORDER BY id DESC
     LIMIT 1`,
    [phoneNorm]
  );
  return r.rows[0] || null;
}

async function getLatestByPhoneWithPrize(phoneNorm) {
  const r = await pool.query(
    `SELECT id, phone_norm, name, prize, created_at, prized_at
     FROM submissions
     WHERE phone_norm = $1 AND prize IS NOT NULL AND prize <> ''
     ORDER BY id DESC
     LIMIT 1`,
    [phoneNorm]
  );
  return r.rows[0] || null;
}

async function setPrize(submissionId, prize) {
  const r = await pool.query(
    `UPDATE submissions
     SET prize = $1, prized_at = now()
     WHERE id = $2 AND (prize IS NULL OR prize = '')
     RETURNING id`,
    [prize, submissionId]
  );
  return r.rowCount;
}

async function setName(submissionId, name) {
  const r = await pool.query(
    `UPDATE submissions SET name = $1 WHERE id = $2`,
    [name || null, submissionId]
  );
  return r.rowCount;
}

async function deleteSubmission(id) {
  const r = await pool.query(`DELETE FROM submissions WHERE id = $1`, [id]);
  return r.rowCount;
}

async function prizeStats() {
  const r = await pool.query(
    `SELECT prize, COUNT(*)::int AS c
     FROM submissions
     WHERE prize IS NOT NULL AND prize <> ''
     GROUP BY prize
     ORDER BY c DESC, prize ASC`
  );
  return r.rows;
}

async function listSubmissions({ prize, sort, order } = {}) {
  const sortWhitelist = new Set(['id', 'created_at', 'prized_at', 'phone_norm', 'name', 'prize']);
  const orderWhitelist = new Set(['asc', 'desc']);

  const sortCol = sortWhitelist.has(String(sort)) ? String(sort) : 'id';
  const sortOrder = orderWhitelist.has(String(order).toLowerCase()) ? String(order).toLowerCase() : 'desc';

  const params = [];
  let where = '';

  if (prize === '__NO_PRIZE__') {
    where = `WHERE (prize IS NULL OR prize = '')`;
  } else if (typeof prize === 'string' && prize.trim() !== '') {
    params.push(prize.trim());
    where = `WHERE prize = $1`;
  }

  const q = `
    SELECT id, phone_norm, name, prize, created_at, prized_at
    FROM submissions
    ${where}
    ORDER BY ${sortCol} ${sortOrder};
  `;

  const r = await pool.query(q, params);
  return r.rows;
}

async function resetVisits() {
  await pool.query(`TRUNCATE visits RESTART IDENTITY;`);
}

async function resetSubmissions() {
  await pool.query(`TRUNCATE submissions RESTART IDENTITY;`);
}

module.exports = {
  pool,
  initDb,
  addVisit,
  countVisits,
  createSubmission,
  getSubmissionById,
  getLatestByPhone,
  getLatestByPhoneWithPrize,
  setPrize,
  setName,
  deleteSubmission,
  prizeStats,
  listSubmissions,
  resetVisits,
  resetSubmissions
};
