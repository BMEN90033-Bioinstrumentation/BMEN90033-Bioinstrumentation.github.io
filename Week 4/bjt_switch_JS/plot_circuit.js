// Section 01 · Switch schematic (NPN low-side or PNP high-side) with live
// branch currents. Drawn in a fixed 640 x 400 viewBox so the layout scales
// as one unit; all wires are orthogonal.
//
// Layout (viewBox units):
//   BJT centre (420, 200), r = 28. Collector/emitter rail at x = 420.
//   V_CC bar at y = 40, ground at y = 350.
//   Base loop: source at (110, 270) -> up to y = 200 -> R_B box x 250..320 -> base.
//   Current labels sit right of the rail; V_CE bracket at x = 462.
(function () {
    var sel = '#plot-circuit';
    var W = 640, H = 400;
    var bx = 420, by = 200, r = 28;
    var srcX = 110, srcY = 270, srcR = 22;
    var gndY = 350, vccY = 40;

    function css(n) { return window.CMP.cssVar(n); }

    function render() {
        var B = window.BJT, p = B.p, s = B.compute(p.vin);
        var T = window.T, npn = p.type === 'NPN';
        var wire = T.fg(0.6), ink = T.fg(0.85);

        var svg = d3.select(sel);
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 ' + W + ' ' + H).attr('preserveAspectRatio', 'xMidYMid meet');

        function line(x1, y1, x2, y2, col, w) {
            svg.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', col || wire).attr('stroke-width', w || 1.6).attr('stroke-linecap', 'round');
        }
        function tex(latex, x, y, o) { window.renderKatex(svg, latex, x, y, o); }
        // Text whose left edge sits at x.
        function texL(latex, x, y, o) {
            o = Object.assign({ width: 180, height: 20, size: 13, align: 'left' }, o);
            tex(latex, x + o.width / 2, y, o);
        }
        // Text whose right edge sits at x.
        function texR(latex, x, y, o) {
            o = Object.assign({ width: 120, height: 20, size: 13, align: 'right' }, o);
            tex(latex, x - o.width / 2, y, o);
        }
        function resistorV(x, y1, y2, name) {
            svg.append('rect').attr('x', x - 10).attr('y', y1).attr('width', 20).attr('height', y2 - y1)
                .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
            texR(name, x - 18, (y1 + y2) / 2 - 10);
            texR('\\text{' + B.fmtR(p.rl).replace('Ω', '}\\Omega\\text{') + '}', x - 18, (y1 + y2) / 2 + 10,
                { size: 12, color: T.textDim });
        }
        function ground(x, y) {
            [12, 8, 4].forEach(function (hw, i) { line(x - hw, y + i * 5, x + hw, y + i * 5, wire, 1.6); });
        }
        // Filled arrowhead on a wire, pointing in direction dir.
        function arrow(x, y, dir, col) {
            var a = 6, pts;
            if (dir === 'down') pts = [[x, y + a], [x - a * 0.7, y - a], [x + a * 0.7, y - a]];
            else if (dir === 'right') pts = [[x + a, y], [x - a, y - a * 0.7], [x - a, y + a * 0.7]];
            else pts = [[x - a, y], [x + a, y - a * 0.7], [x + a, y + a * 0.7]];
            svg.append('polygon').attr('points', pts.map(function (q) { return q.join(','); }).join(' '))
                .attr('fill', col);
        }

        var cIb = css('--c-ib'), cIc = css('--c-ic'), cIe = css('--c-ie'), cV = css('--c-vce');

        // ── Supply rail ──
        line(bx - 16, vccY, bx + 16, vccY, ink, 2);
        tex('V_{CC} = ' + p.vcc.toFixed(1) + '\\,\\text{V}', bx, vccY - 18, { width: 160, height: 20, size: 13 });

        // ── Collector / emitter rail ──
        var top = by - r, bot = by + r;
        if (npn) {
            line(bx, vccY, bx, 70);
            resistorV(bx, 70, 130, 'R_L');
            line(bx, 130, bx, top);
            arrow(bx, 151, 'down', cIc);
            texL('I_C = ' + B.fmtI(s.ic), bx + 14, 151, { color: cIc });
            line(bx, bot, bx, gndY);
            arrow(bx, 290, 'down', cIe);
            texL('I_E = ' + B.fmtI(s.ie), bx + 14, 290, { color: cIe });
        } else {
            line(bx, vccY, bx, top);
            arrow(bx, 106, 'down', cIe);
            texL('I_E = ' + B.fmtI(s.ie), bx + 14, 106, { color: cIe });
            line(bx, bot, bx, 270);
            arrow(bx, 254, 'down', cIc);
            texL('I_C = ' + B.fmtI(s.ic), bx + 14, 254, { color: cIc });
            resistorV(bx, 270, 330, 'R_L');
            line(bx, 330, bx, gndY);
        }
        ground(bx, gndY);

        // ── BJT symbol ──
        svg.append('circle').attr('cx', bx).attr('cy', by).attr('r', r)
            .attr('fill', 'none').attr('stroke', T.fg(0.3)).attr('stroke-width', 1.2);
        var barX = bx - r * 0.4, barH = r * 0.6;
        line(bx - r, by, barX, by, ink, 2);
        line(barX, by - barH, barX, by + barH, ink, 3);
        // Leads from the bar to the top / bottom of the circle (diagonal by
        // definition of the symbol).
        var yUp = by - barH * 0.45, yDn = by + barH * 0.45;
        line(barX, yUp, bx, top, ink, 1.8);
        line(barX, yDn, bx, bot, ink, 1.8);
        // Emitter arrow: NPN outward on the lower lead, PNP inward on the upper lead.
        var tip, from;
        if (npn) { tip = [bx, bot]; from = [barX, yDn]; }
        else { tip = [barX, yUp]; from = [bx, top]; }
        var dx = tip[0] - from[0], dy = tip[1] - from[1], L = Math.hypot(dx, dy);
        var ux = dx / L, uy = dy / L, a = 8;
        svg.append('polygon').attr('fill', ink).attr('points', [
            tip,
            [tip[0] - ux * a - uy * a * 0.45, tip[1] - uy * a + ux * a * 0.45],
            [tip[0] - ux * a + uy * a * 0.45, tip[1] - uy * a - ux * a * 0.45]
        ].map(function (q) { return q.join(','); }).join(' '));
        texL('\\text{' + (npn ? 'C' : 'E') + '}', bx + 6, top - 4, { width: 20, size: 12, color: T.textDim });
        texL('\\text{' + (npn ? 'E' : 'C') + '}', bx + 6, bot + 6, { width: 20, size: 12, color: T.textDim });

        // ── V_CE bracket ──
        var xb = 462;
        svg.append('path').attr('fill', 'none').attr('stroke', cV).attr('stroke-width', 1.2)
            .attr('d', 'M' + (xb - 6) + ',' + top + 'H' + xb + 'V' + bot + 'H' + (xb - 6));
        texL((npn ? 'V_{CE}' : 'V_{EC}') + ' = ' + s.vce.toFixed(2) + '\\,\\text{V}', xb + 8, by,
            { width: 150, color: cV });

        // ── Base loop ──
        line(bx - r, by, 320, by);
        svg.append('rect').attr('x', 250).attr('y', by - 10).attr('width', 70).attr('height', 20)
            .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
        tex('R_B', 285, by - 24, { width: 40, height: 20, size: 13 });
        tex('\\text{' + B.fmtR(p.rb).replace('Ω', '}\\Omega\\text{') + '}', 285, by + 24,
            { width: 80, height: 20, size: 12, color: T.textDim });
        texR('\\text{B}', bx - r - 4, by - 12, { width: 20, size: 12, color: T.textDim });
        line(250, by, srcX, by);
        line(srcX, by, srcX, srcY - srcR);
        arrow(180, by, npn ? 'right' : 'left', cIb);
        tex('I_B = ' + B.fmtI(s.ib), 180, by - 20, { width: 140, height: 20, size: 13, color: cIb });

        // Source: + at the top terminal (towards the base), - at ground.
        svg.append('circle').attr('cx', srcX).attr('cy', srcY).attr('r', srcR)
            .attr('fill', 'none').attr('stroke', ink).attr('stroke-width', 1.6);
        tex('+', srcX, srcY - 10, { width: 16, height: 16, size: 13 });
        tex('-', srcX, srcY + 10, { width: 16, height: 16, size: 13 });
        texL('v_\\text{in} = ' + p.vin.toFixed(1) + '\\,\\text{V}', srcX + srcR + 10, srcY, { width: 140 });
        line(srcX, srcY + srcR, srcX, gndY);
        ground(srcX, gndY);

        // Plot-box label reflects type and region.
        var lab = document.getElementById('circuit-label');
        if (lab) lab.innerHTML = 'circuit · <b>' + (npn ? 'NPN low-side switch' : 'PNP high-side switch') +
            '</b> · ' + s.region;
    }

    window.BJT.onRender(render);
})();
