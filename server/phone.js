// server/phone.js

/**
 * Беларусь. Допускаем:
 * 1) +375XXXXXXXXX
 * 2) 375XXXXXXXXX
 * 3) 80XXXXXXXXX
 *
 * Храним в нормализованном виде: +375#########
 */
function normalizeBYPhone(input) {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, ''); // только цифры

  // 375 + 9 цифр = 12 цифр
  if (digits.length === 12 && digits.startsWith('375')) {
    return { ok: true, phoneNorm: `+${digits}` };
  }

  // 80 + 9 цифр = 11 цифр -> +375 + 9 цифр
  if (digits.length === 11 && digits.startsWith('80')) {
    const tail = digits.slice(2); // 9 цифр
    return { ok: true, phoneNorm: `+375${tail}` };
  }

  return {
    ok: false,
    error: 'Введите корректный номер BY'
  };
}

module.exports = { normalizeBYPhone };
