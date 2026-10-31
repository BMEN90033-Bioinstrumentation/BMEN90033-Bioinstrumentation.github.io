// Section 01 · Amplifier model: source, ideal gain stage A_v, series R and
// shunt C at the output. Fixed 720 x 340 viewBox; all wires orthogonal.
//
// Layout (viewBox units):
//   Signal rail y = 130. Ground symbols at y = 290.
//   Source circle (100, 210), r = 24; label left of it.
//   Amplifier triangle x 220..300, y 90..170, apex (300, 130).
//   R box x 370..450, y 120..140; name above, value below.
//   Output node x = 540; C plates y = 196 / 206; labels right at x = 572.
//   v_out terminal (640, 130). Mini waveforms at (160, 74) and (640, 66).
(function () {
    var sel = '#plot-circuit';
    var W = 720, H = 340;

    function render() {
        var A = window.AMP, p = A.p, s = A.state(), T = window.T;
        var css = window.CMP.cssVar;
        var wire = T.fg(0.6), ink = T.fg(0.85);
        var svg = d3.select(sel);
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 ' + W + ' ' + H).attr('preserveAspectRatio', 'xMidYMid meet');

        function line(x1, y1, x2, y2, col, w) {
            svg.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', col || wire).attr('stroke-width', w || 1.6).attr('stroke-linecap', 'round');
        }
        function tex(latex, x, y, o) {
            window.renderKatex(svg, latex, x, y, Object.assign({ width: 160, height: 22, size: 15 }, o));
        }
        function texL(latex, x, y, o) {
            o = Object.assign({ width: 160, align: 'left' }, o);
            tex(latex, x + o.width / 2, y, o);
        }
        function texR(latex, x, y, o) {
            o = Object.assign({ width: 80, align: 'right' }, o);
            tex(latex, x - o.width / 2, y, o);
        }
        function ground(x, y) {
            [12, 8, 4].forEach(function (hw, i) { line(x - hw, y + i * 5, x + hw, y + i * 5, wire, 1.6); });
        }
        function arrow(x, y) {
            svg.append('polygon').attr('fill', T.fg(0.45))
                .attr('points', [[x + 6, y], [x - 5, y - 4.5], [x - 5, y + 4.5]].join(' '));
        }
        // Small sine of amplitude a (px) and phase lag phi (rad) centred at cx, cy.
        function mini(cx, cy, a, phi, col) {
            var pts = d3.range(0, 61).map(function (i) {
                var t = i / 60 * 2 * Math.PI;
                return [cx - 25 + i * 50 / 60, cy - a * Math.sin(t - phi)];
            });
            svg.append('path').attr('d', d3.line()(pts)).attr('fill', 'none')
                .attr('stroke', col).attr('stroke-width', 1.8);
            line(cx - 27, cy, cx + 27, cy, T.fg(0.15), 1);
        }

        var cIn = css('--c-in'), cOut = css('--c-out');
        var y0 = 130, gnd = 290;

        // Source and input rail.
        line(100, 186, 100, y0); line(100, y0, 220, y0);
        line(100, 234, 100, gnd); ground(100, gnd);
        svg.append('circle').attr('cx', 100).attr('cy', 210).attr('r', 24)
            .attr('fill', 'none').attr('stroke', ink).attr('stroke-width', 1.6);
        tex('+', 100, 198, { width: 16, height: 16, size: 14 });
        tex('-', 100, 222, { width: 16, height: 16, size: 14 });
        texR('v_\\text{in}', 66, 210, { color: cIn });
        arrow(165, y0);
        mini(160, 74, 12, 0, cIn);

        // Gain stage.
        svg.append('path').attr('d', 'M220,90 L300,130 L220,170 Z')
            .attr('fill', T.fg(0.04)).attr('stroke', ink).attr('stroke-width', 1.6);
        tex('A_v', 248, 130, { width: 40, size: 16 });

        // Series resistor.
        line(300, y0, 370, y0);
        svg.append('rect').attr('x', 370).attr('y', 120).attr('width', 80).attr('height', 20)
            .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
        tex('R', 410, 104, { width: 40 });
        tex(A.tex(A.fmtR(p.R)), 410, 158, { width: 100, size: 13, color: T.textDim });
        arrow(335, y0);

        // Output node, shunt capacitor, terminal.
        line(450, y0, 636, y0);
        arrow(495, y0);
        svg.append('circle').attr('cx', 540).attr('cy', y0).attr('r', 3.5).attr('fill', ink);
        line(540, y0, 540, 196);
        line(520, 196, 560, 196, ink, 3);
        line(520, 206, 560, 206, ink, 3);
        line(540, 206, 540, gnd); ground(540, gnd);
        texL('C', 572, 190);
        texL(A.tex(A.fmtC(p.C)), 572, 212, { size: 13, color: T.textDim });
        texL('Z_C = \\dfrac{1}{j\\omega C}', 572, 248, { size: 13, color: T.textDim, height: 34 });

        svg.append('circle').attr('cx', 640).attr('cy', y0).attr('r', 4)
            .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
        tex('v_\\text{out}', 640, 106, { width: 60, color: cOut });
        mini(640, 62, 12 * s.gf, s.angle * Math.PI / 180, cOut);
        tex('|H|/A_v = ' + (s.gf * 100).toFixed(0) + '\\%', 640, 160,
            { width: 140, size: 13, color: cOut });
    }

    window.AMP.onRender(render);
})();
