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

router.get('/stats', (req, res) => {
  const visitsTotal = countVisits();
  res.json({ ok: true, visitsTotal });
});

router.get('/prize-stats', (req, res) => {
  const rows = prizeStats();
  res.json({ ok: true, rows });
});

router.get('/submissions', (req, res) => {
  const prize = req.query?.prize;
  const sort = req.query?.sort;
  const order = req.query?.order;

  const rows = listSubmissions({ prize, sort, order });
  res.json({ ok: true, rows });
});

router.delete('/submissions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: 'Некорректный id' });

  const changes = deleteSubmission(id);
  if (!changes) return res.status(404).json({ ok: false, error: 'Запись не найдена' });

  res.json({ ok: true });
});

// --- RESET ---
// Сброс переходов по QR
router.post('/reset-visits', (req, res) => {
  resetVisits();
  res.json({ ok: true });
});

// Сброс заявок + сброс авто-ID (программирование по id начнётся заново)
router.post('/reset-submissions', (req, res) => {
  resetSubmissions();
  res.json({ ok: true });
});

module.exports = router;
