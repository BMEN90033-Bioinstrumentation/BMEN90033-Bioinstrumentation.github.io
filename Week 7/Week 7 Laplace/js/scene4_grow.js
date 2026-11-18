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
  const F0 = 0.8;                 // signal frequency in Hz, fixed; the slider sets the winding frequency
  const w0 = 2 * Math.PI * F0;
  const Tmax = 8;

  function gOf(t, a) { return Math.exp(a * t) * Math.cos(w0 * t); }

  function drawSig() {
    const { ctx, w, h } = CFG.setupCanvas(cSig);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const a = parseFloat(aEl.value);
    const padL = 58, padR = 14, padT = 60, padB = 46;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const mid = (y0 + y1) / 2;
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    CFG.label(ctx, '$t$ (s)', (x0 + x1) / 2, y1 + 24, C.muted, { align: 'center' });
    CFG.label(ctx, '$g(t)$', 14, mid, C.time, { rotate: true, align: 'center', baseline: 'middle' });

    // The envelope is largest at one end of the record.
    const maxV = Math.max(1, Math.exp(a * Tmax));
    const half = (y1 - y0) / 2 - 6;
    CFG.ticks(ctx, 'bottom', [0, 2, 4, 6, 8], t => x0 + t / Tmax * (x1 - x0), y1, C.muted);
    CFG.ticks(ctx, 'left', [-maxV, 0, maxV], v => mid - v / maxV * half, x0, C.muted, v => String(+v.toFixed(1)).replace('-', '\u2212'));
    // Envelope ±e^{at}
    ctx.strokeStyle = CFG.ink(0.25); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const u = i / 80;
        const py = mid - sgn * Math.exp(a * u * Tmax) / maxV * half;
        if (i === 0) ctx.moveTo(x0, py); else ctx.lineTo(x0 + u * (x1 - x0), py);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = C.time; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 600; i++) {
      const u = i / 600, t = u * Tmax;
      const v = gOf(t, a) / maxV;
      const px = x0 + u * (x1 - x0);
      const py = mid - v * half;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    CFG.label(ctx, `$a$ = ${a.toFixed(2)} s$^{−1}$, $f_0$ = ${F0.toFixed(1)} Hz: ${a > 0 ? 'growing' : a < 0 ? 'decaying' : 'constant amplitude'}`.replace('-', '−'), x0, y0 - 26, C.muted);
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

    // progressive reveal
    const reveal = Math.min(1, (tAnim % 6) / 5);
    const scale = 22;
    let comX = 0, comY = 0, cnt = 0;
    ctx.strokeStyle = C.imag;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const N = 700;
    let started = false;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      if (u > reveal) break;
      const t = u * Tmax;
      const g = gOf(t, a);
      const ang = -2 * Math.PI * f * t;
      const re = g * Math.cos(ang);
      const im = g * Math.sin(ang);
      const px = cx + re * scale;
      const py = cy - im * scale;
      comX += re; comY += im; cnt++;   // every sample counts toward the centroid, on screen or not
      if (px < -200 || px > w + 200 || py < -200 || py > h + 200) { started = false; continue; }
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Axis titles are drawn over the curve.
    // Ring radii, in signal units
    for (const r of [2, 4]) CFG.label(ctx, String(r), cx - r * 22, cy + 5, C.muted, { align: 'center', halo: true });
    CFG.label(ctx, '$\\Re$', w - 10, cy, C.muted, { align: 'right', baseline: 'middle', halo: true });
    CFG.label(ctx, '$\\Im$', cx, 50, C.muted, { align: 'center', halo: true });

    if (cnt > 0) {
      comX /= cnt; comY /= cnt;
      const cmx = cx + comX * scale;
      const cmy = cy - comY * scale;
      if (isFinite(cmx) && isFinite(cmy)) {
        const offscreen = cmx < 0 || cmx > w || cmy < 0 || cmy > h;
        ctx.fillStyle = C.accent;
        const xx = CFG.clamp(cmx, 8, w - 8), yy = CFG.clamp(cmy, 8, h - 8);
        ctx.beginPath(); ctx.arc(xx, yy, 5, 0, Math.PI * 2); ctx.fill();
      }
    }

    sub.textContent = a > 0 ? 'Curve unbounded: the integral diverges' : a < 0 ? 'Curve bounded: the integral converges' : 'Constant amplitude: no ordinary transform';
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
