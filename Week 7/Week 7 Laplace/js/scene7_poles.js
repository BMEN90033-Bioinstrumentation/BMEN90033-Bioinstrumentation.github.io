// Scene 7, Drag pole around the s-plane, impulse response updates.
(function () {
  const cSP = document.getElementById('p_splane');
  const cT = document.getElementById('p_time');
  if (!cSP) return;
  const sub = document.getElementById('p_sub');

  // pole pair (pole + its conjugate)
  const pole = { sigma: -0.5, omega: 1.4 };
  let dragging = false;

  function toPix(cSP, sigma, omega) {
    const rect = cSP.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const sS = (rect.width - 40) / 3.5;
    const wS = (rect.height - 30) / 6;
    return { x: cx + sigma * sS, y: cy - omega * wS, sS, wS, cx, cy };
  }
  function fromPix(cSP, px, py) {
    const rect = cSP.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const sS = (rect.width - 40) / 3.5;
    const wS = (rect.height - 30) / 6;
    return { sigma: (px - cx) / sS, omega: -(py - cy) / wS };
  }

  cSP.addEventListener('pointerdown', (e) => {
    const rect = cSP.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const p = toPix(cSP, pole.sigma, pole.omega);
    const pConj = toPix(cSP, pole.sigma, -pole.omega);
    if (Math.hypot(x - p.x, y - p.y) < 18 || Math.hypot(x - pConj.x, y - pConj.y) < 18) {
      dragging = true;
      cSP.setPointerCapture(e.pointerId);
    }
  });
  cSP.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = cSP.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const s = fromPix(cSP, x, y);
    pole.sigma = CFG.clamp(s.sigma, -1.6, 1.2);
    pole.omega = Math.abs(CFG.clamp(s.omega, -2.8, 2.8));
    if (pole.omega < 0.1) pole.omega = 0.1;
    drawAll();
  });
  cSP.addEventListener('pointerup', () => dragging = false);
  cSP.addEventListener('pointercancel', () => dragging = false);

  function drawSPlane() {
    const { ctx, w, h } = CFG.setupCanvas(cSP);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const cx = w / 2, cy = h / 2;
    const sS = (w - 40) / 3.5;
    const wS = (h - 30) / 6;

    // Plot frame. The axis titles sit outside it: jω above the vertical
    // axis, σ to the right of the horizontal axis.
    const fx0 = 6, fx1 = w - 30, fy0 = 50, fy1 = h - 6;

    // half-plane shading: stable left, unstable right
    ctx.fillStyle = CFG.alpha(C.time, 0.1);
    ctx.fillRect(fx0, fy0, cx - fx0, fy1 - fy0);
    ctx.fillStyle = CFG.alpha(C.imag, 0.08);
    ctx.fillRect(cx, fy0, fx1 - cx, fy1 - fy0);

    ctx.strokeStyle = C.grid;
    for (let i = -3; i <= 3; i++) {
      const x = cx + i * sS / 2;
      ctx.beginPath(); ctx.moveTo(x, fy0); ctx.lineTo(x, fy1); ctx.stroke();
    }
    for (let i = -3; i <= 3; i++) {
      const y = cy + i * wS;
      if (y < fy0) continue;
      ctx.beginPath(); ctx.moveTo(fx0, y); ctx.lineTo(fx1, y); ctx.stroke();
    }
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(fx0, cy); ctx.lineTo(fx1, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, fy0); ctx.lineTo(cx, fy1); ctx.stroke();
    CFG.label(ctx, 'jω', cx, fy0 - 6, C.muted, { align: 'center', baseline: 'bottom' });
    CFG.label(ctx, 'σ', fx1 + 8, cy, C.muted, { baseline: 'middle' });
    CFG.label(ctx, 'LHP: stable', fx0 + 8, fy1 - 6, C.time, { baseline: 'bottom' });
    CFG.label(ctx, 'RHP: unstable', fx1 - 8, fy1 - 6, C.imag, { align: 'right', baseline: 'bottom' });

    // poles
    function pole_mark(x, y, live) {
      ctx.strokeStyle = live ? C.accent : C.imag;
      ctx.lineWidth = 2;
      const r = 8;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
      ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y - r);
      ctx.stroke();
      if (live) {
        ctx.strokeStyle = CFG.alpha(C.accent, 0.5);
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
      }
    }
    const p1 = { x: cx + pole.sigma * sS, y: cy - pole.omega * wS };
    const p2 = { x: cx + pole.sigma * sS, y: cy + pole.omega * wS };
    pole_mark(p1.x, p1.y, true);
    pole_mark(p2.x, p2.y, false);
    // The label stays on the pole's side of the jω axis: beside the pole
    // where there is room, otherwise on the row above it at the frame edge.
    const txt = `s = ${pole.sigma.toFixed(2)} ± j${pole.omega.toFixed(2)}`.replace('-', '−');
    const LW = 150;
    if (p1.x < cx) {
      if (p1.x - 20 - LW > fx0) CFG.label(ctx, txt, p1.x - 20, p1.y, C.accent, { align: 'right', baseline: 'middle' });
      else CFG.label(ctx, txt, fx0 + 4, p1.y - 24, C.accent, { baseline: 'bottom' });
    } else {
      if (p1.x + 20 + LW < fx1) CFG.label(ctx, txt, p1.x + 20, p1.y, C.accent, { baseline: 'middle' });
      else CFG.label(ctx, txt, fx1 - 4, p1.y - 24, C.accent, { align: 'right', baseline: 'bottom' });
    }
  }

  function drawTime() {
    const { ctx, w, h } = CFG.setupCanvas(cT);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const padL = 34, padR = 12, padT = 50, padB = 26;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const mid = (y0 + y1) / 2;
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    CFG.label(ctx, 't', (x0 + x1) / 2, y1 + 6, C.muted, { align: 'center' });
    CFG.label(ctx, 'h(t)', 14, mid, C.time, { rotate: true, align: 'center', baseline: 'middle' });

    const Tmax = 12;
    // find autoscale
    let maxV = 0;
    for (let i = 0; i <= 400; i++) {
      const t = i / 400 * Tmax;
      const v = Math.exp(pole.sigma * t) * Math.cos(pole.omega * t);
      maxV = Math.max(maxV, Math.abs(v));
    }
    maxV = Math.max(1, Math.min(maxV, 20));
    ctx.strokeStyle = C.time; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 500; i++) {
      const u = i / 500, t = u * Tmax;
      const v = Math.exp(pole.sigma * t) * Math.cos(pole.omega * t) / maxV;
      const px = x0 + u * (x1 - x0);
      const py = CFG.clamp(mid - v * ((y1 - y0) / 2 - 6), y0 + 2, y1 - 2);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

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
