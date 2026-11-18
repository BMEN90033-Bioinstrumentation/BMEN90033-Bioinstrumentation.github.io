// Section 02 · Radial conductivity profile sigma(r) of the current body, from
// the source at the centre to the skin at r = R, with air beyond. Each step
// takes its layer colour; a layer that is switched off is drawn in grey at
// the source-region conductivity. A layer is labelled above its step where
// the step is wide enough, and otherwise beside the profile in the air
// margin, joined to its step by a dotted leader.
(function () {
    var sel = '#plot-sigma';
    var R_MAX = 18;

    function render() {
        var VC = window.VC, T = window.T, css = window.CMP.cssVar, R = VC.SURFACE_RADIUS;
        var f = VC.frame(sel, { margin: { top: 36 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([0, R_MAX]).range([0, iw]);
        var y = d3.scaleLog().domain([2e-4, 3]).range([ih, 0]);
        var xTicks = [0, 2, 4, 6, 8, 10, 12, 14];

        // Air beyond the body surface.
        var xs = x(R);
        g.append('rect').attr('x', xs).attr('y', 0).attr('width', iw - xs).attr('height', ih).attr('fill', T.fg(0.045));
        window.CMP.drawGrid(g, x, y, xs, ih, { xTicks: xTicks, yTicks: [1e-3, 1e-2, 1e-1, 1] });
        var xa = g.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(d3.axisBottom(x).tickValues(xTicks).tickSizeOuter(0));
        var ya = g.append('g').call(d3.axisLeft(y).tickValues([1e-3, 1e-2, 1e-1, 1])
            .tickFormat(function (d) { return d >= 1 ? '1' : String(d); }).tickSizeOuter(0));
        [xa, ya].forEach(window.CMP.styleAxis);
        window.renderKatex(f.svg, '\\sigma\\;[\\mathrm{S/m}]', 22, f.m.top + ih / 2, { width: 200, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, 'r\\;[\\text{model units}]', f.m.left + iw / 2, f.H - 18, { width: 240, height: 22, size: 16 });
        g.append('line').attr('x1', xs).attr('x2', xs).attr('y1', 0).attr('y2', ih)
            .attr('stroke', css('--c-ref')).attr('stroke-dasharray', '5 4');
        window.renderKatex(g, '\\text{air},\\ \\sigma = 0', (xs + iw) / 2, ih - 16, { width: iw - xs, height: 20, size: 14 });

        var r0 = 0, prevY = null, side = [];
        VC.bodyLayers().forEach(function (a) {
            var l = a.layer, x0 = x(r0), x1 = x(a.radius), yy = y(a.sigma);
            if (prevY !== null) {
                g.append('line').attr('x1', x0).attr('x2', x0).attr('y1', prevY).attr('y2', yy)
                    .attr('stroke', T.fg(0.3)).attr('stroke-width', 1.2);
            }
            g.append('line').attr('x1', x0).attr('x2', x1).attr('y1', yy).attr('y2', yy)
                .attr('stroke', css(l.enabled ? '--c-t-' + l.key : '--c-ref')).attr('stroke-width', 3);
            if (l.enabled) {
                // Direct label on a background pill so gridlines do not run
                // through it; a step too narrow for it is labelled at the side.
                var lbg = g.append('rect').attr('fill', css('--white')).attr('rx', 3);
                var lt = g.append('text').attr('x', (x0 + x1) / 2).attr('y', yy - 9)
                    .attr('text-anchor', 'middle').attr('fill', T.text).attr('font-size', 13).text(l.name);
                var lb = lt.node().getBBox();
                if (lb.width + 8 > x1 - x0) { lt.remove(); lbg.remove(); side.push({ name: l.name, x1: x1, y: yy }); }
                else lbg.attr('x', lb.x - 3).attr('y', lb.y).attr('width', lb.width + 6).attr('height', lb.height);
            }
            prevY = yy; r0 = a.radius;
        });

        // Side labels, kept at least 18 px apart and clear of the air label.
        side.sort(function (a, b) { return a.y - b.y; });
        var last = -Infinity;
        side.forEach(function (s) {
            var ly = Math.min(Math.max(s.y, last + 18), ih - 40);
            last = ly;
            g.append('path').attr('d', 'M' + s.x1 + ',' + s.y + 'H' + (xs + 8) + 'V' + ly + 'H' + (xs + 14))
                .attr('fill', 'none').attr('stroke', T.fg(0.45)).attr('stroke-dasharray', '2 3');
            g.append('text').attr('x', xs + 18).attr('y', ly + 4.5).attr('fill', T.text).attr('font-size', 13).text(s.name);
        });
    }

    window.VC.onRender(render);
})();
