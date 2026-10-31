// Common-emitter amplifier model (2N3904, voltage-divider bias). DC
// operating point, hybrid-pi midband gain, three low-frequency poles and one
// zero, two high-frequency (Miller) poles, and A_V(jw) as their product.
// Ported from the original page without change to the equations.
(function () {
    // Fixed circuit constants.
    var RS = 100;
    var RE = 500;
    var RBB = 66670;          // RB1 || RB2
    var Cmu = 4e-12;
    var fT = 300e6;
    var VT = 0.026;
    var VBB = 1.667;
    var VBE = 0.7;
    var VCC = 5;
    var VCE_SAT = 0.2;

    // Slider state. Capacitors are stored in uF and resistors in ohm; the
    // sliders hold log10 of each (data-log). f is the cursor frequency in Hz.
    var DEFAULTS = { cc1: 0.1, cc2: 0.1, ce: Math.pow(10, 2.342), rl: Math.pow(10, 3.301),
                     rc: Math.pow(10, 3.301), beta: 200, f: 1e4 };
    var p = Object.assign({}, DEFAULTS);

    // Derived parameters for the present slider state.
    function params(q) {
        q = q || p;
        var CC1 = q.cc1 * 1e-6, CC2 = q.cc2 * 1e-6, CE = q.ce * 1e-6;
        var RL = q.rl, RC = q.rc, beta = q.beta;

        var IC   = (VBB - VBE) / (RE + RBB / beta);
        var gm   = IC / VT;
        var r_pi = beta / gm;
        var Rin  = (RBB * r_pi) / (RBB + r_pi);
        // Edge of saturation: V_CE = VCC - IC(RC + RE) must stay above VCE_SAT.
        // ponytail: gain is held at the edge-of-saturation value; real gain collapses in saturation
        var RC_max = (VCC - VCE_SAT) / IC - RE;
        var sat = RC > RC_max;
        var RC_ac = Math.min(RC, RC_max);
        var RC_eff = (RC_ac * RL) / (RC_ac + RL);
        var Amid = (Rin / (Rin + RS)) * gm * RC_eff;

        // Low-frequency poles and zero.
        var wL1 = 1 / (CC1 * (RS + Rin));
        var wL2 = 1 / (CC2 * (RC + RL));
        var Rth_e = (RS * RBB) / (RS + RBB);
        var Re_seen = (r_pi + Rth_e) / (beta + 1);
        var RE_par = (RE * Re_seen) / (RE + Re_seen);
        var wL3 = 1 / (CE * RE_par);
        var wZ  = 1 / (CE * RE);

        // High-frequency poles (Miller).
        var Cpi = gm / (2 * Math.PI * fT) - Cmu;
        var Cin_Miller = Cpi + Cmu * (1 + gm * RC_eff);
        var Rth_b = 1 / (1 / RS + 1 / RBB + 1 / r_pi);
        var wH1 = 1 / (Rth_b * Cin_Miller);
        var wH2 = 1 / (RC_eff * Cmu);

        return {
            CC1: CC1, CC2: CC2, CE: CE, RL: RL, RC: RC, beta: beta, IC: IC, gm: gm, r_pi: r_pi,
            Rin: Rin, RC_eff: RC_eff, Amid: Amid, wL1: wL1, wL2: wL2, wL3: wL3, wZ: wZ,
            wH1: wH1, wH2: wH2, sat: sat, Cpi: Cpi, Cin_Miller: Cin_Miller,
            VCE: VCC - IC * (RC + RE)       // collector-emitter voltage, I_E taken as I_C
        };
    }

    // Complex arithmetic helpers.
    function highPass(w, pl) {
        var d = pl * pl + w * w;
        return { re: (w * w) / d, im: (w * pl) / d };
    }
    function lowPass(w, pl) {
        var d = pl * pl + w * w;
        return { re: (pl * pl) / d, im: -(w * pl) / d };
    }
    function poleZero(w, z, pl) {
        var d = pl * pl + w * w;
        return { re: (z * pl + w * w) / d, im: (w * pl - w * z) / d };
    }
    function cmul(a, b) {
        return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
    }

    // H(jw) for parameters P (w in rad/s).
    function evalH(w, P) {
        if (w === 0) return { re: 0, im: 0, mag: 0, phase_deg: 0 };
        var r = cmul(highPass(w, P.wL1), highPass(w, P.wL2));
        r = cmul(r, poleZero(w, P.wZ, P.wL3));
        r = cmul(r, lowPass(w, P.wH1));
        r = cmul(r, lowPass(w, P.wH2));
        var K = -P.Amid;
        r.re *= K;
        r.im *= K;
        var mag = Math.sqrt(r.re * r.re + r.im * r.im);
        return { re: r.re, im: r.im, mag: mag, phase_deg: Math.atan2(r.im, r.re) * 180 / Math.PI };
    }

    // Phase unwrapped by scanning from 10 Hz up to f (Hz).
    function unwrappedPhase(P, f) {
        var prev = 0, off = 0, result = 0;
        var logMin = 1, logCF = Math.log10(f), steps = 200;
        for (var j = 0; j <= steps; j++) {
            var lf = logMin + (logCF - logMin) * j / steps;
            var pj = evalH(2 * Math.PI * Math.pow(10, lf), P).phase_deg + off;
            if (j > 0) {
                while (pj - prev > 180) { pj -= 360; off -= 360; }
                while (pj - prev < -180) { pj += 360; off += 360; }
            }
            prev = pj;
            result = pj;
        }
        return result;
    }

    function fmtFreq(f) {
        if (f >= 1e6) return (f / 1e6).toFixed(f >= 10e6 ? 0 : 1) + ' MHz';
        if (f >= 1e3) return (f / 1e3).toFixed(f >= 10e3 ? 0 : 1) + ' kHz';
        if (f >= 10) return f.toFixed(0) + ' Hz';
        return f.toPrecision(2) + ' Hz';     // sub-10 Hz poles from large capacitors
    }
    function fmtCap(uF) {
        if (uF >= 1) return uF.toFixed(0) + ' µF';
        if (uF >= 0.1) return uF.toFixed(2) + ' µF';
        return (uF * 1000).toFixed(0) + ' nF';
    }
    function fmtRes(ohm) {
        if (ohm >= 1e6) return (ohm / 1e6).toFixed(1) + ' MΩ';
        if (ohm >= 1e3) return (ohm / 1e3).toFixed(ohm >= 10e3 ? 1 : 2) + ' kΩ';
        return ohm.toFixed(0) + ' Ω';
    }
    // Plain-text value with unit into KaTeX, e.g. "2.00 kΩ" -> 2.00\,\text{k}\Omega.
    function tex(s) {
        var i = s.indexOf(' ');
        var unit = s.slice(i + 1).replace('Ω', '}\\Omega\\text{').replace('µ', '}\\mu\\text{');
        return s.slice(0, i) + '\\,\\text{' + unit + '}';
    }

    window.LCA = {
        RS: RS, RE: RE, RBB: RBB, VCC: VCC, VBB: VBB, VBE: VBE, VCE_SAT: VCE_SAT,
        DEFAULTS: DEFAULTS, p: p, params: params, evalH: evalH, unwrappedPhase: unwrappedPhase,
        fmtFreq: fmtFreq, fmtCap: fmtCap, fmtRes: fmtRes, tex: tex,
        // Run fn now (after DOM ready) and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('lcachange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
