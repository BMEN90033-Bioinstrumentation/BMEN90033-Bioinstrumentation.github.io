// Scene 7, Drag pole around the s-plane, impulse response updates.
(function () {
  const cSP = document.getElementById('p_splane');
  const cT = document.getElementById('p_time');
  if (!cSP) return;
  const sub = document.getElementById('p_sub');

  // pole pair (pole + its conjugate)
  const pole = { sigma: -0.5, omega: 1.4 };
  let dragging = false;

  // s-plane frame: σ from -1.75 to 1.75, ω from -3.2 to 3.2. Tick values sit
  // on the left and bottom edges; the axis titles sit outside the frame.
  function geom() {
    const rect = cSP.getBoundingClientRect();
    const fx0 = 44, fx1 = rect.width - 34, fy0 = 52, fy1 = rect.height - 28;
    const cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
    const sS = (fx1 - fx0) / 3.5, wS = (fy1 - fy0) / 6.4;
    return { fx0, fx1, fy0, fy1, cx, cy, xOf: v => cx + v * sS, yOf: v => cy - v * wS, sOf: px => (px - cx) / sS, wOf: py => (cy - py) / wS };
  }

  cSP.style.cursor = 'grab';
  cSP.addEventListener('pointerdown', (e) => {
    const rect = cSP.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const G = geom();
    const px = G.xOf(pole.sigma);
    if (Math.hypot(x - px, y - G.yOf(pole.omega)) < 18 || Math.hypot(x - px, y - G.yOf(-pole.omega)) < 18) {
      dragging = true;
      cSP.setPointerCapture(e.pointerId);
    }
  });
  cSP.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = cSP.getBoundingClientRect();
    const G = geom();
    pole.sigma = CFG.clamp(G.sOf(e.clientX - rect.left), -1.6, 1.2);
    pole.omega = Math.abs(CFG.clamp(G.wOf(e.clientY - rect.top), -2.8, 2.8));
    if (pole.omega < 0.1) pole.omega = 0.1;
    drawAll();
  });
  cSP.addEventListener('pointerup', () => dragging = false);
  cSP.addEventListener('pointercancel', () => dragging = false);

  function drawSPlane() {
    const { ctx, w, h } = CFG.setupCanvas(cSP);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const { fx0, fx1, fy0, fy1, cx, cy, xOf, yOf } = geom();

    // half-plane shading: stable left, unstable right
    ctx.fillStyle = CFG.alpha(C.time, 0.1);
    ctx.fillRect(fx0, fy0, cx - fx0, fy1 - fy0);
    ctx.fillStyle = CFG.alpha(C.imag, 0.08);
    ctx.fillRect(cx, fy0, fx1 - cx, fy1 - fy0);

    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let v = -1.5; v <= 1.5; v += 0.5) {
      ctx.beginPath(); ctx.moveTo(xOf(v), fy0); ctx.lineTo(xOf(v), fy1); ctx.stroke();
    }
    for (let v = -3; v <= 3; v++) {
      ctx.beginPath(); ctx.moveTo(fx0, yOf(v)); ctx.lineTo(fx1, yOf(v)); ctx.stroke();
    }
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(fx0, cy); ctx.lineTo(fx1, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, fy0); ctx.lineTo(cx, fy1); ctx.stroke();
    CFG.ticks(ctx, 'bottom', [-1.5, -1, -0.5, 0, 0.5, 1, 1.5], xOf, fy1, C.muted);
    CFG.ticks(ctx, 'left', [-3, -2, -1, 0, 1, 2, 3], yOf, fx0, C.muted);
    CFG.label(ctx, '$jω$', cx, fy0 - 6, C.muted, { align: 'center', baseline: 'bottom' });
    CFG.label(ctx, '$σ$', fx1 + 10, cy, C.muted, { baseline: 'middle' });
    CFG.label(ctx, 'LHP: stable', fx0 + 8, fy1 - 6, C.time, { baseline: 'bottom' });
    CFG.label(ctx, 'RHP: unstable', fx1 - 8, fy1 - 6, C.imag, { align: 'right', baseline: 'bottom' });

    // Conjugate pole pair; the upper pole is the drag handle.
    const p1 = { x: xOf(pole.sigma), y: yOf(pole.omega) };
    const p2 = { x: xOf(pole.sigma), y: yOf(-pole.omega) };
    CFG.mark(ctx, 'pole', p1.x, p1.y, C.accent, 8);
    ctx.strokeStyle = CFG.alpha(C.accent, 0.5); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p1.x, p1.y, 14, 0, Math.PI * 2); ctx.stroke();
    CFG.mark(ctx, 'pole', p2.x, p2.y, C.imag, 8);
    // The label stays on the pole's side of the jω axis: beside the pole
    // where there is room, otherwise on the row above it at the frame edge.
    const txt = `$s$ = ${pole.sigma.toFixed(2)} ± $j$${pole.omega.toFixed(2)}`.replace('-', '−');
    const LW = 150;
    if (p1.x < cx) {
      if (p1.x - 20 - LW > fx0) CFG.label(ctx, txt, p1.x - 20, p1.y, C.accent, { align: 'right', baseline: 'middle', halo: true });
      else CFG.label(ctx, txt, fx0 + 4, p1.y - 24, C.accent, { baseline: 'bottom', halo: true });
    } else {
      if (p1.x + 20 + LW < fx1) CFG.label(ctx, txt, p1.x + 20, p1.y, C.accent, { baseline: 'middle', halo: true });
      else CFG.label(ctx, txt, fx1 - 4, p1.y - 24, C.accent, { align: 'right', baseline: 'bottom', halo: true });
    }
  }

  function drawTime() {
    const { ctx, w, h } = CFG.setupCanvas(cT);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const padL = 58, padR = 14, padT = 56, padB = 46;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const mid = (y0 + y1) / 2;
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    CFG.label(ctx, '$t$ (s)', (x0 + x1) / 2, y1 + 24, C.muted, { align: 'center' });
    CFG.label(ctx, '$h(t)$', 14, mid, C.time, { rotate: true, align: 'center', baseline: 'middle' });

    const Tmax = 12;
    // find autoscale
    let maxV = 0;
    for (let i = 0; i <= 400; i++) {
      const t = i / 400 * Tmax;
      const v = Math.exp(pole.sigma * t) * Math.cos(pole.omega * t);
      maxV = Math.max(maxV, Math.abs(v));
    }
    maxV = Math.max(1, Math.min(maxV, 20));
    const half = (y1 - y0) / 2 - 6;
    CFG.ticks(ctx, 'bottom', [0, 3, 6, 9, 12], t => x0 + t / Tmax * (x1 - x0), y1, C.muted);
    CFG.ticks(ctx, 'left', [-maxV, 0, maxV], v => mid - v / maxV * half, x0, C.muted, v => String(+v.toFixed(1)).replace('-', '\u2212'));
    // Envelope ±e^{σt}
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    ctx.strokeStyle = CFG.ink(0.25); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const u = i / 100;
        const py = mid - sgn * Math.exp(pole.sigma * u * Tmax) / maxV * half;
        if (i === 0) ctx.moveTo(x0, py); else ctx.lineTo(x0 + u * (x1 - x0), py);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = C.time; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 500; i++) {
      const u = i / 500, t = u * Tmax;
      const v = Math.exp(pole.sigma * t) * Math.cos(pole.omega * t) / maxV;
      const px = x0 + u * (x1 - x0);
      const py = mid - v * half;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    let s = 'Marginally stable: constant amplitude';
    if (pole.sigma < -0.02) s = 'Stable: decaying';
    if (pole.sigma > 0.02) s = 'Unstable: growing';
    const zeta = -pole.sigma / Math.hypot(pole.sigma, pole.omega);   // damping ratio of the pole pair
    if (pole.sigma < -0.02 && zeta >= 0.7) s = 'Stable: heavily damped';
    if (pole.sigma < -0.02 && zeta < 0.2) s = 'Stable: lightly damped';
    sub.textContent = s;
  }

  function drawAll() { drawSPlane(); drawTime(); }
  CFG.registerLoop(cT, () => drawAll());
  window.addEventListener('theme-change', drawAll);
  window.addEventListener('resize', drawAll);
  drawAll();
})();
