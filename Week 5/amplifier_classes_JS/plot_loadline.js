// Section 02 · DC load line I_C(V_CE) with the Q-point and the signal swing
// along the line, as in the original load-line inset. Single quadrant.
// Series are identified by the HTML legend; the only in-plot text is the
// Q label, placed at the first candidate offset that stays inside the plot
// and clear of the load line.
(function () {
    var sel = '#plot-loadline';

    function render() {
        var A = window.AMP, T = window.T, css = window.CMP.cssVar;
        var sw = A.swing(), f = A.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([0, A.VCC]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, A.MAX_IC * 1.15]).range([ih, 0]);
        A.axes(f, g, x, y, ih, 0, { xTitle: 'V_{CE}\\;[\\mathrm{V}]', yTitle: 'I_C\\;[\\mathrm{mA}]' });

        // Point on the line at fraction k (0 = cutoff end, 1 = saturation end).
        function at(k) { return [x(A.VCC * (1 - k)), y(A.MAX_IC * k)]; }
        var L0 = at(1), L1 = at(0);
        g.append('line').attr('x1', L0[0]).attr('y1', L0[1]).attr('x2', L1[0]).attr('y2', L1[1])
            .attr('stroke', css('--c-load')).attr('stroke-width', 1.6).attr('stroke-dasharray', '6 4');

        var cSw = css('--c-npn');
        if (A.p.amp > 0 && sw.s2 > sw.s1) {
            var a = at(sw.s1), b = at(sw.s2);
            g.append('line').attr('x1', a[0]).attr('y1', a[1]).attr('x2', b[0]).attr('y2', b[1])
                .attr('stroke', cSw).attr('stroke-opacity', 0.6).attr('stroke-width', 6).attr('stroke-linecap', 'round');
            [[sw.clipSat, at(1)], [sw.clipCut, at(0)]].forEach(function (c) {
                if (!c[0]) return;
                g.append('circle').attr('cx', c[1][0]).attr('cy', c[1][1]).attr('r', 6)
                    .attr('fill', css('--c-dead'));
            });
        }

        var q = at(sw.q), cq = css('--c-dead');
        g.append('circle').attr('cx', q[0]).attr('cy', q[1]).attr('r', 9).attr('fill', cq).attr('fill-opacity', 0.25);
        g.append('circle').attr('cx', q[0]).attr('cy', q[1]).attr('r', 4.5).attr('fill', cq)
            .attr('stroke', T.text).attr('stroke-width', 1);

        // Q label: first candidate whose box stays inside the plot and clear
        // (by 6 px) of the load line, which carries the swing and markers.
        var lw = 22, lh = 20;
        function lineY(px) { return L0[1] + (L1[1] - L0[1]) * (px - L0[0]) / (L1[0] - L0[0]); }
        function clear(cx, cy) {
            var b = [cx - lw / 2, cy - lh / 2, cx + lw / 2, cy + lh / 2];
            if (b[0] < 2 || b[2] > iw - 2 || b[1] < 2 || b[3] > ih - 2) return false;
            var ya = lineY(b[0]), yb = lineY(b[2]);
            return Math.max(ya, yb) < b[1] - 6 || Math.min(ya, yb) > b[3] + 6;
        }
        var cands = [[18, -18], [-18, 18], [-18, -36], [36, 18], [18, -36]];
        for (var k = 0; k < cands.length; k++) {
            var cx = q[0] + cands[k][0], cy = q[1] + cands[k][1];
            if (clear(cx, cy)) {
                window.renderKatex(f.svg, 'Q', f.m.left + cx, f.m.top + cy,
                    { width: lw, height: lh, size: 15, color: cq });
                break;
            }
        }
    }

    window.AMP.onRender(render);
})();
