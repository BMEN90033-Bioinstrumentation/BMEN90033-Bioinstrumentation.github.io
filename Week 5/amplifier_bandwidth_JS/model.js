// Amplifier bandwidth model. Single-pole RC low-pass after an ideal gain
// stage, H(jw) = A_v / (1 + j w/w0) with w0 = 1/RC, and the op-amp
// gain-bandwidth relation w0 = GBP / A_v. Ported from the original page
// without change to the equations. All frequencies are in rad/s.
(function () {
    // Slider ranges (log-mapped).
    var R_MIN = 100, R_MAX = 100000;
    var C_MIN = 1e-12, C_MAX = 100e-9;
    var AV_MIN = 1, AV_MAX = 1000;
    var FREQ_MIN = 1, FREQ_MAX = 1e9;
    var GBP_MIN = 100e3 * 2 * Math.PI, GBP_MAX = 1e9 * 2 * Math.PI;

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'ampchange'; every plot reads them on render.
    var p = {
        R: 10000, C: 1e-9, Av: 100, testFreq: 1e5,
        GBP: 10e6 * 2 * Math.PI,       // rad/s (10 MHz)
        loop: 'open'                    // op-amp circuit shown in section 05
    };

    var presets = {
        audio: { R: 10000, C: 10e-9, Av: 100 },
        rf:    { R: 500,   C: 5e-12, Av: 20 }
    };

    function omega0(q) { q = q || p; return 1 / (q.R * q.C); }
    function gainAt(w, q) { q = q || p; return q.Av / Math.sqrt(1 + Math.pow(w / omega0(q), 2)); }
    function gainDb(w, q) { return 20 * Math.log10(gainAt(w, q)); }

    // Quantities at the test frequency.
    function state(q) {
        q = q || p;
        var w0 = omega0(q), ratio = q.testFreq / w0;
        var gain = gainAt(q.testFreq, q);
        return {
            w0: w0, ratio: ratio, mag: Math.sqrt(1 + ratio * ratio),
            angle: Math.atan(ratio) * 180 / Math.PI,       // phase lag, degrees
            gain: gain, db: 20 * Math.log10(gain), gf: gain / q.Av,
            regime: ratio < 0.1 ? 'passband' : ratio > 10 ? 'roll-off' : 'transition'
        };
    }

    // Gain as text without exponent notation.
    function fmtAv(v) { return v >= 100 ? v.toFixed(0) : v.toPrecision(3); }
    // Number for KaTeX with p significant figures; large or small values in
    // scientific form, e.g. 1.00 \times 10^{7}.
    function texNum(v, prec) {
        var s = v.toPrecision(prec), i = s.indexOf('e');
        return i < 0 ? s : s.slice(0, i) + '\\times 10^{' + parseInt(s.slice(i + 1), 10) + '}';
    }

    function fmtR(v) {
        if (v >= 1e6) return (v / 1e6).toPrecision(3) + ' MΩ';
        if (v >= 1e3) return (v / 1e3).toPrecision(3) + ' kΩ';
        return v.toPrecision(3) + ' Ω';
    }
    function fmtC(v) {
        if (v >= 1e-6) return (v * 1e6).toPrecision(3) + ' µF';
        if (v >= 1e-9) return (v * 1e9).toPrecision(3) + ' nF';
        return (v * 1e12).toPrecision(3) + ' pF';
    }
    function fmtFreq(v) {
        if (v >= 1e9) return (v / 1e9).toPrecision(3) + ' Grad/s';
        if (v >= 1e6) return (v / 1e6).toPrecision(3) + ' Mrad/s';
        if (v >= 1e3) return (v / 1e3).toPrecision(3) + ' krad/s';
        return v.toPrecision(3) + ' rad/s';
    }
    function fmtHz(w) {
        var hz = w / (2 * Math.PI);
        if (hz >= 1e9) return (hz / 1e9).toPrecision(3) + ' GHz';
        if (hz >= 1e6) return (hz / 1e6).toPrecision(3) + ' MHz';
        if (hz >= 1e3) return (hz / 1e3).toPrecision(3) + ' kHz';
        return hz.toPrecision(3) + ' Hz';
    }
    // Plain-text unit string into KaTeX: "10.0 kΩ" -> "10.0\,\text{k}\Omega".
    function tex(s) {
        var i = s.indexOf(' ');
        var unit = s.slice(i + 1).replace('Ω', '}\\Omega\\text{').replace('µ', '}\\mu\\text{');
        return s.slice(0, i) + '\\,\\text{' + unit + '}';
    }

    window.AMP = {
        p: p, presets: presets,
        R_MIN: R_MIN, R_MAX: R_MAX, C_MIN: C_MIN, C_MAX: C_MAX,
        AV_MIN: AV_MIN, AV_MAX: AV_MAX, FREQ_MIN: FREQ_MIN, FREQ_MAX: FREQ_MAX,
        GBP_MIN: GBP_MIN, GBP_MAX: GBP_MAX,
        omega0: omega0, gainAt: gainAt, gainDb: gainDb, state: state,
        fmtAv: fmtAv, texNum: texNum, fmtR: fmtR, fmtC: fmtC, fmtFreq: fmtFreq, fmtHz: fmtHz, tex: tex,
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
