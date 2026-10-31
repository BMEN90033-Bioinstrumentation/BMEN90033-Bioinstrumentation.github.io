// Section 05 · Op-amp in open loop, or as an inverting amplifier with
// feedback resistor R_2. Fixed 720 x 340 viewBox; all wires orthogonal.
//
// Layout (viewBox units):
//   Op-amp triangle x 300..420, y 110..250; inputs at y = 150 (-) and
//   y = 210 (+); output apex (420, 180). Ground symbols at y = 300.
//   Open loop:  - input to ground via x = 150; + input to source (250, 250).
//   Closed loop: source (110, 225) -> R_in x 160..230 -> node (250, 150);
//                feedback node -> y = 70 -> R_2 x 335..415 -> x = 500 -> output;
//                + input to ground via x = 280.
//   Equation text centred at (450, 322).
(function () {
    var sel = '#plot-opamp';
    var W = 720, H = 340;

    function render() {
        var A = window.AMP, p = A.p, T = window.T, css = window.CMP.cssVar;
        var wire = T.fg(0.6), ink = T.fg(0.85), open = p.loop === 'open';
        var svg = d3.select(sel);
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 ' + W + ' ' + H).attr('preserveAspectRatio', 'xMidYMid meet');

        function line(x1, y1, x2, y2, col, w) {
            svg.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', col || wire).attr('stroke-width', w || 1.6).attr('stroke-linecap', 'round');
        }
        function path(d) { svg.append('path').attr('d', d).attr('fill', 'none').attr('stroke', wire).attr('stroke-width', 1.6); }
        function tex(latex, x, y, o) {
            window.renderKatex(svg, latex, x, y, Object.assign({ width: 120, height: 22, size: 15 }, o));
        }
        function texR(latex, x, y, o) {
            o = Object.assign({ width: 80, align: 'right' }, o);
            tex(latex, x - o.width / 2, y, o);
        }
        function ground(x, y) {
            [12, 8, 4].forEach(function (hw, i) { line(x - hw, y + i * 5, x + hw, y + i * 5, wire, 1.6); });
        }
        function source(cx, cy) {
            svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 24)
                .attr('fill', 'none').attr('stroke', ink).attr('stroke-width', 1.6);
            tex('+', cx, cy - 12, { width: 16, height: 16, size: 14 });
            tex('-', cx, cy + 12, { width: 16, height: 16, size: 14 });
            texR('v_\\text{in}', cx - 34, cy, { color: css('--c-in') });
        }
        function resistor(x, yc, w, name, ny) {
            svg.append('rect').attr('x', x).attr('y', yc - 10).attr('width', w).attr('height', 20)
                .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
            tex(name, x + w / 2, ny, { width: 60 });
        }

        // Op-amp body.
        svg.append('path').attr('d', 'M300,110 L420,180 L300,250 Z')
            .attr('fill', T.fg(0.04)).attr('stroke', ink).attr('stroke-width', 1.6);
        tex('-', 314, 150, { width: 16, height: 16, size: 15 });
        tex('+', 314, 210, { width: 16, height: 16, size: 15 });
        tex('A_\\text{OL}', 352, 180, { width: 60, size: 15 });

        // Output terminal.
        var xT = open ? 564 : 600;
        line(420, 180, xT - 4, 180);
        svg.append('circle').attr('cx', xT).attr('cy', 180).attr('r', 4)
            .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
        tex('v_\\text{out}', xT, 156, { width: 60, color: css('--c-out') });

        if (open) {
            path('M300,150 H150 V300'); ground(150, 300);
            path('M300,210 H250 V226'); line(250, 274, 250, 300); ground(250, 300);
            source(250, 250);
            tex('v_\\text{out} = A_\\text{OL}\\,(v_+ - v_-)', 450, 322, { width: 260, size: 15, color: T.textDim });
        } else {
            path('M110,201 V150 H160'); line(110, 249, 110, 300); ground(110, 300);
            source(110, 225);
            resistor(160, 150, 70, 'R_\\text{in}', 124);
            line(230, 150, 300, 150);
            svg.append('circle').attr('cx', 250).attr('cy', 150).attr('r', 3.5).attr('fill', ink);
            path('M250,150 V70 H335'); path('M415,70 H500 V180');
            resistor(335, 70, 80, 'R_2', 46);
            svg.append('circle').attr('cx', 500).attr('cy', 180).attr('r', 3.5).attr('fill', ink);
            path('M300,210 H280 V300'); ground(280, 300);
            tex('A_{CL} = -\\dfrac{R_2}{R_\\text{in}}', 450, 312, { width: 200, height: 40, size: 15, color: T.textDim });
        }

        var lab = document.getElementById('opamp-label');
        if (lab) lab.innerHTML = 'circuit · <b>' + (open ? 'open loop' : 'inverting amplifier, negative feedback') + '</b>';
    }

    window.AMP.onRender(render);
})();
