// Shared plotting helpers for the filter_applications page.
// Provides setupTimePlot (linear-time amplitude) and setupMagPlot
// (linear-frequency magnitude). Both build axes, gridlines, and
// KaTeX-rendered axis titles, returning a handle that lets each
// section draw its own traces.
(function () {
    var T = window.T;

    function styleAxis(ax) {
        ax.selectAll('path,line').attr('stroke', T.gridAxis);
        ax.selectAll('text')
            .attr('fill', T.text)
            .attr('font-size', 13)
            .attr('font-family', "'JetBrains Mono', monospace");
    }

    // Single-panel time plot. yDomain symmetric around 0 by default.
    function setupTimePlot(opts) {
        var sel = opts.sel;
        var xDomain = opts.xDomain || [0, 1];
        var yDomain = opts.yDomain || [-1.2, 1.2];
        var xTitle  = opts.xTitle  || 't \\, [\\mathrm{s}]';
        var yTitle  = opts.yTitle  || 'amplitude';
        var margin  = opts.margin  || { top: 30, right: 28, bottom: 50, left: 76 };
        var legend  = (opts.legend || []).filter(function (it) { return it.show !== false; });

        var root = d3.select(sel);
        root.selectAll('*').remove();

        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || 320;

        var innerW = W - margin.left - margin.right;

        // Legend rows sit in the top margin, below the panel label, so the
        // legend never covers a trace. Items wrap when the plot is narrow.
        var CH = 7.9, SW = 18, ROW = 18;   // 13 px mono advance, swatch, row height
        var lx = 0, row = 0;
        legend.forEach(function (it) {
            var w = SW + 6 + it.label.length * CH + 16;
            if (lx > 0 && lx + w - 16 > innerW) { lx = 0; row++; }
            it._x = lx; it._row = row; lx += w;
        });
        if (legend.length) margin = Object.assign({}, margin, { top: margin.top + ROW * (row + 1) + 2 });

        var innerH = H - margin.top  - margin.bottom;

        var svg = root.append('svg')
            .attr('class', 'fp')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);

        var x = d3.scaleLinear().domain(xDomain).range([0, innerW]);
        var y = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

        var g = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        legend.forEach(function (it) {
            var ly = -ROW * (row - it._row) - 10;
            g.append('line')
                .attr('x1', it._x).attr('x2', it._x + SW)
                .attr('y1', ly - 4).attr('y2', ly - 4)
                .attr('stroke', it.color).attr('stroke-width', 2.2)
                .attr('stroke-dasharray', it.dashed ? '4 4' : null);
            g.append('text')
                .attr('x', it._x + SW + 6).attr('y', ly)
                .text(it.label);
        });

        // Gridlines
        var yTicks = opts.yTicks || y.ticks(5);
        var xTicks = opts.xTicks || x.ticks(8);

        g.append('g').attr('class', 'grid')
            .selectAll('line.gy').data(yTicks).join('line')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', function (d) { return y(d); })
            .attr('y2', function (d) { return y(d); })
            .attr('stroke', T.grid).attr('stroke-width', 1);

        g.append('g').attr('class', 'grid')
            .selectAll('line.gx').data(xTicks).join('line')
            .attr('y1', 0).attr('y2', innerH)
            .attr('x1', function (d) { return x(d); })
            .attr('x2', function (d) { return x(d); })
            .attr('stroke', T.grid).attr('stroke-width', 1);

        // Zero line emphasised
        if (yDomain[0] < 0 && yDomain[1] > 0) {
            g.append('line')
                .attr('x1', 0).attr('x2', innerW)
                .attr('y1', y(0)).attr('y2', y(0))
                .attr('stroke', T.gridStrong).attr('stroke-width', 1.2);
        }

        var xAxis = d3.axisBottom(x).tickValues(xTicks).tickSizeOuter(0)
            .tickFormat(opts.xTickFormat || d3.format('~g'));
        var yAxis = d3.axisLeft(y).tickValues(yTicks).tickSizeOuter(0)
            .tickFormat(opts.yTickFormat || d3.format('~g'));

        var xg = g.append('g').attr('transform', 'translate(0,' + innerH + ')').call(xAxis);
        var yg = g.append('g').call(yAxis);
        styleAxis(xg);
        styleAxis(yg);

        g.append('rect')
            .attr('x', 0).attr('y', 0)
            .attr('width', innerW).attr('height', innerH)
            .attr('fill', 'none')
            .attr('stroke', T.gridStrong).attr('stroke-width', 1);

        // Axis titles (single quadrant: y rotated, both outside the frame)
        window.renderKatex(svg, yTitle,
            18, margin.top + innerH / 2,
            { width: 200, height: 24, rotate: -90, size: 14 });
        window.renderKatex(svg, xTitle,
            margin.left + innerW / 2, H - 12,
            { width: 240, height: 24, size: 14 });

        return {
            svg: svg, g: g, x: x, y: y,
            innerW: innerW, innerH: innerH, margin: margin, W: W, H: H
        };
    }

    // Magnitude vs frequency plot, linear axes. Used for filter responses
    // and discrete spectra. yDomain is amplitude in [0, 1] by default.
    function setupMagPlot(opts) {
        var sel = opts.sel;
        var xDomain = opts.xDomain || [0, 100];
        var yDomain = opts.yDomain || [0, 1.05];
        var xTitle  = opts.xTitle  || 'f \\, [\\mathrm{Hz}]';
        var yTitle  = opts.yTitle  || '|H(f)|';
        var margin  = opts.margin  || { top: 30, right: 28, bottom: 50, left: 78 };

        var root = d3.select(sel);
        root.selectAll('*').remove();

        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || 220;

        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top  - margin.bottom;

        var svg = root.append('svg')
            .attr('class', 'fp')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);

        var x = d3.scaleLinear().domain(xDomain).range([0, innerW]);
        var y = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

        var g = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var yTicks = opts.yTicks || y.ticks(4);
        var xTicks = opts.xTicks || x.ticks(8);

        g.append('g').attr('class', 'grid')
            .selectAll('line.gy').data(yTicks).join('line')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', function (d) { return y(d); })
            .attr('y2', function (d) { return y(d); })
            .attr('stroke', T.grid).attr('stroke-width', 1);

        g.append('g').attr('class', 'grid')
            .selectAll('line.gx').data(xTicks).join('line')
            .attr('y1', 0).attr('y2', innerH)
            .attr('x1', function (d) { return x(d); })
            .attr('x2', function (d) { return x(d); })
            .attr('stroke', T.grid).attr('stroke-width', 1);

        var xAxis = d3.axisBottom(x).tickValues(xTicks).tickSizeOuter(0)
            .tickFormat(opts.xTickFormat || d3.format('~g'));
        var yAxis = d3.axisLeft(y).tickValues(yTicks).tickSizeOuter(0)
            .tickFormat(opts.yTickFormat || d3.format('~g'));

        var xg = g.append('g').attr('transform', 'translate(0,' + innerH + ')').call(xAxis);
        var yg = g.append('g').call(yAxis);
        styleAxis(xg);
        styleAxis(yg);

        g.append('rect')
            .attr('x', 0).attr('y', 0)
            .attr('width', innerW).attr('height', innerH)
            .attr('fill', 'none')
            .attr('stroke', T.gridStrong).attr('stroke-width', 1);

        window.renderKatex(svg, yTitle,
            18, margin.top + innerH / 2,
            { width: 200, height: 24, rotate: -90, size: 14 });
        window.renderKatex(svg, xTitle,
            margin.left + innerW / 2, H - 12,
            { width: 240, height: 24, size: 14 });

        return {
            svg: svg, g: g, x: x, y: y,
            innerW: innerW, innerH: innerH, margin: margin, W: W, H: H
        };
    }

    window.PlotHelpers = {
        setupTimePlot: setupTimePlot,
        setupMagPlot: setupMagPlot,
        styleAxis: styleAxis
    };
})();
