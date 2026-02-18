// server/routes/public.js
const express = require('express');
const {
  addVisit,
  createSubmission,
  getSubmissionById,
  getLatestByPhone,
  getLatestByPhoneWithPrize,
  setPrize,
  setName
} = require('../db');

const { normalizeBYPhone } = require('../phone');
const { ALL_PRIZES, ALLOWED_PRIZES } = require('../config');
const { getProgrammedPrize } = require('../prizes');

const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({ ok: true, scope: 'public' });
});

router.get('/prizes', (req, res) => {
  res.json({ ok: true, allPrizes: ALL_PRIZES, allowedPrizes: ALLOWED_PRIZES });
});

router.post('/visit', (req, res) => {
  addVisit();
  res.json({ ok: true });
});

router.post('/submit-phone', (req, res) => {
  const phone = req.body?.phone;
  const name = String(req.body?.name || '').trim();

  if (name.length < 2) {
    return res.status(400).json({ ok: false, error: 'Введите имя (минимум 2 символа)' });
  }

  const norm = normalizeBYPhone(phone);
  if (!norm.ok) {
    return res.status(400).json({ ok: false, error: norm.error });
  }

  // если уже есть запись с призом — возвращаем её и обновим имя в записи
  const existingWithPrize = getLatestByPhoneWithPrize(norm.phoneNorm);
  if (existingWithPrize) {
    if (!existingWithPrize.name || existingWithPrize.name !== name) {
      setName(existingWithPrize.id, name);
    }

    return res.json({
      ok: true,
      already: true,
      submissionId: existingWithPrize.id,
      phoneNorm: existingWithPrize.phone_norm,
      name,
      prize: existingWithPrize.prize
    });
  }

  // если есть запись без приза — используем её и обновим имя
  const existing = getLatestByPhone(norm.phoneNorm);
  if (existing && !existing.prize) {
    if (!existing.name || existing.name !== name) {
      setName(existing.id, name);
    }

    return res.json({
      ok: true,
      already: false,
      submissionId: existing.id,
      phoneNorm: existing.phone_norm,
      name
    });
  }

  // иначе создаём новую
  const submissionId = createSubmission(norm.phoneNorm, name);
  return res.json({ ok: true, already: false, submissionId, phoneNorm: norm.phoneNorm, name });
});

router.post('/get-prize', (req, res) => {
  const submissionId = req.body?.submissionId;

  const row = getSubmissionById(submissionId);
  if (!row) return res.status(404).json({ ok: false, error: 'Заявка не найдена' });

  if (row.prize) return res.json({ ok: true, prize: row.prize, alreadySaved: true });

  let prize = '';
  try {
    prize = getProgrammedPrize(row.id);
  } catch {
    return res.status(500).json({ ok: false, error: 'Ошибка выдачи приза' });
  }

  return res.json({ ok: true, prize, alreadySaved: false });
});

router.post('/save-result', (req, res) => {
  const submissionId = req.body?.submissionId;
  const prize = String(req.body?.prize || '');

  const row = getSubmissionById(submissionId);
  if (!row) return res.status(404).json({ ok: false, error: 'Заявка не найдена' });

  if (row.prize) {
    return res.json({ ok: true, alreadySaved: true, prize: row.prize });
  }

  const expected = getProgrammedPrize(row.id);
  if (prize !== expected) {
    return res.status(400).json({ ok: false, error: 'Подмена приза запрещена' });
  }

  const changes = setPrize(row.id, expected);
  if (!changes) return res.status(500).json({ ok: false, error: 'Не удалось сохранить приз' });

  return res.json({ ok: true, alreadySaved: false, prize: expected });
});

module.exports = router;
