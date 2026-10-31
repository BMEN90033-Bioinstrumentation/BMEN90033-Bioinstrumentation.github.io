// Section 04 · Bode magnitude |H(jw)| in dB over the full test-frequency
// range (1 to 1e9 rad/s). Draws the mid-band and -20 dB/decade asymptotes,
// the w0 guide, the -3 dB point and the test-frequency marker. Every
// in-plot label is placed by collision test against all lines, markers and
// earlier labels; a label with no free candidate is omitted (its value is
// also in the readout row).
(function () {
    var sel = '#plot-bode';
    var DB_MIN = -30, DB_MAX = 70;

    function render() {
        var A = window.AMP, p = A.p, s = A.state(), T = window.T, css = window.CMP.cssVar;
        var f = A.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLog().domain([A.FREQ_MIN, A.FREQ_MAX]).range([0, iw]);
        var y = d3.scaleLinear().domain([DB_MIN, DB_MAX]).range([ih, 0]);
        A.axes(f, x, y, {
            log: true, yTicks: d3.range(DB_MIN, DB_MAX + 1, 10),
            yTitle: '|H(j\\omega)|\\;[\\mathrm{dB}]',
            xTitle: '\\omega\\;[\\mathrm{rad/s}]'
        });

        var P = A.placer(f);
        f.svg.append('clipPath').attr('id', 'clip-bode').append('rect').attr('width', iw).attr('height', ih);
        var clip = g.append('g').attr('clip-path', 'url(#clip-bode)');
        var avDb = 20 * Math.log10(p.Av), w0 = s.w0, xw0 = x(Math.min(Math.max(w0, A.FREQ_MIN), A.FREQ_MAX));
        var cOut = css('--c-out'), cTest = css('--c-test'), cGuide = css('--c-guide');

        function seg(pts, col, w, dash) {
            clip.append('path').attr('d', d3.line()(pts)).attr('fill', 'none')
                .attr('stroke', col).attr('stroke-width', w).attr('stroke-dasharray', dash || null);
            P.line(pts);
        }

        // Asymptotes: mid-band line across the plot, -20 dB/dec from w0.
        seg([[0, y(avDb)], [iw, y(avDb)]], T.fg(0.35), 1.2, '6 4');
        var dEnd = Math.log10(A.FREQ_MAX) - Math.log10(w0);
        if (dEnd > 0) seg([[x(w0), y(avDb)], [iw, y(avDb - 20 * dEnd)]], T.fg(0.35), 1.2, '3 3');
        // w0 guide.
        if (w0 >= A.FREQ_MIN && w0 <= A.FREQ_MAX) seg([[xw0, 0], [xw0, ih]], cGuide, 1.2, '6 4');

        // Magnitude curve (clipped to the plot area for the obstacle test).
        var curve = d3.range(0, 601).map(function (i) {
            var w = Math.pow(10, 9 * i / 600);
            return [x(w), y(A.gainDb(w))];
        });
        clip.append('path').attr('class', 'trace').attr('stroke', cOut).attr('d',
            d3.line()(curve));
        P.line(curve);

        // -3 dB point.
        var y3 = y(avDb - 3);
        if (w0 >= A.FREQ_MIN && w0 <= A.FREQ_MAX) {
            clip.append('circle').attr('cx', xw0).attr('cy', y3).attr('r', 5.5).attr('fill', cOut);
            P.box([xw0 - 7, y3 - 7, xw0 + 7, y3 + 7]);
        }

        // Test-frequency marker with guides to both axes.
        var tx = x(p.testFreq), ty = y(s.db);
        var onPlot = ty >= 0 && ty <= ih;
        if (onPlot) {
            seg([[tx, ty], [tx, ih]], cTest, 1, '2 3');
            seg([[0, ty], [tx, ty]], cTest, 1, '2 3');
            clip.append('circle').attr('cx', tx).attr('cy', ty).attr('r', 6.5).attr('fill', cTest)
                .attr('stroke', T.fg(0.4)).attr('stroke-width', 1);
            P.box([tx - 8, ty - 8, tx + 8, ty + 8]);
        }

        // Labels, in order of priority.
        if (onPlot) {
            P.label(s.db.toFixed(1) + '\\,\\text{dB}', function (w, h) {
                var dx = w / 2 + 12, dy = h / 2 + 8;
                return [[tx + dx, ty - dy], [tx - dx, ty - dy], [tx + dx, ty + dy], [tx - dx, ty + dy],
                        [tx + dx, ty - dy - 16], [tx - dx, ty - dy - 16]];
            }, { color: cTest });
        }
        if (w0 >= A.FREQ_MIN && w0 <= A.FREQ_MAX) {
            P.label('-3\\,\\text{dB}', function (w, h) {
                return [[xw0 - w / 2 - 10, y3 + h / 2 + 6], [xw0 + w / 2 + 10, y3 + h / 2 + 8],
                        [xw0 - w / 2 - 10, y3 + h + 14], [xw0 + w / 2 + 10, y3 - h / 2 - 8]];
            }, { color: cOut });
            P.label('\\omega_0', function (w, h) {
                return [[xw0 + w / 2 + 6, h / 2 + 6], [xw0 - w / 2 - 6, h / 2 + 6],
                        [xw0 + w / 2 + 6, ih - h / 2 - 6], [xw0 - w / 2 - 6, ih - h / 2 - 6]];
            }, { color: cGuide });
        }
        if (dEnd > 0.6) {
            P.label('-20\\,\\text{dB/dec}', function (w, h) {
                var out = [];
                [1.5, 1, 2, 2.5, 3, 0.8].forEach(function (d) {
                    if (d > dEnd) return;
                    var px = x(w0 * Math.pow(10, d)), py = y(avDb - 20 * d);
                    out.push([px + w / 2 + 6, py - h / 2 - 6], [px - w / 2 - 4, py + h / 2 + 6]);
                });
                return out;
            }, { color: T.textDim });
        }
        P.label('\\text{mid-band } ' + avDb.toFixed(1) + '\\,\\text{dB}', function (w, h) {
            var yl = y(avDb);
            return [[iw - w / 2 - 8, yl - h / 2 - 6], [w / 2 + 8, yl - h / 2 - 6],
                    [iw * 0.5, yl - h / 2 - 6], [w / 2 + 8, yl + h / 2 + 6]];
        }, { color: T.textDim });
    }

    window.AMP.onRender(render);
})();
