// Section 03 · AC small-signal equivalent: V_CC shorted to ground, the bias
// divider as R_BB, the BJT as its hybrid-pi model (r_pi from base to
// emitter, g_m v_pi from collector to emitter) and the emitter impedance
// R_E || C_E. Fixed 840 x 324 viewBox (y from 56); all wires
// orthogonal.
//
// Layout (viewBox units):
//   Base rail y = 150: source (70, 250) -> R_S x 110..170 -> C_C1 x 226 / 236
//     -> B node (300, 150) -> r_pi top (400, 150). R_BB x = 300, y 190..250.
//   r_pi x = 400, y 180..240 -> emitter rail y = 270 (x 400..520), E node (460, 270).
//   Z_E: split at y = 290 to R_E (x = 430, y 300..340) and C_E (x = 490, plates
//     y 314 / 324), joined at y = 350 -> ground (460, 356).
//   Collector rail y = 150 (x 520..780): g_m v_pi source (520, 210), r = 22;
//     R_C x = 650, y 180..240; C_C2 x 690 / 700; node 6 (750, 150); R_L x = 750.
//   Grounds at y = 356.
(function () {
    var sel = '#plot-ac';
    var W = 840, H = 380;

    function render() {
        var L = window.LCA, p = L.p, P = L.params(), T = window.T, css = window.CMP.cssVar;
        var svg = d3.select(sel);
        svg.selectAll('*').remove();
        // y from 56 leaves headroom under the plot-box title.
        svg.attr('viewBox', '0 56 ' + W + ' ' + (H - 56)).attr('preserveAspectRatio', 'xMidYMid meet');
        var S = L.schem(svg), dim = { size: 14.5, color: T.textDim }, gnd = 356, yb = 150;

        // Input side.
        S.source(70, 250, 22); S.texR('v_s', 40, 250);
        S.line(70, 228, 70, yb); S.line(70, yb, 110, yb); S.resH(110, 170, yb);
        S.line(170, yb, 226, yb); S.capH(226, yb); S.line(236, yb, 400, yb);
        S.line(70, 272, 70, gnd); S.ground(70, gnd);
        S.tex('R_S', 140, yb - 24, { width: 40 }); S.tex('100\\,\\Omega', 140, yb + 24, Object.assign({ width: 70 }, dim));
        S.tex('C_{C1}', 231, yb - 30, { width: 50 }); S.tex(L.tex(L.fmtCap(p.cc1)), 231, yb + 30, Object.assign({ width: 80 }, dim));

        // R_BB.
        S.dot(300, yb); S.tex('\\text{B}', 300, yb - 18, { width: 20, size: 14.5, color: T.textDim });
        S.line(300, yb, 300, 190); S.resV(300, 190, 250); S.line(300, 250, 300, gnd); S.ground(300, gnd);
        S.texR('R_{BB}', 282, 210); S.texR('66.7\\,\\text{k}\\Omega', 282, 230, dim);

        // r_pi with v_pi polarity.
        S.line(400, yb, 400, 180); S.resV(400, 180, 240); S.line(400, 240, 400, 270);
        S.texR('r_\\pi', 382, 200); S.texR(L.tex(L.fmtRes(P.r_pi)), 382, 220, dim);
        S.tex('+', 422, 186, { width: 18, size: 15.5, color: css('--c-q') });
        S.tex('-', 422, 234, { width: 18, size: 15.5, color: css('--c-q') });
        S.tex('v_\\pi', 424, 210, { width: 30, size: 15, color: css('--c-q') });

        // Emitter rail and Z_E = R_E || C_E.
        S.line(400, 270, 520, 270); S.dot(460, 270);
        S.tex('\\text{E}', 446, 256, { width: 20, size: 14.5, color: T.textDim });
        S.line(460, 270, 460, 290); S.line(430, 290, 490, 290);
        S.line(430, 290, 430, 300); S.resV(430, 300, 340); S.line(430, 340, 430, 350);
        S.line(490, 290, 490, 314); S.capV(490, 314); S.line(490, 324, 490, 350);
        S.line(430, 350, 490, 350); S.line(460, 350, 460, gnd); S.ground(460, gnd);
        S.texR('R_E', 412, 312); S.texR('500\\,\\Omega', 412, 332, dim);
        S.texL('C_E', 512, 312); S.texL(L.tex(L.fmtCap(p.ce)), 512, 334, dim);

        // Dependent current source g_m v_pi, collector to emitter.
        S.line(520, yb, 520, 188); S.line(520, 232, 520, 270);
        svg.append('circle').attr('cx', 520).attr('cy', 210).attr('r', 22)
            .attr('fill', 'none').attr('stroke', S.ink).attr('stroke-width', 1.6);
        S.line(520, 198, 520, 218, S.ink, 1.8);
        svg.append('polygon').attr('fill', S.ink).attr('points', [[520, 225], [514, 214], [526, 214]].join(' '));
        S.texL('g_m v_\\pi', 548, 202, { size: 15 });
        S.texL((P.gm * 1e3).toFixed(1) + '\\,\\text{mA/V}', 548, 222, dim);
        S.tex('\\text{C}', 520, yb - 18, { width: 20, size: 14.5, color: T.textDim });

        // Collector side: R_C to AC ground, C_C2, R_L.
        S.line(520, yb, 690, yb); S.dot(650, yb);
        S.line(650, yb, 650, 180); S.resV(650, 180, 240); S.line(650, 240, 650, gnd); S.ground(650, gnd);
        S.texL('R_C', 664, 278); S.texL(L.tex(L.fmtRes(p.rc)), 664, 298, dim);
        S.capH(690, yb); S.line(700, yb, 776, yb);
        S.tex('C_{C2}', 695, yb - 30, { width: 50 }); S.tex(L.tex(L.fmtCap(p.cc2)), 695, yb + 30, Object.assign({ width: 80 }, dim));
        S.dot(750, yb);
        S.line(750, yb, 750, 180); S.resV(750, 180, 240); S.line(750, 240, 750, gnd); S.ground(750, gnd);
        S.texL('R_L', 764, 200); S.texL(L.tex(L.fmtRes(p.rl)), 764, 220, dim);
        svg.append('circle').attr('cx', 780).attr('cy', yb).attr('r', 4)
            .attr('fill', css('--bg-2')).attr('stroke', S.ink).attr('stroke-width', 1.6);
        S.tex('v_o', 780, yb - 20, { width: 30, color: css('--c-mag') });
    }

    window.LCA.onRender(render);
})();
