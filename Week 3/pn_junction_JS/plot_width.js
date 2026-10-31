// Section 03 · Depletion half-width W / W0 against bias. Guides mark V0
// (where the model width reaches zero) and the scaled breakdown voltage;
// their labels sit in the top margin above each guide, outside the plot.
// The guides are 2.2 V apart, so the labels cannot meet.
(function () {
    var sel = '#plot-width';
    var VMIN = -2, VMAX = 2;

    function render() {
        var P = window.PN, V = P.p.bias, T = window.T, css = window.CMP.cssVar;
        var f = P.frame(sel, { margin: { top: 78 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([VMIN, VMAX]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, 2.2]).range([ih, 0]);
        P.axes(f, g, x, y, ih, 0, { xTitle: 'V\\;[\\mathrm{V}]', yTitle: 'W / W_0' });

        [[P.V0, 'V_0'], [P.V_BREAKDOWN, 'V_{BR}']].forEach(function (q) {
            var px = x(q[0]);
            g.append('line').attr('x1', px).attr('x2', px).attr('y1', -8).attr('y2', ih)
                .attr('stroke', T.fg(0.35)).attr('stroke-dasharray', '3 4');
            window.renderKatex(f.svg, q[1] + ' = ' + q[0].toFixed(1) + '\\,\\text{V}', f.m.left + px, f.m.top - 24,
                { width: 120, height: 18, size: 14, color: T.textDim });
        });

        var pts = d3.range(0, 401).map(function (i) { var v = VMIN + (VMAX - VMIN) * i / 400; return [v, P.depletionHalfWidth(v)]; });
        g.append('path').attr('fill', 'none').attr('stroke', css('--c-w')).attr('stroke-width', 2.4)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); })(pts));
        g.append('circle').attr('cx', x(V)).attr('cy', y(P.depletionHalfWidth(V))).attr('r', 4.5)
            .attr('fill', css('--c-w')).attr('stroke', T.text).attr('stroke-width', 1);
    }

    window.PN.onRender(render);
})();
