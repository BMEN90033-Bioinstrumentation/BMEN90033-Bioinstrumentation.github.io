// Amplifier classes model. Class A common-emitter stage with divider bias and
// a bypassed emitter resistor; class B and AB complementary push-pull
// emitter followers driven by a stage of gain GAIN. Currents in mA, powers
// in mW unless stated.
(function () {
    var VCC = 12;        // supply magnitude, V (push-pull uses +/-VCC)
    var VCE_SAT = 0.2;   // collector-emitter saturation voltage, V
    var RC = 1200;       // class A collector resistor (the load), push-pull load R_L, ohm
    var RE = 200;        // class A emitter resistor, bypassed by C_E at signal frequency, ohm
    var GAIN = 20;       // class A small-signal voltage gain; driver gain for B and AB
    var VBE_ON = 0.6;    // base-emitter voltage at which an output device starts to conduct, V
    var BETA = 100;      // current gain h_FE
    var DIV = 10;        // class A divider: current in R_2 is DIV times the base current
    var I_BIAS = 0.5;    // class AB bias-network current through R_b1, D_1, D_2, R_b2, mA
    // DC load-line saturation current of the class A stage, mA (I_E ~ I_C).
    var MAX_IC = VCC / (RC + RE) * 1000;

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'ampchange'. amp: input peak in % of 1 V. bias: class A I_CQ in % of
    // MAX_IC. vd: forward drop of each class AB bias diode, V. speed: signal
    // frequency in Hz x 100.
    var p = { cls: 'A', amp: 25, bias: 53, vd: 0.55, speed: 100, paused: 'no' };

    // Half-width of the push-pull dead zone at the bases, V. Class B: the
    // bases are joined, so a device conducts once |v_drv| > V_BE(on).
    // Class AB: each diode lifts its base by V_D, so the remaining window is
    // V_BE(on) - V_D (zero once V_D >= V_BE(on)).
    function deadZone(q) {
        q = q || p;
        if (q.cls === 'B') return VBE_ON;
        if (q.cls === 'AB') return Math.max(0, VBE_ON - q.vd);
        return 0;
    }

    // Class A quiescent point. I_CQ set by the slider; V_CEQ from the DC loop
    // V_CC = I_C R_C + V_CE + I_E R_E with I_E ~ I_C.
    function qPoint(q) {
        q = q || p;
        var icq = q.cls === 'A' ? (q.bias / 100) * MAX_IC : 0;
        var vceq = Math.max(VCE_SAT, VCC - icq / 1000 * (RC + RE));
        return { icq: icq, vceq: vceq };
    }

    // Clipping limits of v_out, V. Class A (R_E bypassed, AC load R_C): the
    // collector rises by at most I_CQ R_C before cutoff and falls by at most
    // V_CEQ - V_CE(sat) before saturation. Push-pull: +/-(V_CC - V_CE(sat)).
    function limits(q) {
        q = q || p;
        if (q.cls === 'A') {
            var Q = qPoint(q);
            return { hi: Q.icq / 1000 * RC, lo: -(Q.vceq - VCE_SAT) };
        }
        return { hi: VCC - VCE_SAT, lo: -(VCC - VCE_SAT) };
    }

    // Output before clipping for an instantaneous input. Class A inverts;
    // the followers pass v_drv = GAIN v_in less the dead zone.
    function ideal(vin, q) {
        q = q || p;
        if (q.cls === 'A') return -vin * GAIN;
        var vdrv = vin * GAIN, dz = deadZone(q);
        if (Math.abs(vdrv) <= dz) return 0;
        return Math.sign(vdrv) * (Math.abs(vdrv) - dz);
    }

    function outputSample(vin, q) {
        q = q || p;
        var L = limits(q);
        return Math.max(L.lo, Math.min(L.hi, ideal(vin, q)));
    }

    // Bias, swing and power budget for parameter set q.
    function derived(q) {
        q = q || p;
        var vinPeak = q.amp / 100, Q = qPoint(q), L = limits(q);
        var dcPower, vp;
        if (q.cls === 'A') {
            vp = Math.min(vinPeak * GAIN, L.hi, -L.lo);
            // Supply current: collector current plus the current in R_1,
            // which carries the divider current DIV I_B and the base current.
            var idiv = (DIV + 1) * Q.icq / BETA;
            dcPower = VCC * (Q.icq + idiv);
        } else {
            vp = Math.min(Math.max(0, vinPeak * GAIN - deadZone(q)), L.hi);
        }
        var iPeak = vp / RC * 1000;
        var signalPower = vp * vp / (2 * RC) * 1000;
        if (q.cls === 'B') dcPower = 2 * VCC * iPeak / Math.PI;
        if (q.cls === 'AB') dcPower = 2 * VCC * (iPeak / Math.PI + I_BIAS);
        var heatPower = Math.max(0, dcPower - signalPower);
        return {
            vinPeak: vinPeak, icq: Q.icq, vceq: Q.vceq, voutPeak: vp, iPeak: iPeak,
            idiv: q.cls === 'A' ? (DIV + 1) * Q.icq / BETA : 0,
            dcPower: dcPower, signalPower: signalPower, heatPower: heatPower,
            efficiency: dcPower > 0 ? signalPower / dcPower * 100 : 0
        };
    }

    // Class A divider that sets the present Q-point: V_B = I_CQ R_E + V_BE(on),
    // I_R2 = DIV I_B, I_R1 = (DIV + 1) I_B. Resistances in ohm.
    function divider(q) {
        var Q = qPoint(q), ib = Q.icq / 1000 / BETA;
        if (ib <= 0) return null;
        var vb = Q.icq / 1000 * RE + VBE_ON;
        return { vb: vb, r1: (VCC - vb) / ((DIV + 1) * ib), r2: vb / (DIV * ib) };
    }

    // Peak gain and distortion flags. Clipping: the unclipped output peak
    // exceeds a limit. Crossover: a push-pull dead zone is present while a
    // signal is applied.
    function cycleStats(q) {
        q = q || p;
        var d = derived(q), L = limits(q);
        var pk = q.cls === 'A' ? d.vinPeak * GAIN : Math.max(0, d.vinPeak * GAIN - deadZone(q));
        var clipping = d.vinPeak > 0 && (q.cls === 'A' ? (pk > L.hi + 1e-9 || pk > -L.lo + 1e-9) : pk > L.hi + 1e-9);
        return {
            gain: d.vinPeak > 0 ? d.voutPeak / d.vinPeak : 0,
            clipping: clipping,
            crossover: q.cls !== 'A' && d.vinPeak > 0 && deadZone(q) > 0
        };
    }

    // Instantaneous conduction state. For B and AB a device conducts only
    // when the drive exceeds the dead zone.
    function state(vin, q) {
        q = q || p;
        var d = derived(q), n = d.vinPeak > 0 ? vin / d.vinPeak : 0;
        if (q.cls === 'A') {
            if (Math.abs(n) < 0.05) return { n: n, key: 'quiet', text: 'quiescent' };
            return n > 0 ? { n: n, key: 'npn', text: 'I_C increasing' } : { n: n, key: 'pnp', text: 'I_C decreasing' };
        }
        var vo = outputSample(vin, q);
        if (d.vinPeak <= 0) return { n: 0, key: 'quiet', text: 'no signal, both off', vo: 0 };
        if (vo === 0) return { n: n, key: 'dead', text: 'neither conducts', vo: 0 };
        return vo > 0 ? { n: n, key: 'npn', text: 'NPN conducts', vo: vo } : { n: n, key: 'pnp', text: 'PNP conducts', vo: vo };
    }

    window.AMP = {
        VCC: VCC, VCE_SAT: VCE_SAT, MAX_IC: MAX_IC, RC: RC, RE: RE, GAIN: GAIN,
        VBE_ON: VBE_ON, BETA: BETA, DIV: DIV, I_BIAS: I_BIAS,
        p: p, derived: derived, outputSample: outputSample, ideal: ideal, limits: limits,
        qPoint: qPoint, deadZone: deadZone, divider: divider, cycleStats: cycleStats, state: state,
        // Animation clock, advanced by anim.js: phase in cycles of the input
        // sine (0..2), t in seconds of wall time (for current-flow dots).
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
