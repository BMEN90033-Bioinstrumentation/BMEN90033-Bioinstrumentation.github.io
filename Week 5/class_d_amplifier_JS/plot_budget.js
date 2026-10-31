// Section 05 · Power budget of the simulated amplifier at the present
// amplitude and switching ratio: supply power, signal power in the load,
// switching ripple dissipated in the load, conduction loss, switching loss
// and gate-drive plus quiescent power. The axis scales to the largest bar
// (mW below 1 W, W above) so that small budgets remain readable.
(function () {
    var sel = '#plot-budget';

    function render() {
        var C = window.CLD, d = C.power(), css = window.CMP.cssVar, T = window.T;
        var f = C.frame(sel, { margin: { bottom: 70 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var cats = [
            { tex: 'P_\\text{DC}', v: d.dc, c: '--c-dc' },
            { tex: 'P_L', v: d.signal, c: '--c-hi' },
            { tex: 'P_\\text{rip}', v: d.ripple, c: '--c-car' },
            { tex: 'P_\\text{cond}', v: d.cond, c: '--c-heat' },
            { tex: 'P_\\text{sw}', v: d.sw, c: '--c-heat' },
            { tex: 'P_\\text{drv}', v: d.drive, c: '--c-heat' }
        ];
        var w = d.dc >= 1, k = w ? 1 : 1000, unit = w ? 'W' : 'mW';
        var x = d3.scaleBand().domain(d3.range(cats.length)).range([0, iw]).padding(0.3);
        var y = d3.scaleLinear().domain([0, d.dc * k * 1.15]).range([ih, 0]).nice(5);
        var yt = y.ticks(5);
        window.CMP.drawGrid(g, d3.scaleLinear(), y, iw, ih, { xTicks: [], yTicks: yt });
        window.CMP.styleAxis(g.append('g').call(d3.axisLeft(y).tickValues(yt).tickSizeOuter(0)));
        window.CMP.styleAxis(g.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(d3.axisBottom(x).tickSizeOuter(0).tickFormat(function () { return ''; })));
        // Bar values carry their own unit so that small losses stay legible.
        function fmt(v) {
            if (v >= 1) return v.toFixed(2) + ' W';
            var u = v * 1000;
            return (u >= 100 ? u.toFixed(0) : u >= 10 ? u.toFixed(1) : u.toFixed(2)) + ' mW';
        }
        cats.forEach(function (c, i) {
            var v = c.v * k, bx = x(i), bw = x.bandwidth();
            g.append('rect').attr('x', bx).attr('y', y(v)).attr('width', bw).attr('height', ih - y(v))
                .attr('fill', css(c.c)).attr('fill-opacity', 0.8).attr('rx', 3);
            g.append('text').attr('x', bx + bw / 2).attr('y', y(v) - 7).attr('text-anchor', 'middle')
                .attr('fill', T.text).attr('font-size', 12).attr('font-family', "'JetBrains Mono', monospace")
                .text(fmt(c.v));
            window.renderKatex(f.svg, c.tex, f.m.left + bx + bw / 2, f.m.top + ih + 18, { width: 70, height: 20, size: 15 });
        });
        window.renderKatex(f.svg, 'P~[\\mathrm{' + unit + '}]', 22, f.m.top + ih / 2, { width: 200, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, '\\text{power term}', f.m.left + iw / 2, f.H - 16, { width: 200, height: 22, size: 16 });
    }

    window.CLD.onRender(render);
})();
