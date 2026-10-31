// Section 02 · Flat-band diagram for pure, n-type and p-type silicon.
// Level positions are those of the original simulator: E_F at the middle of
// the gap (pure), one quarter below E_C (n-type) or three quarters below E_C
// (p-type); donor level 15 % of the gap below E_C, acceptor level 15 % above
// E_V; both are drawn far from scale.
//
// Layout (inner coordinates, ih = inner height):
//   conduction band 0.08 ih .. 0.28 ih, valence band 0.68 ih .. ih.
//   Level labels (E_F, E_D, E_A) sit at the left end of their line; each
//   line starts 36 px in, so no label touches a line. With a 0.40 ih gap the
//   closest pair (E_D and E_F) is 0.04 ih >= 18 px apart at the smallest box.
//   Excitation arrows at x = 0.6 iw; carriers in the bands right of 0.3 iw;
//   band names at the left. E_g bracket and value in the right margin.
(function () {
    var sel = '#plot-band';

    function render() {
        var D = window.DOP, p = D.p, T = window.T, css = window.CMP.cssVar, mode = p.mode;
        var f = D.frame(sel, { margin: { top: 44, right: 78, bottom: 44, left: 56 } });
        var g = f.g, iw = f.iw, ih = f.ih;

        var cbTop = ih * 0.08, cbBot = ih * 0.28, vbTop = ih * 0.68, vbBot = ih;
        var gapH = vbTop - cbBot;
        var fermiY = cbBot + gapH * (mode === 'ntype' ? 0.25 : mode === 'ptype' ? 0.75 : 0.5);
        var cV = css('--c-valence'), cC = css('--c-conduction'), cF = css('--c-free'), cH = css('--c-hole');
        var mono = "'JetBrains Mono', monospace";

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

        // Gap bracket in the right margin.
        var bx = iw + 8;
        g.append('path').attr('fill', 'none').attr('stroke', T.overlay50).attr('stroke-width', 1.2)
            .attr('d', 'M' + (bx - 4) + ',' + cbBot + 'H' + bx + 'V' + vbTop + 'H' + (bx - 4));
        window.renderKatex(f.svg, '1.1\\,\\text{eV}', f.m.left + bx + 34, f.m.top + (cbBot + vbTop) / 2,
            { width: 56, height: 20, size: 14 });

        // A level: label at the left end, line from x = 36 to the right edge.
        function level(y, latex, col, dash) {
            g.append('line').attr('x1', 36).attr('x2', iw - 6).attr('y1', y).attr('y2', y)
                .attr('stroke', col).attr('stroke-width', 1.6).attr('stroke-dasharray', dash);
            window.renderKatex(f.svg, latex, f.m.left + 18, f.m.top + y, { width: 30, height: 18, size: 14, color: col });
        }
        function arrow(x, y0, y1, col) {
            g.append('line').attr('x1', x).attr('x2', x).attr('y1', y0).attr('y2', y1 + 2)
                .attr('stroke', col).attr('stroke-width', 1.3).attr('stroke-dasharray', '2 2');
            g.append('path').attr('d', 'M' + (x - 3) + ',' + (y1 + 7) + 'L' + x + ',' + y1 + 'L' + (x + 3) + ',' + (y1 + 7))
                .attr('fill', 'none').attr('stroke', col).attr('stroke-width', 1.3);
        }
        function dot(x, y, r, col, open) {
            var c = g.append('circle').attr('cx', x).attr('cy', y).attr('r', r);
            if (open) c.attr('fill', 'none').attr('stroke', col).attr('stroke-width', 1.6);
            else c.attr('fill', col);
        }
        var x0 = iw * 0.32, x1 = iw - 20, cx = iw * 0.6;
        function dx(i, n) { return x0 + i * (x1 - x0) / Math.max(n - 1, 1); }

        level(fermiY, 'E_F', css('--c-fermi'), '6 4');

        if (mode === 'ntype') {
            var donorY = cbBot + gapH * 0.15;
            level(donorY, 'E_D', css('--c-p'), '2 3');
            for (var a = 0; a < 3; a++) arrow(cx - 20 + a * 20, donorY - 2, cbBot + 2, cF);
            for (var d = 0; d < 4; d++) dot(dx(d, 4), (cbTop + cbBot) / 2 + 6, 4.5, cF);
        } else if (mode === 'ptype') {
            var accY = cbBot + gapH * 0.85;
            level(accY, 'E_A', css('--c-b'), '2 3');
            for (var b = 0; b < 3; b++) arrow(cx - 20 + b * 20, vbTop - 2, accY + 2, cH);
            for (var h = 0; h < 4; h++) dot(dx(h, 4), vbTop + (vbBot - vbTop) * 0.25, 4.5, cH, true);
        } else {
            var numTh = Math.floor(Math.pow(p.temp / 1000, 2) * 4);
            for (var k = 0; k < numTh; k++) {
                dot(dx(k, 4), (cbTop + cbBot) / 2 + 6, 4, cF);
                dot(dx(k, 4), vbTop + (vbBot - vbTop) * 0.25, 4, cH, true);
            }
            for (var q = 0; q < numTh; q++) arrow(cx - 20 + q * 14, vbTop - 2, cbBot + 2, cF);
        }
        for (var v = 0; v < 6; v++) dot(dx(v, 6), vbTop + (vbBot - vbTop) * 0.55, 3.5, cV);

        var lab = document.getElementById('band-label');
        if (lab) lab.innerHTML = 'energy band diagram · <b>' + D.LABELS[mode].name + '</b> · levels not to scale';
    }

    window.DOP.onRender(render);
})();
