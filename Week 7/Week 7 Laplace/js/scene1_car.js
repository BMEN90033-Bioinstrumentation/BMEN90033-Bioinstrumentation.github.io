// Scene 1, Zoomed quarter-car suspension.
// The wheel stays on the road surface at all times. As a bump passes under it,
// the wheel moves up/down following the road profile. The chassis above reacts
// through the spring/damper, oscillating based on the suspension response.
// Plot above shows chassis vertical displacement z(t), what the driver feels.
(function () {
  const canvas = document.getElementById('carCanvas');
  if (!canvas) return;
  const sub = document.getElementById('carSub');
  let mode = 'good';
  const params = {
    good: { zeta: 0.75, wn: 4.8, label: 'Well damped (ζ = 0.75)' },
    ring: { zeta: 0.12, wn: 5.0, label: 'Underdamped (ζ = 0.12)' },
    bad:  { zeta: -0.05, wn: 4.8, label: 'Unstable (ζ = −0.05)' },
  };

  // Time offset so we can rewind the animation to t=0 when the design changes.
  let lastTAnim = 0;
  let tReset = 0;

  function updateSub() {
    sub.textContent = params[mode].label;
    sub.className = 'sub ' + (mode === 'bad' ? 'bad' : mode === 'ring' ? 'warn' : 'ok');
  }
  updateSub();

  document.querySelectorAll('#carSeg button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#carSeg button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      mode = b.getAttribute('data-v');
      cache.mode = null;
      updateSub();
      // Restart the animation so the bump enters fresh from the right.
      tReset = lastTAnim;
    });
  });

  // --- world/time constants ---
  const LOOP = 8.0;
  const ROAD_SPEED = 3.4;
  const BUMP_POS_WORLD = 2.8;
  const BUMP_HALFW = 0.35;

  // Road profile u(t): vertical road height at the wheel's contact at time t.
  // Bump is a smooth cosine hump.
  function travelled(t) { return ROAD_SPEED * t; }
  function roadU(t) {
    const s = travelled(t);
    const d = s - BUMP_POS_WORLD;
    if (Math.abs(d) > BUMP_HALFW) return 0;
    return 0.5 * (1 + Math.cos(Math.PI * d / BUMP_HALFW));
  }

  // Chassis response z(t) from road input u(t), modeled as a 2nd-order system:
  //   z'' + 2ζωₙ z' + ωₙ² z = ωₙ² u(t)
  // Integrate numerically over [0, t] with RK2 or just fine-grained Euler.
  // Cache across the loop window.
  let cache = { mode: null, z: null, dt: 0.01, tMax: 0 };
  function computeChassis() {
    if (cache.mode === mode) return;
    const p = params[mode];
    const dt = 0.005;
    const N = Math.ceil(LOOP / dt) + 2;
    const z = new Float32Array(N);
    let zv = 0, zp = 0;
    for (let i = 1; i < N; i++) {
      const t = i * dt;
      const u = roadU(t);
      const za = p.wn * p.wn * (u - zp) - 2 * p.zeta * p.wn * zv;
      zv += za * dt;
      zp += zv * dt;
      z[i] = zp;
    }
    cache = { mode, z, dt, tMax: (N - 1) * dt };
  }
  function chassisZ(t) {
    computeChassis();
    if (t <= 0) return 0;
    const idx = t / cache.dt;
    const i0 = Math.floor(idx), i1 = Math.min(cache.z.length - 1, i0 + 1);
    const frac = idx - i0;
    return cache.z[i0] * (1 - frac) + cache.z[i1] * frac;
  }

  function draw(tAnim) {
    lastTAnim = tAnim;
    const tLocal = Math.max(0, tAnim - tReset);

    const { ctx, w, h } = CFG.setupCanvas(canvas);
    const C = CFG.colors();
    CFG.clear(ctx, w, h);

    // Suspension on the LEFT, plot on the RIGHT. The plot's leading edge
    // (current time) sits at its LEFT edge, right next to the chassis, so
    // as time advances the response appears to flow out of the suspension.
    const splitX = Math.round(w * 0.48);
    const gap = 10;
    const suspInfo = drawSuspension(ctx, 0, 0, splitX - gap, h, tLocal, C);
    const plotInfo = drawPlot(ctx, splitX + gap, 0, w - splitX - gap, h, tLocal, C);

    // Connector: dashed line from the chassis marker to the pen on the plot
    if (suspInfo && plotInfo) {
      ctx.strokeStyle = CFG.alpha(C.time, 0.55);
      ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(suspInfo.readoutX, suspInfo.readoutY);
      ctx.lineTo(plotInfo.leadX, plotInfo.leadY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawPlot(ctx, px, py, pw, ph, tAnim, C) {
    const padL = 40, padR = 14, padT = 30, padB = 30;
    const x0 = px + padL, y0 = py + ph - padB;
    const x1 = px + pw - padR, y1 = py + padT;
    const midY = (y0 + y1) / 2;
    const tNow = tAnim % LOOP;
    const pxPerSec = (x1 - x0) / LOOP;
    // Sampler: before the animation started (t < 0) the plot is blank, this
    // makes a fresh reset "fill in" from the left. Past t=LOOP the response
    // wraps so the animation stays continuous.
    const zAt = (t) => {
      if (t < 0) return 0;
      const tM = ((t % LOOP) + LOOP) % LOOP;
      return chassisZ(tM);
    };

    // grid
    ctx.strokeStyle = C.grid;
    for (let i = 1; i < 8; i++) {
      const gx = x0 + (x1 - x0) * i / 8;
      ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y1); ctx.stroke();
    }
    for (let i = 1; i < 4; i++) {
      const gy = y1 + (y0 - y1) * i / 4;
      ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke();
    }
    ctx.strokeStyle = C.gridStrong;
    ctx.beginPath(); ctx.moveTo(x0, midY); ctx.lineTo(x1, midY); ctx.stroke();
    // The "pen" y-axis at the LEFT edge, this is where the chassis feeds in.
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.stroke();

    // Bump window slides rightward over time (older events further right).
    const tEntry = (BUMP_POS_WORLD - BUMP_HALFW) / ROAD_SPEED;
    const tExit  = (BUMP_POS_WORLD + BUMP_HALFW) / ROAD_SPEED;
    const deltaEntry = ((tNow - tEntry) % LOOP + LOOP) % LOOP;
    const deltaExit  = ((tNow - tExit)  % LOOP + LOOP) % LOOP;
    const xE = x0 + deltaEntry * pxPerSec;
    const xX = x0 + deltaExit  * pxPerSec;
    const bumpL = Math.min(xE, xX);
    const bumpR = Math.max(xE, xX);
    // Only render the band if both edges currently sit inside the plot window
    // (avoids a stretched shade straddling the wrap).
    if (bumpR - bumpL < (x1 - x0) * 0.5) {
      ctx.fillStyle = CFG.alpha(C.accent, 0.10);
      ctx.fillRect(bumpL, y1, Math.max(2, bumpR - bumpL), y0 - y1);
      ctx.strokeStyle = CFG.alpha(C.accent, 0.5); ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(bumpL, y0); ctx.lineTo(bumpL, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bumpR, y0); ctx.lineTo(bumpR, y1); ctx.stroke();
      ctx.setLineDash([]);
      CFG.label(ctx, 'bump', (bumpL + bumpR) / 2, y1 - 18, C.accent, { align: 'center' });
    }

    // axis labels
    CFG.label(ctx, 'z(t)', px + 14, midY, C.time, { rotate: true, align: 'center', baseline: 'middle' });
    CFG.label(ctx, 'time before present', (x0 + x1) / 2, y0 + 8, C.muted, { align: 'center' });
    CFG.label(ctx, '0', x0 - 8, midY, C.muted, { align: 'right', baseline: 'middle' });

    // Response curve: the current value is at x0 (left, next to the chassis);
    // history trails to the right.
    const N = 360;
    ctx.strokeStyle = C.time; ctx.lineWidth = 2.2;
    ctx.beginPath();
    let first = true;
    for (let i = 0; i <= N; i++) {
      const dt = (i / N) * LOOP;
      const z = zAt(tNow - dt);
      const xx = x0 + dt * pxPerSec;
      const yy = CFG.clamp(midY - z * (y0 - midY) * 0.9, y1 + 3, y0 - 3);
      if (first) { ctx.moveTo(xx, yy); first = false; } else ctx.lineTo(xx, yy);
    }
    ctx.stroke();

    // Pen dot at the LEFT edge, visually attached to the chassis.
    const zNow = zAt(tNow);
    const yNow = CFG.clamp(midY - zNow * (y0 - midY) * 0.9, y1 + 3, y0 - 3);
    ctx.fillStyle = C.time;
    ctx.beginPath(); ctx.arc(x0, yNow, 5, 0, Math.PI * 2); ctx.fill();

    return { leadX: x0, leadY: yNow };
  }

  // ---------------------------------------------------------------
  // Zoomed suspension assembly.
  // Layout (in pixel space):
  //   top band: chassis rail (fixed)
  //   middle: coil spring + shock absorber (telescopic damper)
  //   bottom: A-arm (control arm) pivoted on inner chassis mount, outboard end holds wheel
  //   road: scrolls right-to-left; bump moves with it
  // ---------------------------------------------------------------
  function drawSuspension(ctx, sx, sy, sw, sh, tAnim, C) {
    ctx.save();
    ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();

    const tNow = tAnim % LOOP;
    const uNorm = roadU(tNow);
    const zNorm = chassisZ(tNow);

    // reference geometry
    const roadY0  = sy + sh * 0.82;
    const wheelR  = sh * 0.16;
    const liftPx  = Math.min(sh * 0.09, 26);

    const chassisY0 = sy + sh * 0.14;
    const chassisY  = chassisY0 - zNorm * liftPx;

    const wheelCX = sx + sw * 0.60;
    const hubY0 = roadY0 - wheelR;
    const hubY  = hubY0 - uNorm * liftPx;

    // chassis-relative anchor points for strut top and lower arm pivot
    const strutTopX = wheelCX - sw * 0.04;         // near-vertical strut, slightly inboard of hub
    const strutTopY = chassisY + sh * 0.03;        // just below the chassis rail, at strut tower
    const pivotCX = sx + sw * 0.16;                // inboard lower-arm bushing on subframe
    const pivotCY = chassisY + sh * 0.22;          // below chassis

    // ---------- background: chassis rail (moves with chassis) ----------
    drawChassisRail(ctx, sx, sy, sw, sh, chassisY, C);
    // strut tower (short vertical pillar from chassis down a bit), drawn between chassis and strut top
    drawStrutTower(ctx, strutTopX, chassisY + Math.max(8, sh * 0.025), strutTopY, C);
    // lower-arm pivot bracket hanging off the subframe
    drawPivotBracket(ctx, pivotCX, chassisY + Math.max(8, sh * 0.025), pivotCY, C);

    // ---------- road surface ----------
    drawRoad(ctx, sx, sy, sw, sh, roadY0, tNow, C);

    // ---------- lower control arm (A-arm) ----------
    // Ball joint sits at the bottom of the steering knuckle, a bit below the hub.
    const ballJointX = wheelCX - wheelR * 0.15;
    const ballJointY = hubY + wheelR * 0.75;
    drawAArm(ctx, pivotCX, pivotCY, ballJointX, ballJointY, C);

    // ---------- MacPherson strut (coilover from chassis down to knuckle top) ----------
    // Strut bottom attaches to the steering knuckle near the top of the wheel.
    const strutBotX = wheelCX - wheelR * 0.08;
    const strutBotY = hubY - wheelR * 0.75;
    drawStrut(ctx, strutTopX, strutTopY, strutBotX, strutBotY, C);

    // ---------- steering knuckle + wheel ----------
    drawKnuckle(ctx, wheelCX, hubY, wheelR, ballJointX, ballJointY, strutBotX, strutBotY, C);
    drawWheel(ctx, wheelCX, hubY, wheelR, tAnim, C);

    // ---------- overlays: readouts and arrows ----------
    // Anchor the chassis-height readout near the right edge of the suspension
    // panel so it lines up with the plot's pen on the right half of the canvas.
    const readoutX = Math.min(wheelCX + wheelR + 28, sx + sw - 18);
    const readout = drawReadout(ctx, readoutX, chassisY, chassisY0, zNorm, C);

    // caption
    CFG.label(ctx, '← road motion', sx + sw - 12, roadY0 + 16, C.muted, { align: 'right' });
    // The label rides above the rail so the rail never covers it.
    CFG.label(ctx, 'chassis (sprung mass)', sx + 14,
      Math.max(sy + 2, chassisY - Math.max(10, sh * 0.05) / 2 - 19), C.muted);

    ctx.restore();
    return readout;
  }

  // The assembly is drawn as a flat line drawing: light grey fills from the
  // theme tokens with ink outlines.
  function outline(ctx, C) { ctx.strokeStyle = C.fg; ctx.lineWidth = 1; }

  function drawStrutTower(ctx, cx, topY, botY, C) {
    const w = 14;
    ctx.fillStyle = C.line;
    outline(ctx, C);
    ctx.fillRect(cx - w / 2, topY, w, Math.max(4, botY - topY));
    ctx.strokeRect(cx - w / 2, topY, w, Math.max(4, botY - topY));
  }

  function drawPivotBracket(ctx, cx, topY, botY, C) {
    const w = 10;
    ctx.fillStyle = C.line;
    outline(ctx, C);
    ctx.fillRect(cx - w / 2, topY, w, Math.max(4, botY - topY + 4));
    ctx.strokeRect(cx - w / 2, topY, w, Math.max(4, botY - topY + 4));
  }

  function drawChassisRail(ctx, sx, sy, sw, sh, chassisY, C) {
    const thick = Math.max(10, sh * 0.05);
    // car body above the rail
    ctx.fillStyle = C.panel;
    ctx.fillRect(sx + 8, sy + 4, sw - 16, Math.max(2, chassisY - thick / 2 - sy - 4));
    // main rail
    ctx.fillStyle = C.line;
    outline(ctx, C);
    ctx.fillRect(sx + 8, chassisY - thick / 2, sw - 16, thick);
    ctx.strokeRect(sx + 8, chassisY - thick / 2, sw - 16, thick);
    // bolt heads
    ctx.fillStyle = C.fg;
    for (let i = 0; i < 8; i++) {
      const bx = sx + 28 + i * ((sw - 56) / 7);
      ctx.beginPath(); ctx.arc(bx, chassisY, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawRoad(ctx, sx, sy, sw, sh, roadY0, tNow, C) {
    // ground fill
    ctx.fillStyle = C.panel;
    ctx.fillRect(sx, roadY0, sw, sy + sh - roadY0);

    // Scrolling bump: the wheel is fixed at wheelCX in world; the bump moves left.
    // The bump centre sits at (BUMP_POS_WORLD - travelled(tNow)) * pxPerUnit
    // from the wheel's screen x.
    const pxPerUnit = sw * 0.12; // world-unit -> pixels
    const wheelCX = sx + sw * 0.58;
    const bumpDist = BUMP_POS_WORLD - travelled(tNow);
    const bumpPx = wheelCX + bumpDist * pxPerUnit;
    const bumpWpx = BUMP_HALFW * 2 * pxPerUnit;
    const bumpHpx = Math.min(sh * 0.06, 16);

    // road surface: flat segments either side of the bump
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sx, roadY0);
    ctx.lineTo(bumpPx - bumpWpx / 2, roadY0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bumpPx + bumpWpx / 2, roadY0);
    ctx.lineTo(sx + sw, roadY0);
    ctx.stroke();

    // bump hump
    if (bumpPx - bumpWpx / 2 < sx + sw && bumpPx + bumpWpx / 2 > sx) {
      const N = 24;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const x = bumpPx - bumpWpx / 2 + u * bumpWpx;
        const y = roadY0 - bumpHpx * 0.5 * (1 + Math.cos(Math.PI * (u * 2 - 1)));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.fillStyle = CFG.alpha(C.accent, 0.25);
      ctx.fill();
      ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // texture: scrolling hash marks just under the road line
    ctx.strokeStyle = CFG.ink(0.3);
    ctx.lineWidth = 1;
    const scrollPx = (travelled(tNow) * pxPerUnit) % 30;
    for (let x = sx - scrollPx; x < sx + sw; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, roadY0 + 6);
      ctx.lineTo(x + 14, roadY0 + 6);
      ctx.stroke();
    }
  }

  function drawAArm(ctx, px, py, bx, by, C) {
    // A-arm: a triangular plate pivoting at (px,py), with ball joint at (bx,by).
    // The outboard vertex is at the ball joint and the two inner vertices are
    // stacked vertically at the pivot (a pair of bushings).
    const inboardDY = 10;
    const a1 = { x: px, y: py - inboardDY };
    const a2 = { x: px, y: py + inboardDY };
    const a3 = { x: bx, y: by };

    // pivot bracket on chassis: two vertical tabs
    ctx.fillStyle = C.line;
    outline(ctx, C);
    ctx.fillRect(px - 8, py - inboardDY - 6, 5, inboardDY * 2 + 12);
    ctx.fillRect(px + 3, py - inboardDY - 6, 5, inboardDY * 2 + 12);
    ctx.strokeRect(px - 8, py - inboardDY - 6, 5, inboardDY * 2 + 12);
    ctx.strokeRect(px + 3, py - inboardDY - 6, 5, inboardDY * 2 + 12);

    // main plate
    ctx.fillStyle = C.line;
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(a3.x, a3.y);
    ctx.lineTo(a2.x, a2.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // central rib
    ctx.strokeStyle = CFG.ink(0.35);
    ctx.beginPath();
    ctx.moveTo(px + 2, py);
    ctx.lineTo(bx - 4, by);
    ctx.stroke();

    // inner bushings
    drawBushing(ctx, a1.x, a1.y, 5, C);
    drawBushing(ctx, a2.x, a2.y, 5, C);
  }

  function drawBushing(ctx, cx, cy, r, C) {
    ctx.fillStyle = C.fg;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.bg;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawStrut(ctx, x1, y1, x2, y2, C) {
    // Coil spring wraps around a telescopic damper (piston + cylinder).
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux; // perpendicular (width direction)

    // --- damper cylinder (bottom half) ---
    const cylWidth = 7;
    const cylLen = len * 0.5;
    const cylTopX = x1 + ux * (len - cylLen);
    const cylTopY = y1 + uy * (len - cylLen);

    // piston rod from top mount down into cylinder
    ctx.strokeStyle = C.grey;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(cylTopX, cylTopY);
    ctx.stroke();

    // cylinder body
    ctx.fillStyle = C.line;
    outline(ctx, C);
    ctx.beginPath();
    ctx.moveTo(cylTopX + nx * cylWidth, cylTopY + ny * cylWidth);
    ctx.lineTo(cylTopX - nx * cylWidth, cylTopY - ny * cylWidth);
    ctx.lineTo(x2 - nx * cylWidth, y2 - ny * cylWidth);
    ctx.lineTo(x2 + nx * cylWidth, y2 + ny * cylWidth);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // --- coil spring around the damper ---
    const springR = 14;
    const coils = 9;
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= coils * 8; i++) {
      const u = i / (coils * 8);
      const acrossAngle = u * coils * 2 * Math.PI;
      const baseX = x1 + ux * u * len;
      const baseY = y1 + uy * u * len;
      const side = Math.cos(acrossAngle) * springR;
      const depth = Math.sin(acrossAngle) * 2;
      const ptX = baseX + nx * side + ux * depth;
      const ptY = baseY + ny * side + uy * depth;
      if (i === 0) ctx.moveTo(ptX, ptY); else ctx.lineTo(ptX, ptY);
    }
    ctx.stroke();

    // top mount and bottom perch
    ctx.fillStyle = C.grey;
    outline(ctx, C);
    for (const [mx, my] of [[x1, y1], [x2, y2]]) {
      ctx.beginPath();
      ctx.ellipse(mx, my, springR + 4, 5, Math.atan2(dy, dx) - Math.PI / 2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  function drawKnuckle(ctx, cx, hubY, r, ballX, ballY, strutX, strutY, C) {
    // Steering knuckle: vertical piece from ball joint up past hub.
    ctx.fillStyle = C.line;
    outline(ctx, C);
    ctx.beginPath();
    ctx.moveTo(cx - 7, hubY - r * 0.25);
    ctx.lineTo(cx + 7, hubY - r * 0.25);
    ctx.lineTo(cx + 5, ballY + 2);
    ctx.lineTo(cx - 5, ballY + 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // ball joint
    drawBushing(ctx, ballX, ballY, 6, C);
  }

  function drawWheel(ctx, cx, cy, r, tAnim, C) {
    // tyre
    ctx.fillStyle = C.bg;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // tread detail
    ctx.strokeStyle = CFG.ink(0.5);
    ctx.lineWidth = 1;
    const spinAngle = tAnim * -8; // rotates as if rolling (wheel fixed in scene, road moves)
    const treads = 18;
    for (let i = 0; i < treads; i++) {
      const a = spinAngle + (i * 2 * Math.PI / treads);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }

    // rim
    ctx.fillStyle = C.line;
    outline(ctx, C);
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.bg;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2); ctx.fill();
    // spokes (5)
    ctx.strokeStyle = C.grey;
    ctx.lineWidth = 3;
    for (let k = 0; k < 5; k++) {
      const a = spinAngle + k * 2 * Math.PI / 5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.15, cy + Math.sin(a) * r * 0.15);
      ctx.lineTo(cx + Math.cos(a) * r * 0.48, cy + Math.sin(a) * r * 0.48);
      ctx.stroke();
    }
    // hub cap
    ctx.fillStyle = C.fg;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2); ctx.fill();
  }

  function drawReadout(ctx, xRef, chassisY, chassisY0, zNorm, C) {
    // vertical dashed reference from nominal chassis height to current chassis height
    ctx.strokeStyle = CFG.alpha(C.time, 0.6);
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xRef, chassisY0);
    ctx.lineTo(xRef, chassisY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = CFG.alpha(C.time, 0.35);
    ctx.beginPath();
    ctx.moveTo(xRef - 6, chassisY0); ctx.lineTo(xRef + 6, chassisY0); ctx.stroke();

    ctx.fillStyle = C.time;
    ctx.beginPath(); ctx.arc(xRef, chassisY, 4, 0, Math.PI * 2); ctx.fill();
    const zShow = Math.abs(zNorm) < 0.005 ? 0 : zNorm;
    CFG.label(ctx, `z = ${zShow >= 0 ? '+' : '−'}${Math.abs(zShow).toFixed(2)}`, xRef - 10, chassisY + 24, C.time, { align: 'right' });
    return { readoutX: xRef, readoutY: chassisY };
  }

  CFG.registerLoop(canvas, draw);
  window.addEventListener('theme-change', () => draw(0));
  window.addEventListener('resize', () => draw(0));
})();
