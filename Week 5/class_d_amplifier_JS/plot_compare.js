// Section 06 · Efficiency of the amplifier classes as quoted on this page:
// class A 25 %, AB 55 %, B 78.5 %, D 92 % (the assumed value, with its
// typical 90-95 % range as an error bar). Values sit above the bars.
(function () {
    var sel = '#plot-compare';
    var CLS = [
        { tex: '\\text{A}', v: 25 }, { tex: '\\text{AB}', v: 55 },
        { tex: '\\text{B}', v: 78.5 }, { tex: '\\text{D}', v: 92, lo: 90, hi: 95 }
    ];

    function render() {
        var C = window.CLD, css = window.CMP.cssVar, T = window.T;
        var f = C.frame(sel, { margin: { top: 36, bottom: 70 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleBand().domain(d3.range(4)).range([0, iw]).padding(0.4);
        var y = d3.scaleLinear().domain([0, 100]).range([ih, 0]);
        var yt = [0, 20, 40, 60, 80, 100];
        window.CMP.drawGrid(g, d3.scaleLinear(), y, iw, ih, { xTicks: [], yTicks: yt });
        window.CMP.styleAxis(g.append('g').call(d3.axisLeft(y).tickValues(yt).tickSizeOuter(0)));
        window.CMP.styleAxis(g.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(d3.axisBottom(x).tickSizeOuter(0).tickFormat(function () { return ''; })));
        CLS.forEach(function (c, i) {
            var bx = x(i), bw = x.bandwidth(), d = c.lo !== undefined;
            g.append('rect').attr('x', bx).attr('y', y(c.v)).attr('width', bw).attr('height', ih - y(c.v)).attr('rx', 3)
                .attr('fill', css(d ? '--c-hi' : '--c-lo')).attr('fill-opacity', d ? 0.85 : 0.45);
            var top = y(c.v);
            if (d) {
                var cx = bx + bw / 2;
                g.append('line').attr('x1', cx).attr('x2', cx).attr('y1', y(c.lo)).attr('y2', y(c.hi)).attr('stroke', T.text).attr('stroke-width', 1.5);
                [c.lo, c.hi].forEach(function (v) {
                    g.append('line').attr('x1', cx - 8).attr('x2', cx + 8).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', T.text).attr('stroke-width', 1.5);
                });
                top = y(c.hi);
            }
            g.append('text').attr('x', bx + bw / 2).attr('y', top - 8).attr('text-anchor', 'middle')
                .attr('fill', T.text).attr('font-size', 13).attr('font-family', "'JetBrains Mono', monospace")
                .text(c.v + ' %');
            window.renderKatex(f.svg, c.tex, f.m.left + bx + bw / 2, f.m.top + ih + 18, { width: 60, height: 20, size: 15 });
        });
        window.renderKatex(f.svg, '\\eta~[\\%]', 22, f.m.top + ih / 2, { width: 200, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, '\\text{amplifier class}', f.m.left + iw / 2, f.H - 16, { width: 220, height: 22, size: 16 });
    }

    window.CLD.onRender(render);
})();
