// server/server.js
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');

const { initDb } = require('./db');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();

app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production', // на Render ставь NODE_ENV=production
    },
  })
);

// API
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// static (public и admin лежат НА УРОВЕНЬ ВЫШЕ папки server/)
app.use('/', express.static(path.join(__dirname, '..', 'public')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// /admin -> если не залогинен, на логин
app.get('/admin', (req, res) => {
  if (req.session?.isAdmin) return res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
  return res.redirect('/admin/login.html');
});

// главная
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

const port = Number(process.env.PORT || 3000);

(async () => {
  await initDb();
  app.listen(port, () => console.log(`qr_stats listening on :${port}`));
})().catch((e) => {
  console.error('Startup failed:', e);
  process.exit(1);
});
