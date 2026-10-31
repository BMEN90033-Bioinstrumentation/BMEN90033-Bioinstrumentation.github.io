// Section 03 · Spatial low-pass filtering. Peak amplitude of each multipole
// term at the electrode radius, w_l T_l / R^(l+1), normalised to the dipole
// term, for the homogeneous medium (T_l = 1) and for the enabled shells.
// Grouped bars; series identified by the HTML legend.
(function () {
    var sel = '#plot-harmonics';
    var L = [1, 2, 3, 4];

    function render() {
        var VC = window.VC, css = window.CMP.cssVar, R = VC.SURFACE_RADIUS;
        var f = VC.frame(sel, { margin: { top: 36 } });
        var g = f.g, iw = f.iw, ih = f.ih;

        var T = L.map(function (l) { return VC.transfer(l, R).pot; });
        var h = L.map(function (l) { return VC.multipoleWeight(l) / Math.pow(R, l + 1); });
        var hom = h.map(function (v) { return v / h[0]; });
        var vc = h.map(function (v, i) { return v * T[i] / (h[0] * T[0]); });

        var x = d3.scaleBand().domain(L).range([0, iw]).padding(0.3);
        var xi = d3.scaleBand().domain([0, 1]).range([0, x.bandwidth()]).padding(0.08);
        var lo = Math.min(0, d3.min(vc)), hi = Math.max(1, d3.max(hom), d3.max(vc)) * 1.15;
        var y = d3.scaleLinear().domain([lo, hi]).range([ih, 0]);

        window.CMP.drawGrid(g, d3.scaleLinear().domain([0, 1]).range([0, iw]), y, iw, ih, { xTicks: [], yTicks: y.ticks(5) });
        var xa = g.append('g').attr('transform', 'translate(0,' + y(0) + ')').call(d3.axisBottom(x).tickSizeOuter(0));
        var ya = g.append('g').call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));
        [xa, ya].forEach(window.CMP.styleAxis);
        window.renderKatex(f.svg, '\\text{amplitude relative to } l = 1', 22, f.m.top + ih / 2,
            { width: 260, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, '\\text{multipole order } l', f.m.left + iw / 2, f.H - 18,
            { width: 240, height: 22, size: 16 });

        [[hom, '--c-true'], [vc, '--c-rec']].forEach(function (s, k) {
            g.selectAll(null).data(L).enter().append('rect')
                .attr('x', function (l) { return x(l) + xi(k); })
                .attr('width', xi.bandwidth())
                .attr('y', function (l, i) { return y(Math.max(0, s[0][i])); })
                .attr('height', function (l, i) { return Math.abs(y(s[0][i]) - y(0)); })
                .attr('fill', css(s[1])).attr('fill-opacity', 0.85);
        });

        var out = { t1: T[0], t2: T[1], t3: T[2], t4: T[3], r41: T[3] / T[0] };
        Object.keys(out).forEach(function (k) {
            document.querySelectorAll('[data-out="' + k + '"]').forEach(function (el) { el.textContent = out[k].toFixed(3); });
        });
    }

    window.VC.onRender(render);
})();
