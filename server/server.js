// server/server.js
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { PORT } = require('./config');
const { adminAuth, adminLoginHandler, adminLogoutHandler } = require('./auth');

// ВАЖНО: импортируем db, чтобы таблицы создались сразу при старте
require('./db');

const publicApi = require('./routes/public');
const adminApi = require('./routes/admin');

const app = express();

app.use(express.json());
app.use(cookieParser());

// Public static
app.use('/', express.static(path.join(__dirname, '..', 'public')));

// Логин/логаут API (НЕ защищаем, иначе не залогиниться)
app.post('/api/admin/login', adminLoginHandler);
app.post('/api/admin/logout', adminLogoutHandler);

// Admin static: разрешаем login.* без авторизации, остальное — через adminAuth
const adminDir = path.join(__dirname, '..', 'admin');
app.use('/admin', (req, res, next) => {
  const p = req.path.toLowerCase();
  if (p === '/login.html' || p === '/login.js' || p === '/login.css') return next();
  return adminAuth(req, res, next);
}, express.static(adminDir));

// Удобный редирект /admin -> /admin/
app.get('/admin', (req, res) => res.redirect('/admin/'));

// Admin API (защищаем)
app.use('/api/admin', adminAuth, adminApi);

// Public API
app.use('/api', publicApi);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`qr_stats server running on http://localhost:${PORT}`);
  console.log(`Landing: http://localhost:${PORT}/`);
  console.log(`Admin:   http://localhost:${PORT}/admin  (login page)`);
});
