// Section 04 · Efficiency against input amplitude for the three classes,
// from the same power model. The class A curve uses the present bias when
// class A is selected and the centred bias otherwise. The dashed lines mark
// the theoretical maxima of 25 % and 78.5 %. Series are identified by the
// HTML legend.
(function () {
    var sel = '#plot-eff';
    var COL = { A: '--c-bias', B: '--c-pnp', AB: '--c-npn' };
    var BIAS = { A: 50, B: 0, AB: 5 };

    function render() {
        var A = window.AMP, p = A.p, css = window.CMP.cssVar, T = window.T;
        var f = A.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([0, 1]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, 100]).range([ih, 0]);
        A.axes(f, g, x, y, ih, 0, {
            xTicks: [0, 0.2, 0.4, 0.6, 0.8, 1], yTicks: [0, 20, 40, 60, 80, 100],
            xTitle: '\\hat{v}_\\text{in}\\;[\\mathrm{V}]', yTitle: '\\eta\\;[\\%]'
        });
        [25, 78.5].forEach(function (v) {
            g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', css('--c-load')).attr('stroke-width', 1.3).attr('stroke-dasharray', '6 4');
        });
        ['A', 'B', 'AB'].forEach(function (c) {
            var q = { cls: c, bias: c === 'A' && p.cls === 'A' ? p.bias : BIAS[c] };
            var pts = d3.range(0, 101).map(function (a) {
                q.amp = a; return [a / 100, A.derived(q).efficiency];
            });
            var now = c === p.cls;
            g.append('path').attr('class', 'trace').attr('stroke', css(COL[c]))
                .attr('stroke-width', now ? 2.6 : 1.6).attr('stroke-opacity', now ? 1 : 0.4)
                .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); })(pts));
        });
        var d = A.derived();
        g.append('circle').attr('cx', x(d.vinPeak)).attr('cy', y(d.efficiency)).attr('r', 5)
            .attr('fill', css(COL[p.cls])).attr('stroke', T.text).attr('stroke-width', 1);
    }

    window.AMP.onRender(render);
})();
