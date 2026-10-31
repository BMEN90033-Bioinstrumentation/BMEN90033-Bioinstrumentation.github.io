// Section 03 · Magnitude response of each analysis band: the high-pass
// biquad at the lower edge times the low-pass biquad at the upper edge,
// evaluated on the unit circle. Above 40 channels an evenly spaced subset
// of 40 is drawn and the plot-box label says so. No in-plot text.
(function () {
    var sel = '#plot-bank';
    var MAXDRAW = 40;

    function render() {
        var CI = window.CI, css = window.CMP.cssVar, cfg = CI.config(), sr = CI.data.sr;
        var f = CI.frame(sel, {});
        var x = d3.scaleLog().domain([20, 20000]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-40, 3]).range([f.ih, 0]);

        CI.axes(f, f.g, x, y, f.ih, 0, {
            xTicks: [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000], xFmt: CI.fTick,
            yTicks: [-40, -30, -20, -10, 0],
            xTitle: 'f\\;[\\mathrm{Hz}]', yTitle: '|H_i(f)|\\;[\\mathrm{dB}]'
        });

        f.g.append('line').attr('x1', 0).attr('x2', f.iw).attr('y1', y(-3)).attr('y2', y(-3))
            .attr('stroke', css('--c-guide')).attr('stroke-width', 1.2).attr('stroke-dasharray', '6 4');

        var n = cfg.freqs.length, idx = d3.range(n);
        if (n > MAXDRAW) idx = d3.range(MAXDRAW).map(function (k) { return Math.round(k * (n - 1) / (MAXDRAW - 1)); });
        var fs = d3.range(0, 301).map(function (i) { return 20 * Math.pow(1000, i / 300); });
        // Clip the traces to the plot area; the skirts fall below -40 dB.
        var clipId = 'bank-clip';
        f.g.append('clipPath').attr('id', clipId).append('rect').attr('width', f.iw).attr('height', f.ih);
        var traces = f.g.append('g').attr('clip-path', 'url(#' + clipId + ')');
        idx.forEach(function (i) {
            var hp = CI.hpCoef(cfg.bands[i][0], sr), lp = CI.lpCoef(cfg.bands[i][1], sr);
            var pts = fs.filter(function (q) { return q < sr / 2; }).map(function (q) {
                var m = CI.biquadMag(hp, q, sr) * CI.biquadMag(lp, q, sr);
                return [x(q), y(20 * Math.log10(Math.max(m, 1e-6)))];
            });
            traces.append('path').attr('fill', 'none').attr('stroke', cfg.colors[i])
                .attr('stroke-width', n > 16 ? 1.2 : 2).attr('d', d3.line()(pts));
        });

        var lab = document.getElementById('bank-label');
        if (lab) lab.innerHTML = 'filter bank · <b>magnitude response of each band</b>' +
            (n > MAXDRAW ? ' · ' + MAXDRAW + ' of ' + n + ' bands shown' : ' · ' + n + (n === 1 ? ' band' : ' bands'));
    }

    window.CI.onRender(render);
    window.addEventListener('cichange', render);
})();
