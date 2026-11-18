// Section 04 · Equivalent circuit of the interface and the magnitude of its
// impedance, |Z(f)| = |R_s + R_ct / (1 + j 2 pi f R_ct C_dl)|, on log axes.
// The circuit is static; the Bode plot follows the sliders.
(function () {
    var F_MIN = 1e-2, F_MAX = 1e5;
    var ECG = [0.05, 150];   // diagnostic ECG bandwidth, Hz

    // Circuit in a fixed 640 x 236 viewBox: orthogonal wires, resistors as
    // rectangles, the half-cell potential as a circle with + on the lead side.
    function circuit() {
        var T = window.T;
        var svg = d3.select('#circuit-eq');
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 640 236').attr('preserveAspectRatio', 'xMidYMid meet');
        var Y = 132, YT = 92, YB = 172;
        function wire(d) { svg.append('path').attr('d', d).attr('fill', 'none').attr('stroke', T.wire).attr('stroke-width', 1.8); }
        function res(cx, cy) {
            svg.append('rect').attr('x', cx - 36).attr('y', cy - 12).attr('width', 72).attr('height', 24)
                .attr('fill', T.plotBg).attr('stroke', T.wire).attr('stroke-width', 1.8);
        }
        function node(cx, open) {
            svg.append('circle').attr('cx', cx).attr('cy', Y).attr('r', open ? 5 : 3.5)
                .attr('fill', open ? T.plotBg : T.wire).attr('stroke', T.wire).attr('stroke-width', 1.8);
        }
        function tex(s, cx, cy, w) { window.renderKatex(svg, s, cx, cy, { width: w || 120, height: 26, size: 20 }); }

        wire('M45,' + Y + 'H108');                                   // lead terminal to source
        wire('M152,' + Y + 'H225');                                  // source to node A
        wire('M225,' + Y + 'V' + YT + 'H405V' + Y);                  // upper branch, R_ct
        wire('M225,' + Y + 'V' + YB + 'H309M321,' + YB + 'H405V' + Y);   // lower branch, C_dl
        wire('M405,' + Y + 'H590');                                  // node B through R_s to the terminal
        svg.append('circle').attr('cx', 130).attr('cy', Y).attr('r', 22)
            .attr('fill', T.plotBg).attr('stroke', T.wire).attr('stroke-width', 1.8);
        // Polarity marks inside the source, clear of both wires.
        [['+', 119], ['\u2212', 141]].forEach(function (s) {
            svg.append('text').attr('x', s[1]).attr('y', Y + 5.5).attr('text-anchor', 'middle')
                .attr('font-size', 18).attr('fill', T.text).text(s[0]);
        });
        res(315, YT);
        res(490, Y);
        [309, 321].forEach(function (cx) {
            svg.append('line').attr('x1', cx).attr('x2', cx).attr('y1', YB - 18).attr('y2', YB + 18)
                .attr('stroke', T.wire).attr('stroke-width', 2.4);
        });
        node(225); node(405); node(45, true); node(590, true);

        tex('E_\\text{hc}', 130, Y - 42);
        tex('R_\\text{ct}', 315, YT - 28);
        tex('C_\\text{dl}', 315, YB + 36);
        tex('R_\\text{s}', 490, Y - 28);
        tex('\\text{lead}', 45, Y + 26);
        tex('\\text{electrolyte}', 580, Y + 26);
    }

    function render() {
        var B = window.ELI, T = window.T, css = window.CMP.cssVar;
        var c = B.circuit();
        var f = B.frame('#plot-z', { margin: { right: 30 } });
        var g = f.g;
        var x = d3.scaleLog().domain([F_MIN, F_MAX]).range([0, f.iw]);
        var y = d3.scaleLog().domain([10, 1e6]).range([f.ih, 0]).clamp(true);
        var pow = function (d) { return d >= 1e6 ? d / 1e6 + ' M' : d >= 1e3 ? d / 1e3 + ' k' : String(d); };

        // ECG band, drawn under the grid.
        g.append('rect').attr('x', x(ECG[0])).attr('width', x(ECG[1]) - x(ECG[0])).attr('y', 0).attr('height', f.ih)
            .attr('fill', css('--c-band'));
        B.axes(f, g, x, y, {
            xTicks: [1e-2, 1e-1, 1, 10, 100, 1e3, 1e4, 1e5],
            yTicks: [10, 100, 1e3, 1e4, 1e5, 1e6],
            xFormat: pow, yFormat: pow,
            xTitle: 'f\\;[\\mathrm{Hz}]',
            yTitle: '|Z|\\;[\\Omega]'
        });

        // Corner frequency of R_ct and C_dl.
        if (c.fc > F_MIN && c.fc < F_MAX) {
            g.append('line').attr('x1', x(c.fc)).attr('x2', x(c.fc)).attr('y1', 0).attr('y2', f.ih)
                .attr('stroke', css('--c-ref')).attr('stroke-dasharray', '4 4');
        }
        var fs = d3.range(0, 281).map(function (i) { return F_MIN * Math.pow(F_MAX / F_MIN, i / 280); });
        g.append('path').attr('class', 'trace').attr('stroke', css('--c-z'))
            .attr('d', d3.line()(fs.map(function (v) { return [x(v), y(B.zmag(v, c))]; })));

        B.out({
            'z-rct': B.fmtOhm(c.Rct),
            'z-c': (c.C * 1e6).toPrecision(3) + ' µF',
            'z-fc': c.fc >= 1000 ? (c.fc / 1000).toPrecision(3) + ' kHz' : c.fc.toPrecision(3) + ' Hz',
            'z-lo': B.fmtOhm(B.zmag(ECG[0], c)),
            'z-hi': B.fmtOhm(B.zmag(ECG[1], c)),
            'z-ratio': (B.zmag(ECG[0], c) / B.zmag(ECG[1], c)).toPrecision(3)
        });
    }

    window.ELI.onRender(circuit);
    window.ELI.onRender(render);
})();
