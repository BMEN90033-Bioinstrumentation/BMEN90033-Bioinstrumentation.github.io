// Section 02 · Potential along the electrode line (upper slab surface,
// y = H/2 + 0.2, z = 0) at the present instant. x is measured from the
// stimulated end, so the slab spans 0..40. The electrode labels sit in the
// top margin above their guides, outside the plot, so they cannot meet the
// trace. Front positions are identified by the HTML legend.
(function () {
    var sel = '#plot-profile';
    var A = window.APD, X0 = A.HALF_LEN, N = 400;
    var refs = null;

    function render() {
        var css = window.CMP.cssVar, T = window.T;
        var f = A.frame(sel, { margin: { top: 58 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLinear().domain([0, A.TISSUE_LEN]).range([0, iw]);
        var y = d3.scaleLinear().domain([-20, 20]).range([ih, 0]);

        var band = g.append('rect').attr('y', 0).attr('height', ih).attr('fill', css('--c-depol-band'));
        A.axes(f, g, x, y, ih, 0, { xTitle: 'x\\;[\\text{a.u.}]', yTitle: '\\phi\\;[\\text{a.u.}]' });

        // Electrode guides and labels.
        var dots = {};
        [['B', A.EB, '--c-eb'], ['A', A.EA, '--c-ea']].forEach(function (e) {
            var px = x(e[1][0] + X0);
            g.append('line').attr('x1', px).attr('x2', px).attr('y1', -10).attr('y2', ih)
                .attr('stroke', css(e[2])).attr('stroke-opacity', 0.6).attr('stroke-dasharray', '3 4');
            window.renderKatex(f.svg, '\\text{' + e[0] + '}', f.m.left + px, f.m.top - 20,
                { width: 30, height: 20, size: 15, color: css(e[2]) });
            dots[e[0]] = g.append('circle').attr('cx', px).attr('r', 5).attr('fill', css(e[2]))
                .attr('stroke', T.text).attr('stroke-width', 1);
        });

        var fd = g.append('line').attr('y1', 0).attr('y2', ih).attr('stroke', css('--c-dipole')).attr('stroke-width', 1.4);
        var fr = g.append('line').attr('y1', 0).attr('y2', ih).attr('stroke', css('--c-repol'))
            .attr('stroke-width', 1.4).attr('stroke-dasharray', '6 4');
        var path = g.append('path').attr('class', 'trace').attr('stroke', css('--c-diff'));
        refs = { x: x, y: y, band: band, fd: fd, fr: fr, path: path, dots: dots };
        tick();
    }

    function tick() {
        if (!refs) return;
        var st = A.state(A.s.wf), x = refs.x, y = refs.y;
        var line = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
        var pts = [];
        for (var i = 0; i <= N; i++) {
            var xs = A.TISSUE_LEN * i / N;
            pts.push([xs, A.totalPotential(st, [xs - X0, A.EA[1], 0])]);
        }
        refs.path.attr('d', line(pts));
        var show = st.depLen > 0.1;
        refs.band.attr('display', show ? null : 'none')
            .attr('x', x(st.depLeft + X0)).attr('width', Math.max(0, x(st.depRight + X0) - x(st.depLeft + X0)));
        refs.fd.attr('display', st.depolIn ? null : 'none').attr('x1', x(st.depolX + X0)).attr('x2', x(st.depolX + X0));
        refs.fr.attr('display', st.repolIn ? null : 'none').attr('x1', x(st.repolX + X0)).attr('x2', x(st.repolX + X0));
        refs.dots.A.attr('cy', y(st.va));
        refs.dots.B.attr('cy', y(st.vb));
    }

    A.onRender(render);
    A.onTick(tick, document.querySelector(sel));
})();
