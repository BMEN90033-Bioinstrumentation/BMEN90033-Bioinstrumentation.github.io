// Section 04 · Quasi-static switching waveforms. Top panel: drive v_in(t).
// Bottom panel: i_B, i_C, i_E. Series identified by the HTML legend, so the
// panels carry no in-plot text.
(function () {
    var sel = '#plot-time';
    var T_END = 5;   // s

    function render() {
        var B = window.BJT, p = B.p, css = window.CMP.cssVar;
        var f = B.frame(sel, {});
        var gap = 14, ph = (f.ih - gap) / 2;

        var pts = d3.range(0, 1001).map(function (i) {
            var t = T_END * i / 1000, v = p.vin * B.waveValue(t, p.wave, p.freq);
            return [t, v, B.compute(v)];
        });
        var iMax = Math.max(B.icSat() * 1.15, d3.max(pts, function (d) { return d[2].ie; })) * 1e3;

        var x = d3.scaleLinear().domain([0, T_END]).range([0, f.iw]);
        var yV = d3.scaleLinear().domain([0, Math.max(1, p.vin) * 1.15]).range([ph, 0]);
        var yI = d3.scaleLinear().domain([0, iMax]).range([ph, 0]);

        var gT = f.g;
        var gB = f.svg.append('g').attr('transform',
            'translate(' + f.m.left + ',' + (f.m.top + ph + gap) + ')');
        B.axes(f, gT, x, yV, ph, 0, { yTitle: 'v_\\text{in}\\;[\\mathrm{V}]' });
        B.axes(f, gB, x, yI, ph, ph + gap, { yTitle: 'i\\;[\\mathrm{mA}]', xTitle: 't\\;[\\mathrm{s}]' });

        function trace(g, y, get, col, w) {
            g.append('path').attr('class', 'trace').attr('stroke', css(col)).attr('stroke-width', w)
                .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(get(d)); })(pts));
        }
        trace(gT, yV, function (d) { return d[1]; }, '--c-vin', 2);
        trace(gB, yI, function (d) { return d[2].ie * 1e3; }, '--c-ie', 1.6);
        trace(gB, yI, function (d) { return d[2].ic * 1e3; }, '--c-ic', 2.2);
        trace(gB, yI, function (d) { return d[2].ib * 1e3; }, '--c-ib', 1.6);

        var avg = document.getElementById('time-pavg');
        if (avg) avg.textContent = B.fmtP(d3.mean(pts, function (d) { return d[2].pd; }));
    }

    window.BJT.onRender(render);
})();
