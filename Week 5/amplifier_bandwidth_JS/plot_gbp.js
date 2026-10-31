// Section 06 · Closed-loop Bode magnitude for noise gains 1, 10, 100, 1000
// and for the present A_v, all from one amplifier of fixed GBP, with the
// open-loop envelope GBP/w and a guide at w = GBP. Curve labels sit above
// each plateau near the left edge, collision-tested against every curve,
// guide and earlier label, with fallbacks below the plateau and, failing
// those, a leader-line placement.
(function () {
    var sel = '#plot-gbp';
    var DB_MIN = -20, DB_MAX = 80, W_MIN = 1, W_MAX = 1e12;
    var GAINS = [1, 10, 100, 1000];

    function render() {
        var A = window.AMP, p = A.p, T = window.T, css = window.CMP.cssVar;
        var f = A.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLog().domain([W_MIN, W_MAX]).range([0, iw]);
        var y = d3.scaleLinear().domain([DB_MIN, DB_MAX]).range([ih, 0]);
        A.axes(f, x, y, {
            log: true, yTicks: d3.range(DB_MIN, DB_MAX + 1, 20),
            yTitle: '|A_{CL}(j\\omega)|\\;[\\mathrm{dB}]',
            xTitle: '\\omega\\;[\\mathrm{rad/s}]'
        });

        f.svg.append('clipPath').attr('id', 'clip-gbp').append('rect').attr('width', iw).attr('height', ih);
        var clip = g.append('g').attr('clip-path', 'url(#clip-gbp)');
        var P = A.placer(f);
        var ws = d3.range(0, 721).map(function (i) { return Math.pow(10, 12 * i / 720); });

        function curve(fn, col, w, dash) {
            var pts = ws.map(function (w) { return [x(w), y(fn(w))]; });
            clip.append('path').attr('d', d3.line()(pts)).attr('fill', 'none')
                .attr('stroke', col).attr('stroke-width', w).attr('stroke-dasharray', dash || null);
            P.line(pts);
        }
        function closed(av) {
            var w0 = p.GBP / av;
            return function (w) { return 20 * Math.log10(av / Math.sqrt(1 + Math.pow(w / w0, 2))); };
        }
        function dot(av, col, r) {
            var cx = x(p.GBP / av), cy = y(20 * Math.log10(av) - 3);
            clip.append('circle').attr('cx', cx).attr('cy', cy).attr('r', r).attr('fill', col);
            P.box([cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1]);
        }

        // Guide at w = GBP and the open-loop envelope.
        var gx = x(p.GBP);
        clip.append('line').attr('x1', gx).attr('x2', gx).attr('y1', 0).attr('y2', ih)
            .attr('stroke', css('--c-guide')).attr('stroke-dasharray', '6 4');
        P.line([[gx, 0], [gx, ih]]);
        curve(function (w) { return 20 * Math.log10(p.GBP / w); }, css('--c-env'), 1.4, '4 3');

        var cols = ['--c-g1', '--c-g2', '--c-g3', '--c-g4'].map(css);
        GAINS.forEach(function (av, i) { curve(closed(av), cols[i], 1.8); dot(av, cols[i], 4); });
        var cCur = css('--c-cur');
        curve(closed(p.Av), cCur, 2.8);
        dot(p.Av, cCur, 6);

        // Labels: present gain first, then the reference family.
        function plateau(av, txt, col) {
            var yl = y(20 * Math.log10(av));
            P.label(txt, function (w, h) {
                return [[w / 2 + 8, yl - h / 2 - 5], [w / 2 + 8, yl + h / 2 + 5],
                        [iw * 0.18 + w / 2, yl - h / 2 - 5], [iw * 0.18 + w / 2, yl + h / 2 + 5]];
            }, { color: col, size: 13, anchor: [8, yl] });
        }
        plateau(p.Av, 'A_v = ' + A.fmtAv(p.Av) + '\\ \\text{(present)}', cCur);
        GAINS.forEach(function (av, i) {
            if (Math.abs(Math.log10(av / p.Av)) > 0.02) plateau(av, 'A_v = ' + av, cols[i]);
        });
        P.label('\\omega = \\text{GBP}', function (w, h) {
            return [[gx + w / 2 + 6, h / 2 + 6], [gx - w / 2 - 6, h / 2 + 6],
                    [gx + w / 2 + 6, ih - h / 2 - 6], [gx - w / 2 - 6, ih - h / 2 - 6]];
        }, { color: css('--c-guide'), size: 13, anchor: [gx, 12] });
    }

    window.AMP.onRender(render);
})();
