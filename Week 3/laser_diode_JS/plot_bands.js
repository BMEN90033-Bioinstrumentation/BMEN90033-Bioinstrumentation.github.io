// Energy band diagram, one instance per svg[data-bands-step]. Schematic: the
// x axis is position across the device and the y axis is electron energy in
// units of E_g, with no numeric ticks. Geometry from LD.bands.
//
// Label plan (energy domain -0.55 .. 1.35 E_g):
//   E_C above E_C(p) and E_V below E_V(p), left-aligned at x = 8. E_Fc lies
//   between 0.79 and 1.03 E_g and E_Fv between -0.03 and 0.01 E_g, so the
//   15 px offsets keep both labels clear of the dashed quasi-Fermi lines.
//   E_Fc and E_Fv labels sit in the right margin, level with their lines.
//   E_g double arrow at x = 0.25 on the P side, label to its right at mid-gap,
//   at least 0.29 E_g from either quasi-Fermi level.
(function () {
    function tri(g, x, y, dir, c) {
        var a = 5, pts = dir === 'down' ? [[x, y], [x - a, y - 8], [x + a, y - 8]]
            : [[x, y], [x - a, y + 8], [x + a, y + 8]];
        g.append('polygon').attr('points', pts.map(function (q) { return q.join(','); }).join(' '))
            .attr('fill', c);
    }

    function render(el) {
        var LD = window.LD, T = window.T, css = window.CMP.cssVar;
        var step = +el.dataset.bandsStep, I = step === 0 ? 0 : LD.p.I;
        var b = LD.bands(step, I);
        var f = LD.frame(el, { margin: { top: 34, right: 58, bottom: 40, left: 46 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([0, 1]).range([0, iw]);
        var y = d3.scaleLinear().domain([-0.55, 1.35]).range([ih, 0]);
        LD.axes(f, g, x, y, { bare: true, xTitle: '\\text{position } x', yTitle: '\\text{electron energy } E' });

        // Inverted: shade the occupied band states between the edges and the
        // quasi-Fermi levels.
        if (b.qfl && b.inverted) {
            g.append('rect').attr('x', x(0.01)).attr('width', x(0.99) - x(0.01))
                .attr('y', y(b.efc)).attr('height', Math.max(0, y(b.ecN) - y(b.efc)))
                .attr('fill', css('--c-elec')).attr('fill-opacity', 0.15);
            g.append('rect').attr('x', x(0.01)).attr('width', x(0.99) - x(0.01))
                .attr('y', y(b.evP)).attr('height', Math.max(0, y(b.efv) - y(b.evP)))
                .attr('fill', css('--c-hole')).attr('fill-opacity', 0.15);
        }

        // Bands: flat, a quadratic step across the junction, flat.
        function band(e0, e1, c) {
            var pth = d3.path();
            pth.moveTo(x(0.01), y(e0));
            pth.lineTo(x(0.45), y(e0));
            pth.quadraticCurveTo(x(0.5), y(e1), x(0.55), y(e1));
            pth.lineTo(x(0.99), y(e1));
            g.append('path').attr('d', pth.toString()).attr('fill', 'none')
                .attr('stroke', c).attr('stroke-width', 2.2);
        }
        var cE = css('--c-elec'), cH = css('--c-hole'), cT = T.textDim;
        band(b.ecP, b.ecN, cE);
        band(b.evP, b.evN, cH);

        function tex(s, cx, cy, c, w, align) {
            window.renderKatex(f.svg, s, f.m.left + cx, f.m.top + cy,
                { width: w, height: 20, size: 15, color: c, align: align || 'center' });
        }
        tex('E_C', 8 + 20, y(b.ecP) - 15, cE, 40, 'left');
        tex('E_V', 8 + 20, y(b.evP) + 15, cH, 40, 'left');

        if (b.qfl) {
            [[b.efc, cE, 'E_{Fc}'], [b.efv, cH, 'E_{Fv}']].forEach(function (q) {
                g.append('line').attr('x1', x(0.01)).attr('x2', x(0.99)).attr('y1', y(q[0])).attr('y2', y(q[0]))
                    .attr('stroke', q[1]).attr('stroke-width', 1.4).attr('stroke-dasharray', '6 3').attr('stroke-opacity', 0.8);
                tex(q[2], iw + 6 + 24, y(q[0]), q[1], 48, 'left');
            });
        }

        [['p-type', 0.22, cH], ['n-type', 0.78, cE]].forEach(function (r) {
            g.append('text').attr('x', x(r[1])).attr('y', 16).attr('text-anchor', 'middle')
                .attr('fill', r[2]).attr('font-size', 13).attr('font-family', 'Inter, sans-serif')
                .attr('font-weight', 600).text(r[0]);
        });

        var bx = x(0.25);
        g.append('line').attr('x1', bx).attr('x2', bx).attr('y1', y(b.ecP) + 7).attr('y2', y(b.evP) - 7)
            .attr('stroke', cT).attr('stroke-width', 1.2);
        tri(g, bx, y(b.ecP), 'up', cT);
        tri(g, bx, y(b.evP), 'down', cT);
        tex('E_g = ' + LD.BANDGAP.toFixed(2) + '\\,\\text{eV}', bx + 8 + 64, (y(b.ecP) + y(b.evP)) / 2, cT, 128, 'left');
    }

    function renderAll() { document.querySelectorAll('svg[data-bands-step]').forEach(render); }
    window.LD.onRender(renderAll);
})();
