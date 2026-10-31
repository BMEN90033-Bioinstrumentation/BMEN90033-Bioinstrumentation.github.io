// Section 02 · Flat-band energy diagram. Band edges follow the shell radii
// of the 3D scene (larger radius drawn at higher energy), as in the original
// simulator. Band names sit at the left inside each band; carriers are drawn
// in the right 55 % of the width so the two never meet. The E_g bracket and
// its label sit in the right margin, outside the bands.
(function () {
    var sel = '#plot-band';

    function render() {
        var B = window.BANDS, p = B.p, s = B.state(), T = window.T, css = window.CMP.cssVar;
        var f = B.frame(sel, { margin: { top: 44, right: 64, bottom: 44, left: 56 } });
        var g = f.g, iw = f.iw, ih = f.ih, cfg = s.cfg;

        function py(r) { return ih * (1 - r / B.MAX_R); }
        var vbTop = py(cfg.valenceRadius), cbBot = py(s.cRadius);
        var hasGap = cbBot < vbTop - 4;
        var cV = css('--c-valence'), cC = css('--c-conduction'), cF = css('--c-free'), cH = css('--c-hole');

        // Bands.
        g.append('rect').attr('x', 0).attr('y', vbTop).attr('width', iw).attr('height', ih - vbTop)
            .attr('fill', cV).attr('fill-opacity', 0.18).attr('stroke', cV).attr('stroke-opacity', 0.6).attr('stroke-width', 1.5);
        g.append('rect').attr('x', 0).attr('y', 0).attr('width', iw).attr('height', cbBot)
            .attr('fill', cC).attr('fill-opacity', 0.13).attr('stroke', cC).attr('stroke-opacity', 0.55).attr('stroke-width', 1.5);

        // Energy axis with arrowhead, and axis titles outside the plot.
        g.append('line').attr('x1', -8).attr('x2', -8).attr('y1', ih).attr('y2', -6)
            .attr('stroke', T.gridAxis).attr('stroke-width', 1.2);
        g.append('path').attr('d', 'M-12,2 L-8,-8 L-4,2').attr('fill', 'none').attr('stroke', T.gridAxis).attr('stroke-width', 1.2);
        window.renderKatex(f.svg, '\\text{electron energy } E', 20, f.m.top + ih / 2,
            { width: 220, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, '\\text{position in the crystal } x', f.m.left + iw / 2, f.H - 18,
            { width: 280, height: 22, size: 16 });

        // Band names.
        function name(txt, y, col) {
            g.append('text').attr('x', 12).attr('y', y).attr('dominant-baseline', 'middle')
                .attr('fill', col).attr('font-size', 13).attr('font-family', "'JetBrains Mono', monospace").text(txt);
        }
        name('conduction band', Math.min(cbBot / 2, 22), cC);
        name('valence band', ih - 16, cV);

        // Gap guides and bracket.
        if (hasGap) {
            [cbBot, vbTop].forEach(function (y) {
                g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', y).attr('y2', y)
                    .attr('stroke', T.gridStrong).attr('stroke-dasharray', '3 3');
            });
            var bx = iw + 8;
            g.append('path').attr('fill', 'none').attr('stroke', T.overlay50).attr('stroke-width', 1.2)
                .attr('d', 'M' + (bx - 4) + ',' + cbBot + 'H' + bx + 'V' + vbTop + 'H' + (bx - 4));
            window.renderKatex(f.svg, 'E_g', f.m.left + bx + 22, f.m.top + (cbBot + vbTop) / 2,
                { width: 34, height: 20, size: 15 });
        }

        // Carriers. Region for dots: x in [0.45 iw, iw - 20].
        var x0 = iw * 0.45, x1 = iw - 20;
        function dx(i) { return x0 + (i % 5) * (x1 - x0) / 4; }
        var numFree = s.numFree;
        var numHoles = hasGap ? Math.min(numFree, 10) : 0;
        for (var d = 0; d < 15; d++) {
            var ey = vbTop + 14 + Math.floor(d / 5) * 16;
            var c = g.append('circle').attr('cx', dx(d)).attr('cy', ey).attr('r', 4);
            if (d < numHoles) c.attr('fill', 'none').attr('stroke', cH).attr('stroke-width', 1.6);
            else c.attr('fill', cV);
        }
        for (var e = 0; e < Math.min(numFree, 10); e++) {
            var fy = Math.min(14 + Math.floor(e / 5) * 16, cbBot - 6);
            g.append('circle').attr('cx', dx(e)).attr('cy', fy).attr('r', 4.5).attr('fill', cF);
        }

        // Excitation arrows across the gap.
        if (numFree > 0 && hasGap) {
            var n = Math.min(numFree, 4), cx = (x0 + x1) / 2;
            var alpha = Math.min(numFree / 5, 0.8) + 0.2;
            for (var a = 0; a < n; a++) {
                var ax = cx - (n - 1) * 8 + a * 16;
                g.append('line').attr('x1', ax).attr('x2', ax).attr('y1', vbTop - 3).attr('y2', cbBot + 4)
                    .attr('stroke', cF).attr('stroke-opacity', alpha).attr('stroke-width', 1.5).attr('stroke-dasharray', '3 3');
                g.append('path').attr('d', 'M' + (ax - 4) + ',' + (cbBot + 9) + 'L' + ax + ',' + (cbBot + 2) + 'L' + (ax + 4) + ',' + (cbBot + 9))
                    .attr('fill', 'none').attr('stroke', cF).attr('stroke-opacity', alpha).attr('stroke-width', 1.5);
            }
        }

        var lab = document.getElementById('band-label');
        if (lab) lab.innerHTML = 'energy band diagram · <b>' + cfg.label + '</b> · T = ' + Math.round(p.temp) + ' K';
    }

    window.BANDS.onRender(render);
})();
