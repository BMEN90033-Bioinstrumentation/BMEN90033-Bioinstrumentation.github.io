// Section 03 · Complementary MOSFET half-bridge driven by the inverted PWM.
// PWM high: PMOS on, output connected to V_CC. PWM low: NMOS on, output
// connected to ground. ON / OFF labels and the current-flow overlay follow
// the shared clock.
//
// Layout (viewBox 640 x 400): PMOS centre (330, 130), NMOS centre (330, 290),
// device rail x = 350. V_CC bar y = 50, ground y = 360, output node
// (350, 210) -> terminal (504, 210). Gate drive enters at (116, 210) and
// splits at x = 230 to both gates.
(function () {
    var sel = '#plot-bridge';
    var k = null, onP = null, onN = null;

    function render() {
        var C = window.CLD, svg = d3.select(sel);
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 640 400').attr('preserveAspectRatio', 'xMidYMid meet');
        k = C.kit(svg);
        k.rail(350, 50); k.texL('V_{CC} = +' + C.VCC + '\\,\\text{V}', 374, 50);
        k.line(350, 50, 350, 100);
        k.mos(330, 130, 'p', 230);
        k.line(350, 160, 350, 260);
        k.mos(330, 290, 'n', 230);
        k.line(350, 320, 350, 360); k.ground(350, 360);
        k.line(230, 130, 230, 290); k.line(120, 210, 230, 210); k.terminal(116, 210); k.dot(230, 210);
        k.texR('\\overline{\\text{PWM}}', 106, 210, { width: 70 });
        k.line(350, 210, 500, 210); k.dot(350, 210); k.terminal(504, 210);
        k.texL('v_\\text{sw}', 514, 210, { width: 60 });
        k.flow('p', [[350, 50], [350, 210], [500, 210]]);
        k.flow('n', [[500, 210], [350, 210], [350, 360]]);
        onP = k.text('', 382, 130, { anchor: 'start', size: 13, weight: 600 });
        onN = k.text('', 382, 290, { anchor: 'start', size: 13, weight: 600 });
        tick();
    }

    function tick() {
        if (!k) return;
        var C = window.CLD, pOn = C.pwmSignal(C.clock.th) === 1, css = window.CMP.cssVar;
        k.clearFlows();
        if (pOn) k.setFlow('p', '--c-hi', 1); else k.setFlow('n', '--c-lo', 1);
        onP.text(pOn ? 'ON' : 'OFF').attr('fill', css(pOn ? '--c-hi' : '--c-off'));
        onN.text(pOn ? 'OFF' : 'ON').attr('fill', css(pOn ? '--c-off' : '--c-hi'));
    }

    window.CLD.onRender(render);
    window.CLD.onTick(tick);
})();
