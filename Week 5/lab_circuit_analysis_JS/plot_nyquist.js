// Section 05 · Nyquist plot of A_V(jw) for w from 1 to 1e10 rad/s, with the
// mirror image for negative frequencies, the -1 point, a direction arrow,
// labelled frequency dots and the cursor vector with its 0 to 360 deg angle.
// Four-quadrant: equal scales, axes through the origin, Im title above the
// plot at the y-axis and Re title right of the plot at the x-axis. Tick
// labels sit on the frame edges so the locus never crosses them. Every
// in-plot label is placed by collision test; frequency labels that cannot
// sit beside their dot are moved outward with a leader line.
(function () {
    var sel = '#plot-nyquist';
    var ANNOTS = [[1e3, '1\\,\\text{kHz}'], [1e4, '10\\,\\text{kHz}'], [1e5, '100\\,\\text{kHz}'],
                  [1e6, '1\\,\\text{MHz}'], [8e6, '8\\,\\text{MHz}']];

    function render() {
        var L = window.LCA, p = L.p, P = L.params(), T = window.T, css = window.CMP.cssVar;
        var f = L.frame(sel, { margin: { top: 56, right: 104, bottom: 34, left: 44 } });
        var g = f.g;

        // Locus samples and symmetric square window.
        var pts = [], maxVal = 1;
        for (var i = 0; i <= 1000; i++) {
            var w = Math.pow(10, 10 * i / 1000);
            var h = L.evalH(w, P);
            pts.push([h.re, h.im]);
            maxVal = Math.max(maxVal, Math.abs(h.re), Math.abs(h.im));
        }
        var R = maxVal * 1.15;
        var side = Math.min(f.iw, f.ih), ox = (f.iw - side) / 2, oy = (f.ih - side) / 2;
        var x = d3.scaleLinear().domain([-R, R]).range([ox, ox + side]);
        var y = d3.scaleLinear().domain([-R, R]).range([oy + side, oy]);
        var X0 = x(0), Y0 = y(0);

        // Grid, rings at |A_V| = 10..50, axes through the origin, ticks on the frame.
        var ticks = x.ticks(6);
        g.append('g').selectAll('line').data(ticks).join('line')
            .attr('x1', x).attr('x2', x).attr('y1', y(R)).attr('y2', y(-R)).attr('stroke', css('--grid-line'));
        g.append('g').selectAll('line').data(ticks).join('line')
            .attr('y1', y).attr('y2', y).attr('x1', x(-R)).attr('x2', x(R)).attr('stroke', css('--grid-line'));
        [10, 20, 30, 40, 50].forEach(function (r) {
            if (r < R) g.append('circle').attr('cx', X0).attr('cy', Y0).attr('r', x(r) - X0)
                .attr('fill', 'none').attr('stroke', T.fg(0.08));
        });
        var xa = g.append('g').attr('transform', 'translate(0,' + y(-R) + ')')
            .call(d3.axisBottom(x).tickValues(ticks).tickSizeOuter(0));
        var ya = g.append('g').attr('transform', 'translate(' + x(-R) + ',0)')
            .call(d3.axisLeft(y).tickValues(ticks).tickSizeOuter(0));
        [xa, ya].forEach(window.CMP.styleAxis);
        g.append('line').attr('x1', x(-R)).attr('x2', x(R)).attr('y1', Y0).attr('y2', Y0).attr('stroke', T.gridAxis);
        g.append('line').attr('x1', X0).attr('x2', X0).attr('y1', y(R)).attr('y2', y(-R)).attr('stroke', T.gridAxis);
        window.renderKatex(f.svg, '\\mathrm{Im}\\{A_V(j\\omega)\\}', f.m.left + X0, f.m.top + y(R) - 20,
            { width: 160, height: 22, size: 15 });
        window.renderKatex(f.svg, '\\mathrm{Re}\\{A_V(j\\omega)\\}', f.m.left + x(R) + 52, f.m.top + Y0,
            { width: 100, height: 22, size: 15 });

        var Pl = L.placer(f);
        Pl.line([[x(-R), Y0], [x(R), Y0]]); Pl.line([[X0, y(R)], [X0, y(-R)]]);
        // Keep labels inside the square frame: block the gutters around it.
        Pl.box([-50, -50, ox + 2, f.ih + 50]); Pl.box([ox + side - 2, -50, f.iw + 50, f.ih + 50]);
        Pl.box([-50, -50, f.iw + 50, oy + 2]); Pl.box([-50, oy + side - 2, f.iw + 50, f.ih + 50]);

        // Mirror (negative frequencies) and locus.
        var px = pts.map(function (q) { return [x(q[0]), y(q[1])]; });
        var mir = pts.map(function (q) { return [x(q[0]), y(-q[1])]; });
        var cLoc = css('--c-mag');
        g.append('path').attr('d', d3.line()(mir)).attr('fill', 'none').attr('stroke', cLoc)
            .attr('stroke-opacity', 0.3).attr('stroke-width', 1.4);
        g.append('path').attr('class', 'trace').attr('stroke', cLoc).attr('d', d3.line()(px));
        Pl.line(px); Pl.line(mir);

        // Direction arrow at 40 % of the sweep.
        var a0 = px[400], a1 = px[402];
        var dl = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
        if (dl > 0) {
            var ux = (a1[0] - a0[0]) / dl, uy = (a1[1] - a0[1]) / dl;
            g.append('polygon').attr('fill', cLoc).attr('points', [
                [a0[0] + ux * 8, a0[1] + uy * 8],
                [a0[0] - ux * 4 + uy * 5, a0[1] - uy * 4 - ux * 5],
                [a0[0] - ux * 4 - uy * 5, a0[1] - uy * 4 + ux * 5]].join(' '));
        }

        // -1 point and origin.
        var cWarn = css('--c-lf');
        g.append('circle').attr('cx', x(-1)).attr('cy', Y0).attr('r', 4).attr('fill', cWarn);
        g.append('circle').attr('cx', X0).attr('cy', Y0).attr('r', 3).attr('fill', T.text);
        Pl.box([x(-1) - 5, Y0 - 5, x(-1) + 5, Y0 + 5]);

        // Cursor vector and angle arc (0 to 360 deg, counter-clockwise from +Re).
        var tau = 2 * Math.PI, hc = L.evalH(tau * p.f, P);
        var cx = x(hc.re), cy = y(hc.im), len = Math.hypot(cx - X0, cy - Y0);
        var ang = Math.atan2(hc.im, hc.re); if (ang < 0) ang += tau;
        var cCur = T.text, cAng = css('--c-phase');
        var arcR = Math.min(len * 0.3, 45), arc = [];
        if (len > 2) {
            var vx = (cx - X0) / len, vy = (cy - Y0) / len, hl = 10;
            g.append('line').attr('x1', X0).attr('y1', Y0).attr('x2', cx - vx * hl).attr('y2', cy - vy * hl)
                .attr('stroke', cCur).attr('stroke-width', 1.8);
            g.append('polygon').attr('fill', cCur).attr('points', [[cx, cy],
                [cx - vx * hl + vy * 5, cy - vy * hl - vx * 5], [cx - vx * hl - vy * 5, cy - vy * hl + vx * 5]].join(' '));
            Pl.line([[X0, Y0], [cx, cy]]);
            arc = d3.range(0, 61).map(function (k) {
                var a = ang * k / 60; return [X0 + arcR * Math.cos(a), Y0 - arcR * Math.sin(a)];
            });
            g.append('path').attr('d', d3.line()(arc)).attr('fill', 'none').attr('stroke', cAng).attr('stroke-width', 1.6);
            Pl.line(arc);
        }
        g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('fill', cLoc)
            .attr('stroke', cCur).attr('stroke-width', 1.5);
        Pl.box([cx - 7, cy - 7, cx + 7, cy + 7]);

        // Frequency dots (drawn before labels so every dot is an obstacle).
        var dots = ANNOTS.map(function (a) {
            var hh = L.evalH(tau * a[0], P);
            var d = [x(hh.re), y(hh.im), a[1]];
            g.append('circle').attr('cx', d[0]).attr('cy', d[1]).attr('r', 3).attr('fill', css('--c-hf'));
            Pl.box([d[0] - 4, d[1] - 4, d[0] + 4, d[1] + 4]);
            return d;
        });

        // Candidate centres on rings of 8 directions around (px, py).
        function ring(px, py, w, h, radii) {
            var out = [];
            radii.forEach(function (rr) {
                for (var k = 0; k < 8; k++) {
                    var a = k * Math.PI / 4;
                    out.push([px + Math.cos(a) * (rr + w / 2), py - Math.sin(a) * (rr + h / 2)]);
                }
            });
            return out;
        }
        function leader(r, d, col) {
            var bx = Math.max(r.c[0] - r.w / 2, Math.min(d[0], r.c[0] + r.w / 2));
            var by = Math.max(r.c[1] - r.h / 2, Math.min(d[1], r.c[1] + r.h / 2));
            g.append('line').attr('x1', d[0]).attr('y1', d[1]).attr('x2', bx).attr('y2', by)
                .attr('stroke', col).attr('stroke-opacity', 0.6);
        }

        // Labels, most important first.
        if (len > 2) {
            var mx = (X0 + cx) / 2, my = (Y0 + cy) / 2, nx = -(cy - Y0) / len, ny = (cx - X0) / len;
            Pl.label('|A_V| = ' + hc.mag.toFixed(1), function (w, h) {
                var d1 = Math.abs(nx) * w / 2 + Math.abs(ny) * h / 2 + 6;
                return [[mx + nx * d1, my + ny * d1], [mx - nx * d1, my - ny * d1],
                        [mx + nx * (d1 + 14), my + ny * (d1 + 14)], [mx - nx * (d1 + 14), my - ny * (d1 + 14)]];
            }, { color: cCur });
            var am = [X0 + arcR * Math.cos(ang / 2), Y0 - arcR * Math.sin(ang / 2)];
            var ra = Pl.label((ang * 180 / Math.PI).toFixed(0) + '^\\circ', function (w, h) {
                var mid = ang / 2, out = [];
                [6, 16, 28].forEach(function (dd) {
                    var r1 = arcR + Math.max(w, h) / 2 + dd;
                    out.push([X0 + r1 * Math.cos(mid), Y0 - r1 * Math.sin(mid)]);
                });
                return out.concat(ring(am[0], am[1], w, h, [8, 30, 54]));
            }, { color: cAng });
            if (ra && ra.i >= 11) leader(ra, am, cAng);
        }
        var rm = Pl.label('-1', function (w, h) { return ring(x(-1), Y0, w, h, [8, 30, 54]); },
            { color: cWarn, size: 13 });
        if (rm && rm.i >= 8) leader(rm, [x(-1), Y0], cWarn);
        dots.forEach(function (d) {
            var r = Pl.label(d[2], function (w, h) { return ring(d[0], d[1], w, h, [8, 32, 56]); },
                { color: css('--c-hf'), size: 12 });
            // Labels moved beyond the first ring get a leader to their dot.
            if (r && r.i >= 8) leader(r, d, css('--c-hf'));
        });
    }

    window.LCA.onRender(render);
})();
