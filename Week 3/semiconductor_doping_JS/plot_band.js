// Section 02 · Flat-band diagram for pure, n-type and p-type silicon, with
// the energy levels to scale within the gap. The gap of E_g(T) spans the
// space between the bands; E_i is taken at midgap; E_F sits at
// E_F - E_i = kT ln(n / n_i) from DOP.state(), the same statistics as the
// section 03 plot. E_D lies 45 meV below E_C and E_A 45 meV above E_V.
// Where complete ionisation and non-degenerate statistics would put E_F
// within 2 px of a band edge (heavy doping or low temperature), the drawn
// line is held at that limit and the plot label says so.
//
// Layout (inner coordinates):
//   conduction band 0.08 ih .. 0.28 ih, valence band 0.68 ih .. ih.
//   E_F label at the left, x < 32, centred on its line. Only the band edges
//   cross x < 36 (every level line starts at x = 36), so the label moves
//   13 px below its line when within 12 px of E_C, or above when within
//   12 px of E_V. E_D and E_A labels sit in the right margin at their own
//   heights, 16 px right of the E_g bracket; the bracket value sits at
//   midgap, at least 0.37 E_g from either of them.
(function () {
    var sel = '#plot-band';

    function render() {
        var D = window.DOP, p = D.p, T = window.T, css = window.CMP.cssVar, mode = p.mode;
        var s = D.state();
        var f = D.frame(sel, { margin: { top: 56, right: 78, bottom: 44, left: 56 } });
        var g = f.g, iw = f.iw, ih = f.ih;

        var cbTop = ih * 0.08, cbBot = ih * 0.28, vbTop = ih * 0.68, vbBot = ih;
        var gapH = vbTop - cbBot, yMid = (cbBot + vbTop) / 2;
        var cV = css('--c-valence'), cC = css('--c-conduction'), cF = css('--c-free'), cH = css('--c-hole');
        var mono = "'JetBrains Mono', monospace";
        function yE(eFromEi) { return yMid - eFromEi / s.eg * gapH; }

        g.append('rect').attr('x', 0).attr('y', cbTop).attr('width', iw).attr('height', cbBot - cbTop)
            .attr('fill', cC).attr('fill-opacity', 0.13).attr('stroke', cC).attr('stroke-opacity', 0.55).attr('stroke-width', 1.5);
        g.append('rect').attr('x', 0).attr('y', vbTop).attr('width', iw).attr('height', vbBot - vbTop)
            .attr('fill', cV).attr('fill-opacity', 0.18).attr('stroke', cV).attr('stroke-opacity', 0.6).attr('stroke-width', 1.5);

        // Energy axis and titles.
        g.append('line').attr('x1', -8).attr('x2', -8).attr('y1', ih).attr('y2', -6)
            .attr('stroke', T.gridAxis).attr('stroke-width', 1.2);
        g.append('path').attr('d', 'M-12,2 L-8,-8 L-4,2').attr('fill', 'none').attr('stroke', T.gridAxis).attr('stroke-width', 1.2);
        window.renderKatex(f.svg, '\\text{electron energy } E', 20, f.m.top + ih / 2,
            { width: 220, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, '\\text{position in the crystal } x', f.m.left + iw / 2, f.H - 18,
            { width: 280, height: 22, size: 16 });

        function name(txt, y, col) {
            g.append('text').attr('x', 12).attr('y', y).attr('dominant-baseline', 'middle')
                .attr('fill', col).attr('font-size', 13).attr('font-family', mono).text(txt);
        }
        name('conduction band', cbTop + 16, cC);
        name('valence band', vbBot - 16, cV);

        // Gap bracket and value in the right margin.
        var bx = iw + 8;
        g.append('path').attr('fill', 'none').attr('stroke', T.overlay50).attr('stroke-width', 1.2)
            .attr('d', 'M' + (bx - 4) + ',' + cbBot + 'H' + bx + 'V' + vbTop + 'H' + (bx - 4));
        window.renderKatex(f.svg, s.eg.toFixed(2) + '\\,\\text{eV}', f.m.left + bx + 34, f.m.top + yMid,
            { width: 56, height: 20, size: 14 });

        function line(y, col, dash) {
            g.append('line').attr('x1', 36).attr('x2', iw - 6).attr('y1', y).attr('y2', y)
                .attr('stroke', col).attr('stroke-width', 1.6).attr('stroke-dasharray', dash);
        }
        function dot(x, y, r, col, open) {
            var c = g.append('circle').attr('cx', x).attr('cy', y).attr('r', r);
            if (open) c.attr('fill', 'none').attr('stroke', col).attr('stroke-width', 1.6);
            else c.attr('fill', col);
        }
        var x0 = iw * 0.32, x1 = iw - 20;
        function dx(i, n) { return x0 + i * (x1 - x0) / Math.max(n - 1, 1); }

        // Dopant level, to scale.
        if (mode === 'ntype') {
            var yD = cbBot + D.E_ION / s.eg * gapH;
            line(yD, css('--c-p'), '2 3');
            window.renderKatex(f.svg, 'E_D', f.m.left + iw + 30, f.m.top + yD, { width: 30, height: 18, size: 14, color: css('--c-p') });
            for (var d = 0; d < 4; d++) dot(dx(d, 4), (cbTop + cbBot) / 2 + 6, 4.5, cF);
        } else if (mode === 'ptype') {
            var yA = vbTop - D.E_ION / s.eg * gapH;
            line(yA, css('--c-b'), '2 3');
            window.renderKatex(f.svg, 'E_A', f.m.left + iw + 30, f.m.top + yA, { width: 30, height: 18, size: 14, color: css('--c-b') });
            for (var h = 0; h < 4; h++) dot(dx(h, 4), vbTop + (vbBot - vbTop) * 0.25, 4.5, cH, true);
        } else {
            // Thermal pairs, proportional to n_i: four at 1000 K, none below about 700 K.
            var numTh = Math.min(4, Math.round(4 * s.ni / D.niSi(1000)));
            for (var k = 0; k < numTh; k++) {
                dot(dx(k, 4), (cbTop + cbBot) / 2 + 6, 4, cF);
                dot(dx(k, 4), vbTop + (vbBot - vbTop) * 0.25, 4, cH, true);
            }
            for (var q = 0; q < numTh; q++) {
                var ax = iw * 0.6 - 20 + q * 14;
                g.append('line').attr('x1', ax).attr('x2', ax).attr('y1', vbTop - 2).attr('y2', cbBot + 4)
                    .attr('stroke', cF).attr('stroke-width', 1.3).attr('stroke-dasharray', '2 2');
                g.append('path').attr('d', 'M' + (ax - 3) + ',' + (cbBot + 9) + 'L' + ax + ',' + (cbBot + 2) + 'L' + (ax + 3) + ',' + (cbBot + 9))
                    .attr('fill', 'none').attr('stroke', cF).attr('stroke-width', 1.3);
            }
        }
        for (var v = 0; v < 6; v++) dot(dx(v, 6), vbTop + (vbBot - vbTop) * 0.55, 3.5, cV);

        // Fermi level from the carrier statistics.
        // Within 3kT of a band edge the non-degenerate statistics used here
        // are no longer accurate; the label says so.
        var nearEdge = !isNaN(s.ef) && s.eg / 2 - Math.abs(s.ef) < 3 * D.K_B * p.temp;
        var clamped = false, yF;
        if (isNaN(s.ef)) { yF = null; }
        else {
            yF = yE(s.ef);
            if (yF < cbBot + 2) { yF = cbBot + 2; clamped = true; }
            if (yF > vbTop - 2) { yF = vbTop - 2; clamped = true; }
        }
        if (yF !== null) {
            var cE = css('--c-fermi');
            line(yF, cE, '6 4');
            var ly = yF - cbBot < 12 ? yF + 13 : vbTop - yF < 12 ? yF - 13 : yF;
            window.renderKatex(f.svg, 'E_F', f.m.left + 18, f.m.top + ly, { width: 30, height: 18, size: 14, color: cE });
        }

        var lab = document.getElementById('band-label');
        if (lab) {
            var Ntxt = mode === 'pure' ? '' : ' · N = ' + D.N().toExponential(1).replace('e+', 'e') + ' cm⁻³';
            lab.innerHTML = '<b>' + D.LABELS[mode].name + '</b>' + Ntxt + ' · ' + Math.round(p.temp) + ' K' +
                (yF === null ? ' · E_F undefined at 0 K' : clamped ? ' · E_F held at band edge (model invalid)'
                : nearEdge ? ' · E_F within 3kT of band edge (model inaccurate)' : '');
        }
    }

    window.DOP.onRender(render);
})();
