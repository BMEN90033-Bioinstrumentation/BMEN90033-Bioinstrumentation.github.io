// Shared SVG schematic primitives for the four circuit figures on this page.
// CLD.kit(svg) returns drawing helpers bound to one D3 selection. All wires
// are orthogonal; resistors are rectangles; sources are circles with + at
// the upper terminal. Colours come from window.T and the page CSS variables.
(function () {
    function css(n) { return window.CMP.cssVar(n); }

    // fs scales every label size, for schematics drawn in a wider viewBox.
    window.CLD.kit = function (svg, fs) {
        fs = fs || 1;
        var T = window.T, wire = T.fg(0.6), ink = T.fg(0.85);
        function sz(o, d) { o = Object.assign({}, o); o.size = (o.size || d) * fs; return o; }
        var k = { flows: {}, ink: ink, wire: wire };

        k.line = function (x1, y1, x2, y2, col, w) {
            return svg.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', col || wire).attr('stroke-width', w || 1.6).attr('stroke-linecap', 'round');
        };
        k.path = function (pts, col, w) {
            return svg.append('path').attr('d', d3.line()(pts)).attr('fill', 'none')
                .attr('stroke', col || wire).attr('stroke-width', w || 1.6)
                .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
        };
        k.tex = function (latex, x, y, o) {
            o = sz(Object.assign({ width: 120, height: 20 }, o), 14);
            o.height = Math.max(o.height, o.size + 6);
            return window.renderKatex(svg, latex, x, y, o);
        };
        // Left edge at x / right edge at x.
        k.texL = function (latex, x, y, o) {
            o = sz(Object.assign({ width: 160, height: 20, align: 'left' }, o), 14);
            o.height = Math.max(o.height, o.size + 6);
            return window.renderKatex(svg, latex, x + o.width / 2, y, o);
        };
        k.texR = function (latex, x, y, o) {
            o = sz(Object.assign({ width: 160, height: 20, align: 'right' }, o), 14);
            o.height = Math.max(o.height, o.size + 6);
            return window.renderKatex(svg, latex, x - o.width / 2, y, o);
        };
        k.text = function (s, x, y, o) {
            o = o || {};
            return svg.append('text').attr('x', x).attr('y', y).attr('text-anchor', o.anchor || 'middle')
                .attr('dominant-baseline', 'middle').attr('fill', o.color || T.textDim)
                .attr('font-size', (o.size || 12) * fs).attr('font-weight', o.weight || 400)
                .attr('font-family', "'JetBrains Mono', monospace").text(s);
        };
        k.dot = function (x, y) { svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 3).attr('fill', ink); };
        k.terminal = function (x, y) {
            svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 4)
                .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
        };
        k.resV = function (x, y1, y2) {
            svg.append('rect').attr('x', x - 10).attr('y', y1).attr('width', 20).attr('height', y2 - y1)
                .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
        };
        // Capacitor on a vertical wire: plates at ya and yb.
        k.capV = function (x, ya, yb) {
            k.line(x - 14, ya, x + 14, ya, ink, 2.2); k.line(x - 14, yb, x + 14, yb, ink, 2.2);
        };
        // Capacitor on a horizontal wire: plates at xa and xb. The wire is
        // drawn up to each plate, so callers leave the gap open.
        k.capH = function (xa, xb, y) {
            k.line(xa, y - 14, xa, y + 14, ink, 2.2); k.line(xb, y - 14, xb, y + 14, ink, 2.2);
        };
        k.ground = function (x, y) {
            [12, 8, 4].forEach(function (hw, i) { k.line(x - hw, y + i * 5, x + hw, y + i * 5, wire, 1.6); });
        };
        k.rail = function (x, y) { k.line(x - 16, y, x + 16, y, ink, 2); };
        k.source = function (x, y, r) {
            r = r || 18;
            svg.append('circle').attr('cx', x).attr('cy', y).attr('r', r)
                .attr('fill', 'none').attr('stroke', ink).attr('stroke-width', 1.6);
            k.tex('+', x, y - r * 0.45, { width: 16, height: 16, size: 12 });
            k.tex('-', x, y + r * 0.45, { width: 16, height: 16, size: 12 });
        };
        // Inductor on a horizontal wire from xa to xb at height y: n arcs above the wire.
        k.inductorH = function (xa, xb, y, n) {
            n = n || 4;
            var w = (xb - xa) / n, d = 'M' + xa + ',' + y;
            for (var i = 0; i < n; i++) d += 'A' + (w / 2) + ',' + (w / 2) + ' 0 0 1 ' + (xa + (i + 1) * w) + ',' + y;
            svg.append('path').attr('d', d).attr('fill', 'none').attr('stroke', ink).attr('stroke-width', 1.8);
        };
        // Comparator triangle with its left edge at x, apex at x + w, centred on y.
        k.comparator = function (x, y, w, h, topSign) {
            svg.append('path').attr('d', 'M' + x + ',' + (y - h / 2) + 'L' + (x + w) + ',' + y + 'L' + x + ',' + (y + h / 2) + 'Z')
                .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
            k.tex(topSign, x + 11, y - h / 4, { width: 14, height: 16, size: 13 });
            k.tex(topSign === '+' ? '-' : '+', x + 11, y + h / 4, { width: 14, height: 16, size: 13 });
        };
        // Enhancement MOSFET, all leads orthogonal. Gate plate at cx - 6, channel
        // at cx, device rail (drain / source leads) at cx + 20, terminals at
        // cy -/+ 30. NMOS: drain top, body arrow into the channel. PMOS: source
        // top, body arrow out of the channel. The gate lead starts at gx.
        k.mos = function (cx, cy, type, gx) {
            var n = type === 'n', rx = cx + 20;
            k.line(gx, cy, cx - 6, cy, wire);
            k.line(cx - 6, cy - 16, cx - 6, cy + 16, ink, 2.2);
            [[-16, -8], [-4, 4], [8, 16]].forEach(function (s) { k.line(cx, cy + s[0], cx, cy + s[1], ink, 2.6); });
            k.path([[cx, cy - 12], [rx, cy - 12], [rx, cy - 30]], ink, 1.8);
            k.path([[cx, cy + 12], [rx, cy + 12], [rx, cy + 30]], ink, 1.8);
            k.path([[cx, cy], [rx, cy], [rx, n ? cy + 12 : cy - 12]], ink, 1.8);
            var a = n ? [[cx + 1, cy], [cx + 9, cy - 4], [cx + 9, cy + 4]] : [[cx + 15, cy], [cx + 7, cy - 4], [cx + 7, cy + 4]];
            svg.append('polygon').attr('points', a.map(function (q) { return q.join(','); }).join(' ')).attr('fill', ink);
            var o = { width: 16, size: 12, color: T.textDim };
            k.tex('\\text{G}', cx - 16, cy - 11, { width: 16, height: 16, size: 12, color: T.textDim });
            k.texL('\\text{' + (n ? 'D' : 'S') + '}', rx + 5, cy - 24, o);
            k.texL('\\text{' + (n ? 'S' : 'D') + '}', rx + 5, cy + 24, o);
        };
        // Flow overlay (glow plus moving dots), driven by k.setFlow from tick().
        k.flow = function (name, pts) {
            var d = d3.line()(pts);
            k.flows[name] = {
                glow: svg.append('path').attr('d', d).attr('fill', 'none').attr('stroke-width', 5)
                    .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('stroke-opacity', 0),
                dots: svg.append('path').attr('d', d).attr('fill', 'none').attr('stroke-width', 4.5)
                    .attr('stroke-linecap', 'round').attr('stroke-dasharray', '0 18').attr('stroke-opacity', 0)
            };
        };
        k.setFlow = function (name, colVar, alpha) {
            var f = k.flows[name];
            if (!f) return;
            var a = Math.max(0, Math.min(1, alpha)), c = css(colVar);
            f.glow.attr('stroke', c).attr('stroke-opacity', a * 0.3);
            f.dots.attr('stroke', c).attr('stroke-opacity', a)
                .attr('stroke-dashoffset', -(window.CLD.clock.t * 80) % 18);
        };
        k.clearFlows = function () { Object.keys(k.flows).forEach(function (n) { k.setFlow(n, '--c-hi', 0); }); };
        // Re-render KaTeX into an existing label only when its text changes.
        k.setTex = function (fo, latex, color) {
            var div = fo.select('div').node();
            if (color) div.style.color = color;
            if (div.dataset.tex === latex) return;
            div.dataset.tex = latex;
            window.katex.render(latex, div, { throwOnError: false });
        };
        return k;
    };
})();
