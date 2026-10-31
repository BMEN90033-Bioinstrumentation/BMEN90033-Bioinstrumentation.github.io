// Section 04 · Photon energy against wavelength, E = hc / lambda, with the
// three LED materials marked at (lambda, E_g). Single quadrant. Material
// labels are placed by collision test against the curve, the guides of the
// selected material, the 'visible' band label and each other.
(function () {
    var sel = '#plot-emission';
    var LMIN = 350, LMAX = 1000, EMIN = 1.0, EMAX = 3.6;

    function render() {
        var L = window.LED, T = window.T, css = window.CMP.cssVar;
        var f = L.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([LMIN, LMAX]).range([0, iw]);
        var y = d3.scaleLinear().domain([EMIN, EMAX]).range([ih, 0]);

        // Visible band, 380 to 750 nm.
        g.append('rect').attr('x', x(380)).attr('y', 0).attr('width', x(750) - x(380)).attr('height', ih)
            .attr('fill', T.overlay05);
        L.axes(f, g, x, y, { xTitle: '\\lambda\\;[\\mathrm{nm}]', yTitle: 'E\\;[\\mathrm{eV}]' });
        g.append('text').attr('x', x(565)).attr('y', 18).attr('text-anchor', 'middle')
            .attr('fill', T.textDim).attr('font-size', 12).attr('font-family', "'JetBrains Mono', monospace")
            .text('visible');
        var placed = [[x(565) - 30, 4, x(565) + 30, 24]];

        var pts = d3.range(0, 301).map(function (i) {
            var lam = LMIN + (LMAX - LMIN) * i / 300; return [x(lam), y(L.HC / lam)];
        }).filter(function (q) { return q[1] >= 0; });
        g.append('path').attr('class', 'trace').attr('stroke', T.gridMax).attr('stroke-width', 2)
            .attr('d', d3.line()(pts));

        // Guides for the selected material.
        var cur = L.mat();
        var gx = x(cur.wavelength), gy = y(cur.bandgap);
        g.append('path').attr('fill', 'none').attr('stroke', css(cur.col)).attr('stroke-width', 1.2)
            .attr('stroke-dasharray', '4 4').attr('d', 'M0,' + gy + 'H' + gx + 'V' + ih);

        function hits(b) {
            var curve = pts.some(function (q) { return q[0] > b[0] - 3 && q[0] < b[2] + 3 && q[1] > b[1] - 3 && q[1] < b[3] + 3; });
            var guide = (gy > b[1] - 3 && gy < b[3] + 3 && b[0] < gx) || (gx > b[0] - 3 && gx < b[2] + 3 && b[3] > gy);
            return curve || guide || !L.clear(b, placed) || b[0] < 2 || b[2] > iw - 2 || b[1] < 2 || b[3] > ih - 2;
        }

        Object.keys(L.MATERIALS).forEach(function (k) {
            var mt = L.MATERIALS[k], c = css(mt.col), on = k === L.p.mat;
            var px = x(mt.wavelength), py = y(mt.bandgap);
            g.append('circle').attr('cx', px).attr('cy', py).attr('r', on ? 6 : 4.5)
                .attr('fill', c).attr('stroke', T.text).attr('stroke-width', on ? 1.4 : 0.8);
            var s = '\\text{' + mt.name + '}', w = mt.name.length * 9 + 14, h = 20;
            var cands = [[px + 10, py - 14 - h / 2], [px + 10, py - h / 2 - 2], [px - 10 - w, py - 14 - h / 2],
                         [px + 10, py + 6], [px - 10 - w, py + 6]];
            for (var i = 0; i < cands.length; i++) {
                var bb = [cands[i][0], cands[i][1], cands[i][0] + w, cands[i][1] + h];
                if (!hits(bb)) {
                    placed.push(bb);
                    window.renderKatex(f.svg, s, f.m.left + bb[0] + w / 2, f.m.top + bb[1] + h / 2,
                        { width: w, height: h, size: 15, color: on ? c : T.textDim });
                    break;
                }
            }
        });
    }

    window.LED.onRender(render);
})();
