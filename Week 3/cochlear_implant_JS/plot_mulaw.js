// Section 05 · Compression map g(e): mu-law with mu = 255 against the linear
// map. The map in use is drawn heavier. Single quadrant; no in-plot text.
(function () {
    var sel = '#plot-mulaw';

    function render() {
        var CI = window.CI, css = window.CMP.cssVar, on = CI.p.compress === 'on';
        var f = CI.frame(sel, {});
        var x = d3.scaleLinear().domain([0, 1]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([0, 1.05]).range([f.ih, 0]);
        CI.axes(f, f.g, x, y, f.ih, 0, {
            yTicks: [0, 0.25, 0.5, 0.75, 1],
            xTitle: 'e\\;(\\text{normalised envelope})', yTitle: 'g(e)'
        });
        var pts = d3.range(0, 401).map(function (i) { var e = i / 400; return [x(e), y(CI.compress(e))]; });
        f.g.append('line').attr('x1', x(0)).attr('y1', y(0)).attr('x2', x(1)).attr('y2', y(1))
            .attr('stroke', css('--c-guide')).attr('stroke-width', on ? 1.2 : 2.4).attr('stroke-dasharray', '6 4');
        f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-comp'))
            .attr('stroke-width', on ? 2.6 : 1.4).attr('stroke-opacity', on ? 1 : 0.55).attr('d', d3.line()(pts));
    }

    window.CI.onRender(render);
    window.addEventListener('cichange', render);
})();
