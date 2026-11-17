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

  // Text label. opts.rotate draws the text rotated 90 degrees anticlockwise
  // about (x, y), for y-axis titles. opts.halo paints a page-coloured box
  // behind the text so that a curve passing under the label stays clear of it.
  function label(ctx, text, x, y, color, opts = {}) {
    ctx.save();
    ctx.font = FONT;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'top';
    if (opts.halo && !opts.rotate) {
      const tw = ctx.measureText(text).width, th = 16;
      const bx = ctx.textAlign === 'right' ? x - tw : ctx.textAlign === 'center' ? x - tw / 2 : x;
      const by = ctx.textBaseline === 'bottom' ? y - th : ctx.textBaseline === 'middle' ? y - th / 2 : y - 1;
      ctx.fillStyle = alpha(cssVar('--bg'), 0.9);
      ctx.fillRect(bx - 3, by - 1, tw + 6, th + 2);
    }
    ctx.fillStyle = color;
    if (opts.rotate) {
      ctx.translate(x, y); ctx.rotate(-Math.PI / 2);
      ctx.fillText(text, 0, 0);
    } else {
      ctx.fillText(text, x, y);
    }
    ctx.restore();
  }

  // Legend row drawn from (x, y), y being the row centre. Each item is
  // { mark: 'line' | 'dash' | 'pole' | 'zero', text, color }.
  function legend(ctx, x, y, items) {
    ctx.save();
    ctx.font = FONT;
    for (const it of items) {
      ctx.strokeStyle = it.color; ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath();
      if (it.mark === 'pole') {
        ctx.moveTo(x + 2, y - 5); ctx.lineTo(x + 12, y + 5);
        ctx.moveTo(x + 2, y + 5); ctx.lineTo(x + 12, y - 5);
      } else if (it.mark === 'zero') {
        ctx.arc(x + 7, y, 5, 0, Math.PI * 2);
      } else {
        if (it.mark === 'dash') ctx.setLineDash([3, 3]);
        ctx.moveTo(x, y); ctx.lineTo(x + 14, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = it.color;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(it.text, x + 20, y);
      x += 20 + ctx.measureText(it.text).width + 16;
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

  window.CFG = {
    colors, ink, alpha, mix, setupCanvas, clear, label, legend, registerLoop, lerp, clamp, FONT,
  };
})();
