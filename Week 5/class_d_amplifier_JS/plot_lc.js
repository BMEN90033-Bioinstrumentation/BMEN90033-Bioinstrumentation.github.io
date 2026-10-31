// Section 04 · LC low-pass output filter and DC-blocking capacitor between
// the half-bridge node v_sw and the load. The overlay shows inductor current (coloured by the PWM
// state), load current and the capacitor charging path, with the
// intensities of the original animation.
//
// Layout (viewBox 640 x 260): input terminal (70, 110), inductor x 150..270
// on y = 110, node (330, 110), C on x = 330 (plates y 146 / 154), DC-blocking
// C_B on the wire (plates x 396 / 404), R_L on x = 470 (box y 140..190),
// grounds at y = 210, output terminal (560, 110).
(function () {
    var sel = '#plot-lc';
    var k = null;

    function render() {
        var svg = d3.select(sel);
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 640 260').attr('preserveAspectRatio', 'xMidYMid meet');
        k = window.CLD.kit(svg);
        k.terminal(70, 110); k.texR('v_\\text{sw}', 60, 110, { width: 60 });
        k.line(74, 110, 150, 110); k.inductorH(150, 270, 110, 4); k.line(270, 110, 396, 110);
        k.capH(396, 404, 110); k.line(404, 110, 470, 110);
        k.tex('C_B', 400, 82, { width: 40 });
        k.tex('L', 210, 78, { width: 30 });
        k.dot(330, 110);
        k.line(330, 110, 330, 146); k.capV(330, 146, 154); k.line(330, 154, 330, 210); k.ground(330, 210);
        k.texL('C', 352, 150, { width: 30 });
        k.dot(470, 110);
        k.line(470, 110, 470, 140); k.resV(470, 140, 190); k.line(470, 190, 470, 210); k.ground(470, 210);
        k.texL('R_L', 488, 165, { width: 40 });
        k.line(470, 110, 556, 110); k.terminal(560, 110);
        k.texL('v_\\text{out}', 570, 110, { width: 60 });
        k.flow('ind', [[74, 110], [330, 110]]);
        k.flow('load', [[330, 110], [470, 110], [470, 210]]);
        k.flow('cap', [[330, 110], [330, 146]]);
        tick();
    }

    function tick() {
        if (!k) return;
        var C = window.CLD, hi = C.pwmSignal(C.clock.th) === 1;
        k.setFlow('ind', hi ? '--c-hi' : '--c-lo', 0.7);
        k.setFlow('load', '--c-hi', 0.4);
        k.setFlow('cap', '--c-car', hi ? 0.5 : 0.2);
    }

    window.CLD.onRender(render);
    window.CLD.onTick(tick);
})();
