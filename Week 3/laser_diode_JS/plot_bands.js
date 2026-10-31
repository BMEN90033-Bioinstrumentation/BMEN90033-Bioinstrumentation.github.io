// Energy band diagram, one instance per svg[data-bands-step]. Quantitative:
// energies in eV from LD.bands, with the N side q(V0 - V_j) below the P side.
// Under injection the quasi-Fermi levels E_Fc and E_Fv are drawn across the
// device, separated by qV_j.
(function () {
    var NS = window.LD;

    function tri(g, x, y, dir, c) {
        var a = 5, pts = dir === 'down' ? [[x, y], [x - a, y - 8], [x + a, y - 8]]
            : [[x, y], [x - a, y + 8], [x + a, y + 8]];
        g.append('polygon').attr('points', pts.map(function (q) { return q.join(','); }).join(' '))
            .attr('fill', c);
    }

    // ── Quantitative band diagram ──
    // d: { eg, off, efp, efn (eV, from the P-side valence band), df (depletion
    // half-width as a fraction of the width), fullQfl (quasi-Fermi levels
    // across the whole device), names: [n-side label, p-side label],
    // arrow: { x (px offset from the junction), e0, e1 (eV), col } }.
    // Energy axis in eV with ticks; position axis schematic. Every label is
    // placed at the first candidate box that no drawn line, other label or
    // plot edge enters; a quasi-Fermi label with no free candidate is left to
    // the legend.
    function drawBands(el, d) {
        var T = window.T, css = window.CMP.cssVar;
        var f = NS.frame(el, { margin: { top: 34, right: 20, bottom: 44, left: 64 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        if (ih <= 0 || iw <= 0) return;   // not laid out yet
        var ecP = d.eg, evP = 0, ecN = d.eg - d.off, evN = -d.off;
        var lo = Math.min(evN, evP, d.efp, d.efn), hi = Math.max(ecP, ecN, d.efp, d.efn), span = hi - lo;
        var x = d3.scaleLinear().domain([0, 1]).range([0, iw]);
        var y = d3.scaleLinear().domain([lo - 0.16 * span, hi + 0.3 * span]).range([ih, 0]).nice(5);

        var df = Math.max(d.df * 1.5, 0.04);
        var dl = x(0.5 - df), dr = x(0.5 + df), mid = x(0.5);
        if (d.shade) g.append('rect').attr('x', dl).attr('y', 0).attr('width', dr - dl).attr('height', ih)
            .attr('fill', T.overlay05);

        // Energy grid, ticked energy axis, plain position axis.
        var yt = y.ticks(5);
        g.append('g').selectAll('line').data(yt).join('line')
            .attr('x1', 0).attr('x2', iw).attr('y1', y).attr('y2', y)
            .attr('stroke', css('--grid-line'));
        var ya = g.append('g').call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));
        window.CMP.styleAxis(ya);
        g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ih).attr('y2', ih)
            .attr('stroke', T.gridAxis).attr('stroke-width', 1.2);
        window.renderKatex(f.svg, 'E\\;[\\mathrm{eV}]', 18, f.m.top + ih / 2,
            { width: 160, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, '\\text{position } x', f.m.left + iw / 2, f.H - 16,
            { width: 200, height: 22, size: 16 });

        var nodes = [];
        function band(e0, e1, c) {
            var pth = d3.path();
            pth.moveTo(x(0.01), y(e0));
            pth.lineTo(dl, y(e0));
            pth.bezierCurveTo(mid - 5, y(e0), mid + 5, y(e1), dr, y(e1));
            pth.lineTo(x(0.99), y(e1));
            nodes.push(g.append('path').attr('d', pth.toString()).attr('fill', 'none')
                .attr('stroke', c).attr('stroke-width', 2.2).node());
        }
        var cE = css('--c-elec'), cH = css('--c-hole'), cT = T.textDim;
        band(ecP, ecN, cE);
        band(evP, evN, cH);

        function dash(x0, x1, e, c) {
            nodes.push(g.append('line').attr('x1', x0).attr('x2', x1).attr('y1', y(e)).attr('y2', y(e))
                .attr('stroke', c).attr('stroke-width', 1.4).attr('stroke-dasharray', '5 4').node());
        }
        var split = Math.abs(d.efn - d.efp) > 1e-6;
        if (!split) dash(x(0.01), x(0.99), d.efp, T.gridMax);
        else if (d.fullQfl) { dash(x(0.01), x(0.99), d.efn, cE); dash(x(0.01), x(0.99), d.efp, cH); }
        else { dash(x(0.01), mid, d.efp, cH); dash(mid, x(0.99), d.efn, cE); }

        if (d.arrow) {
            var a = d.arrow, ax = mid + a.x, ya0 = y(a.e0), ya1 = y(a.e1), up = ya1 < ya0;
            nodes.push(g.append('line').attr('x1', ax).attr('x2', ax).attr('y1', ya0)
                .attr('y2', ya1 + (up ? 7 : -7)).attr('stroke', a.col).attr('stroke-width', 1.6)
                .attr('stroke-dasharray', '3 3').node());
            tri(g, ax, ya1, up ? 'up' : 'down', a.col);
        }

        var bx = iw - 64, gap = y(evN) - y(ecN);
        nodes.push(g.append('line').attr('x1', bx).attr('x2', bx).attr('y1', y(ecN) + (gap > 18 ? 7 : 0))
            .attr('y2', y(evN) - (gap > 18 ? 7 : 0)).attr('stroke', cT).attr('stroke-width', 1.2).node());
        if (gap > 18) { tri(g, bx, y(ecN), 'up', cT); tri(g, bx, y(evN), 'down', cT); }

        // Collision geometry: points along every line, plus placed boxes.
        var pts = [];
        nodes.forEach(function (n) {
            var L = n.getTotalLength();
            for (var i = 0; i <= 300; i++) { var q = n.getPointAtLength(L * i / 300); pts.push([q.x, q.y]); }
        });
        var placed = [];
        [['p-type', 0.22, cH], ['n-type', 0.78, cE]].forEach(function (r) {
            g.append('text').attr('x', x(r[1])).attr('y', 16).attr('text-anchor', 'middle')
                .attr('fill', r[2]).attr('font-size', 13).attr('font-family', 'Inter, sans-serif')
                .attr('font-weight', 600).text(r[0]);
            placed.push([x(r[1]) - 28, 2, x(r[1]) + 28, 22]);
        });
        function free(b) {
            if (b[0] < 2 || b[2] > iw - 2 || b[1] < 2 || b[3] > ih - 2) return false;
            if (!NS.clear(b, placed)) return false;
            return !pts.some(function (q) { return q[0] > b[0] - 2 && q[0] < b[2] + 2 && q[1] > b[1] - 2 && q[1] < b[3] + 2; });
        }
        // cands: [left edge, vertical centre]; returns true when placed.
        function place(s, w, c, cands) {
            for (var i = 0; i < cands.length; i++) {
                var b = [cands[i][0], cands[i][1] - 10, cands[i][0] + w, cands[i][1] + 10];
                if (free(b)) {
                    placed.push(b);
                    window.renderKatex(f.svg, s, f.m.left + b[0] + w / 2, f.m.top + cands[i][1],
                        { width: w, height: 20, size: 15, color: c });
                    return true;
                }
            }
            return false;
        }
        function around(x0, e) { return [[x0, y(e) - 13], [x0, y(e) + 13]]; }

        place('E_C', 34, cE, around(8, ecP).concat(around(x(0.12), ecP)));
        place('E_V', 34, cH, around(8, evP).reverse().concat(around(x(0.12), evP).reverse()));
        if (!split) place('E_F', 34, cT, around(8, d.efp).concat(around(x(0.12), d.efp), around(x(0.3), d.efp)));
        else {
            var nm = d.names || ['E_{Fn}', 'E_{Fp}'];
            place(nm[1], 44, cH, around(8, d.efp).concat(around(x(0.12), d.efp), around(x(0.3), d.efp)));
            var xr = iw - 8 - 44;
            place(nm[0], 44, cE, around(xr, d.efn).reverse().concat(around(xr - 60, d.efn).reverse(), around(x(0.62), d.efn)));
        }
        if (d.arrow) {
            var aCands = [];
            [0.5, 0.35, 0.65, 0.2, 0.8].forEach(function (t) {
                var yy = ya1 + (ya0 - ya1) * t;
                aCands.push([ax + 6, yy], [ax - 40, yy]);
            });
            // Beyond the ends of a short arrow.
            aCands.push([ax + 8, ya1 + (up ? -14 : 14)], [ax - 42, ya1 + (up ? -14 : 14)],
                        [ax + 8, ya0 + (up ? 14 : -14)], [ax - 42, ya0 + (up ? 14 : -14)]);
            place('h\\nu', 34, d.arrow.col, aCands);
        }
        var full = 'E_g = ' + d.eg.toFixed(2) + '\\,\\text{eV}', gm = (y(ecN) + y(evN)) / 2;
        var eCands = [[bx - 8 - 128, gm], [bx - 8 - 128, y(ecN) - 14], [bx - 8 - 128, y(evN) + 14]];
        if (!place(full, 128, cT, eCands)) place('E_g', 30, cT, eCands.map(function (c) { return [bx - 8 - 30, c[1]]; }));
    }

    function render(el) {
        var step = +el.dataset.bandsStep, b = NS.bands(step, step === 0 ? 0 : NS.p.I);
        drawBands(el, {
            eg: b.eg, off: b.off, efp: b.efv, efn: b.efc, shade: false, df: 0.03,
            fullQfl: true, names: ['E_{Fc}', 'E_{Fv}']
        });
    }

    function renderAll() { document.querySelectorAll('svg[data-bands-step]').forEach(render); }
    NS.onRender(renderAll);
})();
