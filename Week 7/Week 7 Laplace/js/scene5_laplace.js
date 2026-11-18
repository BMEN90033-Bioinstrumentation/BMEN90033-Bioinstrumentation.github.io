// Scene 5, Laplace: σ tames the signal. Signal + wound + s-plane with ROC.
(function () {
  const cSig = document.getElementById('l_sig');
  const cWnd = document.getElementById('l_wound');
  const cSP = document.getElementById('l_splane');
  if (!cSig) return;
  const sEl = document.getElementById('lapS');
  const wEl = document.getElementById('lapW');
  const aEl = document.getElementById('lapA');
  const sO = document.getElementById('lapSO');
  const wO = document.getElementById('lapWO');
  const aO = document.getElementById('lapAO');
  const matchBtn = document.getElementById('lapMatch');
  const sub = document.getElementById('l_sub');

  // Signal frequency in rad/s. It lies inside both the winding slider range
  // and the s-plane window, so the poles at a ± jω₀ are visible and the
  // winding frequency can be brought onto them.
  const w0 = 2;
  const Tmax = 8;
  function signal(t, a) { return Math.exp(a * t) * Math.cos(w0 * t); }

  matchBtn.addEventListener('click', () => {
    sEl.value = (parseFloat(aEl.value) + 0.05).toFixed(3);
    drawAll();
  });

  // g(t) and the weighted signal g(t) e^{-σt} on one shared axis. The axis is
  // scaled to the weighted signal; the unweighted one is clipped by the frame
  // where it grows beyond that range.
  function drawSig() {
    const { ctx, w, h } = CFG.setupCanvas(cSig);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const sigma = parseFloat(sEl.value);
    const a = parseFloat(aEl.value);
    const padL = 58, padR = 14, padT = 62, padB = 46;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const mid = (y0 + y1) / 2, half = (y1 - y0) / 2 - 4;
    const Y = Math.max(1, Math.exp((a - sigma) * Tmax));
    const xOf = t => x0 + t / Tmax * (x1 - x0);
    const yOf = v => mid - v / Y * half;

    ctx.strokeStyle = C.gridStrong; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    CFG.ticks(ctx, 'bottom', [0, 2, 4, 6, 8], xOf, y1, C.muted);
    CFG.ticks(ctx, 'left', [-Y, 0, Y], yOf, x0, C.muted, v => String(+v.toFixed(1)).replace('-', '−'));
    CFG.label(ctx, '$t$ (s)', (x0 + x1) / 2, y1 + 24, C.muted, { align: 'center' });
    CFG.label(ctx, 'amplitude', 14, mid, C.muted, { rotate: true, align: 'center', baseline: 'middle' });

    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    const trace = (fn, color, lw, dash) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const t = i / 400 * Tmax;
        if (i === 0) ctx.moveTo(xOf(t), yOf(fn(t))); else ctx.lineTo(xOf(t), yOf(fn(t)));
      }
      ctx.stroke();
    };
    trace(t => signal(t, a), C.grey, 1.2, [2, 3]);
    trace(t => signal(t, a) * Math.exp(-sigma * t), C.time, 2, []);
    ctx.restore();
    ctx.setLineDash([]);

    CFG.legend(ctx, x0, y0 - 16, [
      { mark: 'dash', text: '$g(t)$', color: C.muted },
      { mark: 'line', text: '$g(t) e^{−σt}$', color: C.time },
    ]);
  }

  function drawWound(tAnim) {
    const { ctx, w, h } = CFG.setupCanvas(cWnd);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const sigma = parseFloat(sEl.value);
    const omega = parseFloat(wEl.value);
    const a = parseFloat(aEl.value);
    const cx = w / 2, cy = h / 2;

    ctx.strokeStyle = C.grid;
    for (let r = 1; r <= 4; r++) { ctx.beginPath(); ctx.arc(cx, cy, r * 20, 0, Math.PI * 2); ctx.stroke(); }

    ctx.strokeStyle = C.gridStrong;
    // Axes stop short of the titles, which sit beyond the axis ends.
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w - 34, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 68); ctx.lineTo(cx, h); ctx.stroke();

    const N = 700;
    const scale = 20;
    let comX = 0, comY = 0, cnt = 0;
    const inROC = sigma > a;
    ctx.strokeStyle = C.imag;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const reveal = Math.min(1, (tAnim % 6) / 5);
    let started = false;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      if (u > reveal) break;
      const t = u * Tmax;
      const g = signal(t, a) * Math.exp(-sigma * t);
      const ang = -omega * t;
      const re = g * Math.cos(ang);
      const im = g * Math.sin(ang);
      const px = cx + re * scale;
      const py = cy - im * scale;
      comX += re; comY += im; cnt++;   // every sample counts toward the centroid, on screen or not
      if (px < -400 || px > w + 400 || py < -400 || py > h + 400) { started = false; continue; }
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Axis titles are drawn over the curve.
    // Ring radii, in signal units
    for (const r of [2, 4]) CFG.label(ctx, String(r), cx - r * 20, cy + 5, C.muted, { align: 'center', halo: true });
    CFG.label(ctx, '$\\Re$', w - 10, cy, C.muted, { align: 'right', baseline: 'middle', halo: true });
    CFG.label(ctx, '$\\Im$', cx, 50, C.muted, { align: 'center', halo: true });

    if (cnt > 0) {
      comX /= cnt; comY /= cnt;
      const cmx = CFG.clamp(cx + comX * scale, 6, w - 6);
      const cmy = CFG.clamp(cy - comY * scale, 6, h - 6);
      ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.arc(cmx, cmy, 5, 0, Math.PI * 2); ctx.fill();
    }

    sub.textContent = (inROC ? `Bounded: inside the ROC (σ > ${a.toFixed(2)})` : 'Unbounded: outside the ROC').replace('-', '−');
  }

  function drawSPlane() {
    const { ctx, w, h } = CFG.setupCanvas(cSP);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const sigma = parseFloat(sEl.value);
    const omega = parseFloat(wEl.value);
    const a = parseFloat(aEl.value);

    // Plot frame: σ from -1.75 to 1.75, ω from -3 to 3. Tick values sit on
    // the left and bottom edges; the axis titles sit outside the frame, jω
    // above the vertical axis and σ to the right of the horizontal axis.
    const fx0 = 44, fx1 = w - 34, fy0 = 30, fy1 = h - 26;
    const cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
    const sScale = (fx1 - fx0) / 3.5;
    const wScale = (fy1 - fy0) / 6;
    const xOf = v => cx + v * sScale, yOf = v => cy - v * wScale;

    // ROC region σ > a
    const xA = xOf(a);
    ctx.fillStyle = CFG.alpha(C.time, 0.12);
    ctx.fillRect(xA, fy0, fx1 - xA, fy1 - fy0);
    ctx.strokeStyle = CFG.alpha(C.time, 0.6); ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(xA, fy0); ctx.lineTo(xA, fy1); ctx.stroke();
    ctx.setLineDash([]);
    CFG.label(ctx, 'ROC: $σ > a$', fx1 - 8, fy1 - 6, C.time, { align: 'right', baseline: 'bottom' });

    // grid
    ctx.strokeStyle = C.grid;
    for (let v = -1.5; v <= 1.5; v += 0.5) {
      ctx.beginPath(); ctx.moveTo(xOf(v), fy0); ctx.lineTo(xOf(v), fy1); ctx.stroke();
    }
    for (let v = -3; v <= 3; v++) {
      ctx.beginPath(); ctx.moveTo(fx0, yOf(v)); ctx.lineTo(fx1, yOf(v)); ctx.stroke();
    }
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(fx0, cy); ctx.lineTo(fx1, cy); ctx.stroke();
    CFG.ticks(ctx, 'bottom', [-1.5, -1, -0.5, 0, 0.5, 1, 1.5], xOf, fy1, C.muted);
    CFG.ticks(ctx, 'left', [-2, 0, 2], yOf, fx0, C.muted);

    // jω axis, the Fourier line
    ctx.strokeStyle = C.real; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, fy0); ctx.lineTo(cx, fy1); ctx.stroke();
    CFG.label(ctx, '$jω$', cx, fy0 - 6, C.real, { align: 'center', baseline: 'bottom' });
    // The caption sits on the side of the axis away from the ROC boundary.
    if (a > 0) CFG.label(ctx, '$σ = 0$: Fourier transform', cx - 8, fy0 + 6, C.real, { align: 'right' });
    else CFG.label(ctx, '$σ = 0$: Fourier transform', cx + 8, fy0 + 6, C.real);
    CFG.label(ctx, '$σ$', fx1 + 10, cy, C.muted, { baseline: 'middle' });

    // poles of G(s) at a ± jω₀
    CFG.mark(ctx, 'pole', xOf(a), yOf(w0), C.imag, 6);
    CFG.mark(ctx, 'pole', xOf(a), yOf(-w0), C.imag, 6);

    // current s
    const sx = xOf(sigma), sy = yOf(omega);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.accent;
    ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
    // The label sits beside the point, on whichever side keeps it clear of
    // the jω axis and the ROC boundary. If neither side is clear it is drawn
    // on a halo.
    const sTxt = `$s$ = ${sigma.toFixed(2)} + $j$${omega.toFixed(2)}`.replace('-', '−');
    const sLW = 150;
    const sLblY = sy < fy0 + 50 ? sy + 10 : sy - 24;
    const crossed = (l, r) => l < fx0 || r > fx1 || [cx, xA].some(v => v > l - 4 && v < r + 4);
    const rightOK = !crossed(sx + 10, sx + 10 + sLW);
    const leftOK = !crossed(sx - 10 - sLW, sx - 10);
    const onLeft = !rightOK && (leftOK || sx > w - 200);
    CFG.label(ctx, sTxt, onLeft ? sx - 10 : sx + 10, sLblY, C.accent,
      { align: onLeft ? 'right' : 'left', halo: !rightOK && !leftOK });
  }

  function drawAll(tAnim) {
    sO.textContent = parseFloat(sEl.value).toFixed(2);
    wO.textContent = parseFloat(wEl.value).toFixed(2);
    aO.textContent = parseFloat(aEl.value).toFixed(2);
    drawSig();
    drawWound(tAnim || performance.now() / 1000);
    drawSPlane();
  }

  [sEl, wEl, aEl].forEach(el => el.addEventListener('input', () => drawAll()));
  CFG.registerLoop(cWnd, (t) => drawAll(t));
  window.addEventListener('theme-change', () => drawAll());
  window.addEventListener('resize', () => drawAll());
})();
