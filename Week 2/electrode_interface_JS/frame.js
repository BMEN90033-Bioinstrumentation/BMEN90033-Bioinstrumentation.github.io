// Shared D3 frame for the single-quadrant plots on this page: inner group,
// grid, styled axes and KaTeX axis titles (x below, y rotated in the left
// margin, both outside the plot area).
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

    // Grid, axes and titles for panel group g of height ph at vertical offset
    // oy (relative to the inner area). t.xTicks / t.xFormat override the
    // default x ticks (used by the log axis).
    window.ELI.axes = function (f, g, x, y, ph, oy, t) {
        var xt = t.xTicks || x.ticks(6);
        window.CMP.drawGrid(g, x, y, f.iw, ph, { xTicks: xt, yTicks: y.ticks(5) });
        var xa = g.append('g').attr('transform', 'translate(0,' + ph + ')')
            .call(d3.axisBottom(x).tickValues(xt).tickSizeOuter(0)
                .tickFormat(t.xFormat || null));
        var ya = g.append('g').call(d3.axisLeft(y).ticks(5).tickSizeOuter(0)
            .tickFormat(t.yFormat || null));
        [xa, ya].forEach(window.CMP.styleAxis);
        window.renderKatex(f.svg, t.yTitle, 22, f.m.top + oy + ph / 2,
            { width: 240, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, t.xTitle, f.m.left + f.iw / 2, f.H - 18,
            { width: 260, height: 22, size: 16 });
    };
})();
