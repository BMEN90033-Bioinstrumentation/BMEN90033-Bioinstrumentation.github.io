// Section 03 · Input and output sinusoids at the test frequency over 2.5
// periods. The input has unit amplitude; the output is shown divided by A_v,
// so its amplitude is |H|/A_v and its peak lags by the phase angle. A
// bracket above the traces marks the lag between corresponding peaks.
(function () {
    var sel = '#plot-phase';
    var CYC = 2.5, YM = 1.4;

    function render() {
        var A = window.AMP, s = A.state(), T = window.T, css = window.CMP.cssVar;
        var f = A.frame(sel, {});
        var g = f.g;
        var x = d3.scaleLinear().domain([0, CYC]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-YM, YM]).range([f.ih, 0]);
        A.axes(f, x, y, {
            yTicks: [-1, -0.5, 0, 0.5, 1],
            yTitle: '\\text{normalised amplitude}',
            xTitle: 't / T'
        });

        var phi = s.angle * Math.PI / 180;
        function trace(fn, col, w, dash) {
            var pts = d3.range(0, 601).map(function (i) { var t = CYC * i / 600; return [x(t), y(fn(t))]; });
            g.append('path').attr('class', 'trace').attr('d', d3.line()(pts))
                .attr('stroke', css(col)).attr('stroke-width', w).attr('stroke-dasharray', dash || null);
        }
        trace(function (t) { return Math.sin(2 * Math.PI * t); }, '--c-in', 1.8, '6 4');
        trace(function (t) { return s.gf * Math.sin(2 * Math.PI * t - phi); }, '--c-out', 2.6);

        // Lag bracket between the input peak at t/T = 1.25 and the output peak.
        if (s.angle > 2) {
            var t1 = 1.25, t2 = 1.25 + phi / (2 * Math.PI);
            var x1 = x(t1), x2 = x(t2), yb = y(1.13), col = css('--c-test');
            [[x1, y(1)], [x2, y(s.gf)]].forEach(function (q) {
                g.append('line').attr('x1', q[0]).attr('x2', q[0]).attr('y1', q[1] - 4).attr('y2', yb)
                    .attr('stroke', T.fg(0.35)).attr('stroke-dasharray', '3 3');
            });
            g.append('line').attr('x1', x1).attr('x2', x2 - 6).attr('y1', yb).attr('y2', yb)
                .attr('stroke', col).attr('stroke-width', 1.6);
            g.append('polygon').attr('fill', col)
                .attr('points', [[x2, yb], [x2 - 8, yb - 4], [x2 - 8, yb + 4]].join(' '));
            window.renderKatex(f.svg, '\\text{lag } ' + s.angle.toFixed(1) + '^\\circ',
                f.m.left + (x1 + x2) / 2, f.m.top + yb - 14, { width: 140, height: 20, size: 14, color: col });
        }
    }

    window.AMP.onRender(render);
})();
