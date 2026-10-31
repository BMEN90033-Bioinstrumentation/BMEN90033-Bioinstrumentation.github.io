// Section 02 · Linear amplitude spectrum of the present signal: V_n / V_1
// for the fundamental and harmonics 2 to 5 on a fixed 0..100 % scale. The
// value sits above each bar; bars below 0.5 % carry no value label.
(function () {
    var sel = '#plot-bars';

    function render() {
        var H = window.THD, p = H.p, css = window.CMP.cssVar, T = window.T;
        var f = H.frame(sel, { margin: { top: 44, bottom: 96 } });
        var g = f.g;
        var x = d3.scaleBand().domain([0, 1, 2, 3, 4]).range([0, f.iw]).padding(0.3);
        var y = d3.scaleLinear().domain([0, 100]).range([f.ih, 0]);
        var yt = [0, 25, 50, 75, 100];
        window.CMP.drawGrid(g, d3.scaleLinear(), y, f.iw, f.ih, { xTicks: [], yTicks: yt });
        window.CMP.styleAxis(g.append('g').call(d3.axisLeft(y).tickValues(yt).tickSizeOuter(0)));
        H.catAxis(f, g, x, [1, 2, 3, 4, 5].map(function (n) {
            return { tex: (n === 1 ? '' : n) + 'f_1', sub: (p.f * n) + ' Hz' };
        }));
        [1, 2, 3, 4, 5].forEach(function (n, i) {
            var v = H.amp(n) * 100;
            g.append('rect').attr('x', x(i)).attr('y', y(v)).attr('width', x.bandwidth()).attr('height', f.ih - y(v))
                .attr('fill', css(H.COL[n])).attr('fill-opacity', n === 1 ? 0.6 : 0.8).attr('rx', 2);
            if (v > 0.5) {
                g.append('text').attr('x', x(i) + x.bandwidth() / 2).attr('y', y(v) - 7).attr('text-anchor', 'middle')
                    .attr('fill', T.text).attr('font-size', 12).attr('font-family', "'JetBrains Mono', monospace")
                    .text(v.toFixed(1) + ' %');
            }
        });
        window.renderKatex(f.svg, 'V_n / V_1~[\\%]', 22, f.m.top + f.ih / 2,
            { width: 200, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, 'f~[\\mathrm{Hz}]', f.m.left + f.iw / 2, f.H - 16,
            { width: 200, height: 22, size: 16 });
    }

    window.THD.onRender(render);
})();
