// Section 03 · Electrode potentials V_A, V_B and the bipolar signal V_A - V_B
// over one full cycle (entry of the depolarisation front to exit of the
// repolarisation front). The cursor marks the present instant. Series are
// identified by the HTML legend, so the plot carries no in-plot text.
(function () {
    var sel = '#plot-signals';
    var A = window.APD, N = 730;
    var refs = null;

    function render() {
        var css = window.CMP.cssVar, T = window.T;
        var f = A.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih, Tc = A.cycleLength();
        var x = d3.scaleLinear().domain([0, Tc]).range([0, iw]);
        var y = d3.scaleLinear().domain([-20, 20]).range([ih, 0]);
        A.axes(f, g, x, y, ih, 0, { xTitle: 't\\;[\\mathrm{s}]', yTitle: 'V\\;[\\text{a.u.}]' });

        var pts = d3.range(0, N + 1).map(function (i) {
            var t = Tc * i / N; return [t, A.state(A.wfAt(t))];
        });
        function trace(key, c, w) {
            g.append('path').attr('class', 'trace').attr('stroke', css(c)).attr('stroke-width', w)
                .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1][key]); })(pts));
        }
        trace('vb', '--c-eb', 1.6);
        trace('va', '--c-ea', 1.6);
        trace('diff', '--c-diff', 2.4);

        var cursor = g.append('line').attr('y1', 0).attr('y2', ih).attr('stroke', T.fg(0.45)).attr('stroke-dasharray', '3 4');
        var dots = [['va', '--c-ea'], ['vb', '--c-eb'], ['diff', '--c-diff']].map(function (d) {
            return { key: d[0], el: g.append('circle').attr('r', 4.5).attr('fill', css(d[1])).attr('stroke', T.text).attr('stroke-width', 1) };
        });
        refs = { x: x, y: y, cursor: cursor, dots: dots };
        tick();
    }

    function tick() {
        if (!refs) return;
        var t = A.tNow(), st = A.state(A.s.wf), px = refs.x(t), y = refs.y;
        refs.cursor.attr('x1', px).attr('x2', px);
        refs.dots.forEach(function (d) { d.el.attr('cx', px).attr('cy', y(st[d.key])); });
    }

    A.onRender(render);
    A.onTick(tick, document.querySelector(sel));
})();
