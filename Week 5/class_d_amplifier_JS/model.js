// Class D amplifier model: sine input, triangle carrier, comparator PWM, an
// LC-filtered output with a ripple term, and an assumed-efficiency power
// budget. Ported from the original simulator without change to the
// equations. Time t is the phase of the input in radians (sin t).
(function () {
    var VCC = 12;           // half-bridge supply, V
    var RC = 1000;          // load resistance, ohm
    var EFFICIENCY = 0.92;  // assumed class D efficiency

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'cldchange'. amp is the input amplitude in % of the carrier peak,
    // speed the animation rate (rad/s of input phase), ratio = f_sw / f_sig.
    var p = { amp: 30, speed: 1, ratio: 8, paused: 'no' };

    function inputSignal(t, q) { q = q || p; return (q.amp / 100) * Math.sin(t); }

    // Triangle wave from -1 to 1 at ratio times the signal frequency.
    function triangleCarrier(t, q) {
        q = q || p;
        var phase = (t * q.ratio) / (2 * Math.PI);
        var frac = phase - Math.floor(phase);
        return frac < 0.5 ? (-1 + 4 * frac) : (3 - 4 * frac);
    }

    function pwmSignal(t, q) { return inputSignal(t, q) > triangleCarrier(t, q) ? 1 : 0; }

    // Filtered output, normalised -1..1 about V_CC / 2. The ideal output
    // equals the input; the ripple is a triangle at the switching frequency
    // with amplitude 8 / ratio^2, i.e. proportional to 1 / ratio^2 for a
    // second-order LC filter whose cutoff is assumed proportional to f_sig.
    function filteredSignal(t, q) {
        q = q || p;
        var vin = inputSignal(t, q);
        var duty = (vin + 1) / 2;
        var idealOut = (duty - 0.5) * 2;
        var rippleAmp = 1.0 / (q.ratio * q.ratio) * 8;
        var carrierPhase = (t * q.ratio) / (2 * Math.PI);
        var frac = carrierPhase - Math.floor(carrierPhase);
        var ripple = (frac < 0.5 ? (frac * 2) : (2 - frac * 2)) - 0.5;
        return idealOut + ripple * rippleAmp;
    }

    // Duty cycle for a given input: D = (v_in + V_c,pk) / (2 V_c,pk).
    function duty(vin) { return (vin + 1) / 2; }

    // Power budget in mW. Single-supply half-bridge: output swings about
    // V_CC / 2 with peak m V_CC / 2. P_DC follows from the assumed efficiency.
    function power(q) {
        q = q || p;
        var vinPeak = q.amp / 100;
        var voutPeak = vinPeak * VCC / 2;
        var signalPower = (voutPeak * voutPeak) / (2 * RC) * 1000;
        var dcPower = signalPower / EFFICIENCY;
        var heatPower = Math.max(0, dcPower - signalPower);
        return { voutPeak: voutPeak, dc: dcPower, signal: signalPower, heat: heatPower,
            eff: dcPower > 0 ? (signalPower / dcPower) * 100 : 0 };
    }

    // PWM samples over [t0, t0 + span] with enough points per carrier cycle
    // to catch every transition; returns [t, level] pairs with the step
    // corners inserted, ready for a d3.line.
    function pwmSteps(t0, span, q) {
        q = q || p;
        var n = Math.max(800, Math.ceil(span / (2 * Math.PI) * q.ratio * 16));
        var out = [], prev = pwmSignal(t0, q);
        out.push([t0, prev]);
        for (var i = 1; i <= n; i++) {
            var t = t0 + span * i / n, v = pwmSignal(t, q);
            if (v !== prev) { out.push([t, prev]); out.push([t, v]); prev = v; }
        }
        out.push([t0 + span, prev]);
        return out;
    }

    window.CLD = {
        VCC: VCC, RC: RC, EFFICIENCY: EFFICIENCY, p: p,
        inputSignal: inputSignal, triangleCarrier: triangleCarrier, pwmSignal: pwmSignal,
        filteredSignal: filteredSignal, duty: duty, power: power, pwmSteps: pwmSteps,
        WINDOW: 4 * Math.PI,   // two input cycles shown in the time plots
        // Animation clock advanced by anim.js: th is the input phase (0..WINDOW),
        // t is wall time in seconds (for current-flow dots).
        clock: { th: 0, t: 0 },
        // Run fn now (after DOM ready) and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('cldchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
