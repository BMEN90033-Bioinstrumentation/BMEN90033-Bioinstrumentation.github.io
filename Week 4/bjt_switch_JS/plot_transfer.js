// Section 03 · Transfer characteristic. Top panel I_C(v_in), bottom panel
// V_CE(v_in), over the full input slider range. Dashed guides mark the
// cutoff and saturation edges; their labels sit in the top margin above the
// guide (outside the plot), staggered onto a second row when close.
(function () {
    var sel = '#plot-transfer';
    var VIN_MAX = 12;

    function render() {
        var B = window.BJT, p = B.p, s = B.compute(p.vin), T = window.T;
        var css = window.CMP.cssVar, npn = p.type === 'NPN';
        var f = B.frame(sel, { margin: { top: 76 } });
        var gap = 14, ph = (f.ih - gap) / 2;

        var x = d3.scaleLinear().domain([0, VIN_MAX]).range([0, f.iw]);
        var yI = d3.scaleLinear().domain([0, B.icSat() * 1e3 * 1.15]).range([ph, 0]);
        var yV = d3.scaleLinear().domain([0, p.vcc * 1.1]).range([ph, 0]);

        var gT = f.g;
        var gB = f.svg.append('g').attr('transform',
            'translate(' + f.m.left + ',' + (f.m.top + ph + gap) + ')');
        B.axes(f, gT, x, yI, ph, 0, { yTitle: 'I_C\\;[\\mathrm{mA}]' });
        B.axes(f, gB, x, yV, ph, ph + gap, {
            yTitle: (npn ? 'V_{CE}' : 'V_{EC}') + '\\;[\\mathrm{V}]',
            xTitle: 'v_\\text{in}\\;[\\mathrm{V}]'
        });

        var pts = d3.range(0, 481).map(function (i) {
            var v = VIN_MAX * i / 480; return [v, B.compute(v)];
        });
        gT.append('path').attr('class', 'trace').attr('stroke', css('--c-ic'))
            .attr('d', d3.line().x(function (d) { return x(d[0]); })
                .y(function (d) { return yI(d[1].ic * 1e3); })(pts));
        gB.append('path').attr('class', 'trace').attr('stroke', css('--c-vce'))
            .attr('d', d3.line().x(function (d) { return x(d[0]); })
                .y(function (d) { return yV(d[1].vce); })(pts));

        // Region edges in v_in.
        var edges = [
            { v: npn ? B.VBE_ON : p.vcc - B.VBE_ON,
              tex: npn ? 'V_{BE(\\text{on})}' : 'V_{CC} - V_{EB(\\text{on})}' },
            { v: B.vinSat(), tex: 'v_\\text{in,sat}' }
        ].filter(function (e) { return e.v >= 0 && e.v <= VIN_MAX; })
         .sort(function (a, b) { return a.v - b.v; });

        // Edge labels live in the top margin on one of two rows, each placed to
        // the right or left of its guide. All combinations are tried in order of
        // preference; a layout is valid when labels stay inside the box, labels
        // on the same row do not overlap, and no guide rising to the upper row
        // crosses a label on the lower row.
        var rows = [f.m.top - 16, f.m.top - 38];
        var labs = edges.map(function (e) {
            var px = x(e.v);
            [gT, gB].forEach(function (gg) {
                gg.append('line').attr('x1', px).attr('x2', px).attr('y1', 0).attr('y2', ph)
                    .attr('stroke', T.fg(0.35)).attr('stroke-dasharray', '3 4');
            });
            var fo = window.renderKatex(f.svg, e.tex + ' = ' + e.v.toFixed(2) + '\\,\\text{V}',
                0, 0, { width: 220, height: 18, size: 14, color: T.textDim, align: 'left' });
            var kw = fo.select('.katex').node().getBoundingClientRect().width || 120;
            return { fo: fo, gx: f.m.left + px, kw: kw };
        });
        function span(l, side) { return side ? [l.gx - 6 - l.kw, l.gx - 6] : [l.gx + 6, l.gx + 6 + l.kw]; }
        var best = null;
        [[0, 0], [1, 0], [0, 1]].some(function (rw) {
            return [[0, 0], [0, 1], [1, 0], [1, 1]].some(function (sd) {
                var sp = labs.map(function (l, i) { return span(l, sd[i]); });
                var ok = sp.every(function (q) { return q[0] >= 4 && q[1] <= f.W - 4; });
                for (var i = 0; ok && i < labs.length; i++) for (var j = 0; j < labs.length; j++) {
                    if (i === j) continue;
                    if (rw[i] === rw[j] && i < j && sp[i][1] + 10 > sp[j][0] && sp[j][1] + 10 > sp[i][0]) ok = false;
                    if (rw[i] === 1 && rw[j] === 0 && labs[i].gx > sp[j][0] - 4 && labs[i].gx < sp[j][1] + 4) ok = false;
                }
                if (ok) best = { rw: rw, sp: sp };
                return ok;
            });
        });
        best = best || { rw: [0, 1], sp: labs.map(function (l) { return span(l, 0); }) };
        labs.forEach(function (l, i) {
            var y0 = rows[best.rw[i]];
            l.fo.attr('x', best.sp[i][0]).attr('y', y0 - 9);
            f.svg.append('line').attr('x1', l.gx).attr('x2', l.gx).attr('y1', f.m.top).attr('y2', y0 - 6)
                .attr('stroke', T.fg(0.35)).attr('stroke-dasharray', '3 4');
        });

        // Present operating point on both panels.
        [[gT, yI(s.ic * 1e3), '--c-ic'], [gB, yV(s.vce), '--c-vce']].forEach(function (q) {
            q[0].append('circle').attr('cx', x(p.vin)).attr('cy', q[1]).attr('r', 4.5)
                .attr('fill', css(q[2])).attr('stroke', T.text).attr('stroke-width', 1);
        });
    }

    window.BJT.onRender(render);
})();
