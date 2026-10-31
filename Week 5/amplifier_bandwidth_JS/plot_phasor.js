// Section 02 · Denominator phasor D = 1 + j(w/w0) on the complex plane.
// Four-quadrant plot with equal scales on both axes and the axes through
// the origin: Im title above the plot at the y-axis, Re title right of the
// plot at the x-axis. Component, magnitude and angle labels are placed by
// collision test against every drawn element.
(function () {
    var sel = '#plot-phasor';

    function render() {
        var A = window.AMP, s = A.state(), T = window.T, css = window.CMP.cssVar;
        var f = A.frame(sel, { margin: { top: 64, right: 64, bottom: 20, left: 24 } });
        var g = f.g;

        // Square data window [-0.3E, 1.1E] on both axes, centred in the box.
        var E = Math.max(s.mag, 1.8), lo = -0.3 * E, hi = 1.1 * E;
        var k = Math.min(f.iw, f.ih) / (hi - lo);
        var ox = (f.iw - (hi - lo) * k) / 2, oy = (f.ih - (hi - lo) * k) / 2;
        var x = d3.scaleLinear().domain([lo, hi]).range([ox, ox + (hi - lo) * k]);
        var y = d3.scaleLinear().domain([lo, hi]).range([oy + (hi - lo) * k, oy]);
        var X0 = x(0), Y0 = y(0);

        // Grid and axes through the origin; the zero tick label is omitted.
        var ticks = x.ticks(6);
        g.append('g').selectAll('line').data(ticks).join('line')
            .attr('x1', x).attr('x2', x).attr('y1', y(hi)).attr('y2', y(lo)).attr('stroke', css('--grid-line'));
        g.append('g').selectAll('line').data(ticks).join('line')
            .attr('y1', y).attr('y2', y).attr('x1', x(lo)).attr('x2', x(hi)).attr('stroke', css('--grid-line'));
        var sup = '⁰¹²³⁴⁵⁶⁷⁸⁹';
        var nz = function (d) {
            if (d === 0) return '';
            if (Math.abs(d) < 1e4) return d3.format('~g')(d);
            var e = Math.floor(Math.log10(Math.abs(d))), m = d / Math.pow(10, e);
            return d3.format('~g')(+m.toFixed(1)) + '×10' + String(e).split('').map(function (c) { return sup[c]; }).join('');
        };
        var xa = g.append('g').attr('transform', 'translate(0,' + Y0 + ')')
            .call(d3.axisBottom(x).tickValues(ticks).tickFormat(nz).tickSizeOuter(0));
        var ya = g.append('g').attr('transform', 'translate(' + X0 + ',0)')
            .call(d3.axisLeft(y).tickValues(ticks).tickFormat(nz).tickSizeOuter(0));
        [xa, ya].forEach(window.CMP.styleAxis);
        window.renderKatex(f.svg, '\\mathrm{Im}', f.m.left + X0, f.m.top + y(hi) - 20, { width: 60, height: 22, size: 16 });
        window.renderKatex(f.svg, '\\mathrm{Re}', f.m.left + x(hi) + 28, f.m.top + Y0, { width: 50, height: 22, size: 16 });

        var P = window.AMP.placer(f);
        // Tick labels are obstacles: a strip below the x-axis, left of the y-axis.
        P.box([x(lo), Y0, x(hi), Y0 + 22]);
        P.box([X0 - 34, y(hi), X0, y(lo)]);

        // Unit circle reference, first quadrant only.
        var circ = d3.range(0, 46).map(function (i) {
            var a = i / 45 * Math.PI / 2; return [x(Math.cos(a)), y(Math.sin(a))];
        });
        g.append('path').attr('d', d3.line()(circ)).attr('fill', 'none')
            .attr('stroke', T.fg(0.22)).attr('stroke-dasharray', '3 4');

        var tip = [x(1), y(s.ratio)], one = [x(1), Y0];
        function arrowLine(a, b, col, w, dash) {
            g.append('line').attr('x1', a[0]).attr('y1', a[1]).attr('x2', b[0]).attr('y2', b[1])
                .attr('stroke', col).attr('stroke-width', w).attr('stroke-dasharray', dash || null);
            var L = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (L < 8) return;
            var ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, h = 10;
            g.append('polygon').attr('fill', col).attr('points', [
                b, [b[0] - ux * h - uy * h * 0.45, b[1] - uy * h + ux * h * 0.45],
                [b[0] - ux * h + uy * h * 0.45, b[1] - uy * h - ux * h * 0.45]
            ].join(' '));
        }
        var cRe = css('--c-re'), cIm = css('--c-im'), cPh = css('--c-phasor');
        arrowLine([X0, Y0], one, cRe, 2.2);
        arrowLine(one, tip, cIm, 2, '5 4');
        arrowLine([X0, Y0], tip, cPh, 2.8);
        P.line([[X0, Y0], one]); P.line([one, tip]); P.line([[X0, Y0], tip]);
        P.box([tip[0] - 8, tip[1] - 8, tip[0] + 8, tip[1] + 8]);

        // Angle arc.
        var th = Math.atan(s.ratio), rArc = Math.min(46, 0.5 * Math.hypot(tip[0] - X0, tip[1] - Y0));
        var arc = d3.range(0, 31).map(function (i) {
            var a = th * i / 30; return [X0 + rArc * Math.cos(a), Y0 - rArc * Math.sin(a)];
        });
        g.append('path').attr('d', d3.line()(arc)).attr('fill', 'none').attr('stroke', css('--c-test')).attr('stroke-width', 1.6);
        P.line(arc);

        // Labels, most important first.
        var mx = (X0 + tip[0]) / 2, my = (Y0 + tip[1]) / 2;
        var L = Math.hypot(tip[0] - X0, tip[1] - Y0) || 1;
        var nx = -(tip[1] - Y0) / L, ny = (tip[0] - X0) / L;   // unit normal (up-left side)
        if (ny > 0) { nx = -nx; ny = -ny; }
        P.label('|D| = ' + A.texNum(s.mag, 4), function (w, h) {
            var d = [0.5 * w + 0.5 * h + 6, 0.5 * w + 0.5 * h + 20];
            return [[mx + nx * d[0], my + ny * d[0]], [mx + nx * d[1], my + ny * d[1]],
                    [mx + nx * d[0], my + ny * d[0] - h - 4], [mx - nx * d[0], my - ny * d[0]]];
        }, { color: cPh });
        P.label('j\\,' + A.texNum(s.ratio, 3), function (w, h) {
            var ym = (Y0 + tip[1]) / 2;
            return [[one[0] + w / 2 + 10, ym], [one[0] + w / 2 + 10, tip[1] + h], [one[0] + w / 2 + 10, Y0 - h],
                    [tip[0] + w / 2 + 12, tip[1]]];
        }, { color: cIm });
        P.label('\\theta = ' + s.angle.toFixed(1) + '^\\circ', function (w, h) {
            var bis = th / 2, r1 = rArc + 0.5 * w + 6;
            return [[X0 + r1 * Math.cos(bis), Y0 - r1 * Math.sin(bis)],
                    [X0 + rArc + w / 2 + 8, Y0 - h / 2 - 4],
                    [X0 + rArc + w / 2 + 8, Y0 - h - 10]];
        }, { color: css('--c-test') });
    }

    window.AMP.onRender(render);
})();
