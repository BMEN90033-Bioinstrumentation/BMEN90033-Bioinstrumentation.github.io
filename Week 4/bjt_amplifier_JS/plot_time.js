// Section 04 · Input and output in time. Top panel: v_in(t). Bottom panel:
// v_CE(t) from the Shockley operating point at each sample, with the
// quiescent V_CEQ dashed; the v_CE axis is scaled to the output swing.
// The rolling buffer is mapped onto a fixed 10 s window, newest sample at
// the right edge. Series identified by the HTML
// legend, so the panels carry no in-plot text.
(function () {
    var sel = '#plot-time';
    var WIN = 10;   // s
    var dyn = null, S = null;

    function render() {
        var A = window.AMP, p = A.p, css = window.CMP.cssVar;
        var f = A.frame(sel, {});
        var gap = 14, ph = (f.ih - gap) / 2;
        var x = d3.scaleLinear().domain([0, WIN]).range([0, f.iw]);
        var vpk = Math.max(p.vin, 1) * 1.2;
        var yV = d3.scaleLinear().domain([-vpk, vpk]).range([ph, 0]).nice(4);
        // v_CE axis spans the output extremes (the response is monotonic in
        // v_in, so they occur at +/- peak), padded, at least 0.2 V wide.
        var e1 = A.operatingPoint(p.vbb + p.vin / 1000).vce, e2 = A.operatingPoint(p.vbb - p.vin / 1000).vce;
        var lo = Math.min(e1, e2), hi = Math.max(e1, e2), pad = Math.max((hi - lo) * 0.2, 0.1);
        var yC = d3.scaleLinear().domain([Math.max(0, lo - pad), hi + pad]).range([ph, 0]).nice(4);
        var gT = f.g, gB = f.svg.append('g').attr('transform', 'translate(' + f.m.left + ',' + (f.m.top + ph + gap) + ')');
        A.axes(f, gT, x, yV, ph, 0, { yTitle: 'v_\\text{in}\\;[\\mathrm{mV}]' });
        A.axes(f, gB, x, yC, ph, ph + gap, { yTitle: 'v_{CE}\\;[\\mathrm{V}]', xTitle: 't\\;[\\mathrm{s}]' });

        var vq = A.computeDCBias().vceq;
        gB.append('line').attr('x1', 0).attr('x2', f.iw).attr('y1', yC(vq)).attr('y2', yC(vq))
            .attr('stroke', css('--c-load')).attr('stroke-width', 1.2).attr('stroke-dasharray', '6 4');
        [[gT, 'tm-clip-t'], [gB, 'tm-clip-b']].forEach(function (q) {
            q[0].append('clipPath').attr('id', q[1]).append('rect').attr('width', f.iw).attr('height', ph);
        });
        dyn = {
            vin: gT.append('path').attr('clip-path', 'url(#tm-clip-t)').attr('class', 'trace').attr('stroke', css('--c-vin')).attr('stroke-width', 2),
            vce: gB.append('path').attr('clip-path', 'url(#tm-clip-b)').attr('class', 'trace').attr('stroke', css('--c-vce')).attr('stroke-width', 2)
        };
        S = { x: x, yV: yV, yC: yC };
        tick();
    }

    function tick() {
        if (!dyn) return;
        var A = window.AMP, b = A.buf, N = b.t.length;
        if (N < 2) { dyn.vin.attr('d', null); dyn.vce.attr('d', null); return; }
        var t1 = b.t[N - 1];
        var X = function (i) { return S.x(b.t[i] - t1 + WIN); };
        dyn.vin.attr('d', d3.line()(b.vin.map(function (v, i) { return [X(i), S.yV(v * 1e3)]; })));
        dyn.vce.attr('d', d3.line()(b.vin.map(function (v, i) { return [X(i), S.yC(A.operatingPoint(A.p.vbb + v).vce)]; })));
    }

    window.AMP.onRender(render);
    window.addEventListener('amptick', tick);
    window.AMP.watch(document.querySelector(sel));
})();
