// Section 03 · Signed wavefunction of the focus orbital on a plane through
// the nucleus (xz: y = 0, or xy: z = 0), over +/- 4 n^2 a0 / Zeff. The
// colour gives the sign of psi and the opacity |psi|^0.6 relative to its
// peak on the plane, so nodal surfaces appear as unshaded lines.
// Four-quadrant plot: the vertical-axis title sits above the plot at x = 0
// and the horizontal-axis title to the right of the plot at the zero line.
(function () {
    var sel = '#plot-slice';
    var NPIX = 180;

    function rgb(s) {
        var c = d3.color(s);
        return c ? [c.r, c.g, c.b] : [128, 128, 128];
    }

    function render() {
        var EO = window.EO, p = EO.p, css = window.CMP.cssVar;
        var d = EO.ORBITAL_DEFS[p.focus], Z = EO.zeffOf(p.focus), L = EO.rMaxOf(d.n, Z);
        var root = d3.select(sel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect(), W = rect.width, H = rect.height || 400;
        var m = { top: 48, right: 64, bottom: 40, left: 64 };
        var side = Math.min(W - m.left - m.right, H - m.top - m.bottom);
        m.left = Math.max(64, (W - side) / 2);   // centre the square horizontally
        var svg = root.append('svg').attr('width', W).attr('height', H);
        var g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        var x = d3.scaleLinear().domain([-L, L]).range([0, side]);
        var y = d3.scaleLinear().domain([-L, L]).range([side, 0]);

        // Heat map into an off-screen canvas, placed as an SVG image.
        var cv = document.createElement('canvas');
        cv.width = NPIX; cv.height = NPIX;
        var ctx = cv.getContext('2d'), img = ctx.createImageData(NPIX, NPIX);
        var vals = new Float32Array(NPIX * NPIX), peak = 0;
        for (var j = 0; j < NPIX; j++) {
            var v2 = L - (j + 0.5) / NPIX * 2 * L;            // vertical coordinate
            for (var i = 0; i < NPIX; i++) {
                var u = -L + (i + 0.5) / NPIX * 2 * L;         // horizontal coordinate (x)
                var X = u, Y = p.plane === 'xy' ? v2 : 0, Zc = p.plane === 'xy' ? 0 : v2;
                var r = Math.sqrt(X * X + Y * Y + Zc * Zc), val = 0;
                if (r > 1e-6) val = EO.psi(d.n, d.l, d.m, r, Math.acos(Zc / r), Math.atan2(Y, X), Z);
                vals[j * NPIX + i] = val;
                if (Math.abs(val) > peak) peak = Math.abs(val);
            }
        }
        var cp = rgb(css('--c-pos')), cn = rgb(css('--c-neg'));
        for (var k = 0; k < vals.length; k++) {
            var t = peak > 0 ? vals[k] / peak : 0, c = t >= 0 ? cp : cn;
            img.data[k * 4] = c[0]; img.data[k * 4 + 1] = c[1]; img.data[k * 4 + 2] = c[2];
            img.data[k * 4 + 3] = Math.round(255 * Math.pow(Math.abs(t), 0.6));
        }
        ctx.putImageData(img, 0, 0);
        g.append('image').attr('href', cv.toDataURL()).attr('x', 0).attr('y', 0)
            .attr('width', side).attr('height', side).attr('preserveAspectRatio', 'none');

        window.CMP.drawGrid(g, x, y, side, side, { xTicks: x.ticks(5), yTicks: y.ticks(5) });
        var xa = g.append('g').attr('transform', 'translate(0,' + side + ')').call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));
        var ya = g.append('g').call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));
        [xa, ya].forEach(window.CMP.styleAxis);
        g.append('circle').attr('cx', x(0)).attr('cy', y(0)).attr('r', 3).attr('fill', window.T.text);

        var vName = p.plane === 'xy' ? 'y' : 'z';
        window.renderKatex(svg, vName + '\\;[a_0]', m.left + x(0), m.top - 22, { width: 90, height: 22, size: 16 });
        window.renderKatex(svg, 'x\\;[a_0]', m.left + side + 34, m.top + y(0), { width: 60, height: 22, size: 16 });

        var lab = document.getElementById('slice-label');
        if (lab && window.katex) {
            lab.innerHTML = 'cross-section · <b></b>';
            window.katex.render('\\psi_{' + d.tex + '}\\ \\text{on the } ' + (p.plane === 'xy' ? 'xy\\ (z = 0)' : 'xz\\ (y = 0)') + '\\text{ plane}',
                lab.querySelector('b'), { throwOnError: false });
        }
    }

    window.EO.onRender(render);
})();
