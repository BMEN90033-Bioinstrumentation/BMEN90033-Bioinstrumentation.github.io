// Section 05 · Device dissipation P_D(v_in). The dashed line marks the
// load-line maximum V_CC^2 / (4 R_L). Its label is tried above the line at
// the left and right ends, then below, and is placed at the first position
// whose box the curve does not enter.
(function () {
    var sel = '#plot-power';
    var VIN_MAX = 12;

    function render() {
        var B = window.BJT, p = B.p, s = B.compute(p.vin), T = window.T, css = window.CMP.cssVar;
        var f = B.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;

        var pts = d3.range(0, 481).map(function (i) {
            var v = VIN_MAX * i / 480; return [v, B.compute(v).pd * 1e3];
        });
        var pMax = p.vcc * p.vcc / (4 * p.rl) * 1e3;
        var x = d3.scaleLinear().domain([0, VIN_MAX]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, Math.max(pMax, d3.max(pts, function (d) { return d[1]; })) * 1.3])
            .range([ih, 0]);

        B.axes(f, g, x, y, ih, 0, { xTitle: 'v_\\text{in}\\;[\\mathrm{V}]', yTitle: 'P_D\\;[\\mathrm{mW}]' });

        var py = y(pMax);
        g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', py).attr('y2', py)
            .attr('stroke', css('--c-load')).attr('stroke-width', 1.4).attr('stroke-dasharray', '6 4');
        g.append('path').attr('class', 'trace').attr('stroke', css('--c-pd'))
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); })(pts));

        var lw = 230, lh = 18;
        var cands = [[6, py - 12, 'left'], [iw - 6 - lw, py - 12, 'right'],
                     [6, py + 14, 'left'], [iw - 6 - lw, py + 14, 'right']];
        for (var k = 0; k < cands.length; k++) {
            var c = cands[k];
            var hit = pts.some(function (d) {
                var px = x(d[0]), yy = y(d[1]);
                return px >= c[0] - 4 && px <= c[0] + lw + 4 && Math.abs(yy - c[1]) < lh / 2 + 3;
            });
            if (!hit && c[1] - lh / 2 > 0 && c[1] + lh / 2 < ih) {
                window.renderKatex(f.svg,
                    'V_{CC}^2/4R_L = ' + pMax.toFixed(pMax < 10 ? 2 : 1) + '\\,\\text{mW}',
                    f.m.left + c[0] + lw / 2, f.m.top + c[1],
                    { width: lw, height: lh, size: 14, color: css('--c-load'), align: c[2] });
                break;
            }
        }

        g.append('circle').attr('cx', x(p.vin)).attr('cy', y(s.pd * 1e3)).attr('r', 4.5)
            .attr('fill', css('--c-pd')).attr('stroke', T.text).attr('stroke-width', 1);
    }

    window.BJT.onRender(render);
})();
