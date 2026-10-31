// Section 05 · L-I characteristic: normalised optical power against
// injection current, with the threshold guide and the present operating
// point. Single quadrant.
// Label plan: the regime names sit at the top of each region, where the
// curve stays below 0.6 of full scale until 80 mA. The I_th label sits left
// of the guide at 0.35 of full scale, where the sub-threshold curve is below
// 0.02.
(function () {
    var sel = '#plot-li';

    function render() {
        var LD = window.LD, T = window.T, css = window.CMP.cssVar;
        var f = LD.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([0, LD.I_MAX]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, 1.1]).range([ih, 0]);
        LD.axes(f, g, x, y, { xTitle: 'I\\;[\\mathrm{mA}]', yTitle: 'P / P_\\text{max}' });

        var xt = x(LD.THRESHOLD_CURRENT);
        g.append('rect').attr('x', xt).attr('y', 0).attr('width', iw - xt).attr('height', ih)
            .attr('fill', css('--c-photon')).attr('fill-opacity', 0.05);
        g.append('line').attr('x1', xt).attr('x2', xt).attr('y1', 0).attr('y2', ih)
            .attr('stroke', T.gridMax).attr('stroke-width', 1.2).attr('stroke-dasharray', '4 4');

        var pts = d3.range(0, LD.I_MAX + 1).map(function (i) { return [x(i), y(LD.power(i))]; });
        g.append('path').attr('class', 'trace').attr('stroke', css('--c-photon')).attr('d', d3.line()(pts));

        function tex(s, cx, cy, w, c, align) {
            window.renderKatex(f.svg, s, f.m.left + cx, f.m.top + cy,
                { width: w, height: 20, size: 15, color: c, align: align || 'center' });
        }
        tex('I_{th} = ' + LD.THRESHOLD_CURRENT + '\\,\\text{mA}', xt - 8 - 60, y(0.35), 120, T.textDim, 'right');
        [['spontaneous', 0, LD.THRESHOLD_CURRENT], ['stimulated', LD.THRESHOLD_CURRENT, LD.I_MAX]].forEach(function (r) {
            g.append('text').attr('x', (x(r[1]) + x(r[2])) / 2).attr('y', 20).attr('text-anchor', 'middle')
                .attr('fill', T.textDim).attr('font-size', 12).attr('font-family', "'JetBrains Mono', monospace")
                .text(r[0]);
        });

        var I = LD.p.I;
        g.append('circle').attr('cx', x(I)).attr('cy', y(LD.power(I))).attr('r', 5)
            .attr('fill', css('--c-photon')).attr('stroke', T.text).attr('stroke-width', 1.2);
    }

    window.LD.onRender(render);
})();
