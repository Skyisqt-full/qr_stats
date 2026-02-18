// server/auth.js
const crypto = require('crypto');
const { ADMIN_USER, ADMIN_PASS, ADMIN_SESSION_SECRET } = require('./config');

const COOKIE_NAME = 'qr_admin';
const SESSION_DAYS = 7;

function hmacHex(data) {
  return crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(data).digest('hex');
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function makeToken(user, expMs) {
  const payload = `${user}:${expMs}`;
  const sig = hmacHex(payload);
  return `${payload}:${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return { ok: false };

  const parts = token.split(':');
  if (parts.length !== 3) return { ok: false };

  const user = parts[0];
  const expMs = Number(parts[1]);
  const sig = parts[2];

  if (!Number.isFinite(expMs)) return { ok: false };
  if (Date.now() > expMs) return { ok: false };

  const expected = hmacHex(`${user}:${expMs}`);
  if (!timingSafeEqual(sig, expected)) return { ok: false };

  return { ok: true, user };
}

function setAdminCookie(res) {
  const expMs = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = makeToken(ADMIN_USER, expMs);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // на https можно поставить true
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
  });
}

function clearAdminCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function adminAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  const v = verifyToken(token);

  if (v.ok) return next();

  // если это HTML-страница — отправляем на логин
  const wantsHtml = req.accepts('html');
  if (wantsHtml) return res.redirect('/admin/login.html');

  // если это API — 401 json
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

function adminLoginHandler(req, res) {
  const user = String(req.body?.user || '');
  const pass = String(req.body?.pass || '');

  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
    return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' });
  }

  setAdminCookie(res);
  return res.json({ ok: true });
}

function adminLogoutHandler(req, res) {
  clearAdminCookie(res);
  return res.json({ ok: true });
}

module.exports = {
  adminAuth,
  adminLoginHandler,
  adminLogoutHandler
};
