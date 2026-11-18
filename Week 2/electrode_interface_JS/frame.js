// Shared D3 frame for the plots on this page: inner group, grid, styled axes
// and KaTeX axis titles, all outside the plot area. Single-quadrant plots
// take the x title below and the y title rotated in the left margin. With
// t.quad the plot shows all four quadrants: the y title sits above the plot
// over the y axis and the x title to the right, level with the x axis.
(function () {
    window.ELI.frame = function (sel, o) {
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

    // t.xTicks / t.xFormat override the default x ticks (used by log axes),
    // t.yTicks / t.yFormat likewise.
    window.ELI.axes = function (f, g, x, y, t) {
        var xt = t.xTicks || x.ticks(6), yt = t.yTicks || y.ticks(5);
        window.CMP.drawGrid(g, x, y, f.iw, f.ih, { xTicks: xt, yTicks: yt });
        var xa = g.append('g').attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).tickValues(xt).tickSizeOuter(0).tickFormat(t.xFormat || null));
        var ya = g.append('g')
            .call(d3.axisLeft(y).tickValues(yt).tickSizeOuter(0).tickFormat(t.yFormat || null));
        [xa, ya].forEach(function (a) {
            window.CMP.styleAxis(a);
            a.selectAll('text').attr('font-size', 13);
        });
        if (t.quad) {
            window.renderKatex(f.svg, t.yTitle, f.m.left + x(0), f.m.top - 16, { width: 200, height: 22, size: 16 });
            window.renderKatex(f.svg, t.xTitle, f.m.left + f.iw + 10, f.m.top + y(0),
                { width: 80, height: 22, size: 16, align: 'left' }).attr('x', f.m.left + f.iw + 10);
        } else {
            window.renderKatex(f.svg, t.yTitle, 22, f.m.top + f.ih / 2, { width: 240, height: 22, rotate: -90, size: 16 });
            window.renderKatex(f.svg, t.xTitle, f.m.left + f.iw / 2, f.H - 18, { width: 260, height: 22, size: 16 });
        }
    };
})();
