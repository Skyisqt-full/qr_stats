// admin/login.js
async function postJson(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) {
    throw new Error(data?.error || 'Ошибка');
  }
  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  const userEl = document.getElementById('user');
  const passEl = document.getElementById('pass');
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('err');

  function setErr(t) { errEl.textContent = t || ''; }

  async function doLogin() {
    setErr('');
    btn.disabled = true;
    try {
      await postJson('/api/admin/login', {
        user: userEl.value,
        pass: passEl.value
      });
      // Помечаем, что переход в админку произошёл сразу после успешного логина.
      sessionStorage.setItem('admin_show_design_msg_once', '1');
      window.location.href = '/admin/';
    } catch (e) {
      setErr(e.message || 'Ошибка');
    } finally {
      btn.disabled = false;
    }
  }

  btn.addEventListener('click', doLogin);
  passEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });
});
