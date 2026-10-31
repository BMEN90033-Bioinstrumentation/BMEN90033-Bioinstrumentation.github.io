// Section 04 · Energy-level diagram of the present configuration from the
// hydrogenic estimate |E| = 13.6 Zeff^2 / n^2 eV. One column per subshell
// type (s, p, d, f); deeper levels sit lower on a log axis. Each level shows
// its capacity 2(2l+1) as open circles and its electrons as filled ones.
// Subshell labels sit right of the level line inside its column and are
// pushed down when they would overlap the label above in the same column.
(function () {
    var sel = '#plot-levels';
    var COLS = ['s', 'p', 'd', 'f'];

    function render() {
        var EO = window.EO, p = EO.p, css = window.CMP.cssVar, T = window.T;
        var f = EO.frame(sel, { margin: { top: 36, bottom: 62 } });
        var g = f.g, iw = f.iw, ih = f.ih;

        // Group the configuration by subshell (n, l).
        var shells = {};
        p.config.forEach(function (o) {
            var d = EO.ORBITAL_DEFS[o.key], k = d.n + COLS[d.l];
            if (!shells[k]) shells[k] = { name: k, n: d.n, l: d.l, Zeff: o.Zeff, e: 0, keys: [] };
            shells[k].e += o.electrons;
            shells[k].keys.push(o.key);
        });
        var list = Object.keys(shells).map(function (k) {
            var s = shells[k]; s.E = Math.abs(EO.energy(s.n, s.Zeff)); return s;
        });
        var eMin = d3.min(list, function (s) { return s.E; }), eMax = d3.max(list, function (s) { return s.E; });
        var lo = Math.pow(10, Math.floor(Math.log10(eMin / 1.5))), hi = Math.pow(10, Math.ceil(Math.log10(eMax * 1.5)));
        if (hi / lo < 100) hi = lo * 100;

        var x = d3.scaleBand().domain(COLS).range([0, iw]).padding(0.08);
        var y = d3.scaleLog().domain([lo, hi]).range([0, ih]);
        var dec = d3.range(Math.log10(lo), Math.log10(hi) + 1).map(function (e) { return Math.pow(10, e); });

        g.append('g').attr('class', 'grid').selectAll('line').data(dec).join('line')
            .attr('x1', 0).attr('x2', iw).attr('y1', function (v) { return y(v); }).attr('y2', function (v) { return y(v); })
            .attr('stroke', css('--grid-line'));
        COLS.slice(1).forEach(function (c) {
            var xx = x(c) - x.step() * x.paddingInner() / 2;
            g.append('line').attr('x1', xx).attr('x2', xx).attr('y1', 0).attr('y2', ih).attr('stroke', css('--grid-line'));
        });
        var xa = g.append('g').attr('transform', 'translate(0,' + ih + ')').call(d3.axisBottom(x).tickSizeOuter(0));
        var ya = g.append('g').call(d3.axisLeft(y).tickValues(dec).tickFormat(d3.format('~s')).tickSizeOuter(0));
        [xa, ya].forEach(window.CMP.styleAxis);
        window.renderKatex(f.svg, '|E|\\;[\\mathrm{eV}]', 22, f.m.top + ih / 2, { width: 200, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, '\\text{subshell type}\\;(l = 0, 1, 2, 3)', f.m.left + iw / 2, f.H - 18, { width: 300, height: 22, size: 16 });

        var focusShell = (function () { var d = EO.ORBITAL_DEFS[p.focus]; return d.n + COLS[d.l]; })();
        var placed = {};
        list.sort(function (a, b) { return a.E - b.E; }).forEach(function (s) {
            var bx = x(COLS[s.l]), bw = x.bandwidth(), yy = y(s.E);
            var x0 = bx + 8, x1 = bx + bw * 0.66, cap = 2 * (2 * s.l + 1);
            var hot = s.name === focusShell;
            g.append('line').attr('x1', x0).attr('x2', x1).attr('y1', yy).attr('y2', yy)
                .attr('stroke', hot ? css('--accent') : css('--c-level')).attr('stroke-width', hot ? 3 : 2);
            // Capacity and occupancy, centred on the line just above it.
            var step = Math.min(9, (x1 - x0) / cap), cx0 = (x0 + x1) / 2 - step * (cap - 1) / 2;
            for (var i = 0; i < cap; i++) {
                g.append('circle').attr('cx', cx0 + i * step).attr('cy', yy - 6).attr('r', Math.min(3, step / 2 - 0.5))
                    .attr('fill', i < s.e ? T.text : 'none').attr('stroke', T.fg(0.5)).attr('stroke-width', 0.8);
            }
            // Label right of the line; push down past the previous label in this column.
            var ly = yy, col = placed[s.l] || [];
            col.forEach(function (q) { if (Math.abs(ly - q) < 20) ly = q + 20; });
            col.push(ly); placed[s.l] = col;
            window.renderKatex(f.svg, '\\text{' + s.name + '}', f.m.left + x1 + 26, f.m.top + ly, {
                width: 44, height: 20, size: 14, color: hot ? css('--accent') : T.textDim
            });
        });
    }

    window.EO.onRender(render);
})();
