// Energy band diagram, one instance per svg[data-bands-step]. Schematic: the
// x axis is position and the y axis electron energy in units of E_g, no
// numeric ticks. Geometry from PD.bands; step 0 is unbiased, step 2 adds
// the absorption arrow.
//
// Label plan (energy domain -1.5 .. 1.3 E_g):
//   left column, left-aligned at x = 8: E_C below E_C(p), E_F or E_Fp above
//     E_Fp (E_g / 6 above E_V(p)), E_V below E_V(p).
//   right column, right-aligned at iw - 8: E_Fn below E_Fn (5/6 E_g to E_V(n)).
//   E_g double arrow at x = iw - 64 on the N side; label to its left at
//     mid-gap, shortened to E_g alone if it would meet the h nu label.
//   h nu arrow at the junction from the mean valence-band level to the mean
//     conduction-band level; its label is placed by collision test against
//     the quasi-Fermi segments, which can cross mid-gap at the junction.
(function () {
    function tri(g, x, y, dir, c) {
        var a = 5, pts = dir === 'down' ? [[x, y], [x - a, y - 8], [x + a, y - 8]]
            : [[x, y], [x - a, y + 8], [x + a, y + 8]];
        g.append('polygon').attr('points', pts.map(function (q) { return q.join(','); }).join(' '))
            .attr('fill', c);
    }

    function render(el) {
        var PD = window.PD, T = window.T, css = window.CMP.cssVar;
        var step = +el.dataset.bandsStep, m = PD.mat();
        var vr = step === 0 ? 0 : PD.p.vr;
        var b = PD.bands(vr);
        var f = PD.frame(el, { margin: { top: 34, right: 20, bottom: 40, left: 46 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([0, 1]).range([0, iw]);
        var y = d3.scaleLinear().domain([-1.5, 1.3]).range([ih, 0]);

        var df = PD.deplFrac(vr) * 1.5;
        var dl = x(0.5 - df), dr = x(0.5 + df), mid = x(0.5);
        g.append('rect').attr('x', dl).attr('y', 0).attr('width', dr - dl).attr('height', ih)
            .attr('fill', T.overlay05);
        PD.axes(f, g, x, y, { bare: true, xTitle: '\\text{position } x', yTitle: '\\text{electron energy } E' });

        function band(e0, e1, c) {
            var pth = d3.path();
            pth.moveTo(x(0.01), y(e0));
            pth.lineTo(dl, y(e0));
            pth.bezierCurveTo(mid - 5, y(e0), mid + 5, y(e1), dr, y(e1));
            pth.lineTo(x(0.99), y(e1));
            lines.push(g.append('path').attr('d', pth.toString()).attr('fill', 'none')
                .attr('stroke', c).attr('stroke-width', 2.2).node());
        }
        var lines = [];
        var cE = css('--c-elec'), cH = css('--c-hole'), cT = T.textDim;
        band(b.ecP, b.ecN, cE);
        band(b.evP, b.evN, cH);

        lines.push(g.append('path').attr('fill', 'none').attr('stroke', T.gridMax).attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '5 4')
            .attr('d', 'M' + x(0.01) + ',' + y(b.efP) + 'H' + mid + 'M' + mid + ',' + y(b.efN) + 'H' + x(0.99)).node());
        // Points along every drawn line, for label collision tests.
        var pts = [];
        lines.forEach(function (n) {
            var L = n.getTotalLength();
            for (var i = 0; i <= 400; i++) { var q = n.getPointAtLength(L * i / 400); pts.push([q.x, q.y]); }
        });
        function onLine(bb) {
            return pts.some(function (q) { return q[0] > bb[0] - 2 && q[0] < bb[2] + 2 && q[1] > bb[1] - 2 && q[1] < bb[3] + 2; });
        }

        var split = Math.abs(b.efN - b.efP) > 1e-6;
        function texL(s, x0, y0, c, w) {
            window.renderKatex(f.svg, s, f.m.left + x0 + w / 2, f.m.top + y0,
                { width: w, height: 20, size: 15, color: c, align: 'left' });
        }
        function texR(s, x1, y0, c, w) {
            window.renderKatex(f.svg, s, f.m.left + x1 - w / 2, f.m.top + y0,
                { width: w, height: 20, size: 15, color: c, align: 'right' });
        }
        texL('E_C', 8, y(b.ecP) + 13, cE, 40);
        texL('E_V', 8, y(b.evP) + 13, cH, 40);
        texL(split ? 'E_{Fp}' : 'E_F', 8, y(b.efP) - 12, cT, 50);
        if (split) texR('E_{Fn}', iw - 8, y(b.efN) + 13, cT, 50);

        [['p-type', 0.22, cH], ['n-type', 0.78, cE]].forEach(function (r) {
            g.append('text').attr('x', x(r[1])).attr('y', 16).attr('text-anchor', 'middle')
                .attr('fill', r[2]).attr('font-size', 13).attr('font-family', 'Inter, sans-serif')
                .attr('font-weight', 600).text(r[0]);
        });

        // Absorption: an electron is lifted from the valence to the
        // conduction band at the junction.
        var boxes = [], gm = (y(b.ecN) + y(b.evN)) / 2;
        if (step >= 2 && PD.p.light > 0) {
            var pc = css(m.col);
            var yv = y((b.evP + b.evN) / 2), yc = y((b.ecP + b.ecN) / 2), ym = (yv + yc) / 2;
            g.append('line').attr('x1', mid).attr('x2', mid).attr('y1', yv).attr('y2', yc + 7)
                .attr('stroke', pc).attr('stroke-width', 1.6).attr('stroke-dasharray', '3 3');
            tri(g, mid, yc, 'up', pc);
            // The label is tried along the arrow, right then left, and placed
            // at the first box that no band or quasi-Fermi line enters.
            var bb;
            [0.5, 0.35, 0.65, 0.2, 0.8].some(function (t) {
                var yy = yc + (yv - yc) * t;
                return [mid + 6, mid - 40].some(function (x0) {
                    bb = [x0, yy - 10, x0 + 34, yy + 10];
                    return !onLine(bb);
                });
            });
            texL('h\\nu', bb[0], (bb[1] + bb[3]) / 2, pc, 34);
            boxes.push(bb);
        }

        var bx = iw - 64;
        g.append('line').attr('x1', bx).attr('x2', bx).attr('y1', y(b.ecN) + 7).attr('y2', y(b.evN) - 7)
            .attr('stroke', cT).attr('stroke-width', 1.2);
        tri(g, bx, y(b.ecN), 'up', cT);
        tri(g, bx, y(b.evN), 'down', cT);
        var fw = 128;
        var eb = [bx - 8 - fw, gm - 10, bx - 8, gm + 10];
        if (PD.clear(eb, boxes) && !onLine(eb)) {
            texR('E_g = ' + m.bandgap.toFixed(2) + '\\,\\text{eV}', bx - 8, gm, cT, fw);
        } else texR('E_g', bx - 8, gm, cT, 30);
    }

    function renderAll() { document.querySelectorAll('svg[data-bands-step]').forEach(render); }
    window.PD.onRender(renderAll);
})();
