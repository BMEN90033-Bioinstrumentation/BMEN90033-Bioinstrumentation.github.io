// Section 03 · Nernst relation E(a_Cl) on a log activity axis, with the
// standard state (a = 1), typical body fluid (a = 0.08) and the slider value.
// The two reference labels are placed by collision test against the line,
// the plot edges, the slider marker and each other, with fallbacks.
(function () {
    var sel = '#plot-nernst';
    var A_MIN = 1e-3, A_MAX = 1;

    function render() {
        var B = window.ELI, p = B.p, T = window.T, css = window.CMP.cssVar;
        var f = B.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;

        var x = d3.scaleLog().domain([A_MIN, A_MAX]).range([0, iw]);
        var y = d3.scaleLinear().domain([0.19, 0.42]).range([ih, 0]);
        B.axes(f, g, x, y, ih, 0, {
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

        var aNow = Math.pow(10, p.lacl);
        var qx = x(aNow), qy = y(B.nernst(aNow));

        // Dashed guides from the slider point to both axes.
        g.append('path').attr('fill', 'none').attr('stroke', css('--c-ref')).attr('stroke-dasharray', '4 4')
            .attr('d', 'M' + qx + ',' + ih + 'V' + qy + 'H0');

        var refs = [
            { a: 1, tex: '\\text{standard},\\; a = 1' },
            { a: 0.08, tex: '\\text{body fluid},\\; a \\approx 0.08' }
        ];
        var placed = [[qx - 9, qy - 9, qx + 9, qy + 9]];
        function hit(b) {
            if (b[0] < 4 || b[2] > iw - 4 || b[1] < 4 || b[3] > ih - 4) return true;
            if (pts.some(function (q) { return q[0] > b[0] - 3 && q[0] < b[2] + 3 && q[1] > b[1] - 3 && q[1] < b[3] + 3; })) return true;
            // Dashed guides of the slider point.
            if (qx > b[0] - 6 && qx < b[2] + 6 && b[3] > qy - 6) return true;
            if (qy > b[1] - 8 && qy < b[3] + 8 && b[0] < qx) return true;
            return placed.some(function (o) { return b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]; });
        }

        refs.forEach(function (r) {
            var rx = x(r.a), ry = y(B.nernst(r.a));
            g.append('circle').attr('cx', rx).attr('cy', ry).attr('r', 4.5)
                .attr('fill', css('--bg-2')).attr('stroke', T.text).attr('stroke-width', 1.4);
            var fo = window.renderKatex(f.svg, r.tex + ' = ' + B.nernst(r.a).toFixed(3) + '\\,\\text{V}', 0, 0,
                { width: 300, height: 20, size: 14, color: T.textDim, align: 'left' });
            var kw = (fo.select('.katex').node().getBoundingClientRect().width || 200) + 4;
            var lh = 20;
            // Above-right, below-left, above-left, below-right of the point.
            var cands = [[rx + 10, ry - 16], [rx - 10 - kw, ry + 16], [rx - 10 - kw, ry - 16], [rx + 10, ry + 16],
                         [rx - 10 - kw, ry + 30], [rx - kw / 2, ry - 30], [rx - kw / 2, ry + 30]];
            var ok = null;
            for (var k = 0; k < cands.length && !ok; k++) {
                var b = [cands[k][0], cands[k][1] - lh / 2, cands[k][0] + kw, cands[k][1] + lh / 2];
                if (!hit(b)) ok = b;
            }
            if (!ok) { fo.remove(); return; }
            placed.push(ok);
            fo.attr('x', f.m.left + ok[0]).attr('y', f.m.top + ok[1]).attr('width', kw);
        });

        g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 9).attr('fill', css('--c-nernst')).attr('fill-opacity', 0.25);
        g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 4.5).attr('fill', css('--c-nernst'))
            .attr('stroke', T.text).attr('stroke-width', 1);

        var e = B.nernst(aNow);
        var out = {
            'n-e': '+' + e.toFixed(3) + ' V',
            'n-de': ((e - B.E0) * 1e3 >= 0 ? '+' : '') + ((e - B.E0) * 1e3).toFixed(1) + ' mV',
            'n-slope': (B.RT_F * Math.LN10 * 1e3).toFixed(1) + ' mV'
        };
        Object.keys(out).forEach(function (k) {
            document.querySelectorAll('[data-out="' + k + '"]').forEach(function (el) { el.textContent = out[k]; });
        });
    }

    window.ELI.onRender(render);
})();
