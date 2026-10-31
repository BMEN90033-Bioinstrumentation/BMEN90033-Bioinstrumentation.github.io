// Section 02 · Carrier concentrations n(x) and p(x) along the device, log or
// linear scale. Region shading, junction guides and depletion bands as in
// the original. Single quadrant. The x axis carries region names in place
// of numeric ticks; log-axis tick labels are KaTeX powers of ten. Series
// are identified by the HTML legend, so the plot has no in-plot labels.
(function () {
    var sel = '#plot-conc';
    var LIN_MAX = 2e19;   // top of the linear axis, cm^-3

    function render() {
        var B = window.BJS, p = B.p, T = window.T, css = window.CMP.cssVar;
        var npn = p.type === 'NPN', log = p.scale === 'log';
        var root = d3.select(sel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect(), W = rect.width, H = rect.height;
        var m = { top: 40, right: 24, bottom: 66, left: 84 };
        var iw = W - m.left - m.right, ih = H - m.top - m.bottom;
        var svg = root.append('svg').attr('width', W).attr('height', H);
        var g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

        var x = d3.scaleLinear().domain([0, 1]).range([0, iw]);
        // Profiles are in log10 units; map to pixels for the chosen scale.
        var yLog = d3.scaleLinear().domain([0, 20]).range([ih, 0]);
        var yLin = d3.scaleLinear().domain([0, LIN_MAX]).range([ih, 0]).clamp(true);
        function Y(lv) { return log ? yLog(lv) : yLin(Math.pow(10, lv)); }

        // Region shading.
        var cN = css('--c-ntype'), cP = css('--c-ptype');
        [[0, B.EF, npn ? cN : cP], [B.BEJ, B.BCJ, npn ? cP : cN], [B.BCJ, 1, npn ? cN : cP]].forEach(function (s) {
            g.append('rect').attr('x', x(s[0])).attr('y', 0).attr('width', x(s[1]) - x(s[0])).attr('height', ih)
                .attr('fill', s[2]).attr('fill-opacity', 0.07);
        });

        // Grid and y axis.
        var yt = log ? [0, 4, 8, 12, 16, 20] : [0, 0.5e19, 1e19, 1.5e19, 2e19];
        var gy = log ? yLog : yLin;
        g.append('g').attr('class', 'grid').selectAll('line').data(yt).join('line')
            .attr('x1', 0).attr('x2', iw).attr('y1', gy).attr('y2', gy)
            .attr('stroke', css('--grid-line'));
        var ya = g.append('g').call(d3.axisLeft(gy).tickValues(yt).tickSizeOuter(0)
            .tickFormat(log ? function () { return ''; } : function (v) { return d3.format('~g')(v / 1e19); }));
        window.CMP.styleAxis(ya);
        if (log) yt.forEach(function (v) {
            window.renderKatex(svg, '10^{' + v + '}', m.left - 26, m.top + yLog(v), { width: 44, height: 18, size: 13, color: T.textDim, align: 'right' });
        });

        // Depletion bands and junction guides.
        var dep = B.plotDepletion();
        [[B.BEJ, dep.be], [B.BCJ, dep.bc]].forEach(function (d) {
            g.append('rect').attr('x', x(d[0] - d[1])).attr('y', 0).attr('width', x(2 * d[1]) - x(0)).attr('height', ih)
                .attr('fill', T.grid);
            g.append('line').attr('x1', x(d[0])).attr('x2', x(d[0])).attr('y1', 0).attr('y2', ih)
                .attr('stroke', T.overlay20).attr('stroke-dasharray', '4 4');
        });

        // x axis line and region names centred under each region.
        g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ih).attr('y2', ih).attr('stroke', T.gridAxis);
        [['emitter', B.EF / 2], ['base', B.BEJ + B.BF / 2], ['collector', B.BCJ + B.CF / 2]].forEach(function (q) {
            g.append('text').attr('x', x(q[1])).attr('y', ih + 18).attr('text-anchor', 'middle')
                .attr('fill', T.text).attr('font-size', 12).text(q[0]);
        });

        // Profiles.
        var pr = B.profiles(), fr = d3.range(0, 301).map(function (i) { return i / 300; });
        [['--c-electron', pr.logN], ['--c-hole', pr.logP]].forEach(function (s) {
            g.append('path').attr('class', 'trace').attr('stroke', css(s[0]))
                .attr('d', d3.line().x(function (f) { return x(f); }).y(function (f) { return Y(s[1](f)); })(fr));
        });

        window.renderKatex(svg, log ? 'n,\\ p\\;[\\mathrm{cm^{-3}}]' : 'n,\\ p\\;[10^{19}\\,\\mathrm{cm^{-3}}]',
            20, m.top + ih / 2, { width: 240, height: 22, rotate: -90, size: 16 });
        window.renderKatex(svg, 'x\\;(\\text{position along the device})', m.left + iw / 2, H - 18,
            { width: 320, height: 22, size: 16 });
    }

    window.BJS.onRender(render);
})();
