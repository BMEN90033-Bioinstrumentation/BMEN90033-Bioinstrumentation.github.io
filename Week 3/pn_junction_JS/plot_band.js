// Section 02 · Band diagram of the abrupt junction under bias, drawn to
// scale in both axes. Position is in µm about the metallurgical junction;
// the depletion region spans -x_p .. x_n. In the depletion approximation
// the potential is parabolic on each side, with the drops in the ratio
// V_p / V_n = N_D / N_A and a total barrier q(V0 - V). The intrinsic level
// sits at midgap and the Fermi levels follow from the doping:
//   E_i - E_Fp = kT ln(N_A / n_i) (p-side),  E_Fn - E_i = kT ln(N_D / n_i) (n-side),
// so E_F is flat at V = 0 and E_Fn - E_Fp = qV under bias. For V >= V0 the
// depletion approximation fails; the drawing then shows flat bands.
//
// Scales: x domain is +-(larger of x_p, x_n at -2 V) / 0.6, so the depletion
// region never covers more than 80 % of the width. Energy uses one px/eV
// scale chosen so the largest bend (V = -2 V) plus the gap fits the plot.
//
// Text placement (fixed relative to lines that cannot reach it):
//   Region names inside the top edge, above E_C(p) (which is at 0.07 ih + 14 px).
//   E_C, E_V labels in the right margin at the n-side edges.
//   E_F or E_Fp label at the left, 4 px above its line; E_C(p) is at least
//   0.56 eV higher. E_Fn label at the right, below its line; E_V(n) is at
//   least 0.56 eV lower.
//   Barrier value right of the arrow at x_n + 12 px, where E_C has already
//   reached E_C(n): between the two E_C levels when the bend is >= 26 px,
//   otherwise just above E_C(p).
(function () {
    var sel = '#plot-band';

    function render() {
        var P = window.PN, V = P.p.bias, T = window.T, css = window.CMP.cssVar;
        var f = P.frame(sel, { margin: { top: 44, right: 50, bottom: 62, left: 56 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var na = P.NA(), nd = P.ND(), v0 = P.V0(), Eg = P.EG_EV, VT = P.V_T;

        var XMAX = Math.max(P.xp(-2), P.xn(-2)) * 1e4 / 0.6;     // µm
        var x = d3.scaleLinear().domain([-XMAX, XMAX]).range([0, iw]);
        var xp = P.xp(V) * 1e4, xn = P.xn(V) * 1e4;
        var B = Math.max(0, v0 - V);                            // barrier, eV
        var Bp = B * nd / (na + nd), Bn = B - Bp;

        var k = 0.86 * ih / (Eg + v0 + 2);                      // px per eV
        var EcP = ih * 0.07 + 14;
        function yEc(xx) {
            var phi;
            if (B === 0) phi = 0;
            else if (xx <= -xp) phi = 0;
            else if (xx <= 0) phi = Bp * Math.pow((xx + xp) / xp, 2);
            else if (xx < xn) phi = B - Bn * Math.pow((xn - xx) / xn, 2);
            else phi = B;
            return EcP + k * phi;
        }

        // Depletion region.
        var depL = x(-xp), depR = x(xn), depW = depR - depL;
        if (depW > 1) {
            g.append('rect').attr('x', depL).attr('y', 0).attr('width', depW).attr('height', ih)
                .attr('fill', css('--c-depl')).attr('fill-opacity', 0.08);
            [depL, depR].forEach(function (px) {
                g.append('line').attr('x1', px).attr('x2', px).attr('y1', 0).attr('y2', ih)
                    .attr('stroke', css('--c-depl')).attr('stroke-opacity', 0.5).attr('stroke-dasharray', '4 4');
            });
        }

        // Axes: position in µm along the bottom, energy arrow on the left.
        var xa = g.append('g').attr('transform', 'translate(0,' + ih + ')').call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));
        window.CMP.styleAxis(xa);
        g.append('line').attr('x1', -8).attr('x2', -8).attr('y1', ih).attr('y2', -6)
            .attr('stroke', T.gridAxis).attr('stroke-width', 1.2);
        g.append('path').attr('d', 'M-12,2 L-8,-8 L-4,2').attr('fill', 'none').attr('stroke', T.gridAxis).attr('stroke-width', 1.2);
        window.renderKatex(f.svg, '\\text{electron energy } E', 20, f.m.top + ih / 2,
            { width: 220, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, 'x\\;[\\mu\\mathrm{m}]', f.m.left + iw / 2, f.H - 16,
            { width: 120, height: 22, size: 16 });

        // Band edges, sampled.
        var xs = d3.range(0, 401).map(function (i) { return -XMAX + 2 * XMAX * i / 400; });
        [-xp, 0, xn].forEach(function (v) { xs.push(v); });
        xs.sort(function (a, b) { return a - b; });
        function edge(off) {
            return d3.line().x(function (d) { return x(d); }).y(function (d) { return yEc(d) + off; })(xs);
        }
        g.append('path').attr('d', edge(0)).attr('fill', 'none').attr('stroke', css('--c-ec')).attr('stroke-width', 2.2);
        g.append('path').attr('d', edge(k * Eg)).attr('fill', 'none').attr('stroke', css('--c-ev')).attr('stroke-width', 2.2);
        var EcN = EcP + k * B, EvN = EcN + k * Eg;
        window.renderKatex(f.svg, 'E_C', f.m.left + iw + 22, f.m.top + EcN, { width: 30, height: 18, size: 15, color: css('--c-ec') });
        window.renderKatex(f.svg, 'E_V', f.m.left + iw + 22, f.m.top + EvN, { width: 30, height: 18, size: 15, color: css('--c-ev') });

        // Fermi levels from the doping.
        var EiP = EcP + k * Eg / 2, EiN = EiP + k * B;
        var EfP = EiP + k * VT * Math.log(na / P.NI), EfN = EiN - k * VT * Math.log(nd / P.NI);
        function lbl(latex, px, y, col, align) {
            window.renderKatex(f.svg, latex, f.m.left + px, f.m.top + y, { width: 44, height: 18, size: 14, color: col, align: align });
        }
        if (Math.abs(V) > 0.01) {
            g.append('line').attr('x1', x(0)).attr('x2', iw).attr('y1', EfN).attr('y2', EfN)
                .attr('stroke', css('--c-ec')).attr('stroke-dasharray', '3 4').attr('stroke-width', 1.4);
            g.append('line').attr('x1', 0).attr('x2', x(0)).attr('y1', EfP).attr('y2', EfP)
                .attr('stroke', css('--c-ev')).attr('stroke-dasharray', '3 4').attr('stroke-width', 1.4);
            lbl('E_{Fp}', 28, EfP - 13, css('--c-ev'), 'left');
            lbl('E_{Fn}', iw - 26, EfN + 13, css('--c-ec'), 'right');
        } else {
            g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', EfP).attr('y2', EfP)
                .attr('stroke', css('--c-ef')).attr('stroke-dasharray', '6 4').attr('stroke-width', 1.4);
            lbl('E_F', 28, EfP - 13, css('--c-ef'), 'left');
        }

        // Barrier arrow and value.
        var bend = k * B;
        if (bend > 5) {
            var ax = depR + 12, cb = css('--c-barrier');
            g.append('line').attr('x1', ax).attr('x2', ax).attr('y1', EcP + 3).attr('y2', EcN - 3).attr('stroke', cb);
            g.append('path').attr('fill', cb).attr('d', 'M' + (ax - 3) + ',' + (EcP + 8) + 'L' + (ax + 3) + ',' + (EcP + 8) + 'L' + ax + ',' + (EcP + 2) + 'Z');
            g.append('path').attr('fill', cb).attr('d', 'M' + (ax - 3) + ',' + (EcN - 8) + 'L' + (ax + 3) + ',' + (EcN - 8) + 'L' + ax + ',' + (EcN - 2) + 'Z');
            var ly = bend >= 26 ? (EcP + EcN) / 2 : EcP - 12;
            window.renderKatex(f.svg, B.toFixed(2) + '\\,\\text{eV}', f.m.left + ax + 8 + 36, f.m.top + ly,
                { width: 72, height: 18, size: 14, color: cb, align: 'left' });
        }

        // Region names inside the top edge.
        var mono = "'JetBrains Mono', monospace";
        function name(txt, px, anchor, col) {
            g.append('text').attr('x', px).attr('y', ih * 0.07 - 2).attr('text-anchor', anchor)
                .attr('dominant-baseline', 'middle').attr('font-family', mono).attr('font-size', 12).attr('fill', col).text(txt);
        }
        name('p-type', 4, 'start', css('--c-b'));
        name('n-type', iw - 4, 'end', css('--c-p'));
        if (depW > 130) name('depletion', (depL + depR) / 2, 'middle', T.textDim);

        var lab = document.getElementById('band-label');
        if (lab) lab.innerHTML = 'energy band diagram · <b>' + P.junctionState(V).toLowerCase() + '</b>' +
            (V >= v0 ? ' · flat bands drawn for V ≥ V₀' : '');
    }

    window.PN.onRender(render);
})();
