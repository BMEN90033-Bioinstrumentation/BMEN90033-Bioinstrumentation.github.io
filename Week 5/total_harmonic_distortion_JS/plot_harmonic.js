// Section 01 · The fundamental and one selected harmonic (at half the
// fundamental amplitude) over three cycles of the fundamental. Series are
// identified by the HTML legend, so the plot carries no in-plot text.
(function () {
    var sel = '#plot-harmonic';

    function render() {
        var H = window.THD, p = H.p, css = window.CMP.cssVar, n = +p.sel;
        var f = H.frame(sel, {});
        var tEnd = H.CYCLES / p.f * 1000;   // ms
        var x = d3.scaleLinear().domain([0, tEnd]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-1.2, 1.2]).range([f.ih, 0]);
        H.axes(f, f.g, x, y, f.ih, 0, {
            yTicks: [-1, -0.5, 0, 0.5, 1],
            xTitle: 't~[\\mathrm{ms}]', yTitle: 'v / V_1'
        });
        function trace(k, a, col, w, op) {
            var pts = d3.range(0, 601).map(function (i) {
                var th = i / 600 * H.CYCLES * 2 * Math.PI;
                return [x(i / 600 * tEnd), y(a * Math.sin(k * th))];
            });
            f.g.append('path').attr('class', 'trace').attr('stroke', col).attr('stroke-width', w)
                .attr('stroke-opacity', op).attr('d', d3.line()(pts));
        }
        trace(1, 1, css('--c-fund'), 1.6, 0.4);
        trace(n, 0.5, css(H.COL[n]), 2.4, 1);
        var sw = document.getElementById('sel-sw');
        if (sw) sw.style.background = css(H.COL[n]);
    }

    window.THD.onRender(render);
})();
