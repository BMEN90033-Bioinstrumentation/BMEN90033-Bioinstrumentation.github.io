// Section 04 · Differential electrode signal V_A - V_B over the last 4 s for
// the homogeneous medium and through the tissue shells, the latter
// multiplied by the display scale. The frame is rebuilt on theme, size or
// parameter change; each animation frame rewrites the two paths and, when the
// signal range changes by more than a factor of about two, the y axis.
(function () {
    var sel = '#plot-signal';
    var f = null, x = null, y = null, gY = null, pT = null, pR = null, dom = 1, note = null, noteBg = null;

    function build() {
        var VC = window.VC, css = window.CMP.cssVar;
        f = VC.frame(sel, { margin: { top: 36, left: 84 } });
        x = d3.scaleLinear().domain([-VC.WIN, 0]).range([0, f.iw]);
        y = d3.scaleLinear().domain([-dom, dom]).range([f.ih, 0]);
        var gx = f.g.append('g').attr('class', 'grid');
        x.ticks(6).forEach(function (t) {
            gx.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 0).attr('y2', f.ih)
                .attr('stroke', css('--grid-line'));
        });
        f.g.append('line').attr('x1', 0).attr('x2', f.iw).attr('y1', f.ih / 2).attr('y2', f.ih / 2)
            .attr('stroke', css('--grid-zero')).attr('stroke-width', 1.2);
        window.CMP.styleAxis(f.g.append('g').attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0)));
        gY = f.g.append('g');
        window.renderKatex(f.svg, 'V_A - V_B\\;[\\text{a.u.}]', 22, f.m.top + f.ih / 2, { width: 220, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, 't - t_\\text{now}\\;[\\mathrm{s}]', f.m.left + f.iw / 2, f.H - 18, { width: 220, height: 22, size: 16 });
        pT = f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-true')).attr('stroke-width', 2);
        pR = f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-rec')).attr('stroke-width', 2);
        // The note sits on a background pill so it never crosses a gridline.
        noteBg = f.g.append('rect').attr('fill', css('--bg-2')).attr('rx', 4);
        note = f.g.append('text').attr('x', f.iw / 2).attr('y', f.ih / 4).attr('text-anchor', 'middle')
            .attr('fill', window.T.textDim).attr('font-size', 13);
        yAxis();
        draw();
    }

    function yAxis() {
        y.domain([-dom, dom]);
        gY.selectAll('*').remove();
        gY.call(d3.axisLeft(y).ticks(5).tickSizeOuter(0).tickFormat(d3.format('.2~g')));
        window.CMP.styleAxis(gY);
    }

    function draw() {
        if (!f) return;
        var VC = window.VC, h = VC.hist, now = VC.now(), k = Math.pow(10, VC.p.lscale);
        var peak = 0;
        h.forEach(function (d) { peak = Math.max(peak, Math.abs(d[1]), Math.abs(d[2] * k)); });
        if (peak < 1e-6) peak = 1;
        // Rescale only when the trace leaves the axis or falls below 40 % of it.
        if (peak > dom * 0.95 || peak < dom * 0.4) { dom = peak / 0.8; yAxis(); }
        var line = function (get) {
            return d3.line().x(function (d) { return x(d[0] - now); }).y(function (d) { return y(get(d)); })(h) || '';
        };
        pT.attr('d', line(function (d) { return d[1]; }));
        pR.attr('d', line(function (d) { return d[2] * k; }));
        var msg = VC.electrodes.length < 2 ? 'at least two electrodes are needed for a differential signal' : '';
        if (note.text() !== msg) {
            note.text(msg);
            var b = msg ? note.node().getBBox() : { x: 0, y: 0, width: 0, height: 0 };
            noteBg.attr('x', b.x - 8).attr('y', b.y - 4).attr('width', msg ? b.width + 16 : 0).attr('height', msg ? b.height + 8 : 0);
        }

        var out = {};
        out.lead = VC.electrodes.length >= 2 ? VC.electrodes[0].label + ' − ' + VC.electrodes[1].label : '–';
        // RMS ratio over the visible window; an instantaneous ratio is
        // undefined at every zero crossing of the true signal.
        var st = 0, sr = 0;
        h.forEach(function (q) { st += q[1] * q[1]; sr += q[2] * q[2]; });
        var ok = h.length > 1 && st > 1e-12;
        out.atten = ok ? Math.sqrt(sr / st).toFixed(3) : '–';
        out.disp = ok ? (Math.sqrt(sr / st) * k).toFixed(3) : '–';
        Object.keys(out).forEach(function (key) {
            document.querySelectorAll('[data-out="' + key + '"]').forEach(function (el) { el.textContent = out[key]; });
        });
    }

    function init() {
        build();
        window.addEventListener('themechange', build);
        window.addEventListener('resize', build);
        window.addEventListener('vcchange', function (e) { if (e.detail && e.detail.key !== 'angle') build(); });
        window.VC.addView(document.querySelector(sel), draw);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
