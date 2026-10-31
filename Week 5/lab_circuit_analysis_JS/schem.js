// Schematic primitives shared by the two circuit figures: orthogonal wires,
// rectangular resistors, capacitors, grounds, sources with +/- marks, node
// dots, node-number badges and KaTeX labels. Colours come from window.T and
// the page CSS variables on every call.
(function () {
    window.LCA.schem = function (svg) {
        var T = window.T, css = window.CMP.cssVar;
        var wire = T.fg(0.6), ink = T.fg(0.85), bg = css('--bg-2');
        var S = {
            ink: ink,
            line: function (x1, y1, x2, y2, col, w) {
                svg.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                    .attr('stroke', col || wire).attr('stroke-width', w || 1.6).attr('stroke-linecap', 'round');
            },
            path: function (d) {
                svg.append('path').attr('d', d).attr('fill', 'none').attr('stroke', wire).attr('stroke-width', 1.6);
            },
            tex: function (latex, x, y, o) {
                window.renderKatex(svg, latex, x, y, Object.assign({ width: 120, height: 22, size: 15 }, o));
            },
            // Text whose left / right edge sits at x.
            texL: function (latex, x, y, o) {
                o = Object.assign({ width: 140, align: 'left' }, o);
                S.tex(latex, x + o.width / 2, y, o);
            },
            texR: function (latex, x, y, o) {
                o = Object.assign({ width: 100, align: 'right' }, o);
                S.tex(latex, x - o.width / 2, y, o);
            },
            // Vertical resistor body from y1 to y2 centred on x.
            resV: function (x, y1, y2) {
                svg.append('rect').attr('x', x - 10).attr('y', y1).attr('width', 20).attr('height', y2 - y1)
                    .attr('fill', bg).attr('stroke', ink).attr('stroke-width', 1.6);
            },
            // Horizontal resistor body from x1 to x2 centred on y.
            resH: function (x1, x2, y) {
                svg.append('rect').attr('x', x1).attr('y', y - 10).attr('width', x2 - x1).attr('height', 20)
                    .attr('fill', bg).attr('stroke', ink).attr('stroke-width', 1.6);
            },
            // Capacitor in a vertical wire (horizontal plates at y and y + 10).
            capV: function (x, y) {
                S.line(x - 18, y, x + 18, y, ink, 3); S.line(x - 18, y + 10, x + 18, y + 10, ink, 3);
            },
            // Capacitor in a horizontal wire (vertical plates at x and x + 10).
            capH: function (x, y) {
                S.line(x, y - 16, x, y + 16, ink, 3); S.line(x + 10, y - 16, x + 10, y + 16, ink, 3);
            },
            ground: function (x, y) {
                [12, 8, 4].forEach(function (hw, i) { S.line(x - hw, y + i * 5, x + hw, y + i * 5, wire, 1.6); });
            },
            source: function (cx, cy, r) {
                svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', r)
                    .attr('fill', 'none').attr('stroke', ink).attr('stroke-width', 1.6);
                S.tex('+', cx, cy - r / 2, { width: 18, height: 18, size: 16.5 });
                S.tex('-', cx, cy + r / 2, { width: 18, height: 18, size: 16.5 });
            },
            dot: function (x, y) { svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 3.5).attr('fill', ink); },
            // Node number in a small badge.
            node: function (n, x, y) {
                svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 10.5)
                    .attr('fill', bg).attr('stroke', css('--c-node')).attr('stroke-width', 1.2);
                S.tex('\\text{' + n + '}', x, y, { width: 20, height: 20, size: 13, color: css('--c-node') });
            }
        };
        return S;
    };
})();
