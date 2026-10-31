// Section 02 · Comparator schematic: v_in on the non-inverting input, the
// triangle carrier v_c on the inverting input, PWM at the output. The dot on
// the output wire shows the present comparator state.
//
// Layout (viewBox 640 x 260): comparator left edge x = 300, apex (380, 130),
// inputs at y = 105 (+) and y = 155 (-). Source v_in (120, 160), carrier
// source (200, 200), both grounded at y = 230. Output terminal (524, 130).
(function () {
    var sel = '#plot-comparator';
    var stateDot = null;

    function render() {
        var svg = d3.select(sel);
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 640 260').attr('preserveAspectRatio', 'xMidYMid meet');
        var k = window.CLD.kit(svg);
        k.path([[120, 142], [120, 105], [300, 105]]);
        k.path([[200, 182], [200, 155], [300, 155]]);
        k.comparator(300, 130, 80, 100, '+');
        k.source(120, 160); k.line(120, 178, 120, 230); k.ground(120, 230);
        k.source(200, 200); k.line(200, 218, 200, 230); k.ground(200, 230);
        k.texR('v_\\text{in}', 94, 160, { width: 60 });
        k.texL('v_c', 226, 200, { width: 60, color: window.CMP.cssVar('--c-car') });
        k.line(380, 130, 520, 130); k.terminal(524, 130);
        k.texL('\\text{PWM}', 534, 130, { width: 80 });
        stateDot = svg.append('circle').attr('cx', 410).attr('cy', 130).attr('r', 6);
        tick();
    }

    function tick() {
        if (!stateDot) return;
        var C = window.CLD, hi = C.pwmSignal(C.clock.th);
        stateDot.attr('fill', window.CMP.cssVar(hi ? '--c-hi' : '--c-lo'));
    }

    window.CLD.onRender(render);
    window.CLD.onTick(tick);
})();
