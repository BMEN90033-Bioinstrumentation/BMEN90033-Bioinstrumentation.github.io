// Section 01 · Common-emitter amplifier with voltage-divider bias and the
// schematic node numbers. Fixed 780 x 420 viewBox; all wires orthogonal.
//
// Layout (viewBox units):
//   V_CC rail y = 50 (x 300..480). Grounds at y = 380.
//   Source (70, 300), r = 22 -> y = 230 -> R_S x 110..170 -> node 5 (195)
//     -> C_C1 plates x 226 / 236 -> base node 1 (300, 230) -> BJT base x = 452.
//   R_B1 x = 300, y 80..140; R_B2 x = 300, y 280..340.
//   R_C x = 480, y 80..140; collector node 3 (480, 172); BJT centre (480, 230), r = 28.
//   Emitter node 2 (480, 284); R_E y 300..350; C_E at x = 560, plates y 322 / 332.
//   C_C2 plates x 610 / 620 on y = 172; node 6 (690, 172); R_L x = 690, y 220..280.
//   Component names left of vertical parts (right for C_E and R_L), above
//   horizontal parts; values on the line below or beneath the part.
(function () {
    var sel = '#plot-circuit';
    var W = 780, H = 420;

    function render() {
        var L = window.LCA, p = L.p, T = window.T;
        var svg = d3.select(sel);
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 ' + W + ' ' + H).attr('preserveAspectRatio', 'xMidYMid meet');
        var S = L.schem(svg), dim = { size: 14.5, color: T.textDim };
        var bx = 480, by = 230, r = 28, gnd = 380;

        // Supply rail and bias divider.
        S.line(300, 50, bx, 50, S.ink, 2);
        S.texL('V_{CC} = 5\\,\\text{V}', bx + 12, 50);
        S.line(300, 50, 300, 80); S.resV(300, 80, 140); S.line(300, 140, 300, 280);
        S.resV(300, 280, 340); S.line(300, 340, 300, gnd); S.ground(300, gnd);
        S.texR('R_{B1}', 282, 100); S.texR('200\\,\\text{k}\\Omega', 282, 122, dim);
        S.texR('R_{B2}', 282, 300); S.texR('100\\,\\text{k}\\Omega', 282, 322, dim);
        S.dot(300, by);

        // Input: source, R_S, C_C1.
        S.source(70, 300, 22);
        S.texR('v_s', 40, 300);
        S.line(70, 278, 70, by); S.line(70, by, 110, by);
        S.resH(110, 170, by); S.line(170, by, 226, by); S.capH(226, by); S.line(236, by, bx - r, by);
        S.line(70, 322, 70, gnd); S.ground(70, gnd);
        S.tex('R_S', 140, by - 24, { width: 40 }); S.tex('100\\,\\Omega', 140, by + 24, Object.assign({ width: 70 }, dim));
        S.tex('C_{C1}', 231, by - 30, { width: 50 }); S.tex(L.tex(L.fmtCap(p.cc1)), 231, by + 30, Object.assign({ width: 80 }, dim));

        // Collector branch.
        S.line(bx, 50, bx, 80); S.resV(bx, 80, 140); S.line(bx, 140, bx, by - r);
        S.texR('R_C', bx - 16, 100); S.texR(L.tex(L.fmtRes(p.rc)), bx - 16, 122, dim);
        S.dot(bx, 172);

        // BJT symbol (NPN): bar, leads to the circle, outward emitter arrow.
        svg.append('circle').attr('cx', bx).attr('cy', by).attr('r', r)
            .attr('fill', 'none').attr('stroke', T.fg(0.3)).attr('stroke-width', 1.2);
        var barX = bx - r * 0.4, barH = r * 0.6, yUp = by - barH * 0.45, yDn = by + barH * 0.45;
        S.line(barX, by - barH, barX, by + barH, S.ink, 3);
        S.line(barX, yUp, bx, by - r, S.ink, 1.8);
        S.line(barX, yDn, bx, by + r, S.ink, 1.8);
        var dx = bx - barX, dy = r - barH * 0.45, Lh = Math.hypot(dx, dy), ux = dx / Lh, uy = dy / Lh, a = 8;
        var tip = [bx, by + r];
        svg.append('polygon').attr('fill', S.ink).attr('points', [tip,
            [tip[0] - ux * a - uy * a * 0.45, tip[1] - uy * a + ux * a * 0.45],
            [tip[0] - ux * a + uy * a * 0.45, tip[1] - uy * a - ux * a * 0.45]].join(' '));
        S.texL('Q_1\\ \\text{2N3904}', 514, 220, { size: 14 });
        S.texL('\\beta = ' + Math.round(p.beta), 514, 242, dim);

        // Emitter: R_E parallel C_E.
        S.line(bx, by + r, bx, 300); S.dot(bx, 284);
        S.resV(bx, 300, 350); S.line(bx, 350, bx, gnd); S.ground(bx, gnd);
        S.texR('R_E', bx - 16, 316); S.texR('500\\,\\Omega', bx - 16, 336, dim);
        S.line(bx, 284, 560, 284); S.line(560, 284, 560, 322); S.capV(560, 322);
        S.line(560, 332, 560, gnd); S.ground(560, gnd);
        S.texL('C_E', 584, 318); S.texL(L.tex(L.fmtCap(p.ce)), 584, 340, dim);

        // Output: C_C2 and R_L.
        S.line(bx, 172, 610, 172); S.capH(610, 172); S.line(620, 172, 690, 172);
        S.tex('C_{C2}', 615, 140, { width: 50 }); S.tex(L.tex(L.fmtCap(p.cc2)), 615, 204, Object.assign({ width: 80 }, dim));
        S.dot(690, 172);
        S.line(690, 172, 690, 220); S.resV(690, 220, 280); S.line(690, 280, 690, gnd); S.ground(690, gnd);
        S.texL('R_L', 704, 240); S.texL(L.tex(L.fmtRes(p.rl)), 704, 262, dim);

        // Node numbers from the lab schematic.
        S.node(7, 52, 212); S.node(5, 195, 212); S.node(1, 318, 250); S.node(3, 462, 158);
        S.node(2, 462, 274); S.node(6, 690, 150); S.node(4, 282, 50); S.node(0, 96, 384);
    }

    window.LCA.onRender(render);
})();
