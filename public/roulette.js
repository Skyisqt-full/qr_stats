// public/roulette.js

async function getJson(url) {
  const r = await fetch(url);
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) throw new Error(data?.error || 'Ошибка');
  return data;
}

async function postJson(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) throw new Error(data?.error || 'Ошибка');
  return data;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function wrapTwoLines(text, maxCharsLine1 = 18, maxCharsLine2 = 24) {
  const s = String(text || '').trim();
  if (s.length <= maxCharsLine2) return [s];

  const words = s.split(/\s+/);
  const line1 = [];
  const line2 = [];
  let len1 = 0;

  for (const w of words) {
    const add = (line1.length ? 1 : 0) + w.length;
    if (len1 + add <= maxCharsLine1) {
      line1.push(w);
      len1 += add;
    } else {
      line2.push(w);
    }
  }

  if (line2.length === 0) return [s];
  const l1 = line1.join(' ');
  let l2 = line2.join(' ');
  if (l2.length > maxCharsLine2) l2 = l2.slice(0, maxCharsLine2 - 1).trimEnd() + '…';
  return [l1, l2].filter(Boolean);
}

function pickFontSize(text) {
  const len = String(text || '').length;
  if (len <= 18) return 20;
  if (len <= 26) return 17;
  if (len <= 34) return 15;
  return 13;
}

function drawWheel(ctx, prizes, rotation) {
  const { width, height } = ctx.canvas;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 26;

  ctx.clearRect(0, 0, width, height);

  const palette = [
    '#7C3AED', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6'
  ];

  // внешнее кольцо
  const ringGrad = ctx.createRadialGradient(cx, cy, radius - 16, cx, cy, radius + 18);
  ringGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
  ringGrad.addColorStop(1, 'rgba(255,255,255,0.16)');
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 14, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();

  const n = prizes.length;
  const seg = (Math.PI * 2) / n;
  const baseOffset = -Math.PI / 2;

  for (let i = 0; i < n; i++) {
    const start = baseOffset + rotation + i * seg;
    const end = baseOffset + rotation + (i + 1) * seg;

    const col = palette[i % palette.length];

    const g = ctx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius);
    g.addColorStop(0, 'rgba(0,0,0,0.24)');
    g.addColorStop(1, col);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();

    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Текст
    const prize = prizes[i];
    const mid = (start + end) / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(mid);

    const fs = pickFontSize(prize);
    const lines = wrapTwoLines(prize, 18, 24);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${fs}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;

    // обводка для читаемости
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.fillStyle = 'rgba(255,255,255,0.96)';

    const x = radius - 18;

    if (lines.length === 1) {
      ctx.strokeText(lines[0], x, 0);
      ctx.fillText(lines[0], x, 0);
    } else {
      ctx.strokeText(lines[0], x, -fs * 0.60);
      ctx.fillText(lines[0], x, -fs * 0.60);

      ctx.strokeText(lines[1], x, fs * 0.60);
      ctx.fillText(lines[1], x, fs * 0.60);
    }

    ctx.restore();
  }

  // центр
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 84, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fill();

  const hub = ctx.createRadialGradient(cx - 16, cy - 16, 12, cx, cy, 90);
  hub.addColorStop(0, 'rgba(255,255,255,0.22)');
  hub.addColorStop(1, 'rgba(255,255,255,0.07)');
  ctx.beginPath();
  ctx.arc(cx, cy, 64, 0, Math.PI * 2);
  ctx.fillStyle = hub;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 64, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function computeTargetRotation(prizes, targetPrize, extraSpins) {
  const n = prizes.length;
  const seg = (Math.PI * 2) / n;

  const idx = prizes.indexOf(targetPrize);
  if (idx < 0) throw new Error('Приз не найден среди сегментов рулетки');

  const targetRot = - (idx + 0.5) * seg;
  return extraSpins * Math.PI * 2 + targetRot;
}

// Конфетти (canvas overlay)
function launchConfetti(durationMs = 1800) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '60';

  document.body.appendChild(canvas);

  function resize() {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }
  resize();

  const colors = ['#7C3AED', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6', '#ffffff'];
  const particles = [];
  const count = 170;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height * 0.3,
      vx: (Math.random() - 0.5) * 7 * dpr,
      vy: (Math.random() * 5 + 6) * dpr,
      r: (Math.random() * 10 + 6) * dpr,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.22,
      color: colors[i % colors.length],
      a: 1
    });
  }

  const start = performance.now();

  function tick(now) {
    const t = now - start;
    const k = Math.min(1, t / durationMs);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15 * dpr;     // gravity
      p.rot += p.vr;
      p.a = 1 - k;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.a);

      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);

      ctx.restore();
    }

    if (t < durationMs) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
      window.removeEventListener('resize', resize);
    }
  }

  window.addEventListener('resize', resize);
  requestAnimationFrame(tick);
}

document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('wheel');
  const ctx = canvas.getContext('2d');

  const spinBtn = document.getElementById('spinBtn');
  const statusEl = document.getElementById('status');
  const errorEl = document.getElementById('error');

  const modal = document.getElementById('modal');
  const modalPrize = document.getElementById('modalPrize');
  const modalClose = document.getElementById('modalClose');
  const modalOk = document.getElementById('modalOk');

  const submissionId = sessionStorage.getItem('submissionId');

const qs = new URLSearchParams(window.location.search);
  const alreadyFromLanding = qs.get('already') === '1';

  function setStatus(t) { statusEl.textContent = t || ''; }
  function setError(t) { errorEl.textContent = t || ''; }

  function showModal(prize) {
    modalPrize.textContent = prize;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }
  function hideModal() {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }

  modalClose.addEventListener('click', hideModal);
  modalOk.addEventListener('click', hideModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });

  if (!submissionId) {
    setError('Нет данных заявки. Вернитесь на главную и отправьте телефон.');
    spinBtn.disabled = true;
    drawWheel(ctx, ['НЕТ ДАННЫХ'], 0);
    return;
  }

  let prizes = [];
  let targetPrize = '';
  let rotation = 0;
  let spinning = false;

  try {
    const cfg = await getJson('/api/prizes');
    prizes = cfg.allPrizes || [];
    if (!Array.isArray(prizes) || prizes.length < 2) throw new Error('Некорректный список призов');

    drawWheel(ctx, prizes, rotation);

    setStatus('Получаем запрограммированный приз...');
    const gp = await postJson('/api/get-prize', { submissionId: Number(submissionId) });
    targetPrize = gp.prize;

        if (gp.alreadySaved || alreadyFromLanding) {
      setStatus('Вы уже крутили. Ожидайте звонка. Ваш приз: ' + targetPrize);
      showModal(targetPrize);
      spinBtn.disabled = true;
      spinBtn.textContent = 'Уже получено';
    } else {
      setStatus('Готово. Нажмите “Крутить”.');
    }
  } catch (e) {
    setError(e.message || 'Ошибка');
    spinBtn.disabled = true;
    return;
  }

  async function spin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    setError('');

    try {
      const gp = await postJson('/api/get-prize', { submissionId: Number(submissionId) });
      targetPrize = gp.prize;

      if (gp.alreadySaved) {
        setStatus(`Ваш приз: ${targetPrize}`);
        showModal(targetPrize);
        spinning = false;
        return;
      }
    } catch (e) {
      setError(e.message || 'Ошибка');
      spinning = false;
      spinBtn.disabled = false;
      return;
    }

    setStatus('Крутим...');

    const durationMs = 5200;
    const start = performance.now();
    const startRot = rotation;

    let endRot = 0;
    try {
      endRot = computeTargetRotation(prizes, targetPrize, 9);
    } catch (e) {
      setError(e.message || 'Ошибка вычисления остановки');
      spinning = false;
      spinBtn.disabled = false;
      return;
    }

    function frame(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const k = easeOutCubic(t);
      rotation = startRot + (endRot - startRot) * k;
      drawWheel(ctx, prizes, rotation);

      if (t < 1) requestAnimationFrame(frame);
      else finish().catch(err => {
        setError(err.message || 'Ошибка сохранения');
        spinning = false;
        spinBtn.disabled = false;
      });
    }

    requestAnimationFrame(frame);
  }

  async function finish() {
    setStatus('Фиксируем результат...');

    const r = await postJson('/api/save-result', {
      submissionId: Number(submissionId),
      prize: targetPrize
    });

    setStatus(`Ваш приз: ${r.prize}`);
    showModal(r.prize);
    launchConfetti(1800);
    spinBtn.disabled = true;
    spinBtn.textContent = 'Готово';


    spinning = false;
  }

  spinBtn.addEventListener('click', spin);
});
