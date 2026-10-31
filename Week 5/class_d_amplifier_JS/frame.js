// Shared D3 frame for the single-quadrant plots on this page: inner group,
// grid, styled axes and KaTeX axis titles (x below, y rotated in the left
// margin, both outside the plot area).
(function () {
    window.CLD.frame = function (sel, o) {
        var root = d3.select(sel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect();
        var W = rect.width, H = rect.height || 400;
        var m = Object.assign({ top: 40, right: 24, bottom: 62, left: 78 }, o.margin);
        var iw = Math.max(1, W - m.left - m.right), ih = Math.max(1, H - m.top - m.bottom);
        var svg = root.append('svg').attr('width', W).attr('height', H);
        var g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { svg: svg, g: g, W: W, H: H, m: m, iw: iw, ih: ih };
    };

    // Grid, axes and titles for panel group g of height ph at vertical offset
    // oy (relative to the inner area). xTitle is drawn only when given;
    // t.xTicks / t.yTicks override the default tick values.
    window.CLD.axes = function (f, g, x, y, ph, oy, t) {
        var xt = t.xTicks || x.ticks(6), yt = t.yTicks || y.ticks(5);
        window.CMP.drawGrid(g, x, y, f.iw, ph, { xTicks: xt, yTicks: yt });
        var xa = g.append('g').attr('transform', 'translate(0,' + ph + ')')
            .call(d3.axisBottom(x).tickValues(xt).tickSizeOuter(0)
                .tickFormat(t.xTitle ? (t.xFormat || null) : function () { return ''; }));
        var ya = g.append('g').call(d3.axisLeft(y).tickValues(yt).tickSizeOuter(0).tickFormat(t.yFormat || null));
        [xa, ya].forEach(window.CMP.styleAxis);
        window.renderKatex(f.svg, t.yTitle, 22, f.m.top + oy + ph / 2,
            { width: 200, height: 22, rotate: -90, size: 16 });
        if (t.xTitle) {
            window.renderKatex(f.svg, t.xTitle, f.m.left + f.iw / 2, f.H - 18,
                { width: 260, height: 22, size: 16 });
        }
    };
})();

// Stacked time-domain panels sharing one x scale (input phase over
// CLD.WINDOW, shown as t / T_sig). specs: [{ domain, ticks, title, yFormat }].
// Only the last panel carries x tick labels and the x title. Returns the x
// scale and, per panel, its group, y scale and height.
(function () {
    window.CLD.panels = function (f, specs, gap) {
        gap = gap || 16;
        var n = specs.length, ph = (f.ih - gap * (n - 1)) / n;
        var x = d3.scaleLinear().domain([0, window.CLD.WINDOW]).range([0, f.iw]);
        var xt = [0, 1, 2, 3, 4].map(function (v) { return v * Math.PI; });
        var out = specs.map(function (s, i) {
            var oy = i * (ph + gap);
            var g = i === 0 ? f.g : f.svg.append('g').attr('transform',
                'translate(' + f.m.left + ',' + (f.m.top + oy) + ')');
            var y = d3.scaleLinear().domain(s.domain).range([ph, 0]);
            var last = i === n - 1;
            window.CLD.axes(f, g, x, y, ph, oy, {
                xTicks: xt, yTicks: s.ticks, yTitle: s.title, yFormat: s.yFormat,
                xTitle: last ? 't / T_\\text{sig}' : null,
                xFormat: function (v) { return d3.format('~g')(v / (2 * Math.PI)); }
            });
            return { g: g, y: y, ph: ph, oy: oy };
        });
        return { x: x, ph: ph, list: out };
    };

    // Dashed cursor through every panel plus one dot per supplied series.
    window.CLD.cursor = function (P, dots) {
        var c = { lines: [], dots: [] }, col = window.T.fg(0.45);
        P.list.forEach(function (p) {
            c.lines.push(p.g.append('line').attr('y1', 0).attr('y2', p.ph).attr('stroke', col).attr('stroke-dasharray', '2 3'));
        });
        (dots || []).forEach(function (d) {
            c.dots.push({ fn: d.fn, y: P.list[d.panel].y, el: P.list[d.panel].g.append('circle').attr('r', 4.5)
                .attr('fill', window.CMP.cssVar(d.col)).attr('stroke', window.T.text) });
        });
        c.update = function (th) {
            var px = P.x(th);
            c.lines.forEach(function (l) { l.attr('x1', px).attr('x2', px); });
            c.dots.forEach(function (d) { d.el.attr('cx', px).attr('cy', d.y(d.fn(th))); });
        };
        return c;
    };
})();
