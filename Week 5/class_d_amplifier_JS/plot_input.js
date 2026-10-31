// Section 01 · Input signal over two cycles, normalised to the carrier peak
// (so its amplitude is the modulation index m). Single trace, no in-plot text.
(function () {
    var sel = '#plot-input';

    function render() {
        var C = window.CLD, css = window.CMP.cssVar;
        var f = C.frame(sel, {});
        var P = C.panels(f, [{ domain: [-1.1, 1.1], ticks: [-1, -0.5, 0, 0.5, 1], title: 'v_\\text{in} / \\hat{v}_c' }]);
        var pts = d3.range(0, 801).map(function (i) { var t = C.WINDOW * i / 800; return [P.x(t), P.list[0].y(C.inputSignal(t))]; });
        f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-vin')).attr('d', d3.line()(pts));
    }

    window.CLD.onRender(render);
})();
