// Shared D3 frame for the single-quadrant plots on this page: inner group,
// optional grid and ticks, and KaTeX axis titles (x below, y rotated in the
// left margin, both outside the plot area).
(function () {
    window.LED.frame = function (sel, o) {
        var root = d3.select(sel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect();
        var W = rect.width, H = rect.height || 400;
        var m = Object.assign({ top: 40, right: 24, bottom: 62, left: 78 }, o.margin);
        var iw = W - m.left - m.right, ih = H - m.top - m.bottom;
        var svg = root.append('svg').attr('width', W).attr('height', H);
        var g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { svg: svg, g: g, W: W, H: H, m: m, iw: iw, ih: ih };
    };

    // Grid, ticked axes and titles. With t.bare the axes are plain lines with
    // no ticks or grid, for schematic diagrams.
    window.LED.axes = function (f, g, x, y, t) {
        if (t.bare) {
            g.append('line').attr('x1', 0).attr('x2', f.iw).attr('y1', f.ih).attr('y2', f.ih)
                .attr('stroke', window.T.gridAxis).attr('stroke-width', 1.2);
            g.append('line').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', f.ih)
                .attr('stroke', window.T.gridAxis).attr('stroke-width', 1.2);
        } else {
            window.CMP.drawGrid(g, x, y, f.iw, f.ih, { xTicks: x.ticks(7), yTicks: y.ticks(5) });
            var xa = g.append('g').attr('transform', 'translate(0,' + f.ih + ')')
                .call(d3.axisBottom(x).ticks(7).tickSizeOuter(0));
            var ya = g.append('g').call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));
            [xa, ya].forEach(window.CMP.styleAxis);
        }
        window.renderKatex(f.svg, t.yTitle, t.bare ? 20 : 22, f.m.top + f.ih / 2,
            { width: 240, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, t.xTitle, f.m.left + f.iw / 2, f.H - (t.bare ? 16 : 18),
            { width: 240, height: 22, size: 16 });
    };

    // True when box b = [x0, y0, x1, y1] is clear of every box in list.
    window.LED.clear = function (b, list) {
        return !list.some(function (o) { return b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]; });
    };
})();
