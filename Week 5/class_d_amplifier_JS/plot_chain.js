// Section 05 · Complete class D signal chain: input and carrier sources,
// comparator with reversed inputs (output = inverted PWM), MOSFET
// half-bridge, LC filter, DC-blocking capacitor and load. Device states and current flow follow
// the shared clock.
//
// Layout (viewBox 900 x 400): v_in source (60, 260), carrier source
// (150, 300), comparator left edge x = 200, apex (260, 210), inputs at
// y = 192 (-) and y = 228 (+). Gate split x = 330. PMOS (420, 130), NMOS
// (420, 290), rail x = 440, node (440, 210). Inductor x 520..620, node
// (680, 210), C on x = 680, C_B plates x 726 / 734, R_L on x = 780, grounds y = 350 / 360,
// output terminal (850, 210). Stage names on y = 388.
(function () {
    var sel = '#plot-chain';
    var k = null, onP = null, onN = null;

    function render() {
        var C = window.CLD, svg = d3.select(sel), css = window.CMP.cssVar;
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 900 400').attr('preserveAspectRatio', 'xMidYMid meet');
        k = C.kit(svg, 1.25);
        k.path([[60, 242], [60, 192], [200, 192]]);
        k.path([[150, 282], [150, 228], [200, 228]]);
        k.source(60, 260); k.line(60, 278, 60, 350); k.ground(60, 350);
        k.source(150, 300); k.line(150, 318, 150, 350); k.ground(150, 350);
        k.texR('v_\\text{in}', 36, 260, { width: 40 });
        k.texL('v_c', 176, 300, { width: 40, color: css('--c-car') });
        k.comparator(200, 210, 60, 72, '-');
        k.line(260, 210, 330, 210);
        k.tex('\\overline{\\text{PWM}}', 295, 190, { width: 70 });
        k.line(330, 130, 330, 290); k.dot(330, 210);
        k.rail(440, 50); k.texL('V_{CC}', 464, 50, { width: 60 });
        k.line(440, 50, 440, 100);
        k.mos(420, 130, 'p', 330);
        k.line(440, 160, 440, 260);
        k.mos(420, 290, 'n', 330);
        k.line(440, 320, 440, 360); k.ground(440, 360);
        k.dot(440, 210);
        k.line(440, 210, 520, 210); k.inductorH(520, 620, 210, 4); k.line(620, 210, 726, 210);
        k.capH(726, 734, 210); k.line(734, 210, 846, 210);
        k.tex('C_B', 730, 182, { width: 40 });
        k.tex('L', 570, 184, { width: 30 });
        k.dot(680, 210);
        k.line(680, 210, 680, 250); k.capV(680, 250, 258); k.line(680, 258, 680, 360); k.ground(680, 360);
        k.texL('C', 700, 254, { width: 30 });
        k.dot(780, 210);
        k.line(780, 210, 780, 250); k.resV(780, 250, 310); k.line(780, 310, 780, 360); k.ground(780, 360);
        k.texL('R_L', 796, 280, { width: 40 });
        k.terminal(850, 210); k.tex('v_\\text{out}', 850, 188, { width: 50 });
        [['input', 105], ['comparator', 230], ['half-bridge', 430], ['LC filter', 650], ['output', 830]]
            .forEach(function (s) { k.text(s[0], s[1], 388, { size: 13 }); });
        k.flow('sig', [[60, 242], [60, 192], [200, 192]]);
        k.flow('gate', [[260, 210], [330, 210]]);
        k.flow('p', [[440, 50], [440, 210]]);
        k.flow('n', [[440, 210], [440, 360]]);
        k.flow('lc', [[440, 210], [680, 210], [780, 210], [780, 360]]);
        onP = k.text('', 470, 130, { anchor: 'start', size: 12, weight: 600 });
        onN = k.text('', 470, 290, { anchor: 'start', size: 12, weight: 600 });
        tick();
    }

    function tick() {
        if (!k) return;
        var C = window.CLD, pOn = C.pwmSignal(C.clock.th) === 1, css = window.CMP.cssVar;
        k.clearFlows();
        k.setFlow('sig', '--c-vin', 0.4);
        k.setFlow('gate', pOn ? '--c-hi' : '--c-lo', 0.6);
        if (pOn) k.setFlow('p', '--c-hi', 0.8); else k.setFlow('n', '--c-lo', 0.8);
        k.setFlow('lc', '--c-hi', 0.5);
        onP.text(pOn ? 'ON' : 'OFF').attr('fill', css(pOn ? '--c-hi' : '--c-off'));
        onN.text(pOn ? 'OFF' : 'ON').attr('fill', css(pOn ? '--c-off' : '--c-hi'));
    }

    window.CLD.onRender(render);
    window.CLD.onTick(tick);
})();
