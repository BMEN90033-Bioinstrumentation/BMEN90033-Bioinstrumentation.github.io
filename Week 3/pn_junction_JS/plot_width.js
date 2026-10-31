// Section 03 · Depletion width against bias for the present doping: total
// W and its parts x_p (p-side) and x_n (n-side), in µm, for V < V0. Guides
// mark V0 and -V_BR; their labels sit in the top margin above each guide,
// outside the plot. V0 lies between 0.48 and 0.95 V for the doping range, so
// it is always at least 2 V from -V_BR and the labels cannot meet.
(function () {
    var sel = '#plot-width';
    var VMIN = -2, VMAX = 2;

    function render() {
        var P = window.PN, V = P.p.bias, T = window.T, css = window.CMP.cssVar;
        var f = P.frame(sel, { margin: { top: 78 } });
        var g = f.g, iw = f.iw, ih = f.ih, v0 = P.V0();
        var x = d3.scaleLinear().domain([VMIN, VMAX]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, P.W(VMIN) * 1e4 * 1.1]).nice().range([ih, 0]);
        P.axes(f, g, x, y, ih, 0, { xTitle: 'V\\;[\\mathrm{V}]', yTitle: 'W\\;[\\mu\\mathrm{m}]' });

        [[v0, 'V_0 = ' + v0.toFixed(2)], [-P.V_BR, '-V_{BR} = -' + P.V_BR.toFixed(1)]].forEach(function (q) {
            var px = x(q[0]);
            g.append('line').attr('x1', px).attr('x2', px).attr('y1', -8).attr('y2', ih)
                .attr('stroke', T.fg(0.35)).attr('stroke-dasharray', '3 4');
            window.renderKatex(f.svg, q[1] + '\\,\\text{V}', f.m.left + px, f.m.top - 24,
                { width: 140, height: 18, size: 14, color: T.textDim });
        });

        var vs = d3.range(0, 801).map(function (i) { return VMIN + (v0 - VMIN) * i / 800; });
        [['W', '--c-w', 2.4, null], ['xp', '--c-b', 1.6, '6 4'], ['xn', '--c-p', 1.6, '2 3']].forEach(function (s) {
            g.append('path').attr('fill', 'none').attr('stroke', css(s[1])).attr('stroke-width', s[2])
                .attr('stroke-dasharray', s[3])
                .attr('d', d3.line().x(function (v) { return x(v); }).y(function (v) { return y(P[s[0]](v) * 1e4); })(vs));
        });
        if (V < v0) {
            g.append('circle').attr('cx', x(V)).attr('cy', y(P.W(V) * 1e4)).attr('r', 4.5)
                .attr('fill', css('--c-w')).attr('stroke', T.text).attr('stroke-width', 1);
        }
    }

    window.PN.onRender(render);
})();
