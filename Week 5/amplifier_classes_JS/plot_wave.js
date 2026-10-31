// Section 03 · Input and output over two cycles of the input. Top panel:
// v_in. Bottom panel: v_out, coloured by the conducting device (NPN, PNP,
// or neither in the crossover dead zone), with the clipping limits dashed.
// A cursor follows the animation clock shared with the circuit. Series are
// identified by the HTML legend, so the panels carry no in-plot text.
(function () {
    var sel = '#plot-wave';
    var cur = null;

    function render() {
        var A = window.AMP, p = A.p, css = window.CMP.cssVar, d = A.derived();
        var f = A.frame(sel, {});
        var gap = 16, ph = (f.ih - gap) / 2;
        var x = d3.scaleLinear().domain([0, 720]).range([0, f.iw]);
        var yI = d3.scaleLinear().domain([-1.1, 1.1]).range([ph, 0]);
        var yO = d3.scaleLinear().domain([-14, 14]).range([ph, 0]);
        var xt = [0, 90, 180, 270, 360, 450, 540, 630, 720];

        var gT = f.g;
        var gB = f.svg.append('g').attr('transform', 'translate(' + f.m.left + ',' + (f.m.top + ph + gap) + ')');
        A.axes(f, gT, x, yI, ph, 0, { xTicks: xt, yTicks: [-1, -0.5, 0, 0.5, 1], yTitle: 'v_\\text{in}\\;[\\mathrm{V}]' });
        A.axes(f, gB, x, yO, ph, ph + gap, {
            xTicks: xt, yTicks: [-12, -6, 0, 6, 12],
            yTitle: 'v_\\text{out}\\;[\\mathrm{V}]', xTitle: '\\omega t\\;[^\\circ]'
        });

        var pts = d3.range(0, 1441).map(function (i) {
            var th = i / 2, v = d.vinPeak * Math.sin(th * Math.PI / 180);
            return [th, v, A.outputSample(v, p, d.vceq)];
        });
        gT.append('path').attr('class', 'trace').attr('stroke', css('--c-vin')).attr('stroke-width', 2)
            .attr('d', d3.line().x(function (q) { return x(q[0]); }).y(function (q) { return yI(q[1]); })(pts));

        // Clipping limits.
        var lim = p.cls === 'A' ? [A.VCC - d.vceq, -(d.vceq - A.VCE_SAT)]
            : [A.VCC - A.VCE_SAT, -(A.VCC - A.VCE_SAT)];
        lim.forEach(function (v) {
            gB.append('line').attr('x1', 0).attr('x2', f.iw).attr('y1', yO(v)).attr('y2', yO(v))
                .attr('stroke', css('--c-load')).attr('stroke-width', 1.3).attr('stroke-dasharray', '6 4');
        });

        // Output split into runs of constant conduction state.
        function key(v) {
            if (p.cls === 'A') return '--c-npn';
            return Math.abs(v) < 0.01 ? '--c-dead' : v > 0 ? '--c-npn' : '--c-pnp';
        }
        var runs = [], run = null;
        pts.forEach(function (q, i) {
            var k = key(q[2]);
            if (!run || run.k !== k) {
                run = { k: k, pts: i ? [pts[i - 1]] : [] };
                runs.push(run);
            }
            run.pts.push(q);
        });
        runs.forEach(function (r) {
            gB.append('path').attr('class', 'trace').attr('stroke', css(r.k)).attr('stroke-width', 2.4)
                .attr('d', d3.line().x(function (q) { return x(q[0]); }).y(function (q) { return yO(q[2]); })(r.pts));
        });

        var cc = window.T.fg(0.45);
        cur = {
            x: x, yI: yI, yO: yO, d: d,
            lT: gT.append('line').attr('y1', 0).attr('y2', ph).attr('stroke', cc).attr('stroke-dasharray', '2 3'),
            lB: gB.append('line').attr('y1', 0).attr('y2', ph).attr('stroke', cc).attr('stroke-dasharray', '2 3'),
            dT: gT.append('circle').attr('r', 4.5).attr('fill', css('--c-vin')).attr('stroke', window.T.text),
            dB: gB.append('circle').attr('r', 4.5).attr('stroke', window.T.text)
        };
        tick();
    }

    function tick() {
        if (!cur) return;
        var A = window.AMP, th = A.clock.phase * 360, v = A.vinNow();
        var vo = A.outputSample(v, A.p, cur.d.vceq), px = cur.x(th);
        cur.lT.attr('x1', px).attr('x2', px);
        cur.lB.attr('x1', px).attr('x2', px);
        cur.dT.attr('cx', px).attr('cy', cur.yI(v));
        var k = A.p.cls === 'A' ? '--c-npn' : Math.abs(vo) < 0.01 ? '--c-dead' : vo > 0 ? '--c-npn' : '--c-pnp';
        cur.dB.attr('cx', px).attr('cy', cur.yO(vo)).attr('fill', window.CMP.cssVar(k));
    }

    window.AMP.onRender(render);
    window.AMP.onTick(tick);
})();
