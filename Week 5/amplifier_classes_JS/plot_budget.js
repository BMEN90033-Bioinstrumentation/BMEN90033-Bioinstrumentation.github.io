// Section 04 · Power budget of the present operating point: DC input power,
// signal power delivered to the load and power dissipated as heat, on a
// fixed 0..140 mW scale so changes in amplitude and class remain visible.
// Category names are KaTeX tick labels; values sit above each bar.
(function () {
    var sel = '#plot-budget';
    var P_MAX = 140;   // mW

    function render() {
        var A = window.AMP, d = A.derived(), css = window.CMP.cssVar, T = window.T;
        var f = A.frame(sel, { margin: { bottom: 70 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var cats = [
            { tex: 'P_\\text{DC}', v: d.dcPower, c: '--c-dc' },
            { tex: 'P_L', v: d.signalPower, c: '--c-sig' },
            { tex: 'P_D', v: d.heatPower, c: '--c-heat' }
        ];
        var x = d3.scaleBand().domain([0, 1, 2]).range([0, iw]).padding(0.38);
        var y = d3.scaleLinear().domain([0, P_MAX]).range([ih, 0]);
        var yt = [0, 20, 40, 60, 80, 100, 120, 140];

        window.CMP.drawGrid(g, d3.scaleLinear().range([0, iw]), y, iw, ih, { xTicks: [], yTicks: yt });
        var ya = g.append('g').call(d3.axisLeft(y).tickValues(yt).tickSizeOuter(0));
        var xa = g.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(d3.axisBottom(x).tickSizeOuter(0).tickFormat(function () { return ''; }));
        [xa, ya].forEach(window.CMP.styleAxis);

        cats.forEach(function (c, i) {
            var v = Math.min(c.v, P_MAX), bx = x(i), bw = x.bandwidth();
            g.append('rect').attr('x', bx).attr('y', y(v)).attr('width', bw).attr('height', ih - y(v))
                .attr('fill', css(c.c)).attr('fill-opacity', 0.8).attr('rx', 3);
            g.append('text').attr('x', bx + bw / 2).attr('y', y(v) - 7).attr('text-anchor', 'middle')
                .attr('fill', T.text).attr('font-size', 13).attr('font-family', "'JetBrains Mono', monospace")
                .text(c.v.toFixed(c.v < 10 ? 1 : 0) + ' mW');
            window.renderKatex(f.svg, c.tex, f.m.left + bx + bw / 2, f.m.top + ih + 18,
                { width: 60, height: 20, size: 15 });
        });
        window.renderKatex(f.svg, 'P\\;[\\mathrm{mW}]', 22, f.m.top + ih / 2,
            { width: 200, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, '\\text{power term}', f.m.left + iw / 2, f.H - 16,
            { width: 200, height: 22, size: 16 });
    }

    window.AMP.onRender(render);
})();
