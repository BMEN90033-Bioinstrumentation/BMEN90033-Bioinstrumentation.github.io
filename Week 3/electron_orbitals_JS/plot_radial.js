// Section 02 · Radial structure of the focus orbital. Top panel R_nl(r),
// bottom panel the radial probability density r^2 R_nl^2, both normalised
// to their own peak and plotted to r = 4 n^2 a0 / Zeff. Dots on the zero
// line and dashed guides through both panels mark the radial nodes. Series
// are identified by the HTML legend, so the panels carry no in-plot text.
(function () {
    var sel = '#plot-radial';
    var N = 400;

    function render() {
        var EO = window.EO, p = EO.p, css = window.CMP.cssVar, T = window.T;
        var d = EO.ORBITAL_DEFS[p.focus], Z = EO.zeffOf(p.focus), rMax = EO.rMaxOf(d.n, Z);
        var f = EO.frame(sel, { margin: { top: 36 } });
        var gap = 16, ph = (f.ih - gap) / 2;

        var pts = d3.range(0, N + 1).map(function (i) {
            var r = rMax * i / N, R = EO.radialWavefunction(d.n, d.l, r, Z);
            return [r, R, r * r * R * R];
        });
        var rPk = d3.max(pts, function (q) { return Math.abs(q[1]); }) || 1;
        var pPk = d3.max(pts, function (q) { return q[2]; }) || 1;

        var x = d3.scaleLinear().domain([0, rMax]).range([0, f.iw]);
        var yR = d3.scaleLinear().domain([-1.15, 1.15]).range([ph, 0]);
        var yP = d3.scaleLinear().domain([0, 1.15]).range([ph, 0]);
        var gT = f.g, gB = f.svg.append('g').attr('transform', 'translate(' + f.m.left + ',' + (f.m.top + ph + gap) + ')');
        EO.axes(f, gT, x, yR, ph, 0, { yTitle: 'R_{nl}\\,/\\,|R_{nl}|_\\text{max}', xTitle: '', xFormat: function () { return ''; } });
        EO.axes(f, gB, x, yP, ph, ph + gap, { yTitle: 'r^2 R_{nl}^2\\,/\\,\\text{max}', xTitle: 'r\\;[a_0]' });

        // Signed fills under R(r), then the curves.
        var area = function (sgn) {
            return d3.area().x(function (q) { return x(q[0]); }).y0(yR(0))
                .y1(function (q) { var v = q[1] / rPk; return yR(sgn > 0 ? Math.max(v, 0) : Math.min(v, 0)); })(pts);
        };
        gT.append('path').attr('d', area(1)).attr('fill', css('--c-pos')).attr('fill-opacity', 0.12);
        gT.append('path').attr('d', area(-1)).attr('fill', css('--c-neg')).attr('fill-opacity', 0.12);
        gT.append('path').attr('class', 'trace').attr('stroke', css('--c-radial'))
            .attr('d', d3.line().x(function (q) { return x(q[0]); }).y(function (q) { return yR(q[1] / rPk); })(pts));
        gB.append('path').attr('class', 'trace').attr('stroke', css('--c-prob'))
            .attr('d', d3.line().x(function (q) { return x(q[0]); }).y(function (q) { return yP(q[2] / pPk); })(pts));

        // Radial nodes: sign changes of R(r).
        var nodes = [];
        for (var i = 1; i <= N; i++) if (pts[i - 1][1] * pts[i][1] < 0) nodes.push(x(pts[i][0]));
        nodes.forEach(function (nx) {
            [[gT, yR(1.15)], [gB, 0]].forEach(function (q) {
                q[0].append('line').attr('x1', nx).attr('x2', nx).attr('y1', 0).attr('y2', ph)
                    .attr('stroke', css('--c-ref')).attr('stroke-dasharray', '3 4');
            });
            gT.append('circle').attr('cx', nx).attr('cy', yR(0)).attr('r', 4).attr('fill', T.text);
        });

        // Most probable radius.
        var pk = pts.reduce(function (a, q) { return q[2] > a[2] ? q : a; }, pts[0]);
        gB.append('circle').attr('cx', x(pk[0])).attr('cy', yP(pk[2] / pPk)).attr('r', 4.5)
            .attr('fill', css('--c-prob')).attr('stroke', T.text).attr('stroke-width', 1);
        document.querySelectorAll('[data-out="rpk"]').forEach(function (el) { el.textContent = pk[0].toPrecision(3) + ' a₀'; });
        document.querySelectorAll('[data-out="nodes-found"]').forEach(function (el) { el.textContent = nodes.length; });
    }

    window.EO.onRender(render);
})();
