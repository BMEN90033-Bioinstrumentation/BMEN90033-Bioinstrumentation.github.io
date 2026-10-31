// Section 03 · Schematic membrane potential at the recording point
// (x = RECORD_X) for both fibres over one cycle, V = -70 + 110 a(d) mV with
// a = apShape and d the distance from the recording point to the front.
// Each trace is sampled at every simulation step and, in addition, at the
// exact instants the front passes the breakpoints of apShape (including the
// peak at d = 0), so a fast front cannot skip the peak between samples.
// The readout gives the arrival time of each front at the recording point.
(function () {
    var sel = '#plot-record';
    var M = window.MYE, refs = null;

    function render() {
        var css = window.CMP.cssVar, T = window.T;
        var f = M.frame(sel, {});
        var run = M.simulate(), Tc = run[run.length - 1].t, R = M.RECORD_X;
        var x = d3.scaleLinear().domain([0, Tc]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-90, 50]).range([f.ih, 0]);
        M.axes(f, f.g, x, y, f.ih, 0, { xTitle: 't\\;[\\mathrm{s}]', yTitle: 'V_m\\;[\\mathrm{mV}]' });

        // [t, front position] pairs with the breakpoint crossings inserted.
        function samples(key) {
            var out = [[run[0].t, run[0][key]]];
            for (var i = 1; i < run.length; i++) {
                var a = run[i - 1], b = run[i];
                M.AP_BREAKS.forEach(function (dk) {
                    var xb = R - dk;
                    if (a[key] < xb && b[key] >= xb) {
                        out.push([a.t + (b.t - a.t) * (xb - a[key]) / (b[key] - a[key]), xb]);
                    }
                });
                out.push([b.t, b[key]]);
            }
            return out;
        }
        function trace(key, c) {
            f.g.append('path').attr('class', 'trace').attr('stroke', css(c))
                .attr('d', d3.line().x(function (d) { return x(d[0]); })
                    .y(function (d) { return y(M.vm(M.apShape(R - d[1]))); })(samples(key)));
        }
        trace('u', '--c-depol');
        trace('m', '--c-myelin');

        var cur = f.g.append('line').attr('y1', 0).attr('y2', f.ih).attr('stroke', T.fg(0.45)).attr('stroke-dasharray', '3 4');
        var du = f.g.append('circle').attr('r', 4.5).attr('fill', css('--c-depol')).attr('stroke', T.text).attr('stroke-width', 1);
        var dm = f.g.append('circle').attr('r', 4.5).attr('fill', css('--c-myelin')).attr('stroke', T.text).attr('stroke-width', 1);
        refs = { x: x, y: y, cur: cur, du: du, dm: dm };

        // Arrival: first sample at which the front has reached the recording point.
        var tu = M.crossTime(run, 'u', R), tmy = M.crossTime(run, 'm', R);
        var out = { tm: tmy.toFixed(2) + ' s', tu: tu.toFixed(2) + ' s', tr: (tu / tmy).toFixed(1) + '×' };
        document.querySelectorAll('[data-out]').forEach(function (el) { el.textContent = out[el.dataset.out]; });
        tick();
    }

    function tick() {
        if (!refs) return;
        var s = M.s, R = M.RECORD_X, px = refs.x(s.t);
        refs.cur.attr('x1', px).attr('x2', px);
        refs.du.attr('cx', px).attr('cy', refs.y(M.vm(M.apShape(R - s.unmyelX))));
        refs.dm.attr('cx', px).attr('cy', refs.y(M.vm(M.apShape(R - s.myelX))));
    }

    M.onRender(render);
    M.onTick(tick, document.querySelector(sel));
})();
