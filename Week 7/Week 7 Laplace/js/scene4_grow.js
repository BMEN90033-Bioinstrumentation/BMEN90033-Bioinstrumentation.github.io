// Scene 4, Fourier fails on growing signal.
(function () {
  const cSig = document.getElementById('g_sig');
  const cWnd = document.getElementById('g_wound');
  if (!cSig) return;
  const aEl = document.getElementById('growA');
  const fEl = document.getElementById('growF');
  const aO = document.getElementById('growAO');
  const fO = document.getElementById('growFO');
  const sub = document.getElementById('g_sub');
  const w0 = 2 * Math.PI * 0.8;

  function gOf(t, a, f) { return Math.exp(a * t) * Math.cos(2 * Math.PI * f * t); }

  function drawSig() {
    const { ctx, w, h } = CFG.setupCanvas(cSig);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const a = parseFloat(aEl.value);
    const f = parseFloat(fEl.value);
    const padL = 34, padR = 12, padT = 56, padB = 26;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const mid = (y0 + y1) / 2;
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    CFG.label(ctx, 't', (x0 + x1) / 2, y1 + 6, C.muted, { align: 'center' });
    CFG.label(ctx, 'g(t)', 14, mid, C.time, { rotate: true, align: 'center', baseline: 'middle' });

    const Tmax = 8;
    let maxV = 0;
    for (let i = 0; i <= 200; i++) {
      const t = i / 200 * Tmax;
      maxV = Math.max(maxV, Math.abs(gOf(t, a, f)));
    }
    maxV = Math.max(1, maxV);
    ctx.strokeStyle = C.time; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 600; i++) {
      const u = i / 600, t = u * Tmax;
      const v = gOf(t, a, f) / maxV;
      const px = x0 + u * (x1 - x0);
      const py = mid - v * ((y1 - y0) / 2 - 6);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    CFG.label(ctx, `a = ${a.toFixed(2)}, f = ${f.toFixed(2)} Hz (${a > 0 ? 'growing' : a < 0 ? 'decaying' : 'constant amplitude'})`.replace('-', '−'), x0 + 6, y0 - 22, a > 0 ? C.imag : a < 0 ? C.time : C.muted);
  }

  function drawWound(tAnim) {
    const { ctx, w, h } = CFG.setupCanvas(cWnd);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const a = parseFloat(aEl.value);
    const f = parseFloat(fEl.value);
    const cx = w / 2, cy = h / 2;
    // grid
    ctx.strokeStyle = C.grid;
    for (let r = 1; r <= 4; r++) {
      ctx.beginPath(); ctx.arc(cx, cy, r * 22, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = C.gridStrong;
    // Axes stop short of the titles, which sit beyond the axis ends.
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w - 34, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 68); ctx.lineTo(cx, h); ctx.stroke();
    CFG.label(ctx, 'Re', w - 10, cy, C.muted, { align: 'right', baseline: 'middle' });
    CFG.label(ctx, 'Im', cx, 50, C.muted, { align: 'center' });

    // progressive reveal
    const Tmax = 8;
    const reveal = Math.min(1, (tAnim % 6) / 5);
    const scale = 22;
    let comX = 0, comY = 0, cnt = 0;
    ctx.strokeStyle = a > 0 ? C.imag : C.real;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const N = 700;
    let started = false;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      if (u > reveal) break;
      const t = u * Tmax;
      const g = gOf(t, a, f);
      const ang = -2 * Math.PI * f * t;
      const re = g * Math.cos(ang);
      const im = g * Math.sin(ang);
      const px = cx + re * scale;
      const py = cy - im * scale;
      if (px < -200 || px > w + 200 || py < -200 || py > h + 200) continue;
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      comX += re; comY += im; cnt++;
    }
    ctx.stroke();

    if (cnt > 0) {
      comX /= cnt; comY /= cnt;
      const cmx = cx + comX * scale;
      const cmy = cy - comY * scale;
      if (isFinite(cmx) && isFinite(cmy)) {
        const offscreen = cmx < 0 || cmx > w || cmy < 0 || cmy > h;
        ctx.fillStyle = offscreen ? C.imag : C.accent;
        const xx = CFG.clamp(cmx, 8, w - 8), yy = CFG.clamp(cmy, 8, h - 8);
        ctx.beginPath(); ctx.arc(xx, yy, 5, 0, Math.PI * 2); ctx.fill();
      }
    }

    sub.textContent = a > 0 ? 'Curve unbounded: the integral diverges' : a < 0 ? 'Curve bounded: the integral converges' : 'Constant amplitude: marginal case';
  }

  function drawAll(t) {
    aO.textContent = parseFloat(aEl.value).toFixed(2);
    fO.textContent = parseFloat(fEl.value).toFixed(2);
    drawSig();
    drawWound(t || performance.now() / 1000);
  }

  [aEl, fEl].forEach(el => el.addEventListener('input', () => drawAll()));
  CFG.registerLoop(cWnd, (t) => drawAll(t));
  window.addEventListener('theme-change', () => drawAll());
  window.addEventListener('resize', () => drawAll());
})();
