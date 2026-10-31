// Section 05 · Share of the total harmonic power carried by each harmonic,
// V_n^2 / sum(V_k^2), which is the weight of each term under the square
// root of the THD expression. The share sits above each bar.
(function () {
    var sel = '#plot-contrib';

    function render() {
        var H = window.THD, css = window.CMP.cssVar, T = window.T;
        var f = H.frame(sel, { margin: { top: 36, bottom: 74 } });
        var g = f.g;
        var ns = [2, 3, 4, 5];
        var tot = d3.sum(ns, function (n) { return H.amp(n) * H.amp(n); });
        var x = d3.scaleBand().domain(d3.range(4)).range([0, f.iw]).padding(0.35);
        var y = d3.scaleLinear().domain([0, 100]).range([f.ih, 0]);
        var yt = [0, 25, 50, 75, 100];
        window.CMP.drawGrid(g, d3.scaleLinear(), y, f.iw, f.ih, { xTicks: [], yTicks: yt });
        window.CMP.styleAxis(g.append('g').call(d3.axisLeft(y).tickValues(yt).tickSizeOuter(0)));
        H.catAxis(f, g, x, ns.map(function (n) { return { tex: 'V_' + n }; }));
        ns.forEach(function (n, i) {
            var s = tot > 0 ? H.amp(n) * H.amp(n) / tot * 100 : 0;
            g.append('rect').attr('x', x(i)).attr('y', y(s)).attr('width', x.bandwidth()).attr('height', f.ih - y(s))
                .attr('fill', css(H.COL[n])).attr('fill-opacity', 0.8).attr('rx', 2);
            if (tot > 0) {
                g.append('text').attr('x', x(i) + x.bandwidth() / 2).attr('y', y(s) - 7).attr('text-anchor', 'middle')
                    .attr('fill', T.text).attr('font-size', 12).attr('font-family', "'JetBrains Mono', monospace")
                    .text(s.toFixed(1) + ' %');
            }
        });
        window.renderKatex(f.svg, '\\text{share of } \\textstyle\\sum V_k^2~[\\%]', 22, f.m.top + f.ih / 2,
            { width: 220, height: 22, rotate: -90, size: 15 });
        window.renderKatex(f.svg, '\\text{harmonic amplitude}', f.m.left + f.iw / 2, f.H - 16,
            { width: 240, height: 22, size: 16 });
    }

    window.THD.onRender(render);
})();
