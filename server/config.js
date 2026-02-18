// server/config.js
require('dotenv').config();

const PORT = Number.parseInt(process.env.PORT || '3000', 10);

// Простой логин/пароль для админки
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// Секрет для подписи cookie (в проде вынести в .env)
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'dev_secret_change_me';

// --- Призы ---
// Визуальные сегменты рулетки (показываются ВСЕ)
const ALL_PRIZES = [
  // МОЖЕТ ВЫПАСТЬ (твои)
  'СКИДКА 15 % НА СТРИЖКУ',
  'СКИДКА 20 % НА СТРИЖКУ',
  'СКИДКА 15% НА ВЕСЬ АССОРТИМЕНТ КОСМЕТИКИ',
  'БЕСПЛАТНАЯ ДОПОЛНИТЕЛЬНАЯ УСЛУГА',
  'СКИДКА 10 РУБЛЕЙ',

  // НЕ ВЫПАДАЕТ 
  'СКИДКА 15 РУБЛЕЙ НА УСЛУГИ',
  'БЕСПЛАТНАЯ СТРИЖКА',

  // ОТ СЕБЯ ДОБАВИЛ
  'ПОДАРОК: ПРОБНИК КОСМЕТИКИ'
];

// Выпадать могут ТОЛЬКО эти (подмножество ALL_PRIZES)
const ALLOWED_PRIZES = [
  'СКИДКА 15 % НА СТРИЖКУ',
  'СКИДКА 20 % НА СТРИЖКУ',
  'СКИДКА 15% НА ВЕСЬ АССОРТИМЕНТ КОСМЕТИКИ',
  'БЕСПЛАТНАЯ ДОПОЛНИТЕЛЬНАЯ УСЛУГА',
  'СКИДКА 10 РУБЛЕЙ'
];

module.exports = {
  PORT,
  ADMIN_USER,
  ADMIN_PASS,
  ADMIN_SESSION_SECRET,
  ALL_PRIZES,
  ALLOWED_PRIZES
};
