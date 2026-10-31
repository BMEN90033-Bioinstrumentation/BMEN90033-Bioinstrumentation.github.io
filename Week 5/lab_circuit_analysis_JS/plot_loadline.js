// Section 02 · DC load line V_CE = V_CC - I_C (R_C + R_E) with the bias
// current set by the base divider and the Q-point. When the bias current
// would need V_CE below V_CE(sat), the point is drawn at the saturation end
// of the load line. The Q-point label is placed by collision test.
(function () {
    var sel = '#plot-loadline';

    function render() {
        var L = window.LCA, P = L.params(), T = window.T, css = window.CMP.cssVar;
        var f = L.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;
        var Rsum = P.RC + L.RE, iMax = L.VCC / Rsum * 1e3;
        var x = d3.scaleLinear().domain([0, L.VCC]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, Math.max(iMax, P.IC * 1e3) * 1.15]).range([ih, 0]);

        g.append('rect').attr('x', 0).attr('y', 0).attr('width', x(L.VCE_SAT)).attr('height', ih)
            .attr('fill', css('--c-sat-band'));
        L.axes(f, g, x, y, ih, 0, { yTitle: 'I_C\\;[\\mathrm{mA}]', xTitle: 'V_{CE}\\;[\\mathrm{V}]' });

        var Pl = L.placer(f);
        var ll = [[x(0), y(iMax)], [x(L.VCC), y(0)]];
        g.append('line').attr('x1', ll[0][0]).attr('y1', ll[0][1]).attr('x2', ll[1][0]).attr('y2', ll[1][1])
            .attr('stroke', css('--c-load')).attr('stroke-width', 1.8).attr('stroke-dasharray', '6 4');
        Pl.line(ll);
        var yb = y(P.IC * 1e3);
        g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yb).attr('y2', yb)
            .attr('stroke', css('--c-bias')).attr('stroke-width', 1.4).attr('stroke-dasharray', '2 4');
        Pl.line([[0, yb], [iw, yb]]);

        var qv = P.sat ? L.VCE_SAT : P.VCE, qi = P.sat ? (L.VCC - L.VCE_SAT) / Rsum : P.IC;
        var qx = x(qv), qy = y(qi * 1e3), qc = css(P.sat ? '--c-warn' : '--c-q');
        g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 10).attr('fill', qc).attr('fill-opacity', 0.25);
        g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 5).attr('fill', qc).attr('stroke', T.text);
        Pl.box([qx - 11, qy - 11, qx + 11, qy + 11]);

        var txt = P.sat ? '\\text{Q, saturated}'
            : '\\text{Q}\\;(' + P.VCE.toFixed(2) + '\\,\\text{V},\\ ' + (P.IC * 1e3).toFixed(2) + '\\,\\text{mA})';
        Pl.label(txt, function (w, h) {
            var dx = w / 2 + 14, dy = h / 2 + 10;
            return [[qx + dx, qy - dy], [qx - dx, qy - dy], [qx + dx, qy + dy], [qx - dx, qy + dy],
                    [qx + dx, qy - dy - 20], [qx - dx, qy - dy - 20], [qx + dx, qy + dy + 20], [qx - dx, qy + dy + 20]];
        }, { color: qc, anchor: [qx, qy] });
    }

    window.LCA.onRender(render);
})();
