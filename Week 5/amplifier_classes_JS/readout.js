// Fills every [data-out] readout value and the condition-dependent note
// (#class-note) from the present parameters.
(function () {
    function note(A, p, st, d) {
        var L = A.limits(), drive = d.vinPeak * A.GAIN, dz = A.deadZone();
        if (p.cls === 'A') {
            var sat = drive >= -L.lo, cut = drive >= L.hi;
            if (sat !== cut && drive > 0) return '<strong>Asymmetric clipping.</strong> The Q-point is not centred on the AC load line, so the output reaches ' + (sat ? 'saturation' : 'cutoff') + ' on one half-cycle before the other half-cycle reaches its limit. Symmetric swing requires $I_{CQ} R_C = V_{CEQ} - V_{CE(\\text{sat})}$.';
            if (sat && cut) return '<strong>Clipping.</strong> The drive exceeds both limits: the output is cut off once the collector has risen by $I_{CQ} R_C$ and saturates once $v_{CE}$ falls to $V_{CE(\\text{sat})}$.';
            return '<strong>Linear operation.</strong> Conduction angle $360^\\circ$. With a resistive load the efficiency cannot exceed 25 %; the bias-divider current and the drop across $R_E$ lower the achievable value further.';
        }
        if (st.clipping) return '<strong>Clipping.</strong> The output is limited by the supply rails, $\\pm(V_{CC} - V_{CE(\\text{sat})})$.';
        if (p.cls === 'B') {
            if (drive > 0 && dz / drive > 0.1) return '<strong>Crossover distortion.</strong> The dead zone of $\\pm 0.6$ V at the bases is a large fraction of the drive amplitude, so neither device conducts for a visible part of each zero crossing.';
            return '<strong>Near half-cycle conduction.</strong> Each device conducts for just under $180^\\circ$ and the maximum efficiency is $\\pi/4 \\approx 78.5$ %. The dead zone still distorts every zero crossing.';
        }
        if (dz > 0) return '<strong>Residual dead zone.</strong> Each diode lifts its base by $V_D = ' + p.vd.toFixed(2) + '$ V, which is ' + Math.round(dz * 1000) + ' mV short of $V_{BE(\\text{on})} = 0.6$ V, so a dead zone of $\\pm' + Math.round(dz * 1000) + '$ mV remains at the bases.';
        return '<strong>No dead zone.</strong> With $V_D = V_{BE(\\text{on})}$ both devices sit at the edge of conduction, and the output follows the drive through zero. A slightly larger diode drop would bias both into conduction and extend each conduction angle beyond $180^\\circ$.';
    }

    // Conduction angle of one push-pull device: the drive exceeds the dead
    // zone for 180 deg - 2 arcsin(dz / (A v_in,peak)).
    function angle(A, p, d) {
        if (p.cls === 'A') return '360°';
        var drive = d.vinPeak * A.GAIN, dz = A.deadZone();
        if (drive <= dz) return '0°';
        return (180 - 2 * Math.asin(dz / drive) * 180 / Math.PI).toFixed(0) + '° per device';
    }

    function render() {
        var A = window.AMP, p = A.p, d = A.derived(), st = A.cycleStats(), div = A.divider();
        var out = {
            cls: 'class ' + p.cls, angle: angle(A, p, d),
            dz: p.cls === 'A' ? '–' : '±' + (A.deadZone() * 1000).toFixed(0) + ' mV',
            idiv: d.idiv.toFixed(3) + ' mA',
            r12: div ? (div.r1 / 1000).toFixed(1) + ' / ' + (div.r2 / 1000).toFixed(1) + ' kΩ' : '–',
            icq: d.icq.toFixed(1) + ' mA', vceq: d.vceq.toFixed(2) + ' V',
            vpk: d.voutPeak.toFixed(2) + ' V', gain: d.vinPeak > 0 ? st.gain.toFixed(1) : '–',
            clip: st.clipping ? 'clipping' : st.crossover ? 'crossover dead zone' : 'linear',
            pdc: d.dcPower.toFixed(1) + ' mW', pl: d.signalPower.toFixed(1) + ' mW',
            pd: d.heatPower.toFixed(1) + ' mW', eta: d.efficiency.toFixed(0) + ' %'
        };
        document.querySelectorAll('[data-out]').forEach(function (el) {
            var k = el.dataset.out;
            if (!(k in out)) return;
            el.textContent = out[k];
            if (k === 'clip') el.classList.toggle('warn', st.clipping || st.crossover);
        });
        var n = document.getElementById('class-note');
        if (n) {
            n.innerHTML = note(A, p, st, d);
            if (window.renderMathInElement) window.renderMathInElement(n, {
                delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false
            });
        }
    }

    window.AMP.onRender(render);
})();
