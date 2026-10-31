// Section 04 · Passive (channel + leak) particle flux over the last 70 ms:
// Na+ influx and K+ efflux, both positive in their physiological direction.
// The symmetric y range grows to fit the window (minimum +/-30 particles/ms)
// and the plot is redrawn when it changes. Series in the HTML legend.
(function () {
    var sel = '#plot-flux';
    var B = window.BIO, refs = null, lim = 30;

    function limit() {
        var mx = 0;
        ['naFlux', 'kFlux'].forEach(function (k) {
            B.buf[k].forEach(function (v) { if (Math.abs(v) > mx) mx = Math.abs(v); });
        });
        return Math.max(30, Math.ceil(mx / 10) * 10);
    }

    function render() {
        var css = window.CMP.cssVar;
        lim = limit();
        var f = B.frame(sel, {});
        var x = B.timeScale(f.iw);
        var y = d3.scaleLinear().domain([-lim, lim]).range([f.ih, 0]);
        B.axes(f, f.g, x, y, f.ih, 0, { yTitle: '\\dot{N}\\;[\\text{particles/ms}]', yWidth: 240, xTitle: 't\\;[\\mathrm{ms}]' });
        refs = {
            x: x, y: y,
            na: f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-na')).attr('stroke-width', 2.2),
            k: f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-k')).attr('stroke-width', 2.2)
        };
        tick();
    }

    function tick() {
        if (!refs) return;
        if (limit() !== lim) { render(); return; }
        refs.na.attr('d', B.tracePath(B.buf.naFlux, refs.x, refs.y));
        refs.k.attr('d', B.tracePath(B.buf.kFlux, refs.x, refs.y));
    }

    B.onRender(render);
    B.onTick(tick, document.querySelector(sel));
})();
