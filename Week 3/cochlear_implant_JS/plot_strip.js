// Section 04 · Processing strip (Canvas2D, redrawn on every playback tick).
// One row per electrode, columns: label, band-pass y_i, rectified r_i,
// envelope e_i, stimulation bar. Window of +/-50 ms about the playback
// position (or the middle of the signal when stopped); each trace scaled to
// its own peak in the window; the stimulation bar is the envelope at the
// window centre. Above 16 channels an evenly spaced subset of
// 16 rows is shown and the plot-box label says so.
//
// Layout (CSS px): plot-box label occupies y < 28; column titles at y = 44;
// rows from y = 58 to h - 12. Label column 96 px, stim column 40 px, three
// equal trace columns between them, 14 px side padding.
(function () {
    var cv = null, visible = true;
    var MAXROWS = 16, TOP = 58, BOT = 12, PAD = 14, LABW = 96, STIMW = 40;

    function setup() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
        var bw = Math.max(1, Math.round(r.width * dpr)), bh = Math.max(1, Math.round(r.height * dpr));
        if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
        var g = cv.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { g: g, w: r.width, h: r.height };
    }

    // Min/max of each pixel column, so oscillations faster than the pixel
    // pitch render as a filled band rather than an aliased line. Signed
    // signals are centred; non-negative ones (rectified, envelope) sit on a
    // baseline near the bottom of the cell.
    function trace(g, data, s0, s1, x0, y0, w, h, color, signed, line) {
        var cols = Math.max(1, Math.floor(w)), lo = [], hi = [], peak = 0;
        for (var px = 0; px < cols; px++) {
            var a = s0 + Math.floor(px / cols * (s1 - s0)), b = Math.max(a + 1, s0 + Math.floor((px + 1) / cols * (s1 - s0)));
            var mn = Infinity, mx = -Infinity;
            for (var s = a; s < b && s < data.length; s++) { if (data[s] < mn) mn = data[s]; if (data[s] > mx) mx = data[s]; }
            lo.push(mn); hi.push(mx); peak = Math.max(peak, Math.abs(mn), Math.abs(mx));
        }
        if (peak === 0 || !isFinite(peak)) peak = 1;
        var base = signed ? y0 + h / 2 : y0 + h * 0.92, amp = signed ? h * 0.44 : h * 0.84;
        var Y = function (v) { return base - v / peak * amp; };
        g.beginPath();
        for (px = 0; px < cols; px++) g.lineTo(x0 + px, Y(hi[px]));
        if (line) { g.lineTo(x0 + cols - 1, base); g.lineTo(x0, base); }
        else for (px = cols - 1; px >= 0; px--) g.lineTo(x0 + px, Y(lo[px]));
        g.closePath();
        g.save(); g.globalAlpha = line ? 0.2 : 0.85; g.fillStyle = color; g.fill(); g.restore();
        if (line) {
            g.beginPath();
            for (px = 0; px < cols; px++) g.lineTo(x0 + px, Y(hi[px]));
            g.strokeStyle = color; g.lineWidth = 1.4; g.stroke();
        }
    }

    function draw() {
        if (!cv || !visible) return;
        var CI = window.CI, d = CI.data, T = window.T, css = window.CMP.cssVar;
        var s = setup(), g = s.g, w = s.w, h = s.h;
        g.clearRect(0, 0, w, h);
        if (!d.raw || !d.env.length) return;

        var cfg = CI.config(), n = d.env.length;
        var rows = n <= MAXROWS ? d3.range(n) : d3.range(MAXROWS).map(function (k) { return Math.round(k * (n - 1) / (MAXROWS - 1)); });
        var total = d.raw.length, play = CI.play;
        var centre = play.active ? Math.floor(play.pos * d.sr) : Math.floor(total / 2);
        var half = Math.floor(d.sr * 0.05);
        var s0 = Math.max(0, centre - half), s1 = Math.min(total, centre + half);

        var colW = (w - 2 * PAD - LABW - STIMW) / 3, rh = (h - TOP - BOT) / rows.length;
        var xc = [PAD + LABW, PAD + LABW + colW, PAD + LABW + 2 * colW];

        g.font = "500 11px 'JetBrains Mono', monospace";
        g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = T.textDim;
        ['ELECTRODE', 'BAND-PASS', 'RECTIFIED', 'ENVELOPE', 'STIM'].forEach(function (t, i) {
            var cx = i === 0 ? PAD + LABW / 2 : i === 4 ? w - PAD - STIMW / 2 : xc[i - 1] + colW / 2;
            g.fillText(t, cx, 44);
        });

        g.strokeStyle = T.gridLight; g.lineWidth = 1;
        for (var k = 0; k <= rows.length; k++) {
            g.beginPath(); g.moveTo(PAD, TOP + k * rh); g.lineTo(w - PAD, TOP + k * rh); g.stroke();
        }
        [xc[0], xc[1], xc[2], w - PAD - STIMW].forEach(function (x) {
            g.beginPath(); g.moveTo(x, TOP); g.lineTo(x, h - BOT); g.stroke();
        });

        var cRect = css('--c-rect'), cEnv = css('--c-env'), labFont = rh >= 30 ? 12 : 11;
        rows.forEach(function (ch, r) {
            var y0 = TOP + r * rh, ih = rh - 6;
            g.textAlign = 'left';
            g.font = '600 ' + labFont + "px 'JetBrains Mono', monospace"; g.fillStyle = cfg.colors[ch];
            if (rh >= 30) {
                g.fillText('E' + (n - ch), PAD + 6, y0 + rh / 2 - 7);
                g.font = labFont + "px 'JetBrains Mono', monospace"; g.fillStyle = T.textDim;
                g.fillText(cfg.labels[ch], PAD + 6, y0 + rh / 2 + 8);
            } else {
                g.fillText('E' + (n - ch), PAD + 6, y0 + rh / 2);
                g.font = labFont + "px 'JetBrains Mono', monospace"; g.fillStyle = T.textDim;
                g.fillText(cfg.labels[ch], PAD + 40, y0 + rh / 2);
            }
            trace(g, d.bp[ch], s0, s1, xc[0] + 4, y0 + 3, colW - 8, ih, cfg.colors[ch], true, false);
            trace(g, d.rect[ch], s0, s1, xc[1] + 4, y0 + 3, colW - 8, ih, cRect, false, false);
            trace(g, d.env[ch], s0, s1, xc[2] + 4, y0 + 3, colW - 8, ih, cEnv, false, true);

            // Stimulation level: the envelope at the window centre.
            var bx = w - PAD - STIMW / 2 - 5, lv = d.env[ch][Math.min(centre, d.env[ch].length - 1)];
            g.fillStyle = T.overlay05; g.fillRect(bx, y0 + 3, 10, ih);
            g.fillStyle = cfg.colors[ch]; g.fillRect(bx, y0 + 3 + ih * (1 - lv), 10, ih * lv);
        });

        // Playback position: centre of the window while playing.
        if (play.active) {
            g.strokeStyle = css('--c-rec'); g.lineWidth = 1.5;
            for (var c = 0; c < 3; c++) {
                var xm = xc[c] + 4 + (colW - 8) * (centre - s0) / Math.max(1, s1 - s0);
                g.beginPath(); g.moveTo(xm, TOP); g.lineTo(xm, h - BOT); g.stroke();
            }
        }

        var lab = document.getElementById('strip-label');
        if (lab) lab.innerHTML = 'processing strip · <b>band-pass, rectified and envelope per electrode</b>' +
            (n > MAXROWS ? ' · ' + MAXROWS + ' of ' + n + ' shown' : '');
    }

    function init() {
        cv = document.getElementById('plot-strip');
        new IntersectionObserver(function (es) {
            visible = es[0].isIntersecting;
            if (visible) draw();
        }).observe(cv);
        window.CI.onRender(draw);
        window.addEventListener('citick', draw);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
