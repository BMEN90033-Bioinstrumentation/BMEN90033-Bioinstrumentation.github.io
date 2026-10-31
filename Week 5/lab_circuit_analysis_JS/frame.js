// Shared D3 frame for the plots on this page: inner group, grid, styled
// axes and KaTeX axis titles (single-quadrant rule: x title below, y title
// rotated in the left margin). Also provides a label placer that tests
// candidate positions against every drawn line, marker and earlier label.
(function () {
    var L = window.LCA;

    L.frame = function (sel, o) {
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
    // oy. With t.log the x ticks sit on decades and are labelled 10^n in
    // KaTeX. x tick labels and the x title are drawn only when t.xTitle is set.
    L.axes = function (f, g, x, y, ph, oy, t) {
        var xt;
        if (t.log) {
            var d0 = Math.ceil(Math.log10(x.domain()[0])), d1 = Math.floor(Math.log10(x.domain()[1]));
            xt = d3.range(d0, d1 + 1).map(function (d) { return Math.pow(10, d); });
        } else {
            xt = x.ticks(6);
        }
        var yt = t.yTicks || y.ticks(5);
        window.CMP.drawGrid(g, x, y, f.iw, ph, { xTicks: xt, yTicks: yt });
        var xa = g.append('g').attr('transform', 'translate(0,' + ph + ')')
            .call(d3.axisBottom(x).tickValues(xt).tickSizeOuter(0)
                .tickFormat(t.log || !t.xTitle ? function () { return ''; } : null));
        var ya = g.append('g').call(d3.axisLeft(y).tickValues(yt).tickSizeOuter(0)
            .tickFormat(t.yFormat || null));
        [xa, ya].forEach(window.CMP.styleAxis);
        if (t.log && t.xTitle) {
            xt.forEach(function (v) {
                window.renderKatex(f.svg, '10^{' + Math.round(Math.log10(v)) + '}',
                    f.m.left + x(v), f.m.top + oy + ph + 18, { width: 40, height: 20, size: 13, color: window.T.text });
            });
        }
        window.renderKatex(f.svg, t.yTitle, 22, f.m.top + oy + ph / 2,
            { width: Math.max(120, ph), height: 22, rotate: -90, size: 16 });
        if (t.xTitle) {
            window.renderKatex(f.svg, t.xTitle, f.m.left + f.iw / 2, f.H - 16,
                { width: 260, height: 22, size: 16 });
        }
    };

    // Label placer for a panel of width pw, height ph whose origin sits at
    // (f.m.left + ox, f.m.top + oy). Obstacles are polylines (resampled every
    // 1.5 px) and boxes; a label box is rejected when it leaves the panel,
    // contains an obstacle point, or overlaps a box.
    L.placer = function (f, ox, oy, pw, ph) {
        ox = ox || 0; oy = oy || 0;
        pw = pw === undefined ? f.iw : pw; ph = ph === undefined ? f.ih : ph;
        var pts = [], boxes = [];
        function line(poly) {
            for (var i = 1; i < poly.length; i++) {
                var a = poly[i - 1], b = poly[i];
                var n = Math.min(4000, Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5)));
                for (var k = 0; k <= n; k++) {
                    var px = a[0] + (b[0] - a[0]) * k / n, py = a[1] + (b[1] - a[1]) * k / n;
                    if (px >= -2 && px <= pw + 2 && py >= -2 && py <= ph + 2) pts.push([px, py]);
                }
            }
        }
        function box(b) { boxes.push(b); }
        function free(b, pad) {
            if (b[0] < 2 || b[1] < 2 || b[2] > pw - 2 || b[3] > ph - 2) return false;
            for (var i = 0; i < pts.length; i++) {
                var q = pts[i];
                if (q[0] > b[0] - pad && q[0] < b[2] + pad && q[1] > b[1] - pad && q[1] < b[3] + pad) return false;
            }
            return !boxes.some(function (o) {
                return b[0] < o[2] + 4 && b[2] > o[0] - 4 && b[1] < o[3] + 4 && b[3] > o[1] - 4;
            });
        }
        // Render latex, measure it, then move it to the first free candidate.
        // cands(w, h) returns [cx, cy] centres. Returns the chosen index and
        // centre, or null (label removed) when no candidate is free.
        function label(latex, cands, o) {
            o = Object.assign({ size: 14, color: window.T.text, pad: 3 }, o);
            var fo = window.renderKatex(f.svg, latex, 0, 0, { width: 260, height: 22, size: o.size, color: o.color });
            var k = fo.select('.katex').node();
            var r = k ? k.getBoundingClientRect() : { width: 80, height: 16 };
            var w = Math.ceil(r.width) + 2, h = Math.max(14, Math.ceil(r.height));
            var list = cands(w, h);
            for (var i = 0; i < list.length; i++) {
                var c = list[i], b = [c[0] - w / 2, c[1] - h / 2, c[0] + w / 2, c[1] + h / 2];
                if (free(b, o.pad)) {
                    boxes.push(b);
                    fo.attr('x', f.m.left + ox + c[0] - 130).attr('y', f.m.top + oy + c[1] - 11);
                    return { i: i, c: c, w: w, h: h };
                }
            }
            fo.remove();
            return null;
        }
        return { line: line, box: box, label: label };
    };
})();
