// Section 02 · Radial conductivity profile sigma(r) of the enabled shells,
// as the model sees it: the innermost layer holds the source and the
// outermost extends to infinity. Each step takes its layer colour; the
// chips above the plot identify the layers, so the plot carries no labels.
(function () {
    var sel = '#plot-sigma';
    var R_MAX = 20;

    function render() {
        var VC = window.VC, T = window.T, css = window.CMP.cssVar;
        var f = VC.frame(sel, { margin: { top: 36 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([0, R_MAX]).range([0, iw]);
        var y = d3.scaleLog().domain([5e-4, 3]).range([ih, 0]);

        window.CMP.drawGrid(g, x, y, iw, ih, { xTicks: x.ticks(5), yTicks: [1e-3, 1e-2, 1e-1, 1] });
        var xa = g.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));
        var ya = g.append('g').call(d3.axisLeft(y).tickValues([1e-3, 1e-2, 1e-1, 1])
            .tickFormat(function (d) { return d >= 1 ? '1' : String(d); }).tickSizeOuter(0));
        [xa, ya].forEach(window.CMP.styleAxis);
        window.renderKatex(f.svg, '\\sigma\\;[\\mathrm{S/m}]', 22, f.m.top + ih / 2, { width: 200, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, 'r\\;[\\text{model units}]', f.m.left + iw / 2, f.H - 18, { width: 240, height: 22, size: 16 });

        // Electrode radius.
        var xs = x(VC.SURFACE_RADIUS);
        g.append('line').attr('x1', xs).attr('x2', xs).attr('y1', 0).attr('y2', ih)
            .attr('stroke', css('--c-ref')).attr('stroke-dasharray', '5 4');

        var act = VC.layers.filter(function (l) { return l.enabled; })
            .sort(function (a, b) { return a.radius - b.radius; });
        if (!act.length) {
            // Centred left of the electrode-radius guide, on a background pill
            // so the vertical gridlines do not run through it.
            var bg = g.append('rect').attr('fill', css('--bg-2')).attr('rx', 4);
            var tx = g.append('text').attr('x', xs / 2).attr('y', y(0.0316) + 4).attr('text-anchor', 'middle')
                .attr('fill', T.textDim).attr('font-size', 13).text('no layers enabled: homogeneous medium');
            var b = tx.node().getBBox();
            bg.attr('x', b.x - 8).attr('y', b.y - 4).attr('width', b.width + 16).attr('height', b.height + 8);
            return;
        }
        var r0 = 0, prevY = null, prevX = null;
        act.forEach(function (l, i) {
            var r1 = i === act.length - 1 ? R_MAX : l.radius;
            if (r1 <= r0) return;
            var yy = y(l.sigma), c = css('--c-t-' + l.key);
            if (prevY !== null) {
                g.append('line').attr('x1', prevX).attr('x2', prevX).attr('y1', prevY).attr('y2', yy)
                    .attr('stroke', T.fg(0.3)).attr('stroke-width', 1.2);
            }
            g.append('line').attr('x1', x(r0)).attr('x2', x(r1)).attr('y1', yy).attr('y2', yy)
                .attr('stroke', c).attr('stroke-width', 3).attr('stroke-linecap', 'butt');
            prevY = yy; prevX = x(r1); r0 = r1;
        });
    }

    window.VC.onRender(render);
})();
