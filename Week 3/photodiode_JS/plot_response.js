// Section 04 · Ideal spectral responsivity R(lambda) = eta lambda / 1240 A/W
// up to each material's cutoff wavelength, zero beyond. The three materials
// share the rising line below their cutoffs, so the selected one is drawn
// solid and the others as faint cutoff edges. Single quadrant.
// Material labels sit below and right of each cutoff corner (the shared line
// continues above and right of it), with fallbacks tested against all drawn
// lines, the visible-band label, each other and the plot edges.
(function () {
    var sel = '#plot-response';
    var LMIN = 300, LMAX = 1900;

    function render() {
        var PD = window.PD, T = window.T, css = window.CMP.cssVar;
        var f = PD.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;
        if (ih <= 0 || iw <= 0) return;   // not laid out yet
        var x = d3.scaleLinear().domain([LMIN, LMAX]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, 1.25]).range([ih, 0]);

        g.append('rect').attr('x', x(380)).attr('y', 0).attr('width', x(750) - x(380)).attr('height', ih)
            .attr('fill', T.overlay05);
        PD.axes(f, g, x, y, { xTitle: '\\lambda\\;[\\mathrm{nm}]', yTitle: '\\mathcal{R}\\;[\\mathrm{A/W}]' });
        g.append('text').attr('x', x(565)).attr('y', 18).attr('text-anchor', 'middle')
            .attr('fill', T.textDim).attr('font-size', 12).attr('font-family', "'JetBrains Mono', monospace")
            .text('visible');
        var placed = [[x(565) - 30, 4, x(565) + 30, 24]];

        var cur = PD.mat(), keys = Object.keys(PD.MATERIALS);
        var segs = [];   // drawn line segments in pixels, for collision tests
        function curve(m, on) {
            var lc = m.cutoffWavelength, rc = PD.responsivity(lc, m);
            var c = css(m.col);
            var d = on ? [[x(LMIN), y(PD.responsivity(LMIN, m))], [x(lc), y(rc)], [x(lc), y(0)], [x(LMAX), y(0)]]
                : [[x(lc), y(rc)], [x(lc), y(0)]];
            g.append('path').attr('fill', 'none').attr('stroke', c)
                .attr('stroke-width', on ? 2.6 : 1.4).attr('stroke-opacity', on ? 1 : 0.55)
                .attr('stroke-dasharray', on ? null : '4 3').attr('d', d3.line()(d));
            for (var i = 0; i < d.length - 1; i++) segs.push([d[i], d[i + 1]]);
        }
        keys.forEach(function (k) { if (k !== cur.short) curve(PD.MATERIALS[k], false); });
        curve(cur, true);

        // Peak-response operating point with guides to both axes.
        var lp = cur.peakWavelength, rp = PD.responsivity(lp, cur);
        var px = x(lp), py = y(rp);
        g.append('path').attr('fill', 'none').attr('stroke', css(cur.col)).attr('stroke-width', 1.1)
            .attr('stroke-dasharray', '3 4').attr('d', 'M0,' + py + 'H' + px + 'V' + ih);
        segs.push([[0, py], [px, py]], [[px, py], [px, ih]]);
        g.append('circle').attr('cx', px).attr('cy', py).attr('r', 5.5)
            .attr('fill', css(cur.col)).attr('stroke', T.text).attr('stroke-width', 1.2);
        placed.push([px - 8, py - 8, px + 8, py + 8]);

        function segHit(b) {
            return segs.some(function (s) {
                for (var t = 0; t <= 1; t += 0.02) {
                    var qx = s[0][0] + (s[1][0] - s[0][0]) * t, qy = s[0][1] + (s[1][1] - s[0][1]) * t;
                    if (qx > b[0] - 3 && qx < b[2] + 3 && qy > b[1] - 3 && qy < b[3] + 3) return true;
                }
                return false;
            });
        }

        // Selected material labelled first so it wins placement.
        [cur].concat(keys.filter(function (k) { return k !== cur.short; }).map(function (k) { return PD.MATERIALS[k]; }))
            .forEach(function (m) {
                var on = m === cur, lc = m.cutoffWavelength;
                var cx = x(lc), cy = y(PD.responsivity(lc, m));
                var w = m.short.length * 9 + 14, h = 20;
                var cands = [[cx + 8, cy + 6], [cx + 8, cy + 30], [cx - 8 - w, cy + 6], [cx - 8 - w, cy + 30]];
                for (var i = 0; i < cands.length; i++) {
                    var b = [cands[i][0], cands[i][1], cands[i][0] + w, cands[i][1] + h];
                    if (!segHit(b) && PD.clear(b, placed) && b[0] > 2 && b[2] < iw - 2 && b[3] < ih - 2) {
                        placed.push(b);
                        window.renderKatex(f.svg, '\\text{' + m.short + '}', f.m.left + b[0] + w / 2, f.m.top + b[1] + h / 2,
                            { width: w, height: h, size: 15, color: on ? css(m.col) : T.textDim });
                        break;
                    }
                }
            });
    }

    window.PD.onRender(render);
})();
