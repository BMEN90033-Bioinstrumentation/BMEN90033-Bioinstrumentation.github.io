// Section 01 · Common-emitter amplifier with fixed bias. Drawn in a fixed
// 640 x 400 viewBox; all wires orthogonal. Redrawn on parameter change only;
// instantaneous values go to the HTML readout.
//
// Layout (viewBox units):
//   BJT centre (380, 200), r = 28; collector exit y = 172, emitter y = 228.
//   Top bus y = 40 from x = 380 to the V_CC rail at x = 520.
//   R_C box x 370..390, y 80..140, labels left of it; i_C arrow y = 156.
//   V_CE bracket x = 418 (172..228), label right of it.
//   V_CC source (520, 205), r = 22, labels right of it.
//   Ground bus y = 370 from x = 100 to 520, ground symbol below x = 380.
//   Left rail x = 100: v_in source (100, 250) and V_BB source (100, 318),
//   both r = 22 with + towards the base; labels right of the rail.
//   Base wire y = 200: R_B box x 190..250, label above; i_B arrow x = 300;
//   V_BE bracket x = 342 (204..228), label left of it.
(function () {
    var sel = '#plot-circuit';
    var W = 640, H = 400;
    var bx = 380, by = 200, r = 28, topY = 40, gndY = 370, vx = 520, lx = 100;

    function css(n) { return window.CMP.cssVar(n); }

    function render() {
        var A = window.AMP, p = A.p, T = window.T, bias = A.computeDCBias();
        var wire = T.fg(0.6), ink = T.fg(0.85);
        var svg = d3.select(sel);
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 ' + W + ' ' + H).attr('preserveAspectRatio', 'xMidYMid meet');

        function line(x1, y1, x2, y2, col, w) {
            svg.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', col || wire).attr('stroke-width', w || 1.6).attr('stroke-linecap', 'round');
        }
        function tex(latex, x, y, o) { window.renderKatex(svg, latex, x, y, Object.assign({ height: 20, size: 13 }, o)); }
        function texL(latex, x, y, o) { o = Object.assign({ width: 160, align: 'left' }, o); tex(latex, x + o.width / 2, y, o); }
        function texR(latex, x, y, o) { o = Object.assign({ width: 160, align: 'right' }, o); tex(latex, x - o.width / 2, y, o); }
        function ohms(v) { return '\\text{' + A.fmtR(v).replace('Ω', '}\\Omega\\text{') + '}'; }
        function arrow(x, y, dir, col) {
            var a = 6, pts = dir === 'down' ? [[x, y + a], [x - a * 0.7, y - a], [x + a * 0.7, y - a]]
                : [[x + a, y], [x - a, y - a * 0.7], [x - a, y + a * 0.7]];
            svg.append('polygon').attr('points', pts.map(function (q) { return q.join(','); }).join(' ')).attr('fill', col);
        }
        function source(x, y, sine) {
            svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 22)
                .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
            if (sine) {
                var pts = d3.range(0, 41).map(function (i) { var t = i / 40; return [x - 13 + 26 * t, y - 7 * Math.sin(2 * Math.PI * t)]; });
                svg.append('path').attr('d', d3.line()(pts)).attr('fill', 'none').attr('stroke', ink).attr('stroke-width', 1.4);
            } else {
                tex('+', x, y - 10, { width: 16, height: 16 });
                tex('-', x, y + 10, { width: 16, height: 16 });
            }
        }
        function bracket(x, y1, y2, side, col) {
            svg.append('path').attr('fill', 'none').attr('stroke', col).attr('stroke-width', 1.2)
                .attr('d', 'M' + (x - 6 * side) + ',' + y1 + 'H' + x + 'V' + y2 + 'H' + (x - 6 * side));
        }

        var cIb = css('--c-ib'), cIc = css('--c-ic'), cVce = css('--c-vce'), cVbe = css('--c-vbe');

        // ── Collector side ──
        line(bx, topY, vx, topY);
        line(bx, topY, bx, 80);
        svg.append('rect').attr('x', bx - 10).attr('y', 80).attr('width', 20).attr('height', 60)
            .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
        texR('R_C', bx - 18, 101);
        texR(ohms(p.rc), bx - 18, 120, { size: 12, color: T.textDim });
        line(bx, 140, bx, by - r);
        arrow(bx, 156, 'down', cIc);
        texL('i_C', bx + 12, 156, { width: 40, color: cIc });
        line(bx, by + r, bx, gndY);

        // ── BJT symbol (diagonal leads are part of the symbol) ──
        svg.append('circle').attr('cx', bx).attr('cy', by).attr('r', r)
            .attr('fill', 'none').attr('stroke', T.fg(0.3)).attr('stroke-width', 1.2);
        var barX = bx - r * 0.4, barH = r * 0.6, yUp = by - barH * 0.45, yDn = by + barH * 0.45;
        line(bx - r, by, barX, by, cIb, 2);
        line(barX, by - barH, barX, by + barH, ink, 3);
        line(barX, yUp, bx, by - r, cIc, 1.8);
        line(barX, yDn, bx, by + r, ink, 1.8);
        var dx = bx - barX, dy = by + r - yDn, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, a = 8;
        var tip = [bx, by + r];
        svg.append('polygon').attr('fill', ink).attr('points', [tip,
            [tip[0] - ux * a - uy * a * 0.45, tip[1] - uy * a + ux * a * 0.45],
            [tip[0] - ux * a + uy * a * 0.45, tip[1] - uy * a - ux * a * 0.45]
        ].map(function (q) { return q.join(','); }).join(' '));

        bracket(418, by - r, by + r, 1, cVce);
        tex('+', 426, by - r + 8, { width: 14, height: 14, size: 12, color: cVce });
        tex('-', 426, by + r - 8, { width: 14, height: 14, size: 12, color: cVce });
        texL('V_{CE}', 436, by, { width: 60, color: cVce });

        // ── V_CC ──
        line(vx, topY, vx, 183);
        source(vx, 205, false);
        line(vx, 227, vx, gndY);
        texL('V_{CC}', vx + 32, 196);
        texL('\\text{' + p.vcc.toFixed(1) + ' V}', vx + 32, 215, { size: 12, color: T.textDim });

        // ── Ground ──
        line(lx, gndY, vx, gndY);
        line(bx, gndY, bx, gndY + 10);
        [12, 8, 4].forEach(function (hw, i) { line(bx - hw, gndY + 10 + i * 5, bx + hw, gndY + 10 + i * 5, wire, 1.6); });
        svg.append('circle').attr('cx', bx).attr('cy', gndY).attr('r', 3).attr('fill', ink);

        // ── Base loop: ground, V_BB, v_in, R_B, base ──
        line(lx, gndY, lx, 340);
        source(lx, 318, false);
        line(lx, 296, lx, 272);
        source(lx, 250, true);
        tex('+', lx - 32, 236, { width: 14, height: 14, size: 12 });
        tex('-', lx - 32, 264, { width: 14, height: 14, size: 12 });
        line(lx, 228, lx, by);
        texL('v_\\text{in}(t)', lx + 32, 242);
        texL('\\text{' + p.vin.toFixed(0) + ' mV peak}', lx + 32, 261, { size: 12, color: T.textDim });
        texL('V_{BB}', lx + 32, 310);
        texL('\\text{' + p.vbb.toFixed(1) + ' V}', lx + 32, 329, { size: 12, color: T.textDim });

        line(lx, by, 190, by);
        svg.append('rect').attr('x', 190).attr('y', by - 10).attr('width', 60).attr('height', 20)
            .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
        tex('R_B = ' + ohms(p.rb), 220, by - 24, { width: 160 });
        line(250, by, bx - r, by);
        arrow(300, by, 'right', cIb);
        tex('i_B', 300, by - 18, { width: 30, color: cIb });

        bracket(342, by + 4, by + r, -1, cVbe);
        texR('V_{BE}', 334, by + 16, { width: 60, color: cVbe });

        var lab = document.getElementById('circuit-label');
        if (lab) lab.innerHTML = 'circuit · <b>common-emitter amplifier, fixed bias</b> · ' + bias.region;
    }

    window.AMP.onRender(render);
    // The live readout under the circuit needs the animation clock.
    window.AMP.watch(document.querySelector(sel));
})();
