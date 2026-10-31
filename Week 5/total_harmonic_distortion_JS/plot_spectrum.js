// Section 04 · Spectrum in decibels relative to the fundamental for the
// fundamental and harmonics 2 to 8, on a 0 to -60 dB scale. Harmonics 6 to
// 8 are absent from the model and sit at the -60 dB floor (amplitude 0.001),
// as in the original page. Bars rise from the floor.
(function () {
    var sel = '#plot-spectrum';
    var DB_MIN = -60;

    function render() {
        var H = window.THD, p = H.p, css = window.CMP.cssVar;
        var f = H.frame(sel, { margin: { top: 30, bottom: 96 } });
        var g = f.g;
        var ns = [1, 2, 3, 4, 5, 6, 7, 8];
        var x = d3.scaleBand().domain(d3.range(ns.length)).range([0, f.iw]).padding(0.22);
        var y = d3.scaleLinear().domain([DB_MIN, 0]).range([f.ih, 0]);
        var yt = [0, -20, -40, -60];
        window.CMP.drawGrid(g, d3.scaleLinear(), y, f.iw, f.ih, { xTicks: [], yTicks: yt });
        window.CMP.styleAxis(g.append('g').call(d3.axisLeft(y).tickValues(yt).tickSizeOuter(0)));
        H.catAxis(f, g, x, ns.map(function (n) { return { tex: (n === 1 ? '' : n) + 'f_1', sub: String(p.f * n) }; }));
        ns.forEach(function (n, i) {
            var a = n <= 5 ? Math.max(H.amp(n), 0.001) : 0.001;
            var db = Math.max(20 * Math.log10(a), DB_MIN);
            g.append('rect').attr('x', x(i)).attr('y', y(db)).attr('width', x.bandwidth())
                .attr('height', f.ih - y(db)).attr('rx', 2)
                .attr('fill', css(n <= 5 ? H.COL[n] : '--c-hx')).attr('fill-opacity', n === 1 ? 0.7 : 0.85);
        });
        window.renderKatex(f.svg, '20\\log_{10}(V_n/V_1)~[\\mathrm{dB}]', 22, f.m.top + f.ih / 2,
            { width: 280, height: 22, rotate: -90, size: 15 });
        window.renderKatex(f.svg, 'f~[\\mathrm{Hz}]', f.m.left + f.iw / 2, f.H - 16,
            { width: 200, height: 22, size: 16 });
    }

    window.THD.onRender(render);
})();
