// Energy band diagram, one instance per svg[data-bands-step]. Schematic: the
// x axis is position across the device and the y axis is electron energy in
// units of E_g (no numeric ticks). Geometry comes from LED.bands, ported from
// the band strip of the original canvas.
//
// Label plan (inner plot coordinates, energy domain -0.85 .. 1.3 E_g):
//   left column, left-aligned at x = 8:  E_C below E_C(p), E_Fp above E_Fp,
//     E_V below E_V(p). The gaps are 5/6 E_g, 1/6 E_g and the bottom margin.
//   right column, right-aligned at iw - 8: E_Fn below E_Fn (5/6 E_g to E_V(n)).
//   E_g double arrow at x = iw - 64 from E_C(n) to E_V(n); its label sits to
//   the left at mid-gap, shortened to E_g alone if it would meet the h nu label.
//   h nu arrow at the junction + 10 px; its label sits left of the arrow.
(function () {
    function tri(g, x, y, dir, c) {
        var a = 5, pts = dir === 'down' ? [[x, y], [x - a, y - 8], [x + a, y - 8]]
            : [[x, y], [x - a, y + 8], [x + a, y + 8]];
        g.append('polygon').attr('points', pts.map(function (q) { return q.join(','); }).join(' '))
            .attr('fill', c);
    }

    function render(el) {
        var L = window.LED, T = window.T, css = window.CMP.cssVar;
        var step = +el.dataset.bandsStep, m = L.mat();
        var v = step === 0 ? 0 : L.p[el.dataset.vparam];
        var b = L.bands(step, v, m);
        var f = L.frame(el, { margin: { top: 34, right: 20, bottom: 40, left: 46 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([0, 1]).range([0, iw]);
        var y = d3.scaleLinear().domain([-0.85, 1.3]).range([ih, 0]);

        // Depletion region shading.
        var df = L.deplFrac(step, v, m) * 1.5;
        var dl = x(0.5 - df), dr = x(0.5 + df), mid = x(0.5);
        g.append('rect').attr('x', dl).attr('y', 0).attr('width', dr - dl).attr('height', ih)
            .attr('fill', T.overlay05);

        L.axes(f, g, x, y, { bare: true, xTitle: '\\text{position } x', yTitle: '\\text{electron energy } E' });

        // E_C and E_V with the transition through the depletion region.
        function band(e0, e1, c) {
            var pth = d3.path();
            pth.moveTo(x(0.01), y(e0));
            pth.lineTo(dl, y(e0));
            pth.bezierCurveTo(mid - 5, y(e0), mid + 5, y(e1), dr, y(e1));
            pth.lineTo(x(0.99), y(e1));
            g.append('path').attr('d', pth.toString()).attr('fill', 'none')
                .attr('stroke', c).attr('stroke-width', 2.2);
        }
        var cE = css('--c-elec'), cH = css('--c-hole');
        band(b.ecP, b.ecN, cE);
        band(b.evP, b.evN, cH);

        // (Quasi-)Fermi levels: one flat level at equilibrium, split under bias.
        g.append('path').attr('fill', 'none').attr('stroke', T.gridMax).attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '5 4')
            .attr('d', 'M' + x(0.01) + ',' + y(b.efP) + 'H' + mid + 'M' + mid + ',' + y(b.efN) + 'H' + x(0.99));

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
        texL(split ? 'E_{Fp}' : 'E_F', 8, y(b.efP) - 12, T.textDim, 50);
        if (split) texR('E_{Fn}', iw - 8, y(b.efN) + 13, T.textDim, 50);

        // Region names inside the top of the plot, above E_C(p).
        [['p-type', 0.22, cH], ['n-type', 0.78, cE]].forEach(function (r) {
            g.append('text').attr('x', x(r[1])).attr('y', 16).attr('text-anchor', 'middle')
                .attr('fill', r[2]).attr('font-size', 13).attr('font-family', 'Inter, sans-serif')
                .attr('font-weight', 600).text(r[0]);
        });

        // Recombination: electron drops from E_C(n) to E_V(n), emitting h nu.
        var boxes = [];
        var gm = (y(b.ecN) + y(b.evN)) / 2;
        if (step >= 2 && L.exceeded(v, m)) {
            var ax = mid + 10, pc = css(m.col);
            g.append('line').attr('x1', ax).attr('x2', ax).attr('y1', y(b.ecN)).attr('y2', y(b.evN) - 7)
                .attr('stroke', pc).attr('stroke-width', 1.6).attr('stroke-dasharray', '3 3');
            tri(g, ax, y(b.evN), 'down', pc);
            texR('h\\nu', ax - 8, gm, pc, 34);
            boxes.push([ax - 42, gm - 10, ax + 6, gm + 10]);
        }

        // E_g bracket on the N side.
        var bx = iw - 64, cT = T.textDim;
        g.append('line').attr('x1', bx).attr('x2', bx).attr('y1', y(b.ecN) + 7).attr('y2', y(b.evN) - 7)
            .attr('stroke', cT).attr('stroke-width', 1.2);
        tri(g, bx, y(b.ecN), 'up', cT);
        tri(g, bx, y(b.evN), 'down', cT);
        var full = 'E_g = ' + m.bandgap.toFixed(2) + '\\,\\text{eV}', fw = 128;
        if (window.LED.clear([bx - 8 - fw, gm - 10, bx - 8, gm + 10], boxes)) texR(full, bx - 8, gm, cT, fw);
        else texR('E_g', bx - 8, gm, cT, 30);
    }

    function renderAll() { document.querySelectorAll('svg[data-bands-step]').forEach(render); }
    window.LED.onRender(renderAll);
})();
