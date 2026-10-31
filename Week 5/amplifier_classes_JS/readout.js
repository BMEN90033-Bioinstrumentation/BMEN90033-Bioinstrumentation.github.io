// Fills every [data-out] readout value and the condition-dependent note
// (#class-note) from the present parameters. The note follows the
// conditions of the original explanation panel.
(function () {
    var ANGLE = { A: '360°', B: '180° per device', AB: 'slightly > 180° per device' };

    function note(A, p, st) {
        var lowAmp = p.amp < 10 && p.amp > 0;
        if (p.cls === 'A') {
            if (p.bias < 20) return '<strong>Asymmetric clipping.</strong> The Q-point is far from the centre of the load line, so one half of the output clips before the other. Symmetric swing requires the Q-point at the midpoint of the load line.';
            if (st.clipping) return '<strong>Clipping.</strong> The drive exceeds the linear range of the stage. The output is limited at cutoff, where $v_C$ reaches $V_{CC}$, or at saturation, where $v_{CE}$ falls to $V_{CE(\\text{sat})}$.';
            return '<strong>Linear operation.</strong> Conduction angle $360^\\circ$. The maximum efficiency is 25 % with a resistive load and 50 % with a transformer-coupled load.';
        }
        if (p.cls === 'B') {
            if (lowAmp) return '<strong>Crossover distortion.</strong> At low amplitude the dead zone about the zero crossing is a large fraction of the signal. Each device needs about 0.6 V of base-emitter voltage before it conducts, so neither conducts near zero.';
            if (st.clipping) return '<strong>Clipping.</strong> The output is limited by the supply. The maximum swing is $\\pm(V_{CC} - V_{CE(\\text{sat})})$.';
            return '<strong>Half-cycle conduction.</strong> Conduction angle $180^\\circ$ per device and a maximum efficiency of $\\pi/4 \\approx 78.5$ %. The cost is crossover distortion at each zero crossing.';
        }
        if (lowAmp) return '<strong>Smooth crossover.</strong> The standing bias current set by the diodes keeps both devices slightly conducting, so the output passes through zero without the class B dead zone.';
        if (st.clipping) return '<strong>Clipping.</strong> The output is limited by the supply rails.';
        return '<strong>Biased push-pull.</strong> Conduction angle slightly above $180^\\circ$ per device. Typical efficiency lies between 50 % and 60 %, with less crossover distortion than class B.';
    }

    function render() {
        var A = window.AMP, p = A.p, d = A.derived(), st = A.cycleStats();
        var out = {
            cls: 'class ' + p.cls, angle: ANGLE[p.cls],
            icq: d.icq.toFixed(1) + ' mA', vceq: d.vceq.toFixed(2) + ' V',
            vpk: d.voutPeak.toFixed(2) + ' V', gain: d.vinPeak > 0 ? st.gain.toFixed(1) : '–',
            clip: !st.clipping ? 'linear' : p.cls !== 'A' && d.voutPeak < A.VCC - A.VCE_SAT - 1e-9 ? 'crossover loss' : 'clipping',
            pdc: d.dcPower.toFixed(1) + ' mW', pl: d.signalPower.toFixed(1) + ' mW',
            pd: d.heatPower.toFixed(1) + ' mW', eta: d.efficiency.toFixed(0) + ' %'
        };
        document.querySelectorAll('[data-out]').forEach(function (el) {
            var k = el.dataset.out;
            if (!(k in out)) return;
            el.textContent = out[k];
            if (k === 'clip') el.classList.toggle('warn', st.clipping);
        });
        var n = document.getElementById('class-note');
        if (n) {
            n.innerHTML = note(A, p, st);
            if (window.renderMathInElement) window.renderMathInElement(n, {
                delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false
            });
        }
    }

    window.AMP.onRender(render);
})();
