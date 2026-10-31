// Section 02 · Load lines in the I_C, V_CE plane. Class A: the DC load line
// I_C = (V_CC - V_CE) / (R_C + R_E) (dashed) sets the Q-point; with R_E
// bypassed the signal moves along the AC load line through Q with slope
// -1 / R_C (solid). Push-pull: the load line of one conducting device,
// I_C = (V_CC - V_CE) / R_L, with Q at cutoff. The swing segment and the
// clip markers come from the same limits as the waveform plot. The only
// in-plot text is the Q label, placed at the first candidate offset that
// stays inside the plot and clear of every drawn line.
(function () {
    var sel = '#plot-loadline';

    function render() {
        var A = window.AMP, p = A.p, T = window.T, css = window.CMP.cssVar;
        var d = A.derived(), L = A.limits(), f = A.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([0, A.VCC]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, 11.5]).range([ih, 0]);
        A.axes(f, g, x, y, ih, 0, { xTitle: 'V_{CE}~[\\mathrm{V}]', yTitle: 'I_C~[\\mathrm{mA}]' });
        g.append('clipPath').attr('id', 'll-clip').append('rect').attr('width', iw).attr('height', ih);
        var lines = [];
        function seg(v0, i0, v1, i1, dash, w) {
            var a = [x(v0), y(i0)], b = [x(v1), y(i1)];
            lines.push([a, b]);
            var l = g.append('line').attr('x1', a[0]).attr('y1', a[1]).attr('x2', b[0]).attr('y2', b[1])
                .attr('clip-path', 'url(#ll-clip)').attr('stroke', css('--c-load')).attr('stroke-width', w || 1.6);
            if (dash) l.attr('stroke-dasharray', '6 4');
        }

        var q, s1, s2, satEnd, cutEnd;
        if (p.cls === 'A') {
            seg(0, A.MAX_IC, A.VCC, 0, true);
            // AC load line: i_C = I_CQ - (v_CE - V_CEQ) / R_C, from v_CE = 0 to cutoff.
            var iAt = function (v) { return d.icq - (v - d.vceq) / A.RC * 1000; };
            var vCut = d.vceq + d.icq / 1000 * A.RC;
            seg(0, iAt(0), vCut, 0, false, 1.4);
            q = [d.vceq, d.icq];
            var drive = d.vinPeak * A.GAIN;
            var dn = Math.min(drive, -L.lo), up = Math.min(drive, L.hi);   // v_CE excursions
            s1 = [d.vceq - dn, iAt(d.vceq - dn)];
            s2 = [d.vceq + up, iAt(d.vceq + up)];
            satEnd = drive > 0 && drive >= -L.lo ? s1 : null;
            cutEnd = drive > 0 && drive >= L.hi ? s2 : null;
        } else {
            var iMax = A.VCC / A.RC * 1000;
            seg(0, iMax, A.VCC, 0, false, 1.4);
            q = [A.VCC, 0];
            s1 = q;
            s2 = [A.VCC - d.voutPeak, d.voutPeak / A.RC * 1000];
            satEnd = d.voutPeak >= L.hi - 1e-9 ? s2 : null;
            cutEnd = null;
        }

        if (d.vinPeak > 0 && (s1[0] !== s2[0] || s1[1] !== s2[1])) {
            g.append('line').attr('x1', x(s1[0])).attr('y1', y(s1[1])).attr('x2', x(s2[0])).attr('y2', y(s2[1]))
                .attr('stroke', css('--c-npn')).attr('stroke-opacity', 0.6).attr('stroke-width', 6).attr('stroke-linecap', 'round');
        }
        [satEnd, cutEnd].forEach(function (c) {
            if (c) g.append('circle').attr('cx', x(c[0])).attr('cy', y(c[1])).attr('r', 6).attr('fill', css('--c-dead'));
        });

        var qx = x(q[0]), qy = y(q[1]), cq = css('--c-dead');
        g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 9).attr('fill', cq).attr('fill-opacity', 0.25);
        g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 4.5).attr('fill', cq)
            .attr('stroke', T.text).attr('stroke-width', 1);

        // Q label: the box must stay inside the plot and clear every line by 6 px.
        var lw = 22, lh = 20;
        function clear(cx, cy) {
            var b = [cx - lw / 2, cy - lh / 2, cx + lw / 2, cy + lh / 2];
            if (b[0] < 2 || b[2] > iw - 2 || b[1] < 2 || b[3] > ih - 2) return false;
            return lines.every(function (ln) {
                var a = ln[0], c = ln[1];
                if (Math.abs(c[0] - a[0]) < 1e-6) return a[0] < b[0] - 6 || a[0] > b[2] + 6;
                function ly(px) { return a[1] + (c[1] - a[1]) * (px - a[0]) / (c[0] - a[0]); }
                var x0 = Math.max(b[0] - 6, Math.min(a[0], c[0])), x1 = Math.min(b[2] + 6, Math.max(a[0], c[0]));
                if (x0 > x1) return true;
                var ya = ly(x0), yb = ly(x1);
                return Math.max(ya, yb) < b[1] - 6 || Math.min(ya, yb) > b[3] + 6;
            });
        }
        var cands = [[18, -18], [-18, 18], [-18, -36], [36, 18], [18, -36], [-36, -18], [36, -36]];
        for (var k = 0; k < cands.length; k++) {
            var cx = qx + cands[k][0], cy = qy + cands[k][1];
            if (clear(cx, cy)) {
                window.renderKatex(f.svg, 'Q', f.m.left + cx, f.m.top + cy, { width: lw, height: lh, size: 15, color: cq });
                break;
            }
        }
    }

    window.AMP.onRender(render);
})();
