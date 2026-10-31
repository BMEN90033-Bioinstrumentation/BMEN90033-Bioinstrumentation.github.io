// Section 02 · Output characteristic I_C(V_CE): seven fixed-step I_B curves,
// the I_BQ curve, the DC load line, the Q-point, the AC swing along the load
// line and the instantaneous operating point (moved on every frame). In
// saturation a dashed bracket rises from Q to the beta I_BQ level.
// In-plot text is limited to the Q label, the I_B curve labels and the
// bracket label. Each is placed at the first candidate position whose box
// meets no trace, guide, dot or earlier label and stays inside the plot;
// a label with no free candidate is omitted. Order: Q, I_BQ, bracket, rest.
(function () {
    var sel = '#plot-iv';
    var dot = null, X = null, Y = null;

    function render() {
        var A = window.AMP, p = A.p, T = window.T, css = window.CMP.cssVar;
        var bias = A.computeDCBias(), ss = A.computeSmallSignal(bias);
        var f = A.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;
        dot = null;

        var vceMax = Math.max(p.vcc * 1.15, 15);
        var icMax = Math.max((p.vcc / p.rc) * 1.3, bias.icq * 2.5, 0.005) * 1e3;   // mA
        var x = d3.scaleLinear().domain([0, vceMax]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, icMax]).range([ih, 0]);
        X = x; Y = y;

        g.append('rect').attr('x', 0).attr('y', 0).attr('width', x(A.VCE_SAT + 0.1)).attr('height', ih)
            .attr('fill', css('--c-sat-band'));
        A.axes(f, g, x, y, ih, 0, { xTitle: 'V_{CE}\\;[\\mathrm{V}]', yTitle: 'I_C\\;[\\mathrm{mA}]' });

        var lines = [];   // pixel polylines that labels must avoid
        function curve(ib) {
            var icA = p.hfe * ib * 1e3;
            return d3.range(0, 401).map(function (i) {
                var v = vceMax * i / 400;
                var ic = v < A.VCE_SAT ? icA * v / A.VCE_SAT : icA;   // Early effect neglected
                return [x(v), y(Math.min(ic, icMax))];
            });
        }
        var cIb = css('--c-ib'), step = (p.vcc / p.rc) / (p.hfe * 6), fam = [];
        if (bias.ibq > 0) fam.push({ ib: bias.ibq, q: true });
        for (var n = 1; n <= 7; n++) fam.push({ ib: step * n, q: false });
        fam.forEach(function (c) {
            c.pts = curve(c.ib);
            lines.push(c.pts);
            g.append('path').attr('d', d3.line()(c.pts)).attr('fill', 'none').attr('stroke', cIb)
                .attr('stroke-opacity', c.q ? 1 : 0.35).attr('stroke-width', c.q ? 2 : 1.1);
        });

        // DC load line: I_C = (V_CC - V_CE) / R_C.
        var ll = [[x(0), y(p.vcc / p.rc * 1e3)], [x(p.vcc), y(0)]];
        lines.push(d3.range(0, 201).map(function (i) { var t = i / 200; return [ll[0][0] + t * (ll[1][0] - ll[0][0]), ll[0][1] + t * (ll[1][1] - ll[0][1])]; }));
        g.append('line').attr('x1', ll[0][0]).attr('y1', ll[0][1]).attr('x2', ll[1][0]).attr('y2', ll[1][1])
            .attr('stroke', css('--c-load')).attr('stroke-width', 1.6).attr('stroke-dasharray', '6 4');

        var placed = [], dots = [];
        function free(b) {
            if (b[0] < 2 || b[1] < 2 || b[2] > iw - 2 || b[3] > ih - 2) return false;
            if (placed.some(function (o) { return b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]; })) return false;
            if (dots.some(function (d) { return d[0] > b[0] - 8 && d[0] < b[2] + 8 && d[1] > b[1] - 8 && d[1] < b[3] + 8; })) return false;
            return !lines.some(function (pl) {
                return pl.some(function (q) { return q[0] > b[0] - 2 && q[0] < b[2] + 2 && q[1] > b[1] - 2 && q[1] < b[3] + 2; });
            });
        }
        // Try candidate boxes [x0, yCentre] of width lw; draw the first free one.
        function label(tex, cands, lw, color) {
            for (var k = 0; k < cands.length; k++) {
                var b = [cands[k][0], cands[k][1] - 9, cands[k][0] + lw, cands[k][1] + 9];
                if (free(b)) {
                    placed.push(b);
                    window.renderKatex(f.svg, tex, f.m.left + b[0] + lw / 2, f.m.top + cands[k][1],
                        { width: lw, height: 18, size: 14, color: color, align: cands[k][2] || 'left' });
                    return true;
                }
            }
            return false;
        }

        var showQ = bias.region === 'active' || bias.region === 'saturation';
        var qx = x(bias.vceq), qy = y(bias.icq * 1e3);
        if (showQ) {
            var cQ = css('--c-vout');
            g.append('line').attr('x1', qx).attr('x2', qx).attr('y1', 0).attr('y2', ih)
                .attr('stroke', cQ).attr('stroke-opacity', 0.35).attr('stroke-dasharray', '3 3');
            g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', qy).attr('y2', qy)
                .attr('stroke', cQ).attr('stroke-opacity', 0.35).attr('stroke-dasharray', '3 3');

            // AC swing along the load line, from the small-signal gain.
            if (ss.av !== 0 && p.vin > 0) {
                var dv = Math.min(Math.abs(ss.av * p.vin / 1000), p.vcc / 2);
                var v1 = Math.max(A.VCE_SAT, bias.vceq - dv), v2 = Math.min(p.vcc, bias.vceq + dv);
                var s0 = [x(v1), y(Math.min(icMax, (p.vcc - v1) / p.rc * 1e3))], s1 = [x(v2), y(Math.max(0, (p.vcc - v2) / p.rc * 1e3))];
                g.append('line').attr('x1', s0[0]).attr('y1', s0[1]).attr('x2', s1[0]).attr('y2', s1[1])
                    .attr('stroke', cQ).attr('stroke-width', 5).attr('stroke-opacity', 0.4).attr('stroke-linecap', 'round');
                dot = g.append('circle').attr('r', 4.5).attr('fill', T.text);
            }
            g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 5.5).attr('fill', cQ)
                .attr('stroke', T.text).attr('stroke-width', 1);
            dots.push([qx, qy]);

            // Saturation: bracket from Q up to the beta I_BQ level.
            var bracketTex = null, bx = qx + 22, byN = 0;
            if (bias.region === 'saturation' && bias.ibq > 0) {
                byN = y(Math.min(p.hfe * bias.ibq * (1 + A.VCE_SAT / 100) * 1e3, icMax));
                var cV = css('--c-vce');
                g.append('path').attr('fill', 'none').attr('stroke', cV).attr('stroke-width', 1.5)
                    .attr('stroke-dasharray', '4 3').attr('d', 'M' + bx + ',' + qy + 'V' + byN);
                g.append('path').attr('fill', 'none').attr('stroke', cV).attr('stroke-width', 1.5)
                    .attr('d', 'M' + (bx - 4) + ',' + qy + 'H' + (bx + 4) + 'M' + (bx - 4) + ',' + byN + 'H' + (bx + 4));
                g.append('circle').attr('cx', bx).attr('cy', byN).attr('r', 3).attr('fill', cV);
                lines.push(d3.range(0, 41).map(function (i) { return [bx, qy + (byN - qy) * i / 40]; }));
                dots.push([bx, byN]);
                bracketTex = '\\beta I_{BQ}';
            }

            var qt = 'Q\\;(' + bias.vceq.toFixed(2) + '\\,\\text{V},\\ ' + (bias.icq * 1e3).toFixed(2) + '\\,\\text{mA})';
            var lq = 190;
            var qc = [];
            [-16, 16, -32, 32].forEach(function (dy) {
                [12, 36].forEach(function (dx) { qc.push([qx + dx, qy + dy]); });
                qc.push([qx - 12 - lq, qy + dy, 'right']);
            });
            label(qt, qc, lq, cQ);
            if (bracketTex) label(bracketTex, [[bx + 10, byN + 14], [bx + 10, byN - 14], [bx + 10, (qy + byN) / 2]], 60, css('--c-vce'));
        }

        fam.forEach(function (c) {
            var icA = p.hfe * c.ib * 1e3;
            if (icA >= icMax * 0.95) return;
            var yc = y(icA), lw = 132;
            var t = (c.q ? 'I_{BQ}' : 'I_B') + ' = ' + (c.ib < 1e-3 ? (c.ib * 1e6).toFixed(1) + '\\,\\mu\\text{A}' : (c.ib * 1e3).toFixed(2) + '\\,\\text{mA}');
            label(t, [[iw - 6 - lw, yc - 12, 'right'], [iw - 6 - lw, yc + 12, 'right'], [iw * 0.45, yc - 12], [iw * 0.45, yc + 12]],
                lw, c.q ? cIb : T.textDim);
        });
        tick();
    }

    // Instantaneous operating point on the load line.
    function tick() {
        if (!dot) return;
        var A = window.AMP, op = A.operatingPoint(A.p.vbb + A.vinNow());
        dot.attr('cx', X(op.vce)).attr('cy', Y(Math.max(0, Math.min(Y.domain()[1], op.ic * 1e3))));
    }

    window.AMP.onRender(render);
    window.addEventListener('amptick', tick);
    window.AMP.watch(document.querySelector(sel));
})();
