// Section 03 · Nernst relation E(a_Cl) on a log activity axis, with the
// standard state (a = 1), typical body fluid (a = 0.08) and two electrodes at
// the slider activities. The reference labels are placed by collision test
// against the line, the plot edges, both electrode markers and their guides.
(function () {
    var sel = '#plot-nernst';
    var A_MIN = 1e-3, A_MAX = 1;

    function render() {
        var B = window.ELI, p = B.p, T = window.T, css = window.CMP.cssVar;
        var f = B.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;

        var x = d3.scaleLog().domain([A_MIN, A_MAX]).range([0, iw]);
        var y = d3.scaleLinear().domain([0.19, 0.42]).range([ih, 0]);
        B.axes(f, g, x, y, {
            xTicks: [1e-3, 1e-2, 1e-1, 1],
            xFormat: function (d) { return d >= 1 ? '1' : String(d); },
            yFormat: function (d) { return d.toFixed(2); },
            xTitle: 'a_{\\text{Cl}^-}',
            yTitle: 'E\\;\\text{vs SHE}\\;[\\mathrm{V}]'
        });

        var pts = d3.range(0, 201).map(function (i) {
            var a = A_MIN * Math.pow(A_MAX / A_MIN, i / 200);
            return [x(a), y(B.nernst(a))];
        });
        g.append('path').attr('class', 'trace').attr('stroke', css('--c-nernst')).attr('d', d3.line()(pts));

        // The two electrodes: dashed guides from each point to both axes.
        var e1 = B.nernst(Math.pow(10, p.lacl)), e2 = B.nernst(Math.pow(10, p.lacl2));
        var els = [[x(Math.pow(10, p.lacl)), y(e1)], [x(Math.pow(10, p.lacl2)), y(e2)]];
        els.forEach(function (q) {
            g.append('path').attr('fill', 'none').attr('stroke', css('--c-ref')).attr('stroke-dasharray', '4 4')
                .attr('d', 'M' + q[0] + ',' + ih + 'V' + q[1] + 'H0');
        });

        var refs = [
            { a: 1, tex: '\\text{standard},\\; a = 1' },
            { a: 0.08, tex: '\\text{body fluid},\\; a \\approx 0.08' }
        ];
        var placed = els.map(function (q) { return [q[0] - 10, q[1] - 10, q[0] + 10, q[1] + 10]; });
        function hit(b) {
            if (b[0] < 4 || b[2] > iw - 4 || b[1] < 4 || b[3] > ih - 4) return true;
            if (pts.some(function (q) { return q[0] > b[0] - 3 && q[0] < b[2] + 3 && q[1] > b[1] - 3 && q[1] < b[3] + 3; })) return true;
            // Dashed guides of the electrode points.
            if (els.some(function (q) {
                return (q[0] > b[0] - 6 && q[0] < b[2] + 6 && b[3] > q[1] - 6) ||
                       (q[1] > b[1] - 8 && q[1] < b[3] + 8 && b[0] < q[0]);
            })) return true;
            return placed.some(function (o) { return b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]; });
        }

        refs.forEach(function (r) {
            var rx = x(r.a), ry = y(B.nernst(r.a));
            g.append('circle').attr('cx', rx).attr('cy', ry).attr('r', 4.5)
                .attr('fill', T.plotBg).attr('stroke', T.text).attr('stroke-width', 1.4);
            var fo = window.renderKatex(f.svg, r.tex + ',\\; E = ' + B.nernst(r.a).toFixed(3) + '\\,\\text{V}', 0, 0,
                { width: 300, height: 20, size: 14, color: T.textDim, align: 'left' });
            var kw = (fo.select('.katex').node().getBoundingClientRect().width || 200) + 4;
            var lh = 20;
            // Above-right, below-left, above-left, below-right of the point, then further out.
            var cands = [[rx + 10, ry - 16], [rx - 10 - kw, ry + 16], [rx - 10 - kw, ry - 16], [rx + 10, ry + 16],
                         [rx - 10 - kw, ry + 30], [rx - kw / 2, ry - 30], [rx - kw / 2, ry + 30],
                         [rx - 10 - kw, ry - 44], [rx + 10, ry - 44], [rx - 10 - kw, ry + 52]];
            var ok = null;
            for (var k = 0; k < cands.length && !ok; k++) {
                var b = [cands[k][0], cands[k][1] - lh / 2, cands[k][0] + kw, cands[k][1] + lh / 2];
                if (!hit(b)) ok = b;
            }
            if (!ok) { fo.remove(); return; }
            placed.push(ok);
            fo.attr('x', f.m.left + ok[0]).attr('y', f.m.top + ok[1]).attr('width', kw);
        });

        // Electrode 1: filled marker. Electrode 2: ring.
        g.append('circle').attr('cx', els[0][0]).attr('cy', els[0][1]).attr('r', 9).attr('fill', css('--c-nernst')).attr('fill-opacity', 0.25);
        g.append('circle').attr('cx', els[0][0]).attr('cy', els[0][1]).attr('r', 4.5).attr('fill', css('--c-nernst'))
            .attr('stroke', T.text).attr('stroke-width', 1);
        g.append('circle').attr('cx', els[1][0]).attr('cy', els[1][1]).attr('r', 6.5).attr('fill', T.plotBg)
            .attr('stroke', css('--c-nernst')).attr('stroke-width', 2.6);

        B.out({
            'n-e': B.sgn(e1, 3) + ' V',
            'n-e2': B.sgn(e2, 3) + ' V',
            'n-off': B.sgn((e1 - e2) * 1e3, 1) + ' mV',
            'n-slope': (B.RT_F * Math.LN10 * 1e3).toFixed(1) + ' mV'
        });
    }

    window.ELI.onRender(render);
})();
