// Section 02 · Membrane potential (top panel) and stimulus current (bottom
// panel) over the last 70 ms. Dashed guides mark E_Na and E_K; their labels
// sit in the right margin, outside the plot, so they cannot meet a trace.
(function () {
    var sel = '#plot-vm';
    var B = window.BIO, refs = null;

    function render() {
        var css = window.CMP.cssVar, H = B.HH;
        var f = B.frame(sel, { margin: { right: 66 } });
        var gap = 16, ph1 = (f.ih - gap) * 0.7, ph2 = f.ih - gap - ph1;
        var x = B.timeScale(f.iw);
        var yV = d3.scaleLinear().domain([-90, 60]).range([ph1, 0]);
        var yI = d3.scaleLinear().domain([0, 65]).range([ph2, 0]);

        var gT = f.g;
        var gB = f.svg.append('g').attr('transform', 'translate(' + f.m.left + ',' + (f.m.top + ph1 + gap) + ')');
        B.axes(f, gT, x, yV, ph1, 0, { yTitle: 'V_m\\;[\\mathrm{mV}]' });
        B.axes(f, gB, x, yI, ph2, ph1 + gap, {
            yTitle: 'I_\\text{stim}\\;[\\mu\\mathrm{A/cm^2}]', yTicks: 3, xTitle: 't\\;[\\mathrm{ms}]'
        });

        [[H.E_Na, '--c-na', 'E_\\text{Na}'], [H.E_K, '--c-k', 'E_\\text{K}']].forEach(function (e) {
            var py = yV(e[0]);
            gT.append('line').attr('x1', 0).attr('x2', f.iw).attr('y1', py).attr('y2', py)
                .attr('stroke', css(e[1])).attr('stroke-opacity', 0.8).attr('stroke-dasharray', '6 4');
            window.renderKatex(f.svg, e[2], f.m.left + f.iw + 8 + 25, f.m.top + py,
                { width: 50, height: 20, size: 15, color: css(e[1]), align: 'left' });
        });

        refs = {
            x: x, yV: yV, yI: yI,
            v: gT.append('path').attr('class', 'trace').attr('stroke', css('--c-vm')),
            s: gB.append('path').attr('class', 'trace').attr('stroke', css('--c-stim')).attr('stroke-width', 2)
        };
        tick();
    }

    function tick() {
        if (!refs) return;
        refs.v.attr('d', B.tracePath(B.buf.V, refs.x, refs.yV));
        refs.s.attr('d', B.tracePath(B.buf.stim, refs.x, refs.yI, true));
    }

    B.onRender(render);
    B.onTick(tick, document.querySelector(sel));
})();
