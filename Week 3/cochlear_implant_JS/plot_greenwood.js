// Section 01 · Greenwood place map f(x) on a log frequency axis, with the
// present electrode centre frequencies as dots on the curve. Single
// quadrant; series identified by the HTML legend, no in-plot text.
(function () {
    var sel = '#plot-greenwood';

    function render() {
        var CI = window.CI, T = window.T, css = window.CMP.cssVar, cfg = CI.config();
        var f = CI.frame(sel, { margin: { bottom: 64 } });
        var x = d3.scaleLinear().domain([0, 1]).range([0, f.iw]);
        var y = d3.scaleLog().domain([15, 25000]).range([f.ih, 0]);

        CI.axes(f, f.g, x, y, f.ih, 0, {
            yTicks: [20, 100, 1000, 10000], yFmt: CI.fTick,
            xTitle: 'x\\;(\\text{fractional distance from apex})',
            yTitle: 'f\\;[\\mathrm{Hz}]'
        });

        var pts = d3.range(0, 201).map(function (i) { var xx = i / 200; return [x(xx), y(CI.greenwoodF(xx))]; });
        f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-guide')).attr('stroke-width', 2)
            .attr('d', d3.line()(pts));

        var n = cfg.freqs.length, r = n <= 32 ? 4.5 : n <= 100 ? 3 : 2;
        cfg.freqs.forEach(function (fc, i) {
            var xx = Math.max(0, Math.min(1, CI.greenwoodX(fc)));
            f.g.append('circle').attr('cx', x(xx)).attr('cy', y(fc)).attr('r', r)
                .attr('fill', cfg.colors[i]).attr('stroke', n <= 32 ? T.text : 'none').attr('stroke-width', 0.8);
        });
    }

    window.CI.onRender(render);
    window.addEventListener('cichange', render);
})();
