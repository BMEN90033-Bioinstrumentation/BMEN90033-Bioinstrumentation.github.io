// Section 06 · Illustrative open-loop THD and efficiency of the output
// stage classes, from the ranges quoted in the text: class A THD 1-2 % at
// about 25 %, AB 3-5 % at about 55 %, B 5-10 % at about 78 %. Class D is a
// band at 90-95 % efficiency whose THD depends on the output filter. The
// dashed line is the THD of the present harmonic profile. Series are
// identified by the HTML legend.
(function () {
    var sel = '#plot-tradeoff';
    var CLS = [
        { eta: 25, lo: 1, hi: 2, c: '--c-clsA' },
        { eta: 55, lo: 3, hi: 5, c: '--c-clsAB' },
        { eta: 78, lo: 5, hi: 10, c: '--c-clsB' }
    ];

    function render() {
        var H = window.THD, css = window.CMP.cssVar, T = window.T;
        var f = H.frame(sel, {});
        var g = f.g;
        var x = d3.scaleLinear().domain([0, 100]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([0, 12]).range([f.ih, 0]);
        g.append('rect').attr('x', x(90)).attr('y', 0).attr('width', x(95) - x(90)).attr('height', f.ih)
            .attr('fill', css('--c-clsD'));
        H.axes(f, g, x, y, f.ih, 0, {
            xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, 2, 4, 6, 8, 10, 12],
            xTitle: '\\eta~[\\%]', yTitle: '\\text{THD}~[\\%]'
        });
        var thd = H.thd();
        if (thd <= 12) {
            g.append('line').attr('x1', 0).attr('x2', f.iw).attr('y1', y(thd)).attr('y2', y(thd))
                .attr('stroke', css('--c-ref')).attr('stroke-width', 1.4).attr('stroke-dasharray', '6 4');
        }
        CLS.forEach(function (c) {
            var px = x(c.eta), col = css(c.c);
            g.append('line').attr('x1', px).attr('x2', px).attr('y1', y(c.lo)).attr('y2', y(c.hi))
                .attr('stroke', col).attr('stroke-width', 8).attr('stroke-linecap', 'round');
            [c.lo, c.hi].forEach(function (v) {
                g.append('line').attr('x1', px - 10).attr('x2', px + 10).attr('y1', y(v)).attr('y2', y(v))
                    .attr('stroke', col).attr('stroke-width', 2);
            });
        });
    }

    window.THD.onRender(render);
})();
