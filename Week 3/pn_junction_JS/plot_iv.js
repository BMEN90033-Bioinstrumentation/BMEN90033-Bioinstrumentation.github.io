// Section 04 · Diode current against bias. Upper figure: linear current in
// mA, four quadrants (V and I both change sign), so the axes pass through
// the origin, the I title sits above the plot at the I axis and the V title
// right of the plot at the V axis. Lower figure: |I| on a log axis, single
// quadrant layout. Markers follow the bias slider and carry no text.
// On the linear plot the V tick labels at -2 and -1.5 are omitted: the
// breakdown branch near -V_BR falls through the space below the axis there.
// Points beyond +-10 mA are dropped so the steep branches end at the frame.
(function () {
    var VMIN = -2, VMAX = 1;

    function lin() {
        var P = window.PN, V = P.p.bias, T = window.T, css = window.CMP.cssVar;
        var f = P.frame('#plot-iv', { margin: { top: 56, right: 64, bottom: 24, left: 40 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([VMIN, VMAX]).range([0, iw]);
        var y = d3.scaleLinear().domain([-10, 10]).range([ih, 0]);
        window.CMP.drawGrid(g, x, y, iw, ih, { xTicks: x.ticks(6), yTicks: y.ticks(6) });
        var xa = g.append('g').attr('transform', 'translate(0,' + y(0) + ')')
            .call(d3.axisBottom(x).tickValues([-1, -0.5, 0.5, 1]).tickSizeOuter(0));
        var ya = g.append('g').attr('transform', 'translate(' + x(0) + ',0)')
            .call(d3.axisLeft(y).ticks(6).tickSizeOuter(0).tickFormat(function (d) { return d === 0 ? '' : d; }));
        [xa, ya].forEach(window.CMP.styleAxis);
        window.renderKatex(f.svg, 'I\\;[\\mathrm{mA}]', f.m.left + x(0), f.m.top - 18, { width: 100, height: 22, size: 16 });
        window.renderKatex(f.svg, 'V\\;[\\mathrm{V}]', f.m.left + iw + 38, f.m.top + y(0), { width: 50, height: 22, size: 16 });   // clear of the last tick label

        var pts = d3.range(0, 601).map(function (i) { var v = VMIN + (VMAX - VMIN) * i / 600; return [v, P.current(v) * 1e3]; })
            .filter(function (d) { return Math.abs(d[1]) <= 10; });
        g.append('path').attr('fill', 'none').attr('stroke', css('--c-i')).attr('stroke-width', 2.4)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); })(pts));
        var i = P.current(V) * 1e3;
        if (V >= VMIN && V <= VMAX && Math.abs(i) <= 10) {
            g.append('circle').attr('cx', x(V)).attr('cy', y(i)).attr('r', 4.5)
                .attr('fill', css('--c-i')).attr('stroke', T.text).attr('stroke-width', 1);
        }
    }

    function logp() {
        var P = window.PN, V = P.p.bias, T = window.T, css = window.CMP.cssVar;
        var f = P.frame('#plot-ivlog', { margin: { top: 40, left: 84 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([VMIN, VMAX]).range([0, iw]);
        var y = d3.scaleLog().domain([1e-13, 1e1]).range([ih, 0]);
        var gl = css('--grid-line');
        d3.range(-13, 2).forEach(function (k) {
            g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', y(Math.pow(10, k))).attr('y2', y(Math.pow(10, k))).attr('stroke', gl);
        });
        x.ticks(6).forEach(function (t) {
            g.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 0).attr('y2', ih).attr('stroke', gl);
        });
        var yt = [1e-12, 1e-9, 1e-6, 1e-3, 1];
        var xa = g.append('g').attr('transform', 'translate(0,' + ih + ')').call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));
        var ya = g.append('g').call(d3.axisLeft(y).tickValues(yt).tickFormat(function () { return ''; }).tickSizeOuter(0));
        [xa, ya].forEach(window.CMP.styleAxis);
        yt.forEach(function (v) {
            window.renderKatex(f.svg, '10^{' + Math.round(Math.log10(v)) + '}', f.m.left - 30, f.m.top + y(v),
                { width: 44, height: 18, size: 13, color: T.text, align: 'right' });
        });
        window.renderKatex(f.svg, '|I|\\;[\\mathrm{A}]', 18, f.m.top + ih / 2, { width: 160, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, 'V\\;[\\mathrm{V}]', f.m.left + iw / 2, f.H - 18, { width: 120, height: 22, size: 16 });

        var pts = d3.range(0, 601).map(function (i) { var v = VMIN + (VMAX - VMIN) * i / 600; return [v, Math.max(1e-13, P.currentMagnitude(v))]; })
            .filter(function (d) { return d[1] <= 10; });
        g.append('path').attr('fill', 'none').attr('stroke', css('--c-i')).attr('stroke-width', 2.4)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); })(pts));
        var a = P.currentMagnitude(V);
        if (V >= VMIN && V <= VMAX && a >= 1e-13 && a <= 10) {
            g.append('circle').attr('cx', x(V)).attr('cy', y(a)).attr('r', 4.5)
                .attr('fill', css('--c-i')).attr('stroke', T.text).attr('stroke-width', 1);
        }
    }

    window.PN.onRender(function () { lin(); logp(); });
})();
