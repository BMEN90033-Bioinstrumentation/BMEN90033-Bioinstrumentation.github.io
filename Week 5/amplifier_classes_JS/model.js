// Amplifier classes model. Class A common-emitter stage and class B / AB
// complementary push-pull followers with a gain-of-GAIN driver. Ported from
// the original simulator without change to the equations.
(function () {
    var VCC = 12;        // supply magnitude, V (push-pull uses +/-VCC)
    var VCE_SAT = 0.2;   // collector-emitter saturation voltage, V
    var MAX_IC = 10;     // collector current at the top of the load line, mA
    var RC = 1200;       // collector / load resistance, ohm
    var GAIN = 20;       // small-signal voltage gain (class A) or driver gain (B, AB)
    var DEAD = { B: 0.6, AB: 0.05 };   // base dead zone, V
    var VBE = 0.6;       // diode / base-emitter drop used for the AB annotations, V
    var BETA = 100;      // current gain used for the AB annotations

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'ampchange'. amp and bias are percentages of full scale, speed is the
    // signal frequency in Hz x 100.
    var p = { cls: 'A', amp: 30, bias: 50, speed: 100, paused: 'no' };

    // Output voltage for an instantaneous input voltage. Class A is the
    // inverting CE stage clipped at cutoff and saturation about V_CEQ; B and
    // AB are the push-pull followers with a dead zone referred to the input.
    function outputSample(vinInstant, q, vceq) {
        var gainedSignal = vinInstant * GAIN;
        if (q.cls === 'A') {
            var vout = -gainedSignal;
            var upperClip = VCC - vceq;
            var lowerClip = -(vceq - VCE_SAT);
            return Math.max(lowerClip, Math.min(upperClip, vout));
        }
        var scaledDead = DEAD[q.cls] / GAIN;
        if (Math.abs(vinInstant) < scaledDead) return 0;
        var sign = vinInstant > 0 ? 1 : -1;
        var v = sign * (Math.abs(vinInstant) - scaledDead) * GAIN;
        var clipMax = VCC - VCE_SAT;
        return Math.max(-clipMax, Math.min(clipMax, v));
    }

    // Bias, swing and power budget for parameter set q (defaults to p).
    // Powers in mW, currents in mA.
    function derived(q) {
        q = q || p;
        var vinPeak = q.amp / 100;
        var icq = (q.bias / 100) * MAX_IC;
        var vceq = VCC - (icq / 1000) * RC;
        if (vceq < VCE_SAT) vceq = VCE_SAT;
        var dcPower = VCC * icq;

        var voutPeak = q.cls === 'A'
            ? Math.min(vinPeak * GAIN, vceq - VCE_SAT, VCC - vceq)
            : Math.abs(outputSample(vinPeak, q, vceq));
        var vp = Math.max(0, voutPeak);
        var signalPower = (vp * vp) / (2 * RC) * 1000;
        var iPeak = vp / RC * 1000;
        if (q.cls === 'B') dcPower = 2 * VCC * iPeak / Math.PI;
        else if (q.cls === 'AB') dcPower = 2 * VCC * (iPeak / Math.PI + icq);

        var heatPower = Math.max(0, dcPower - signalPower);
        return {
            vinPeak: vinPeak, icq: icq, vceq: vceq, voutPeak: vp, iPeak: iPeak,
            dcPower: dcPower, signalPower: signalPower, heatPower: heatPower,
            efficiency: dcPower > 0 ? (signalPower / dcPower) * 100 : 0
        };
    }

    // One cycle of the output, sampled. Gain and clipping follow the original
    // readouts: measured gain = peak |v_out| / v_in peak; clipping when the
    // peak falls below 85 % of GAIN x v_in peak.
    function cycleStats(q) {
        q = q || p;
        var d = derived(q), maxOut = 0;
        for (var i = 0; i < 400; i++) {
            var v = d.vinPeak * Math.sin(2 * Math.PI * i / 400);
            maxOut = Math.max(maxOut, Math.abs(outputSample(v, q, d.vceq)));
        }
        var expectedMax = d.vinPeak * GAIN;
        return {
            gain: d.vinPeak > 0 ? maxOut / d.vinPeak : 0,
            clipping: expectedMax > 0 && (maxOut / expectedMax) < 0.85
        };
    }

    // Load-line swing as fractions of the line (0 = cutoff, 1 = saturation),
    // as drawn by the original load-line inset. The dead zone is subtracted
    // for B and AB, whose swing runs from the Q-point towards saturation.
    function swing(q) {
        q = q || p;
        var qFrac = q.bias / 100;
        var vinPeakLocal = q.amp / 100;
        var effectiveSwing = q.cls === 'A' ? vinPeakLocal * GAIN
            : Math.max(0, vinPeakLocal - DEAD[q.cls] / GAIN) * GAIN;
        var swingFrac = effectiveSwing / (VCC - VCE_SAT);
        var pushPull = q.cls !== 'A';
        var s1 = pushPull ? qFrac : Math.max(0, qFrac - swingFrac);
        var s2 = Math.min(1, qFrac + swingFrac);
        return { q: qFrac, s1: s1, s2: s2, clipSat: s2 >= 1, clipCut: !pushPull && s1 <= 0 };
    }

    // Conduction state at the present instant, with the original thresholds.
    function state(vinNow, q) {
        q = q || p;
        var d = derived(q);
        var n = d.vinPeak > 0 ? vinNow / d.vinPeak : 0;
        if (q.cls === 'A') {
            if (Math.abs(n) < 0.05) return { n: n, key: 'quiet', text: 'quiescent' };
            return n > 0 ? { n: n, key: 'npn', text: 'I_C increasing' } : { n: n, key: 'pnp', text: 'I_C decreasing' };
        }
        if (q.cls === 'B') {
            if (d.vinPeak <= 0) return { n: 0, key: 'quiet', text: 'no signal, both off', dz: 0 };
            var dz = 0.6 / (d.vinPeak * GAIN + 0.001);
            if (Math.abs(n) <= dz && d.vinPeak > 0) return { n: n, key: 'dead', text: 'crossover, neither conducts', dz: dz };
            return n > 0 ? { n: n, key: 'npn', text: 'NPN conducts', dz: dz } : { n: n, key: 'pnp', text: 'PNP conducts', dz: dz };
        }
        if (Math.abs(n) < 0.05) return { n: n, key: 'quiet', text: 'both conduct' };
        return n > 0 ? { n: n, key: 'npn', text: 'NPN dominates, PNP assists' }
            : { n: n, key: 'pnp', text: 'PNP dominates, NPN assists' };
    }

    window.AMP = {
        VCC: VCC, VCE_SAT: VCE_SAT, MAX_IC: MAX_IC, RC: RC, GAIN: GAIN, DEAD: DEAD,
        VBE: VBE, BETA: BETA,
        p: p, derived: derived, outputSample: outputSample, cycleStats: cycleStats,
        swing: swing, state: state,
        // Animation clock, advanced by anim.js: phase in cycles of the input (0..2)
        // sine, clock in seconds of wall time (for current-flow dots).
        clock: { phase: 0, t: 0 },
        vinNow: function () { return derived().vinPeak * Math.sin(2 * Math.PI * window.AMP.clock.phase); },
        // Run fn now (after DOM ready) and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('ampchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
