// public/landing.js

function normalizeBYPhone(input) {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('375')) {
    return { ok: true, phoneNorm: `+${digits}` };
  }

  if (digits.length === 11 && digits.startsWith('80')) {
    const tail = digits.slice(2);
    return { ok: true, phoneNorm: `+375${tail}` };
  }

  return {
    ok: false,
    error: 'Введите номер BY: +375XXXXXXXXX, 375XXXXXXXXX или 80XXXXXXXXX'
  };
}

// Формат: +375 XX XXX-XX-XX
function formatBYPhoneForInput(value) {
  const raw = String(value || '');
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 0) return '';
  if (!(digits.startsWith('3') || digits.startsWith('8'))) return value;

  let core = '';

  if (digits.startsWith('375')) core = digits.slice(3);
  else if (digits.startsWith('80')) core = digits.slice(2);
  else if (digits.startsWith('3')) core = digits.slice(1);
  else if (digits.startsWith('8')) core = digits.slice(1);

  core = core.slice(0, 9);

  let out = '+375';
  if (core.length > 0) out += ' ' + core.slice(0, 2);
  if (core.length > 2) out += ' ' + core.slice(2, 5);
  if (core.length > 5) out += '-' + core.slice(5, 7);
  if (core.length > 7) out += '-' + core.slice(7, 9);

  return out;
}

async function postJson(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || 'Ошибка запроса');
  return data;
}

document.addEventListener('DOMContentLoaded', async () => {
  const nameEl = document.getElementById('name');
  const phoneEl = document.getElementById('phone');
  const btn = document.getElementById('submitBtn');
  const msgEl = document.getElementById('msg');
  const errEl = document.getElementById('err');

  function setError(text) { errEl.textContent = text || ''; }
  function setMsg(text) { msgEl.textContent = text || ''; }

  try { await postJson('/api/visit', {}); } catch {}

  phoneEl.addEventListener('input', () => {
    setError('');
    setMsg('');
    const formatted = formatBYPhoneForInput(phoneEl.value);
    if (formatted !== phoneEl.value) phoneEl.value = formatted;
  });

  btn.addEventListener('click', async () => {
    setError('');
    setMsg('');

    const name = String(nameEl.value || '').trim();
    if (name.length < 2) {
      setError('Введите имя (минимум 2 символа)');
      return;
    }

    const norm = normalizeBYPhone(phoneEl.value);
    if (!norm.ok) {
      setError(norm.error);
      return;
    }

    btn.disabled = true;
    try {
      const data = await postJson('/api/submit-phone', {
        name,
        phone: phoneEl.value
      });

      sessionStorage.setItem('submissionId', String(data.submissionId));
      sessionStorage.setItem('phoneNorm', String(data.phoneNorm));
      sessionStorage.setItem('name', String(data.name || name));

      // если уже крутили — сразу на рулетку с флагом already=1
      if (data.already && data.prize) {
        setMsg('Вы уже участвовали — показываем ваш приз.');
        setTimeout(() => {
          window.location.href = '/roulette.html?already=1';
        }, 350);
        return;
      }

      setMsg('Успешно');
      setTimeout(() => {
        window.location.href = '/roulette.html';
      }, 350);
    } catch (e) {
      setError(e.message || 'Ошибка');
    } finally {
      btn.disabled = false;
    }
  });
});
