// Section 02 · Band diagram of the junction under bias. The band-bending
// and Fermi-level construction are those of the original simulator:
// bending = E_g (V0 / 1.12 eV) (V0 - V) / V0, clamped to [0, 3] V0, and
// E_F lies (1 - qV0/E_g)/2 of the gap from the band edge on each side, so it
// is flat at equilibrium and E_Fn - E_Fp = qV under bias. The depletion
// region is drawn 0.35 iw wide at equilibrium and scales with W / W0.
//
// Text placement (all fixed relative to lines that cannot reach it):
//   E_C, E_V labels in the right margin at the n-side band edges.
//   E_F or E_Fp label inside at the left, 4 px above its line (the next line
//   above, E_C, is 0.8 E_g higher). E_Fn label inside at the right, below its
//   line (the next line below, E_V, is 0.8 E_g lower).
//   Barrier value right of the arrow at x = depR + 12, between E_C(p) and
//   E_C(n) when the bend is at least 26 px, otherwise just above E_C(p);
//   both positions lie right of the depletion region where E_C is lower.
//   Region names in the bottom margin, the x title below them.
(function () {
    var sel = '#plot-band';

    function render() {
        var P = window.PN, V = P.p.bias, T = window.T, css = window.CMP.cssVar;
        var f = P.frame(sel, { margin: { top: 44, right: 50, bottom: 66, left: 56 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var W = P.depletionHalfWidth(V);
        var midX = iw / 2;
        var depW = Math.min(iw * 0.8, iw * 0.35 * W);
        var depL = midX - depW / 2, depR = midX + depW / 2;

        var Eg = ih * 0.25;
        var barrier = Math.max(0, Math.min(3, (P.V0 - V) / P.V0));
        var bandBend = Eg * (P.V0 / P.EG_EV) * barrier;
        var efOffset = Eg * (1 - P.V0 / P.EG_EV) / 2;
        var EcP = ih * 0.2, EvP = EcP + Eg, EfP = EvP - efOffset;
        var EcN = EcP + bandBend, EvN = EcN + Eg, EfN = EcN + efOffset;

        // Depletion region.
        if (depW > 1) {
            g.append('rect').attr('x', depL).attr('y', 0).attr('width', depW).attr('height', ih)
                .attr('fill', css('--c-depl')).attr('fill-opacity', 0.08);
            [depL, depR].forEach(function (x) {
                g.append('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', ih)
                    .attr('stroke', css('--c-depl')).attr('stroke-opacity', 0.5).attr('stroke-dasharray', '4 4');
            });
        }

        // Energy axis and titles.
        g.append('line').attr('x1', -8).attr('x2', -8).attr('y1', ih).attr('y2', -6)
            .attr('stroke', T.gridAxis).attr('stroke-width', 1.2);
        g.append('path').attr('d', 'M-12,2 L-8,-8 L-4,2').attr('fill', 'none').attr('stroke', T.gridAxis).attr('stroke-width', 1.2);
        window.renderKatex(f.svg, '\\text{electron energy } E', 20, f.m.top + ih / 2,
            { width: 220, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, '\\text{position } x', f.m.left + iw / 2, f.H - 16,
            { width: 200, height: 22, size: 16 });

        // Band edges: flat, then two quadratic segments through the junction.
        function edge(yP, yN) {
            return 'M0,' + yP + 'L' + depL + ',' + yP +
                'Q' + midX + ',' + yP + ' ' + midX + ',' + (yP + yN) / 2 +
                'Q' + midX + ',' + yN + ' ' + depR + ',' + yN + 'L' + iw + ',' + yN;
        }
        g.append('path').attr('d', edge(EcP, EcN)).attr('fill', 'none').attr('stroke', css('--c-ec')).attr('stroke-width', 2.2);
        g.append('path').attr('d', edge(EvP, EvN)).attr('fill', 'none').attr('stroke', css('--c-ev')).attr('stroke-width', 2.2);
        window.renderKatex(f.svg, 'E_C', f.m.left + iw + 22, f.m.top + EcN, { width: 30, height: 18, size: 15, color: css('--c-ec') });
        window.renderKatex(f.svg, 'E_V', f.m.left + iw + 22, f.m.top + EvN, { width: 30, height: 18, size: 15, color: css('--c-ev') });

        // Fermi level, or quasi-Fermi levels under bias.
        function lbl(latex, x, y, col, align) {
            window.renderKatex(f.svg, latex, f.m.left + x, f.m.top + y, { width: 44, height: 18, size: 14, color: col, align: align });
        }
        if (Math.abs(V) > 0.01) {
            g.append('line').attr('x1', midX).attr('x2', iw).attr('y1', EfN).attr('y2', EfN)
                .attr('stroke', css('--c-ec')).attr('stroke-dasharray', '3 4').attr('stroke-width', 1.4);
            g.append('line').attr('x1', 0).attr('x2', midX).attr('y1', EfP).attr('y2', EfP)
                .attr('stroke', css('--c-ev')).attr('stroke-dasharray', '3 4').attr('stroke-width', 1.4);
            lbl('E_{Fp}', 28, EfP - 13, css('--c-ev'), 'left');
            lbl('E_{Fn}', iw - 26, EfN + 13, css('--c-ec'), 'right');
        } else {
            var Ef = (EfP + EfN) / 2;
            g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', Ef).attr('y2', Ef)
                .attr('stroke', css('--c-ef')).attr('stroke-dasharray', '6 4').attr('stroke-width', 1.4);
            lbl('E_F', 28, Ef - 13, css('--c-ef'), 'left');
        }

        // Barrier arrow and value.
        if (bandBend > 5) {
            var ax = depR + 12, cb = css('--c-barrier');
            g.append('line').attr('x1', ax).attr('x2', ax).attr('y1', EcP + 3).attr('y2', EcN - 3).attr('stroke', cb);
            g.append('path').attr('fill', cb).attr('d', 'M' + (ax - 3) + ',' + (EcP + 8) + 'L' + (ax + 3) + ',' + (EcP + 8) + 'L' + ax + ',' + (EcP + 2) + 'Z');
            g.append('path').attr('fill', cb).attr('d', 'M' + (ax - 3) + ',' + (EcN - 8) + 'L' + (ax + 3) + ',' + (EcN - 8) + 'L' + ax + ',' + (EcN - 2) + 'Z');
            var ly = bandBend >= 26 ? (EcP + EcN) / 2 : EcP - 12;
            window.renderKatex(f.svg, Math.max(0, P.V0 - V).toFixed(2) + '\\,\\text{eV}', f.m.left + ax + 8 + 36, f.m.top + ly,
                { width: 72, height: 18, size: 14, color: cb, align: 'left' });
        }

        // Region names in the bottom margin.
        var mono = "'JetBrains Mono', monospace";
        function name(txt, x, anchor, col) {
            f.svg.append('text').attr('x', f.m.left + x).attr('y', f.m.top + ih + 18).attr('text-anchor', anchor)
                .attr('dominant-baseline', 'middle').attr('font-family', mono).attr('font-size', 12).attr('fill', col).text(txt);
        }
        name('p-type', 0, 'start', css('--c-b'));
        name('n-type', iw, 'end', css('--c-p'));
        if (depW > 1) name('depletion region', midX, 'middle', T.textDim);

        var lab = document.getElementById('band-label');
        if (lab) lab.innerHTML = 'energy band diagram · <b>' + P.junctionState(V).toLowerCase() + '</b>' +
            (V <= P.V_BREAKDOWN ? ' · high field in the depletion region' : '');
    }

    window.PN.onRender(render);
})();
