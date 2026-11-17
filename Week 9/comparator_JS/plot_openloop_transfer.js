// Section 02 · Open-loop op-amp transfer characteristic.
// Four-quadrant plot: V_in on x, V_out on y. Output saturates to the rails
// almost immediately because A_OL is very large; the linear region is
// drawn at an exaggerated width so it is visible at all.
(function () {
    var sel = '#plot-openloop-transfer';

    var Vsat = 12;        // supply rails in volts, drawn at +/- 12 V
    var Vlin = 0.06;      // exaggerated half-width of the linear region in V

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || 380;

        // Margins: extra top for the vertical axis title and right for the
        // horizontal axis title, four-quadrant rule.
        var margin = { top: 76, right: 80, bottom: 36, left: 64 };
        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top - margin.bottom;

        var svg = root.append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);

        var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var x = d3.scaleLinear().domain([-1.0, 1.0]).range([0, innerW]);
        var y = d3.scaleLinear().domain([-15, 15]).range([innerH, 0]);

        // Grid + zero axis lines
        window.CMP.drawGrid(g, x, y, innerW, innerH, {
            xTicks: [-1.0, -0.5, 0, 0.5, 1.0],
            yTicks: [-15, -10, -5, 0, 5, 10, 15]
        });

        // Saturation bands (faint shading to indicate where the output sits)
        var bandOpacity = 0.06;
        g.append('rect')
            .attr('x', 0).attr('y', y(Vsat))
            .attr('width', innerW).attr('height', y(0) - y(Vsat))
            .attr('fill', window.CMP.cssVar('--c-output')).attr('opacity', bandOpacity);
        g.append('rect')
            .attr('x', 0).attr('y', y(0))
            .attr('width', innerW).attr('height', y(-Vsat) - y(0))
            .attr('fill', window.CMP.cssVar('--c-output')).attr('opacity', bandOpacity);

        // Rail dashed lines
        [Vsat, -Vsat].forEach(function (v) {
            g.append('line')
                .attr('x1', 0).attr('x2', innerW)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', window.CMP.cssVar('--c-rail'))
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4 4');
        });

        // Transfer curve: clipped linear region.
        // v_out = clamp(A_OL * v_in, -Vsat, +Vsat). The slope inside the
        // window |v_in| < Vlin is steep but finite for visibility.
        var pts = [];
        var n = 600;
        for (var i = 0; i <= n; i++) {
            var vin = x.domain()[0] + (x.domain()[1] - x.domain()[0]) * i / n;
            var vout;
            if (vin > Vlin) vout = Vsat;
            else if (vin < -Vlin) vout = -Vsat;
            else vout = (Vsat / Vlin) * vin;
            pts.push([vin, vout]);
        }
        var line = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
        g.append('path')
            .datum(pts)
            .attr('class', 'trace output')
            .attr('d', line);

        // Axes (ticks drawn through zero crossings)
        var xAxisG = g.append('g')
            .attr('transform', 'translate(0,' + y(0) + ')')
            .call(d3.axisBottom(x).tickValues([-1.0, -0.5, 0.5, 1.0]).tickSize(6).tickFormat(d3.format('.1f')));
        var yAxisG = g.append('g')
            .attr('transform', 'translate(' + x(0) + ',0)')
            .call(d3.axisLeft(y).tickValues([-15, -10, -5, 5, 10, 15]).tickSize(6).tickFormat(d3.format('d')));
        window.CMP.styleAxis(xAxisG);
        window.CMP.styleAxis(yAxisG);
        // The curve passes left of the axis for v_out < 0, so the negative
        // tick labels sit on the right of the axis, clear of the trace.
        var negTicks = yAxisG.selectAll('.tick').filter(function (d) { return d < 0; });
        negTicks.select('line').attr('x2', 6);
        negTicks.select('text').attr('x', 9).attr('text-anchor', 'start');

        // Annotate rail values at the right edge
        var labW = 70;
        window.renderKatex(svg, 'V_\\text{sat}^{+} \\, =\\, +12\\,\\text{V}',
            margin.left + innerW - labW / 2 - 6, margin.top + y(Vsat) - 12,
            { width: 170, height: 22, size: 13, color: window.CMP.cssVar('--c-output') });
        window.renderKatex(svg, 'V_\\text{sat}^{-} \\, =\\, -12\\,\\text{V}',
            margin.left + innerW - labW / 2 - 6, margin.top + y(-Vsat) + 14,
            { width: 170, height: 22, size: 13, color: window.CMP.cssVar('--c-output') });

        // Transition annotation
        // Placed left of the axis between the 0 and 5 V ticks, with a
        // horizontal leader to the linear segment.
        var annY = y(2.5);
        window.renderKatex(svg, '\\Delta v_\\text{lin} \\sim 240\\,\\mu\\text{V}',
            margin.left + x(0) - 130, margin.top + annY,
            { width: 130, height: 22, size: 13, color: window.T.textDim, align: 'right' });
        g.append('line')
            .attr('x1', x(0) - 60).attr('x2', x(0) - 4)
            .attr('y1', annY).attr('y2', annY)
            .attr('stroke', window.T.textDim).attr('stroke-width', 1);

        // Four-quadrant axis titles
        // y-axis title: above plot, centred on y-axis (x = 0 in data)
        window.renderKatex(svg, 'v_\\text{out} \\, [\\mathrm{V}]',
            margin.left + x(0), margin.top - 20,
            { width: 160, height: 24, size: 14 });
        // x-axis title: right of plot, centred on x-axis (y = 0 in data)
        window.renderKatex(svg, 'v_\\text{in} \\, [\\mathrm{V}]',
            margin.left + innerW + 38, margin.top + y(0),
            { width: 100, height: 24, size: 14 });
    }

    function init() {
        render();
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
