// Scene 8, Sandbox.
// User picks an input function x(t) (each forces a fixed set of poles/zeros
// in X(s)) and builds a transfer function H(s) by clicking the s-plane to
// drop poles and zeros. Output y(t) is the inverse Laplace of X(s)·H(s),
// computed numerically by driving the controllable-canonical state-space
// realisation of H(s) with x(t), integrated with RK4. The roots of X(s) are
// drawn on the s-plane but are not part of the simulated system: the input
// signal already carries them.
(function () {
  const cSP = document.getElementById('sb_splane');
  if (!cSP) return;
  const cIO       = document.getElementById('sb_io');
  const inputSeg  = document.getElementById('sbInput');
  const modeSeg   = document.getElementById('sbMode');
  const param     = document.getElementById('sbParam');
  const paramO    = document.getElementById('sbParamO');
  const paramLbl  = document.getElementById('sbParamLbl');
  const paramRow  = document.getElementById('sbParamRow');
  const gain      = document.getElementById('sbGain');
  const gainO     = document.getElementById('sbGainO');
  const resetBtn  = document.getElementById('sbReset');
  const clearBtn  = document.getElementById('sbClear');
  const hsub      = document.getElementById('sb_hsub');
  const iosub     = document.getElementById('sb_iosub');

  // ─── State ───────────────────────────────────────────────────────────
  let inputKind = 'step';
  let inputParam = 1;     // ω for sin/cos, a for exp
  let mode = 'pole';
  // Each item is one root in the upper half-plane (im ≥ 0). If im > 0 it
  // implicitly carries its conjugate so coefficients stay real.
  const items = [{ kind: 'pole', re: -1, im: 0 }];
  let drag = null;
  let dirty = true;       // only redraw when something changed

  // ─── s-plane geometry ────────────────────────────────────────────────
  const SPAN_X_LEFT = -3, SPAN_X_RIGHT = 1.5;
  const SPAN_Y = 3;
  function geom() {
    const rect = cSP.getBoundingClientRect();
    const padL = 40, padR = 30, padT = 70, padB = 58;
    const w = rect.width, h = rect.height;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    return {
      x0, x1, y0, y1, w, h,
      xOf: re => x0 + (re - SPAN_X_LEFT) / (SPAN_X_RIGHT - SPAN_X_LEFT) * (x1 - x0),
      yOf: im => y1 - (im + SPAN_Y) / (2 * SPAN_Y) * (y1 - y0),
      reOf: px => SPAN_X_LEFT + (px - x0) / (x1 - x0) * (SPAN_X_RIGHT - SPAN_X_LEFT),
      imOf: py => -SPAN_Y + (y1 - py) / (y1 - y0) * 2 * SPAN_Y,
    };
  }

  // ─── Input definitions ───────────────────────────────────────────────
  function inputFn(t) {
    if (t < 0) return 0;
    switch (inputKind) {
      case 'impulse': return 0;             // handled via initial state
      case 'step':    return 1;
      case 'ramp':    return t;
      case 'exp':     return Math.exp(-inputParam * t);
      case 'sin':     return Math.sin(inputParam * t);
      case 'cos':     return Math.cos(inputParam * t);
    }
    return 0;
  }
  // X(s) poles/zeros, each with im ≥ 0 (conjugate pair implicit)
  function inputPolesZeros() {
    switch (inputKind) {
      case 'impulse': return { poles: [], zeros: [], k: 1 };
      case 'step':    return { poles: [{ re: 0, im: 0 }], zeros: [], k: 1 };
      case 'ramp':    return { poles: [{ re: 0, im: 0 }, { re: 0, im: 0 }], zeros: [], k: 1 };
      case 'exp':     return { poles: [{ re: -inputParam, im: 0 }], zeros: [], k: 1 };
      case 'sin':     return { poles: [{ re: 0, im: inputParam }], zeros: [], k: inputParam };
      case 'cos':     return { poles: [{ re: 0, im: inputParam }], zeros: [{ re: 0, im: 0 }], k: 1 };
    }
    return { poles: [], zeros: [], k: 1 };
  }
  // [word, TeX symbol] for the parameter slider label.
  function inputParamLabel() {
    if (inputKind === 'exp') return ['rate', 'a'];
    return ['frequency', '\\omega'];
  }
  function paramVisible() {
    return inputKind === 'sin' || inputKind === 'cos' || inputKind === 'exp';
  }

  // ─── Polynomial helpers (real coefficients, descending order) ────────
  function polyMul(a, b) {
    const out = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < b.length; j++)
        out[i + j] += a[i] * b[j];
    return out;
  }
  // roots = list of {re, im} where im ≥ 0; im > 0 means conjugate pair.
  function polyFromRoots(roots) {
    let p = [1];
    for (const r of roots) {
      if (Math.abs(r.im) < 1e-9) {
        p = polyMul(p, [1, -r.re]);
      } else {
        // (s − r)(s − r*) = s² − 2 Re(r) s + |r|²
        p = polyMul(p, [1, -2 * r.re, r.re * r.re + r.im * r.im]);
      }
    }
    return p;
  }
  function buildSystem() {
    const hZeros = items.filter(i => i.kind === 'zero');
    const hPoles = items.filter(i => i.kind === 'pole');
    const k = parseFloat(gain.value);
    const num = polyFromRoots(hZeros).map(c => c * k);
    const den = polyFromRoots(hPoles);
    return { num, den, hZeroCount: hZeros.length, hPoleCount: hPoles.length };
  }

  // ─── Controllable-canonical state-space realisation ─────────────────
  // Returns { A (n×n flat), B (n), C (n), Dterm, n }.  null when n === 0.
  function stateSpace(num, den) {
    const a0 = den[0];
    if (!isFinite(a0) || a0 === 0) return null;
    const D = den.map(c => c / a0);
    const N = num.map(c => c / a0);
    const n = D.length - 1;
    if (n <= 0) return null;
    while (N.length < n + 1) N.unshift(0);
    if (N.length > n + 1) N.splice(0, N.length - (n + 1)); // truncate (improper)
    const A = new Array(n * n).fill(0);
    for (let i = 0; i < n - 1; i++) A[i * n + (i + 1)] = 1;
    // last row: x_dot_{n-1} = -Σ a_j x_j + u, with a_j = D[n-j]
    for (let j = 0; j < n; j++) A[(n - 1) * n + j] = -D[n - j];
    const B = new Array(n).fill(0); B[n - 1] = 1;
    // For proper-with-feedthrough, polynomial-divide first:
    //   H(s) = Dterm + (N(s) − Dterm·D(s))/D(s)
    // Then C uses the strictly-proper part N′(s) = N(s) − Dterm·D(s).
    const Dterm = N[0];
    const C = new Array(n).fill(0);
    for (let i = 0; i < n; i++) C[i] = N[n - i] - Dterm * D[n - i];
    return { A, B, C, Dterm, n };
  }
  function matVec(A, x, n) {
    const out = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += A[i * n + j] * x[j];
      out[i] = s;
    }
    return out;
  }

  function simulate(num, den, tMax, N) {
    const ss = stateSpace(num, den);
    const dt = tMax / N;
    const out = new Array(N + 1);
    if (!ss) {
      // No poles: H(s) is the constant k.
      const k = num[num.length - 1] / den[den.length - 1];
      for (let i = 0; i <= N; i++) {
        const t = i * dt;
        const xv = inputFn(t);
        out[i] = { t, x: xv, y: k * xv };
      }
      return out;
    }
    let state = inputKind === 'impulse' ? ss.B.slice() : new Array(ss.n).fill(0);
    for (let i = 0; i <= N; i++) {
      const t = i * dt;
      const u = inputKind === 'impulse' ? 0 : inputFn(t);
      let yv = ss.Dterm * u;
      for (let j = 0; j < ss.n; j++) yv += ss.C[j] * state[j];
      out[i] = { t, x: inputFn(t), y: yv };
      if (i === N) break;
      const u2 = inputKind === 'impulse' ? 0 : inputFn(t + dt / 2);
      const u4 = inputKind === 'impulse' ? 0 : inputFn(t + dt);
      const f = (s, uu) => {
        const r = matVec(ss.A, s, ss.n);
        r[ss.n - 1] += uu; // because B = e_{n-1}
        return r;
      };
      const k1 = f(state, u);
      const m1 = state.map((s, j) => s + (dt / 2) * k1[j]);
      const k2 = f(m1, u2);
      const m2 = state.map((s, j) => s + (dt / 2) * k2[j]);
      const k3 = f(m2, u2);
      const m3 = state.map((s, j) => s + dt * k3[j]);
      const k4 = f(m3, u4);
      for (let j = 0; j < ss.n; j++)
        state[j] += (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
      // hard cap to keep RK4 from going to Inf and breaking the canvas
      for (let j = 0; j < ss.n; j++) state[j] = Math.max(-1e8, Math.min(1e8, state[j]));
    }
    return out;
  }

  // ─── Drawing ─────────────────────────────────────────────────────────
  function drawMark(ctx, G, re, im, kind, color, alpha, hi) {
    const px = G.xOf(re), py = G.yOf(im);
    if (px < G.x0 - 4 || px > G.x1 + 4 || py < G.y0 - 4 || py > G.y1 + 4) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    CFG.mark(ctx, kind, px, py, color, 7, 2.2 + (hi ? 1 : 0));
    ctx.restore();
  }
  function drawSPlane() {
    const { ctx, w, h } = CFG.setupCanvas(cSP);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);
    const G = geom();
    // shaded half-planes
    ctx.fillStyle = CFG.alpha(C.time, 0.1);
    ctx.fillRect(G.x0, G.y0, G.xOf(0) - G.x0, G.y1 - G.y0);
    ctx.fillStyle = CFG.alpha(C.imag, 0.08);
    ctx.fillRect(G.xOf(0), G.y0, G.x1 - G.xOf(0), G.y1 - G.y0);
    // grid
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let v = Math.ceil(SPAN_X_LEFT); v <= Math.floor(SPAN_X_RIGHT); v++) {
      const x = G.xOf(v);
      ctx.beginPath(); ctx.moveTo(x, G.y0); ctx.lineTo(x, G.y1); ctx.stroke();
    }
    for (let v = -Math.floor(SPAN_Y); v <= Math.floor(SPAN_Y); v++) {
      const y = G.yOf(v);
      ctx.beginPath(); ctx.moveTo(G.x0, y); ctx.lineTo(G.x1, y); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(G.x0, G.yOf(0)); ctx.lineTo(G.x1, G.yOf(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(G.xOf(0), G.y0); ctx.lineTo(G.xOf(0), G.y1); ctx.stroke();
    CFG.ticks(ctx, 'bottom', [-3, -2, -1, 0, 1], G.xOf, G.y1, C.muted);
    CFG.ticks(ctx, 'left', [-3, -2, -1, 0, 1, 2, 3], G.yOf, G.x0, C.muted);
    CFG.label(ctx, '$jω$', G.xOf(0), G.y0 - 6, C.muted, { align: 'center', baseline: 'bottom' });
    CFG.label(ctx, '$σ$', G.x1 + 10, G.yOf(0), C.muted, { baseline: 'middle' });
    CFG.label(ctx, 'LHP: stable', G.x0 + 6, G.y1 - 6, C.time, { baseline: 'bottom' });
    CFG.label(ctx, 'RHP', G.x1 - 6, G.y1 - 6, C.imag, { align: 'right', baseline: 'bottom' });

    // input poles and zeros (forced by x(t)), drawn in the highlight colour
    const inp = inputPolesZeros();
    const inputCol = C.accent;
    function drawInputRoot(r, kind) {
      drawMark(ctx, G, r.re, r.im, kind, inputCol, 0.9, false);
      if (Math.abs(r.im) > 1e-6) drawMark(ctx, G, r.re, -r.im, kind, inputCol, 0.6, false);
    }
    inp.poles.forEach(p => drawInputRoot(p, 'pole'));
    inp.zeros.forEach(z => drawInputRoot(z, 'zero'));

    // user H items + their conjugates
    for (const it of items) {
      const color = it.kind === 'pole' ? C.imag : C.time;
      const hi = drag && drag.item === it;
      drawMark(ctx, G, it.re, it.im, it.kind, color, 1, hi);
      if (Math.abs(it.im) > 1e-6) drawMark(ctx, G, it.re, -it.im, it.kind, color, 0.7, false);
    }

    // legend along the bottom edge
    CFG.legend(ctx, G.x0, G.y1 + 40, [
      { mark: 'pole', text: 'pole', color: C.imag },
      { mark: 'zero', text: 'zero', color: C.time },
      { mark: 'pole', text: 'input $X(s)$', color: C.accent },
    ]);
  }

  function drawIO() {
    const { ctx, w, h } = CFG.setupCanvas(cIO);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    const sys = buildSystem();
    const improper = sys.num.length > sys.den.length;

    // pick a reasonable plot horizon
    const inp = inputPolesZeros();
    const allPoles = [...inp.poles, ...items.filter(i => i.kind === 'pole')];
    let slow = 4;
    for (const p of allPoles) {
      if (p.re < -1e-3) slow = Math.max(slow, 5 / -p.re);
      if (Math.abs(p.re) < 1e-3 && Math.abs(p.im) > 1e-3) slow = Math.max(slow, 4 * Math.PI / Math.abs(p.im));
      if (Math.abs(p.re) < 1e-3 && Math.abs(p.im) < 1e-3) slow = Math.max(slow, 8); // pure integrator
    }
    if (inputKind === 'sin' || inputKind === 'cos') slow = Math.max(slow, 6 * Math.PI / inputParam);
    if (inputKind === 'exp') slow = Math.max(slow, 5 / inputParam);
    let tMax = Math.min(slow, 40);

    const samples = improper ? [] : simulate(sys.num, sys.den, tMax, 700);
    let yMax = 0.5, xMax = 0.5;
    for (const s of samples) {
      if (isFinite(s.x)) xMax = Math.max(xMax, Math.abs(s.x));
      if (isFinite(s.y)) yMax = Math.max(yMax, Math.abs(s.y));
    }
    // Round each range up to a tidy value so the tick labels read cleanly.
    const tidy = v => { const p = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / p * 2) / 2 * p; };
    xMax = tidy(xMax); yMax = tidy(Math.min(yMax, 1e6));

    const padL = 58, padR = 16, padT = 78, padB = 48;
    const midGap = 30;
    const x0 = padL, x1 = w - padR;
    const topY0 = padT;
    const topY1 = padT + (h - padT - padB - midGap) / 2;
    const botY0 = topY1 + midGap;
    const botY1 = h - padB;

    function lane(y0, y1, color, label, getter, ymax, isInputLane) {
      const mid = (y0 + y1) / 2;
      const amp = (y1 - y0) / 2 - 4;
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();
      ctx.strokeStyle = C.gridStrong;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();

      if (samples.length) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          let v = getter(s);
          if (!isFinite(v)) { started = false; continue; }
          v = CFG.clamp(v, -ymax * 1.05, ymax * 1.05);
          const px = x0 + (s.t / tMax) * (x1 - x0);
          const py = mid - (v / ymax) * amp;
          if (!started) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // impulse spike marker
      if (isInputLane && inputKind === 'impulse') {
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + 1, mid); ctx.lineTo(x0 + 1, y0 + 6);
        ctx.moveTo(x0 - 4, y0 + 10); ctx.lineTo(x0 + 1, y0 + 6); ctx.lineTo(x0 + 6, y0 + 10);
        ctx.stroke();
        CFG.label(ctx, '$δ(t)$', x0 + 12, y0 + 4, color);
      }

      CFG.label(ctx, label, x0, y0 - 22, color);
      CFG.ticks(ctx, 'left', [-ymax, 0, ymax], v => mid - (v / ymax) * amp, x0, C.muted, v => (Math.abs(v) >= 100 ? v.toExponential(0) : String(+v.toFixed(2))).replace('-', '\u2212'));
    }

    lane(topY0, topY1, C.real, '$x(t)$ input',  s => s.x, xMax, true);
    lane(botY0, botY1, C.imag, '$y(t)$ output', s => s.y, yMax, false);

    CFG.label(ctx, '$t$ (s)', (x0 + x1) / 2, botY1 + 26, C.muted, { align: 'center' });
    CFG.ticks(ctx, 'bottom', [0, 0.25, 0.5, 0.75, 1].map(u => u * tMax), t => x0 + (t / tMax) * (x1 - x0), botY1, C.muted, v => String(+v.toFixed(1)));

    // status line
    let status = 'Stable response';
    const userPoles = items.filter(i => i.kind === 'pole');
    const unstable = userPoles.some(p => p.re > 1e-4);
    const onAxis   = userPoles.some(p => Math.abs(p.re) < 1e-4 && Math.abs(p.im) > 1e-4);
    const atOrigin = userPoles.some(p => Math.abs(p.re) < 1e-4 && Math.abs(p.im) < 1e-4);
    const biproper = sys.hPoleCount > 0 && sys.num.length === sys.den.length;
    if (improper) status = 'Improper: H(s) needs at least as many poles as zeros';
    else if (unstable) status = 'Unstable: pole in the RHP, output grows';
    else if (atOrigin) status = 'Pole at the origin: H(s) integrates the input';
    else if (onAxis) status = 'Marginally stable: poles on the jω axis';
    else if (userPoles.length === 0) status = inputKind === 'impulse' ? 'Static gain: y(t) = k·δ(t), not drawn' : 'Static gain: y(t) = k·x(t)';
    else if (biproper && inputKind === 'impulse') status = 'Stable response, plus an impulse k·δ(t) at t = 0 (not drawn)';
    iosub.textContent = status;
  }

  function updateHsubText() {
    const userZ = items.filter(i => i.kind === 'zero').length;
    const userP = items.filter(i => i.kind === 'pole').length;
    const k = parseFloat(gain.value).toFixed(2);
    hsub.textContent = `H(s): ${userZ} zero${userZ === 1 ? '' : 's'}, ${userP} pole${userP === 1 ? '' : 's'}, k = ${k}`;
  }

  function drawAll() {
    drawSPlane();
    drawIO();
    updateHsubText();
    dirty = false;
  }
  function mark() { dirty = true; }

  // ─── Interaction ─────────────────────────────────────────────────────
  function hitTest(px, py) {
    const G = geom();
    let best = null, bestD = 18;
    for (const it of items) {
      const x = G.xOf(it.re), y = G.yOf(it.im);
      const d = Math.hypot(px - x, py - y);
      if (d < bestD) { best = it; bestD = d; }
      if (Math.abs(it.im) > 1e-6) {
        const x2 = G.xOf(it.re), y2 = G.yOf(-it.im);
        const d2 = Math.hypot(px - x2, py - y2);
        if (d2 < bestD) { best = it; bestD = d2; }
      }
    }
    return best;
  }
  cSP.addEventListener('pointerdown', (e) => {
    const rect = cSP.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const G = geom();
    if (px < G.x0 || px > G.x1 || py < G.y0 || py > G.y1) return;
    const hit = hitTest(px, py);
    if (e.shiftKey && hit) {
      const i = items.indexOf(hit);
      if (i >= 0) items.splice(i, 1);
      mark();
      return;
    }
    if (hit) {
      drag = { item: hit };
      cSP.setPointerCapture(e.pointerId);
      mark();
      return;
    }
    let im = G.imOf(py);
    if (im < 0) im = -im;
    if (im < 0.05) im = 0;
    const newItem = {
      kind: mode,
      re: CFG.clamp(G.reOf(px), SPAN_X_LEFT, SPAN_X_RIGHT),
      im: CFG.clamp(im, 0, SPAN_Y),
    };
    items.push(newItem);
    drag = { item: newItem };
    cSP.setPointerCapture(e.pointerId);
    mark();
  });
  cSP.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = cSP.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const G = geom();
    let im = G.imOf(py);
    if (im < 0) im = -im;
    if (im < 0.05) im = 0;
    drag.item.re = CFG.clamp(G.reOf(px), SPAN_X_LEFT, SPAN_X_RIGHT);
    drag.item.im = CFG.clamp(im, 0, SPAN_Y);
    mark();
  });
  function endDrag() { if (drag) { drag = null; mark(); } }
  cSP.addEventListener('pointerup', endDrag);
  cSP.addEventListener('pointercancel', endDrag);
  cSP.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = cSP.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const hit = hitTest(px, py);
    if (hit) {
      const i = items.indexOf(hit);
      if (i >= 0) items.splice(i, 1);
      mark();
    }
  });

  // ─── Controls ────────────────────────────────────────────────────────
  function renderParamLabel() {
    const [word, tex] = inputParamLabel();
    paramLbl.textContent = word + ' ';
    const sym = paramLbl.appendChild(document.createElement('span'));
    if (window.katex) {
      try { katex.render(tex, sym, { throwOnError: false }); return; }
      catch (_) { /* fall through */ }
    }
    sym.textContent = tex.replace('\\omega', 'ω');
  }
  function syncParamUI() {
    paramRow.style.display = paramVisible() ? '' : 'none';
    renderParamLabel();
    paramO.textContent = inputParam.toFixed(2);
  }
  inputSeg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    inputSeg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    inputKind = b.dataset.v;
    if (inputKind === 'exp') {
      param.min = '0.1'; param.max = '2'; param.step = '0.05';
      if (inputParam < 0.1 || inputParam > 2) inputParam = 0.5;
    } else {
      param.min = '0.2'; param.max = '3'; param.step = '0.05';
      if (inputParam < 0.2 || inputParam > 3) inputParam = 1;
    }
    param.value = inputParam;
    syncParamUI();
    mark();
  }));
  modeSeg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    modeSeg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    mode = b.dataset.v;
  }));
  param.addEventListener('input', () => {
    inputParam = parseFloat(param.value);
    paramO.textContent = inputParam.toFixed(2);
    mark();
  });
  gain.addEventListener('input', () => {
    gainO.textContent = parseFloat(gain.value).toFixed(2);
    mark();
  });
  resetBtn.addEventListener('click', () => {
    items.length = 0;
    items.push({ kind: 'pole', re: -1, im: 0 });
    mark();
  });
  clearBtn.addEventListener('click', () => {
    items.length = 0;
    mark();
  });

  // ─── Init ────────────────────────────────────────────────────────────
  syncParamUI();
  gainO.textContent = parseFloat(gain.value).toFixed(2);

  function loop() { if (dirty) drawAll(); }
  CFG.registerLoop(cSP, loop);
  window.addEventListener('theme-change', () => { mark(); });
  window.addEventListener('resize', () => { mark(); });
  // re-render math label once KaTeX is up
  function tryKaTeX(n) {
    if (window.katex) { renderParamLabel(); return; }
    if (n > 20) return;
    setTimeout(() => tryKaTeX(n + 1), 60);
  }
  tryKaTeX(0);
  drawAll();
})();
