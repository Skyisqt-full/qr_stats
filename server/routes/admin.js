// server/routes/admin.js
const express = require('express');
const {
  countVisits,
  listSubmissions,
  deleteSubmission,
  prizeStats,
  resetVisits,
  resetSubmissions
} = require('../db');

const router = express.Router();

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

// Логин (поддержим оба формата body: username/password и user/pass)
router.post('/login', (req, res) => {
  const u = String(req.body?.username ?? req.body?.user ?? '');
  const p = String(req.body?.password ?? req.body?.pass ?? '');

  if (u === ADMIN_USER && p === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'Неверный логин/пароль' });
});

router.post('/logout', (req, res) => {
  if (req.session) req.session.destroy(() => {});
  res.json({ ok: true });
});

// ----- дальше всё защищено -----
router.use(requireAdmin);

// Счётчик посещений
router.get('/stats', async (req, res) => {
  const visitsTotal = await countVisits();
  res.json({ ok: true, visitsTotal });
});

// Статистика по призам (ТОГО НЕ ХВАТАЛО → 404)
router.get('/prize-stats', async (req, res) => {
  const rows = await prizeStats();
  res.json({ ok: true, rows });
});

// Таблица заявок
router.get('/submissions', async (req, res) => {
  const prize = req.query?.prize;
  const sort = req.query?.sort;
  const order = req.query?.order;

  const rows = await listSubmissions({ prize, sort, order });
  res.json({ ok: true, rows });
});

router.delete('/submissions/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: 'Некорректный id' });

  const changes = await deleteSubmission(id);
  if (!changes) return res.status(404).json({ ok: false, error: 'Запись не найдена' });

  res.json({ ok: true });
});

// Сбросы
router.post('/reset-visits', async (req, res) => {
  await resetVisits();
  res.json({ ok: true });
});

router.post('/reset-submissions', async (req, res) => {
  await resetSubmissions();
  res.json({ ok: true });
});

module.exports = router;
