// Common drawing helpers. Colours come from the theme.css tokens and window.T.
(function () {
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function colors() {
    return {
      real: cssVar('--real'),
      imag: cssVar('--imag'),
      time: cssVar('--time'),
      accent: cssVar('--mark'),          // highlighted element (orange)
      fg: cssVar('--fg'),
      muted: cssVar('--muted'),
      bg: cssVar('--bg'),
      panel: cssVar('--hydro-blue-100'),
      line: cssVar('--calcium-white-800'),
      grey: cssVar('--d-grey'),
      grid: window.T.grid,
      gridStrong: window.T.gridHeavy,
    };
  }

  // Ink at a given opacity.
  function ink(a) { return window.T.fg(a); }

  // Parse '#rgb', '#rrggbb' or 'rgb(r,g,b)'; null for anything else.
  function rgb(c) {
    c = (c || '').trim();
    if (c[0] === '#') {
      const h = c.length === 4 ? c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c.slice(1);
      const n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(c);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  // A palette colour at a given opacity.
  function alpha(c, a) {
    const p = rgb(c);
    return p ? `rgba(${p[0]},${p[1]},${p[2]},${a})` : c;
  }
  // Linear blend of two palette colours, t = 0 gives a, t = 1 gives b.
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    if (!A || !B) return a;
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
  }

  // High DPI canvas
  function setupCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }

  function clear(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
  }

  const FONT = "400 13px 'JetBrains Mono', monospace";
  // Mathematics is set in the KaTeX faces already loaded for the page copy.
  const MATH_IT = "KaTeX_Math, 'Times New Roman', serif";
  const MATH_UP = "KaTeX_Main, 'Times New Roman', serif";
  const LETTERS = 'A-Za-zͰ-Ͽ';
  const MATH_RE = new RegExp('\\\\[A-Za-z]+|[\\^_]\\{[^}]*\\}|[\\^_].|[' + LETTERS + ']+|[^' + LETTERS + '\\\\^_]+', 'g');

  // Split label text into font runs. Text between $...$ is mathematics:
  // letters are italic, digits and operators upright, \name is an upright
  // word (\cos, \Re), and ^{..} and _{..} give superscripts and subscripts.
  function mathRuns(src, size, dy, out) {
    for (const tok of src.match(MATH_RE) || []) {
      if (tok[0] === '^' || tok[0] === '_') {
        const inner = tok[1] === '{' ? tok.slice(2, -1) : tok.slice(1);
        mathRuns(inner, size * 0.72, dy + (tok[0] === '^' ? -0.42 : 0.2) * size, out);
      } else if (tok[0] === '\\') {
        out.push({ s: tok.slice(1), font: `${size}px ${MATH_UP}`, dy });
      } else if (new RegExp('^[' + LETTERS + ']').test(tok)) {
        out.push({ s: tok, font: `italic ${size}px ${MATH_IT}`, dy });
      } else {
        out.push({ s: tok, font: `${size}px ${MATH_UP}`, dy });
      }
    }
  }
  function runs(text) {
    const out = [];
    String(text).split('$').forEach((seg, i) => {
      if (!seg) return;
      if (i % 2) mathRuns(seg, 16, 0, out);
      else out.push({ s: seg, font: FONT, dy: 0 });
    });
    return out;
  }
  function measure(ctx, rs) {
    let w = 0;
    for (const r of rs) { ctx.font = r.font; r.w = ctx.measureText(r.s).width; w += r.w; }
    return w;
  }
  // Draw runs from x on the alphabetic baseline y; returns the width drawn.
  function drawRuns(ctx, rs, x, y) {
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    for (const r of rs) { ctx.font = r.font; ctx.fillText(r.s, x, y + r.dy); x += r.w; }
  }

  // Text label. opts.rotate draws the text rotated 90 degrees anticlockwise
  // about (x, y), for y-axis titles. opts.halo paints a page-coloured box
  // behind the text so that a curve passing under the label stays clear of it.
  function label(ctx, text, x, y, color, opts = {}) {
    ctx.save();
    const rs = runs(text);
    const tw = measure(ctx, rs);
    const align = opts.align || 'left', baseline = opts.baseline || 'top';
    if (opts.rotate) { ctx.translate(x, y); ctx.rotate(-Math.PI / 2); x = 0; y = 0; }
    const bx = align === 'right' ? x - tw : align === 'center' ? x - tw / 2 : x;
    const by = baseline === 'bottom' ? y - 4 : baseline === 'middle' ? y + 4.5 : y + 12;
    if (opts.halo) {
      ctx.fillStyle = alpha(cssVar('--bg'), 0.9);
      ctx.fillRect(bx - 3, by - 14, tw + 6, 19);
    }
    ctx.fillStyle = color;
    drawRuns(ctx, rs, bx, by);
    ctx.restore();
    return tw;
  }

  // Tick marks and values along a frame edge. side is 'bottom' (pos maps a
  // value to x, edge is the y of the frame) or 'left' (pos maps to y, edge is
  // the x of the frame).
  const tickText = v => String(+(+v).toFixed(2)).replace('-', '−');
  function ticks(ctx, side, vals, pos, edge, color, fmt = tickText) {
    ctx.save();
    ctx.strokeStyle = window.T.gridAxis; ctx.lineWidth = 1; ctx.setLineDash([]);
    for (const v of vals) {
      const p = pos(v);
      ctx.beginPath();
      if (side === 'bottom') { ctx.moveTo(p, edge); ctx.lineTo(p, edge + 4); }
      else { ctx.moveTo(edge - 4, p); ctx.lineTo(edge, p); }
      ctx.stroke();
      if (side === 'bottom') label(ctx, fmt(v), p, edge + 6, color, { align: 'center' });
      else label(ctx, fmt(v), edge - 7, p, color, { align: 'right', baseline: 'middle' });
    }
    ctx.restore();
  }

  // Pole (cross) or zero (ring) marker.
  function mark(ctx, kind, x, y, color, r = 7, lw = 2.2) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash([]); ctx.lineCap = 'round';
    ctx.beginPath();
    if (kind === 'pole') {
      ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
      ctx.moveTo(x - r, y + r); ctx.lineTo(x + r, y - r);
    } else {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Legend row drawn from (x, y), y being the row centre. Each item is
  // { mark: 'line' | 'dash' | 'pole' | 'zero', text, color }.
  function legend(ctx, x, y, items) {
    ctx.save();
    for (const it of items) {
      if (it.mark === 'pole' || it.mark === 'zero') {
        mark(ctx, it.mark, x + 7, y, it.color, 5, 2);
      } else {
        ctx.strokeStyle = it.color; ctx.lineWidth = 2;
        ctx.setLineDash(it.mark === 'dash' ? [3, 3] : []);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.stroke();
        ctx.setLineDash([]);
      }
      x += 20 + label(ctx, it.text, x + 20, y, it.color, { baseline: 'middle' }) + 16;
    }
    ctx.restore();
    return x;
  }

  // RAF registry with IntersectionObserver pause
  const raf = { loops: new Map(), io: null };

  function registerLoop(el, fn) {
    raf.loops.set(el, { fn, running: false, t0: performance.now() });
    if (!raf.io) {
      raf.io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const L = raf.loops.get(e.target);
          if (!L) continue;
          if (e.isIntersecting && !L.running) {
            L.running = true;
            L.t0 = performance.now();
            tick(e.target);
          } else if (!e.isIntersecting) {
            L.running = false;
          }
        }
      }, { threshold: 0.15 });
    }
    raf.io.observe(el);
  }

  function tick(el) {
    const L = raf.loops.get(el);
    if (!L || !L.running) return;
    const now = performance.now();
    L.fn((now - L.t0) / 1000);
    requestAnimationFrame(() => tick(el));
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  // Redraw once the math faces are available, since canvas text drawn before
  // then falls back to the system serif.
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load(`italic 16px ${MATH_IT}`, 'σ'), document.fonts.load(`16px ${MATH_UP}`, '1')])
      .then(() => window.dispatchEvent(new Event('resize')), () => {});
  }

  window.CFG = {
    colors, ink, alpha, mix, setupCanvas, clear, label, legend, ticks, mark, registerLoop, lerp, clamp, FONT,
  };
})();
