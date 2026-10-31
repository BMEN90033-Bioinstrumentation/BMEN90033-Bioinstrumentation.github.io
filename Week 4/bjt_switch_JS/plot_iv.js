// Section 02 · Output characteristic I_C(V_CE) for a family of base currents,
// the DC load line and the operating point. Single quadrant.
// Region and load-line labels live in the HTML legend, so the only in-plot
// text is the I_B curve labels, placed by collision test against the load
// line, the operating point and each other.
(function () {
    var sel = '#plot-iv';

    function render() {
        var B = window.BJT, p = B.p, s = B.compute(p.vin), T = window.T;
        var css = window.CMP.cssVar;
        var f = B.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;

        var icSatmA = B.icSat() * 1e3;
        var icMax = icSatmA * 1.3;
        var x = d3.scaleLinear().domain([0, p.vcc]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, icMax]).range([ih, 0]);

        // Region shading under the grid.
        g.append('rect').attr('x', 0).attr('y', 0).attr('width', x(B.VCE_SAT)).attr('height', ih)
            .attr('fill', css('--c-sat-band'));
        g.append('rect').attr('x', 0).attr('y', y(icMax * 0.03)).attr('width', iw)
            .attr('height', ih - y(icMax * 0.03)).attr('fill', css('--c-cut-band'));

        B.axes(f, g, x, y, ih, 0, {
            xTitle: (p.type === 'NPN' ? 'V_{CE}' : 'V_{EC}') + '\\;[\\mathrm{V}]',
            yTitle: 'I_C\\;[\\mathrm{mA}]'
        });

        // Load line endpoints in pixels.
        var L0 = [x(0), y(p.vcc / p.rl * 1e3)], L1 = [x(p.vcc), y(0)];
        function loadY(px) { return L0[1] + (L1[1] - L0[1]) * (px - L0[0]) / (L1[0] - L0[0]); }

        // Reference I_B curves at 20, 40, 60, 80 % of the plotted I_C range,
        // plus the curve for the present base current (drawn heavier).
        var drive = p.type === 'NPN' ? p.vin : p.vcc - p.vin;
        var ibNow = drive > B.VBE_ON ? (drive - B.VBE_ON) / p.rb : 0;
        var family = [0.2, 0.4, 0.6, 0.8].map(function (k) { return { ib: k * icMax * 1e-3 / p.hfe, now: false }; });
        if (ibNow > 0) family.unshift({ ib: ibNow, now: true });   // labelled first, so it wins placement

        var cIc = css('--c-ic');
        var placed = [];
        var qx = x(s.vce), qy = y(s.ic * 1e3);
        function hits(b) {
            var yl = [loadY(b[0]), loadY(b[2])];
            var lineHit = Math.max(yl[0], yl[1]) > b[1] && Math.min(yl[0], yl[1]) < b[3];
            var qHit = qx > b[0] - 8 && qx < b[2] + 8 && qy > b[1] - 8 && qy < b[3] + 8;
            var other = placed.some(function (o) {
                return b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1];
            });
            var curve = family.some(function (fm) {
                var cy = y(p.hfe * fm.ib * 1e3);
                return cy > b[1] - 2 && cy < b[3] + 2;
            });
            return lineHit || qHit || other || curve || b[1] < 4 || b[3] > ih - 4;
        }

        family.forEach(function (fm) {
            var ib = fm.ib, icA = p.hfe * ib * 1e3;
            var pts = d3.range(0, 201).map(function (i) {
                var v = p.vcc * i / 200;
                var ic = v < B.VCE_SAT ? icA * v / B.VCE_SAT : icA;
                return [x(v), y(Math.min(ic, icMax))];
            });
            g.append('path').attr('d', d3.line()(pts)).attr('fill', 'none')
                .attr('stroke', cIc).attr('stroke-opacity', fm.now ? 1 : 0.35).attr('stroke-width', fm.now ? 2.2 : 1.2);
            if (icA > icMax) return;
            var lw = 132, lh = 18, yc = y(icA) - 11;
            var yb = y(icA) + 11;   // below the curve as a fallback
            var cands = [[iw - 6 - lw, yc], [x(B.VCE_SAT) + 8, yc], [iw - 6 - lw, yb], [x(B.VCE_SAT) + 8, yb]];
            for (var k = 0; k < cands.length; k++) {
                var cy0 = cands[k][1];
                var bx = [cands[k][0], cy0 - lh / 2, cands[k][0] + lw, cy0 + lh / 2];
                if (!hits(bx)) {
                    placed.push(bx);
                    window.renderKatex(f.svg, 'I_B = ' + B.fmtI(ib),
                        f.m.left + bx[0] + lw / 2, f.m.top + cy0,
                        { width: lw, height: lh, size: 14, color: fm.now ? cIc : T.textDim, align: k % 2 === 0 ? 'right' : 'left' });
                    break;
                }
            }
        });

        // Load line and operating point.
        g.append('line').attr('x1', L0[0]).attr('y1', L0[1]).attr('x2', L1[0]).attr('y2', L1[1])
            .attr('stroke', css('--c-load')).attr('stroke-width', 1.6).attr('stroke-dasharray', '6 4');
        var qc = css(s.region === 'saturation' ? '--c-ib' : s.region === 'active' ? '--c-ic' : '--muted');
        g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 9).attr('fill', qc).attr('fill-opacity', 0.25);
        g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 4.5).attr('fill', qc)
            .attr('stroke', T.text).attr('stroke-width', 1);
    }

    window.BJT.onRender(render);
})();
