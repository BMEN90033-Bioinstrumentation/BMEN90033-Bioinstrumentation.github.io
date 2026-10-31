// Section 02 · Input waveform x(t), drawn as the min/max envelope of each
// pixel column. A vertical cursor follows the playback position. Single
// quadrant in time; no in-plot text.
(function () {
    var sel = '#plot-input';
    var cursor = null, xs = null, dur = 1;

    function render() {
        var CI = window.CI, d = CI.data, css = window.CMP.cssVar;
        var f = CI.frame(sel, {});
        cursor = null;
        if (!d.raw) return;
        var raw = d.raw, n = raw.length, peak = 0;
        for (var i = 0; i < n; i++) peak = Math.max(peak, Math.abs(raw[i]));
        peak = peak || 1;
        dur = n / d.sr;
        xs = d3.scaleLinear().domain([0, dur]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-1.1, 1.1]).range([f.ih, 0]);
        CI.axes(f, f.g, xs, y, f.ih, 0, {
            yTicks: [-1, -0.5, 0, 0.5, 1],
            xTitle: 't\\;[\\mathrm{s}]', yTitle: 'x(t) / \\max|x|'
        });

        var cols = Math.max(2, Math.floor(f.iw)), band = [];
        for (var c = 0; c < cols; c++) {
            var a = Math.floor(c * n / cols), b = Math.max(a + 1, Math.floor((c + 1) * n / cols));
            var lo = Infinity, hi = -Infinity;
            for (var j = a; j < b; j++) { if (raw[j] < lo) lo = raw[j]; if (raw[j] > hi) hi = raw[j]; }
            band.push([c, y(hi / peak), y(lo / peak)]);
        }
        f.g.append('path').attr('fill', css('--c-input')).attr('fill-opacity', 0.75)
            .attr('d', d3.area().x(function (q) { return q[0]; }).y0(function (q) { return q[2]; })
                .y1(function (q) { return q[1]; })(band));

        cursor = f.g.append('line').attr('y1', 0).attr('y2', f.ih)
            .attr('stroke', css('--c-rec')).attr('stroke-width', 2).style('display', 'none');
        tick();
    }

    function tick() {
        if (!cursor) return;
        var play = window.CI.play;
        cursor.style('display', play.active ? null : 'none');
        if (play.active) cursor.attr('x1', xs(Math.min(play.pos, dur))).attr('x2', xs(Math.min(play.pos, dur)));
    }

    window.CI.onRender(render);
    window.addEventListener('citick', tick);
})();
