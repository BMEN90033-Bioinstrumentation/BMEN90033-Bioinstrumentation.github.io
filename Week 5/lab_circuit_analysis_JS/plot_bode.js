// Section 04 · Bode magnitude (top) and unwrapped phase (bottom) of A_V(jw)
// from 10 Hz to 100 MHz. Dashed guides mark f_L1, f_L2 and f_H1; their
// labels sit in the top margin, merged when same-coloured guides are close
// and moved to a second row when labels would overlap. The midband line,
// the -180 deg line and the cursor readings are labelled in-plot by
// collision test.
(function () {
    var sel = '#plot-bode';
    var F_MIN = 10, F_MAX = 1e8, DB_MIN = -30, DB_MAX = 40, PH_MIN = -315, PH_MAX = 45;

    function render() {
        var L = window.LCA, p = L.p, P = L.params(), T = window.T, css = window.CMP.cssVar;
        var f = L.frame(sel, { margin: { top: 70 } });
        var gap = 16, ph = (f.ih - gap) / 2, iw = f.iw;
        var x = d3.scaleLog().domain([F_MIN, F_MAX]).range([0, iw]);
        var yM = d3.scaleLinear().domain([DB_MIN, DB_MAX]).range([ph, 0]);
        var yP = d3.scaleLinear().domain([PH_MIN, PH_MAX]).range([ph, 0]);

        var gT = f.g;
        var gB = f.svg.append('g').attr('transform', 'translate(' + f.m.left + ',' + (f.m.top + ph + gap) + ')');
        L.axes(f, gT, x, yM, ph, 0, { log: true, yTicks: [-30, -20, -10, 0, 10, 20, 30, 40],
            yTitle: '|A_V|\\;[\\mathrm{dB}]' });
        L.axes(f, gB, x, yP, ph, ph + gap, { log: true, yTicks: [-270, -180, -90, 0],
            yFormat: function (d) { return d + '°'; },
            yTitle: '\\angle A_V\\;[^\\circ]', xTitle: 'f\\;[\\mathrm{Hz}]' });

        function clipped(g, id) {
            f.svg.append('clipPath').attr('id', id).append('rect').attr('width', iw).attr('height', ph);
            return g.append('g').attr('clip-path', 'url(#' + id + ')');
        }
        var cT = clipped(gT, 'clip-lca-mag'), cB = clipped(gB, 'clip-lca-ph');
        var PT = L.placer(f, 0, 0, iw, ph), PB = L.placer(f, 0, ph + gap, iw, ph);

        // Curves: magnitude and unwrapped phase.
        var mag = [], phs = [], prev = 0, off = 0;
        for (var i = 0; i <= 800; i++) {
            var lf = 1 + 7 * i / 800, fr = Math.pow(10, lf);
            var h = L.evalH(2 * Math.PI * fr, P);
            var pd = h.phase_deg + off;
            if (i > 0) {
                while (pd - prev > 180) { pd -= 360; off -= 360; }
                while (pd - prev < -180) { pd += 360; off += 360; }
            }
            prev = pd;
            mag.push([x(fr), yM(20 * Math.log10(Math.max(h.mag, 1e-12)))]);
            phs.push([x(fr), yP(pd)]);
        }
        cT.append('path').attr('class', 'trace').attr('stroke', css('--c-mag')).attr('d', d3.line()(mag));
        cB.append('path').attr('class', 'trace').attr('stroke', css('--c-phase')).attr('d', d3.line()(phs));
        PT.line(mag); PB.line(phs);

        // Reference lines.
        var midDb = 20 * Math.log10(P.Amid);
        function hline(g, Pl, yv, col) {
            g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yv).attr('y2', yv)
                .attr('stroke', col).attr('stroke-dasharray', '4 4');
            Pl.line([[0, yv], [iw, yv]]);
        }
        hline(cT, PT, yM(midDb), css('--c-mag'));
        hline(cB, PB, yP(-180), T.fg(0.35));

        // Pole guides through both panels.
        var tau = 2 * Math.PI;
        var marks = [
            { f: P.wL1 / tau, tex: 'f_{L1}', col: css('--c-lf') },
            { f: P.wL2 / tau, tex: 'f_{L2}', col: css('--c-lf') },
            { f: P.wH1 / tau, tex: 'f_{H1}', col: css('--c-hf') }
        ].filter(function (mk) { return mk.f >= F_MIN && mk.f <= F_MAX; })
         .sort(function (a, b) { return a.f - b.f; });
        marks.forEach(function (mk) {
            mk.x = x(mk.f);
            [[cT, PT], [cB, PB]].forEach(function (gp) {
                gp[0].append('line').attr('x1', mk.x).attr('x2', mk.x).attr('y1', 0).attr('y2', ph)
                    .attr('stroke', mk.col).attr('stroke-dasharray', '4 4');
                gp[1].line([[mk.x, 0], [mk.x, ph]]);
            });
        });
        // Merge same-coloured guides closer than 55 px into one label.
        var groups = [];
        marks.forEach(function (mk) {
            var g0 = groups[groups.length - 1];
            if (g0 && g0.col === mk.col && mk.x - g0.xs[g0.xs.length - 1] < 55) {
                g0.xs.push(mk.x); g0.tex += ',\\ ' + mk.tex + ' = ' + L.tex(L.fmtFreq(mk.f));
            } else {
                groups.push({ col: mk.col, xs: [mk.x], tex: mk.tex + ' = ' + L.tex(L.fmtFreq(mk.f)) });
            }
        });
        // Top-margin rows; a label moves up a row when it would overlap one
        // already placed, and is clamped inside the plot width.
        var rows = [f.m.top - 14, f.m.top - 36], placed = [];
        groups.forEach(function (gr) {
            var fo = window.renderKatex(f.svg, gr.tex, 0, 0, { width: 300, height: 20, size: 13, color: gr.col });
            var kn = fo.select('.katex').node();
            var w = (kn ? kn.getBoundingClientRect().width : 120) + 4;
            var cx = (gr.xs[0] + gr.xs[gr.xs.length - 1]) / 2;
            cx = Math.max(w / 2, Math.min(iw - w / 2, cx));
            var row = 0;
            while (row < rows.length - 1 && placed.some(function (b) {
                return b.row === row && cx - w / 2 < b.x1 + 8 && cx + w / 2 > b.x0 - 8;
            })) row++;
            placed.push({ row: row, x0: cx - w / 2, x1: cx + w / 2 });
            fo.attr('x', f.m.left + cx - 150).attr('y', rows[row] - 10);
        });

        // Frequency cursor.
        var fc = p.f, xc = x(fc);
        var hc = L.evalH(tau * fc, P), cDb = 20 * Math.log10(Math.max(hc.mag, 1e-12));
        var cPh = L.unwrappedPhase(P, fc);
        var pts = [[cT, PT, yM(cDb), cDb.toFixed(1) + '\\,\\text{dB}', '--c-mag'],
                   [cB, PB, yP(cPh), cPh.toFixed(1) + '^\\circ', '--c-phase']];
        pts.forEach(function (q) {
            q[0].append('line').attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', ph)
                .attr('stroke', T.fg(0.4)).attr('stroke-dasharray', '2 3');
            q[1].line([[xc, 0], [xc, ph]]);
            var yv = Math.max(0, Math.min(ph, q[2]));
            q[0].append('circle').attr('cx', xc).attr('cy', yv).attr('r', 5)
                .attr('fill', css(q[4])).attr('stroke', T.text).attr('stroke-width', 1);
            q[1].box([xc - 7, yv - 7, xc + 7, yv + 7]);
        });
        pts.forEach(function (q) {
            var yv = Math.max(0, Math.min(ph, q[2]));
            q[1].label(q[3], function (w, h) {
                var dx = w / 2 + 10, dy = h / 2 + 6;
                return [[xc + dx, yv - dy], [xc - dx, yv - dy], [xc + dx, yv + dy], [xc - dx, yv + dy],
                        [xc + dx, yv - dy - 18], [xc - dx, yv - dy - 18], [xc + dx, yv + dy + 18], [xc - dx, yv + dy + 18]];
            }, { color: T.text });
        });

        // Reference-line labels.
        PT.label(midDb.toFixed(1) + '\\,\\text{dB midband}', function (w, h) {
            var yl = yM(midDb);
            return [[iw - w / 2 - 6, yl - h / 2 - 5], [iw / 2, yl - h / 2 - 5], [w / 2 + 6, yl - h / 2 - 5],
                    [iw - w / 2 - 6, yl + h / 2 + 5]];
        }, { color: css('--c-mag'), size: 13 });
        PB.label('-180^\\circ\\ \\text{(inverting)}', function (w, h) {
            var yl = yP(-180);
            return [[iw - w / 2 - 6, yl - h / 2 - 5], [iw - w / 2 - 6, yl + h / 2 + 5],
                    [w / 2 + 6, yl + h / 2 + 5], [iw / 2, yl + h / 2 + 5]];
        }, { color: T.textDim, size: 13 });
    }

    window.LCA.onRender(render);
})();
