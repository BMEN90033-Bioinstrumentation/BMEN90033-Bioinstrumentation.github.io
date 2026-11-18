// Section 03 · Spatial low-pass filtering. Amplitude of each multipole term
// at the body surface, a_l T_l / R^(l+1), normalised to the dipole term, for
// the unbounded homogeneous medium (T_l = 1) and for the body. The terms span
// several decades, so the axis is logarithmic and each series is a line with
// point markers. Series are identified by the HTML legend.
(function () {
    var sel = '#plot-harmonics';
    var L = [1, 2, 3, 4];
    var NAMES = ['dipole', 'quadrupole', 'octupole', 'hexadecapole'];
    var FLOOR = 1e-5;

    function render() {
        var VC = window.VC, css = window.CMP.cssVar, R = VC.SURFACE_RADIUS;
        var f = VC.frame(sel, { margin: { top: 36, left: 96 } });
        var g = f.g, iw = f.iw, ih = f.ih;

        var T = L.map(function (l) { return VC.transfer(l, R).pot; });
        var h = L.map(function (l) { return VC.multipoleWeight(l) / Math.pow(R, l + 1); });
        var hom = h.map(function (v) { return v / h[0]; });
        var vc = h.map(function (v, i) { return v * T[i] / (h[0] * T[0]); });

        var x = d3.scalePoint().domain(L).range([0, iw]).padding(0.5);
        var y = d3.scaleLog().domain([FLOOR, 2]).range([ih, 0]);
        var yTicks = [1, 1e-1, 1e-2, 1e-3, 1e-4, 1e-5];

        window.CMP.drawGrid(g, d3.scaleLinear().domain([0, 1]).range([0, iw]), y, iw, ih, { xTicks: [], yTicks: yTicks });
        var xa = g.append('g').attr('transform', 'translate(0,' + ih + ')').call(d3.axisBottom(x).tickSizeOuter(0)
            // The order names are added where the points are far enough apart.
            .tickFormat(function (l) { return x.step() >= 150 ? l + ' · ' + NAMES[l - 1] : l; }));
        var ya = g.append('g').call(d3.axisLeft(y).tickValues(yTicks).tickSizeOuter(0)
            .tickFormat(function (d) { return d3.format('~f')(d); }));
        [xa, ya].forEach(window.CMP.styleAxis);
        window.renderKatex(f.svg, '\\text{amplitude relative to } l = 1', 22, f.m.top + ih / 2,
            { width: 260, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, '\\text{multipole order } l', f.m.left + iw / 2, f.H - 18,
            { width: 240, height: 22, size: 16 });

        // Terms below the axis floor (a pure dipole has none above l = 1) are omitted.
        [[hom, '--c-true'], [vc, '--c-rec']].forEach(function (s) {
            var pts = L.map(function (l, i) { return [x(l), Math.abs(s[0][i])]; })
                .filter(function (d) { return d[1] >= FLOOR; });
            g.append('path').attr('fill', 'none').attr('stroke', css(s[1])).attr('stroke-width', 2)
                .attr('d', d3.line().x(function (d) { return d[0]; }).y(function (d) { return y(d[1]); })(pts));
            g.selectAll(null).data(pts).enter().append('circle')
                .attr('cx', function (d) { return d[0]; }).attr('cy', function (d) { return y(d[1]); })
                .attr('r', 5).attr('fill', css(s[1])).attr('stroke', css('--white')).attr('stroke-width', 1.5);
        });

        var out = { t1: T[0], t2: T[1], t3: T[2], t4: T[3], r41: T[3] / T[0] };
        Object.keys(out).forEach(function (k) {
            document.querySelectorAll('[data-out="' + k + '"]').forEach(function (el) { el.textContent = out[k].toFixed(3); });
        });
    }

    window.VC.onRender(render);
})();
