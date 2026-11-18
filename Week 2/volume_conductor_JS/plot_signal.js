// Differential electrode signal V_A - V_B over the last 4 s for the unbounded
// homogeneous reference and for the layered body. Two instances: a compact
// one inset in the 3D scene of section 01, and one in section 04, where the
// body trace is multiplied by the display scale and the RMS readouts are
// written. The
// frame is rebuilt on size or parameter change; each animation frame rewrites
// the two paths and, when the signal range changes by more than a factor of
// about two, the y axis.
(function () {
    function plot(sel, scaled, compact) {
        var f = null, x = null, y = null, gY = null, pT = null, pR = null, dom = 1;

        function build() {
            var VC = window.VC, css = window.CMP.cssVar;
            f = VC.frame(sel, { margin: compact ? { top: 38, right: 14, bottom: 48, left: 66 } : { top: 36, left: 84 } });
            var nx = compact ? 4 : 6, ts = compact ? 14 : 16;
            x = d3.scaleLinear().domain([-VC.WIN, 0]).range([0, f.iw]);
            y = d3.scaleLinear().domain([-dom, dom]).range([f.ih, 0]);
            var gx = f.g.append('g').attr('class', 'grid');
            x.ticks(nx).forEach(function (t) {
                gx.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 0).attr('y2', f.ih)
                    .attr('stroke', css('--grid-line'));
            });
            f.g.append('line').attr('x1', 0).attr('x2', f.iw).attr('y1', f.ih / 2).attr('y2', f.ih / 2)
                .attr('stroke', css('--grid-zero')).attr('stroke-width', 1.2);
            window.CMP.styleAxis(f.g.append('g').attr('transform', 'translate(0,' + f.ih + ')')
                .call(d3.axisBottom(x).ticks(nx).tickSizeOuter(0)));
            gY = f.g.append('g');
            window.renderKatex(f.svg, 'V_A - V_B\\;[\\text{a.u.}]', compact ? 16 : 22, f.m.top + f.ih / 2, { width: 220, height: 22, rotate: -90, size: ts });
            window.renderKatex(f.svg, 't - t_\\text{now}\\;[\\mathrm{s}]', f.m.left + f.iw / 2, f.H - (compact ? 14 : 18), { width: 220, height: 22, size: ts });
            pT = f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-true')).attr('stroke-width', 2);
            pR = f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-rec')).attr('stroke-width', 2);
            yAxis();
            draw();
        }

        function yAxis() {
            y.domain([-dom, dom]);
            gY.selectAll('*').remove();
            // On the compact plot every second tick is kept, counted from zero,
            // so the tick labels stay clear of each other.
            var t = y.ticks(5), mid = (t.length - 1) / 2;
            if (compact && t.length > 3) t = t.filter(function (d, i) { return (i - mid) % 2 === 0; });
            gY.call(d3.axisLeft(y).tickValues(t).tickSizeOuter(0).tickFormat(d3.format('.2~g')));
            window.CMP.styleAxis(gY);
        }

        function draw() {
            if (!f) return;
            var VC = window.VC, h = VC.hist, now = VC.now(), k = scaled ? Math.pow(10, VC.p.lscale) : 1;
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
            if (!scaled) return;

            var out = { lead: 'A − B' };
            // RMS ratio over the visible window; an instantaneous ratio is
            // undefined at every zero crossing of the reference signal.
            var st = 0, sr = 0;
            h.forEach(function (q) { st += q[1] * q[1]; sr += q[2] * q[2]; });
            var ok = h.length > 1 && st > 1e-12;
            out.atten = ok ? Math.sqrt(sr / st).toFixed(3) : '–';
            out.disp = ok ? (Math.sqrt(sr / st) * k).toFixed(3) : '–';
            Object.keys(out).forEach(function (key) {
                document.querySelectorAll('[data-out="' + key + '"]').forEach(function (el) { el.textContent = out[key]; });
            });
        }

        build();
        window.addEventListener('resize', build);
        window.addEventListener('vcchange', function (e) { if (e.detail && e.detail.key !== 'angle') build(); });
        window.VC.addView(document.querySelector(sel), draw);
    }

    function init() {
        plot('#plot-lead', false, true);
        plot('#plot-signal', true, false);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
