// admin/admin.js

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pickDate(row) {
  return row.prized_at || row.created_at || '';
}

async function getJson(url) {
  const r = await fetch(url, { credentials: 'same-origin' });
  if (r.status === 401) {
    window.location.href = '/admin/login.html';
    return null;
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) throw new Error(data?.error || 'Ошибка загрузки');
  return data;
}

async function postJson(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body || {})
  });

  if (r.status === 401) {
    window.location.href = '/admin/login.html';
    return null;
  }

  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) throw new Error(data?.error || 'Ошибка');
  return data;
}

async function del(url) {
  const r = await fetch(url, { method: 'DELETE', credentials: 'same-origin' });

  if (r.status === 401) {
    window.location.href = '/admin/login.html';
    return null;
  }

  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) throw new Error(data?.error || 'Ошибка');
  return data;
}

function buildSubmissionsUrl(prize, sort, order) {
  const u = new URL('/api/admin/submissions', window.location.origin);
  if (prize) u.searchParams.set('prize', prize);
  if (sort) u.searchParams.set('sort', sort);
  if (order) u.searchParams.set('order', order);
  return u.toString();
}

// В фильтр добавляем ТОЛЬКО allowedPrizes
async function loadPrizeFilterOptions() {
  const select = document.getElementById('prizeFilter');

  while (select.options.length > 2) select.remove(2);

  const cfg = await getJson('/api/prizes');
  if (!cfg) return;

  const allowed = Array.isArray(cfg.allowedPrizes) ? cfg.allowedPrizes : [];

  for (const p of allowed) {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    select.appendChild(opt);
  }
}

async function loadAll() {
  const visitsEl = document.getElementById('visitsTotal');
  const prizeStatsEl = document.getElementById('prizeStats');
  const tbody = document.getElementById('rows');
  const empty = document.getElementById('empty');

  const prizeFilter = document.getElementById('prizeFilter').value;
  const sortBy = document.getElementById('sortBy').value;
  const order = document.getElementById('order').value;

  const stats = await getJson('/api/admin/stats');
  if (!stats) return;
  visitsEl.textContent = String(stats.visitsTotal);

  const ps = await getJson('/api/admin/prize-stats');
  if (!ps) return;

  const psRows = ps.rows || [];
  const max = psRows.reduce((m, r) => Math.max(m, Number(r.c) || 0), 0);

  if (psRows.length === 0) {
    prizeStatsEl.innerHTML = `<div class="muted">Пока нет выигрышей.</div>`;
  } else {
    prizeStatsEl.innerHTML = psRows.map(r => {
      const c = Number(r.c) || 0;
      const pct = max ? Math.round((c / max) * 100) : 0;

      return `
        <div class="prizeRow">
          <div class="prizeTop">
            <div class="prizeName">${esc(r.prize)}</div>
            <div class="prizeCount">${esc(c)}</div>
          </div>
          <div class="bar">
            <div class="barFill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  const subs = await getJson(buildSubmissionsUrl(prizeFilter, sortBy, order));
  if (!subs) return;

  const rows = subs.rows || [];

  if (rows.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${esc(r.id)}</td>
      <td>${esc(r.name || '')}</td>
      <td>${esc(r.phone_norm)}</td>
      <td>${esc(r.prize || '')}</td>
      <td>${esc(pickDate(r))}</td>
      <td>
        <button class="btnDanger" data-del="${esc(r.id)}" type="button">Удалить</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-del');
      if (!confirm(`Удалить запись #${id}?`)) return;

      btn.disabled = true;
      try {
        await del(`/api/admin/submissions/${id}`);
        await loadAll();
      } catch (e) {
        alert(e.message || 'Ошибка удаления');
      } finally {
        btn.disabled = false;
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const refreshBtn = document.getElementById('refreshBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const resetVisitsBtn = document.getElementById('resetVisitsBtn');
  const resetSubsBtn = document.getElementById('resetSubsBtn');

  const prizeFilter = document.getElementById('prizeFilter');
  const sortBy = document.getElementById('sortBy');
  const order = document.getElementById('order');

  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    try {
      await loadAll();
    } catch (e) {
      alert(e.message || 'Ошибка');
    } finally {
      refreshBtn.disabled = false;
    }
  });

  prizeFilter.addEventListener('change', () => refreshBtn.click());
  sortBy.addEventListener('change', () => refreshBtn.click());
  order.addEventListener('change', () => refreshBtn.click());

  logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    try {
      await postJson('/api/admin/logout', {});
      window.location.href = '/admin/login.html';
    } catch (e) {
      alert(e.message || 'Ошибка');
    } finally {
      logoutBtn.disabled = false;
    }
  });

  resetVisitsBtn.addEventListener('click', async () => {
    if (!confirm('Точно сбросить счётчик переходов по QR?')) return;
    resetVisitsBtn.disabled = true;
    try {
      await postJson('/api/admin/reset-visits', {});
      await loadAll();
    } catch (e) {
      alert(e.message || 'Ошибка');
    } finally {
      resetVisitsBtn.disabled = false;
    }
  });

  resetSubsBtn.addEventListener('click', async () => {
    if (!confirm('Точно удалить ВСЕ заявки и сбросить ID? Это удалит историю выигрышей.')) return;
    resetSubsBtn.disabled = true;
    try {
      await postJson('/api/admin/reset-submissions', {});
      await loadAll();
    } catch (e) {
      alert(e.message || 'Ошибка');
    } finally {
      resetSubsBtn.disabled = false;
    }
  });

  try {
    await loadPrizeFilterOptions();
  } catch {
    // не критично
  }

  refreshBtn.click();
});
