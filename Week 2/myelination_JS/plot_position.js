// Section 02 · Wavefront position against time for both fibres, from a
// fixed-step run of the model's timing rules. Upper panel: the full cycle.
// Lower panel: the interval in which the myelinated front crosses the axon,
// so the dwell-and-jump steps are resolved. The dashed guide marks the
// recording point; the cursor marks the present instant. Series and guide are
// identified by the HTML legend, so the panels carry no in-plot text.
(function () {
    var sel = '#plot-position';
    var M = window.MYE, refs = null;

    function render() {
        var css = window.CMP.cssVar, T = window.T;
        var root = d3.select(sel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect();
        var W = rect.width, H = rect.height || 500;
        var m = { top: 40, right: 24, bottom: 62, left: 78 }, gap = 70;
        var iw = W - m.left - m.right, ph = (H - m.top - m.bottom - gap) / 2;
        var svg = root.append('svg').attr('width', W).attr('height', H);

        var run = M.simulate(), L = M.HALF_LEN;
        var Tc = run[run.length - 1].t;
        var tm = run.find(function (d) { return d.m >= L; });
        var Td = Math.min(Tc, (tm ? tm.t : Tc) * 1.25);
        var y = d3.scaleLinear().domain([0, M.AXON_LENGTH + 5]).range([ph, 0]);   // headroom so the end of the axon is not on the frame

        var panels = [[0, Tc], [0, Td]].map(function (dom, i) {
            var oy = m.top + i * (ph + gap);
            var g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + oy + ')');
            var x = d3.scaleLinear().domain(dom).range([0, iw]);
            window.CMP.drawGrid(g, x, y, iw, ph, { xTicks: x.ticks(6), yTicks: [0, 20, 40, 60] });
            var xa = g.append('g').attr('transform', 'translate(0,' + ph + ')').call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));
            var ya = g.append('g').call(d3.axisLeft(y).tickValues([0, 20, 40, 60]).tickSizeOuter(0));
            [xa, ya].forEach(window.CMP.styleAxis);
            window.renderKatex(svg, 'x\\;[\\text{a.u.}]', 22, oy + ph / 2, { width: 160, height: 22, rotate: -90, size: 16 });
            window.renderKatex(svg, 't\\;[\\mathrm{s}]', m.left + iw / 2, oy + ph + 42, { width: 120, height: 22, size: 16 });

            var clipId = 'mye-clip-' + i;
            svg.append('clipPath').attr('id', clipId).append('rect').attr('width', iw).attr('height', ph);
            var inner = g.append('g').attr('clip-path', 'url(#' + clipId + ')');
            var ry = y(M.RECORD_X + L);
            inner.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ry).attr('y2', ry)
                .attr('stroke', css('--c-rec')).attr('stroke-opacity', 0.8).attr('stroke-dasharray', '6 4');
            var vis = run.filter(function (d) { return d.t <= dom[1] + 1e-9; });
            var uPts = vis.filter(function (d) { return d.u <= L; });
            inner.append('path').attr('class', 'trace').attr('stroke', css('--c-depol'))
                .attr('d', d3.line().x(function (d) { return x(d.t); }).y(function (d) { return y(d.u + L); })(uPts));
            inner.append('path').attr('class', 'trace').attr('stroke', css('--c-myelin'))
                .attr('d', d3.line().x(function (d) { return x(d.t); }).y(function (d) { return y(d.m + L); })(vis));
            var cur = inner.append('line').attr('y1', 0).attr('y2', ph).attr('stroke', T.fg(0.45)).attr('stroke-dasharray', '3 4');
            var du = inner.append('circle').attr('r', 4.5).attr('fill', css('--c-depol')).attr('stroke', T.text).attr('stroke-width', 1);
            var dm = inner.append('circle').attr('r', 4.5).attr('fill', css('--c-myelin')).attr('stroke', T.text).attr('stroke-width', 1);
            return { x: x, dom: dom, cur: cur, du: du, dm: dm };
        });
        refs = { y: y, panels: panels };
        tick();
    }

    function tick() {
        if (!refs) return;
        var s = M.s, L = M.HALF_LEN, y = refs.y;
        refs.panels.forEach(function (pn) {
            var show = s.t <= pn.dom[1], px = pn.x(s.t);
            pn.cur.attr('display', show ? null : 'none').attr('x1', px).attr('x2', px);
            pn.du.attr('display', show && s.unmyelX <= L ? null : 'none').attr('cx', px).attr('cy', y(s.unmyelX + L));
            pn.dm.attr('display', show ? null : 'none').attr('cx', px).attr('cy', y(s.myelX + L));
        });
    }

    M.onRender(render);
    M.onTick(tick, document.querySelector(sel));
})();
