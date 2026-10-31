// BJT switch model. Piecewise-linear large-signal model of a silicon BJT
// (2N3904 / 2N3906 class): cutoff, forward active, saturation. Ported from
// the original simulator without change to the equations.
(function () {
    var VBE_ON = 0.7;    // base-emitter turn-on voltage, V
    var VCE_SAT = 0.2;   // collector-emitter saturation voltage, V
    var R_THETA = 200;   // junction-to-ambient thermal resistance, C/W (TO-92)
    var T_AMB = 25;      // ambient temperature, C

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'bjtchange'; every plot reads them on render.
    var p = {
        type: 'NPN', vcc: 12, rl: 1000, vin: 5, rb: 10000, hfe: 100,
        wave: 'square', freq: 1
    };

    // Input waveform normalised to 0..1.
    function waveValue(t, wave, freq) {
        if (wave === 'dc') return 1;
        var phase = ((t * freq) % 1 + 1) % 1;
        if (wave === 'square') return phase < 0.5 ? 1 : 0;
        if (wave === 'sine') return 0.5 * (1 + Math.sin(2 * Math.PI * phase));
        if (wave === 'sawtooth') return phase;
        return 0;
    }

    // Operating state for an instantaneous input voltage vIn.
    // NPN: vIn drives the base through R_B, emitter grounded, R_L to V_CC.
    // PNP: emitter at V_CC, R_L to ground, conducts when vIn is pulled low.
    function compute(vIn, q) {
        q = q || p;
        var drive = q.type === 'NPN' ? vIn : q.vcc - vIn;   // V_BE (NPN) or V_EB (PNP)
        var ib = 0, ic = 0, vce = q.vcc, region = 'cutoff';
        if (drive >= VBE_ON) {
            ib = (drive - VBE_ON) / q.rb;
            var icActive = q.hfe * ib;
            var icSat = (q.vcc - VCE_SAT) / q.rl;
            if (icActive <= icSat) {
                ic = icActive; vce = q.vcc - ic * q.rl; region = 'active';
            } else {
                ic = icSat; vce = VCE_SAT; region = 'saturation';
            }
        }
        var ie = ic + ib;
        var pd = vce * ic + (ib > 0 ? VBE_ON : 0) * ib;
        return {
            ib: ib, ic: ic, ie: ie, vce: vce, region: region, vIn: vIn,
            pd: pd, tj: T_AMB + pd * R_THETA,
            hfeForced: ib > 0 ? ic / ib : 0
        };
    }

    function icSat(q) { q = q || p; return (q.vcc - VCE_SAT) / q.rl; }

    // Input voltage at the edge of saturation (NPN), or the corresponding
    // base voltage for PNP measured from ground.
    function vinSat(q) {
        q = q || p;
        var d = VBE_ON + q.rb * icSat(q) / q.hfe;
        return q.type === 'NPN' ? d : q.vcc - d;
    }

    // Current formatted for KaTeX, e.g. "1.23\,\text{mA}".
    function fmtI(a) {
        if (a <= 0) return '0\\,\\text{mA}';
        if (a < 1e-3) return (a * 1e6).toFixed(1) + '\\,\\mu\\text{A}';
        if (a < 1) return (a * 1e3).toFixed(2) + '\\,\\text{mA}';
        return a.toFixed(3) + '\\,\\text{A}';
    }
    function fmtR(r) {
        return r >= 1000 ? (r / 1000).toFixed(r % 1000 ? 1 : 0) + ' kΩ' : r + ' Ω';
    }
    function fmtP(w) {
        var mw = w * 1e3;
        return mw < 1000 ? mw.toFixed(mw < 10 ? 2 : 1) + ' mW' : w.toFixed(2) + ' W';
    }

    window.BJT = {
        VBE_ON: VBE_ON, VCE_SAT: VCE_SAT, R_THETA: R_THETA, T_AMB: T_AMB,
        p: p, compute: compute, waveValue: waveValue, icSat: icSat, vinSat: vinSat,
        fmtI: fmtI, fmtR: fmtR, fmtP: fmtP,
        // Run fn now (after DOM ready) and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('bjtchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
