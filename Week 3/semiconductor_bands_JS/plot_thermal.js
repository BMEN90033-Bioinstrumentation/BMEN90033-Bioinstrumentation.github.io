// Section 03 · Temperature dependence of silicon. Top panel: band gap
// E_g(T) in Varshni form. Bottom panel: intrinsic concentration n_i(T) on a
// log axis. The marker on each panel follows the temperature slider; there
// is no in-plot text, so nothing moves into collision.
(function () {
    var sel = '#plot-thermal';
    var NI_MIN = 1, NI_MAX = 1e20;

    function render() {
        var B = window.BANDS, p = B.p, T = window.T, css = window.CMP.cssVar;
        var f = B.frame(sel, { margin: { left: 84 } });
        var gap = 28, ph = (f.ih - gap) / 2;

        var x = d3.scaleLinear().domain([0, B.T_MAX]).range([0, f.iw]);
        var yE = d3.scaleLinear().domain([0.8, 1.2]).range([ph, 0]);
        var yN = d3.scaleLog().domain([NI_MIN, NI_MAX]).range([ph, 0]);

        var gT = f.g;
        var gB = f.svg.append('g').attr('transform',
            'translate(' + f.m.left + ',' + (f.m.top + ph + gap) + ')');
        B.axes(f, gT, x, yE, ph, 0, { yTitle: 'E_g\\;[\\mathrm{eV}]' });

        // Log panel: grid at each decade, KaTeX tick labels every 5 decades.
        var dec = d3.range(0, 21);
        gB.append('g').selectAll('line').data(dec).join('line')
            .attr('x1', 0).attr('x2', f.iw).attr('y1', function (k) { return yN(Math.pow(10, k)); })
            .attr('y2', function (k) { return yN(Math.pow(10, k)); })
            .attr('stroke', css('--grid-line'));
        x.ticks(6).forEach(function (t) {
            gB.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 0).attr('y2', ph).attr('stroke', css('--grid-line'));
        });
        var xa = gB.append('g').attr('transform', 'translate(0,' + ph + ')')
            .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));
        var ya = gB.append('g').call(d3.axisLeft(yN).tickValues([1, 1e5, 1e10, 1e15, 1e20])
            .tickFormat(function () { return ''; }).tickSizeOuter(0));
        [xa, ya].forEach(window.CMP.styleAxis);
        [0, 5, 10, 15, 20].forEach(function (k) {
            window.renderKatex(f.svg, '10^{' + k + '}', f.m.left - 30, f.m.top + ph + gap + yN(Math.pow(10, k)),
                { width: 40, height: 18, size: 13, color: T.text, align: 'right' });
        });
        window.renderKatex(f.svg, 'n_i\\;[\\mathrm{cm^{-3}}]', 18, f.m.top + ph + gap + ph / 2,
            { width: 200, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, 'T\\;[\\mathrm{K}]', f.m.left + f.iw / 2, f.H - 18,
            { width: 200, height: 22, size: 16 });

        var pts = d3.range(1, 1001).map(function (i) { var t = B.T_MAX * i / 1000; return [t, B.egSi(t), B.niSi(t)]; });
        gT.append('path').attr('class', 'trace').attr('stroke', css('--c-eg')).attr('fill', 'none').attr('stroke-width', 2.4)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return yE(d[1]); })(pts));
        var niPts = pts.filter(function (d) { return d[2] >= NI_MIN; });
        gB.append('path').attr('class', 'trace').attr('stroke', css('--c-ni')).attr('fill', 'none').attr('stroke-width', 2.4)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return yN(d[2]); })(niPts));

        // Guide and markers at the present temperature.
        [gT, gB].forEach(function (gg) {
            gg.append('line').attr('x1', x(p.temp)).attr('x2', x(p.temp)).attr('y1', 0).attr('y2', ph)
                .attr('stroke', T.fg(0.3)).attr('stroke-dasharray', '3 4');
        });
        gT.append('circle').attr('cx', x(p.temp)).attr('cy', yE(B.egSi(p.temp))).attr('r', 4.5)
            .attr('fill', css('--c-eg')).attr('stroke', T.text).attr('stroke-width', 1);
        var ni = B.niSi(p.temp);
        if (ni >= NI_MIN) {
            gB.append('circle').attr('cx', x(p.temp)).attr('cy', yN(ni)).attr('r', 4.5)
                .attr('fill', css('--c-ni')).attr('stroke', T.text).attr('stroke-width', 1);
        }
    }

    window.BANDS.onRender(render);
})();
