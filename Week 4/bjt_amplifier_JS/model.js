// NPN common-emitter amplifier, fixed bias through R_B from V_BB with the AC
// source v_in(t) in series: V_BB + v_in(t) = i_B R_B + v_BE. Shockley V_BE
// solver, DC bias, small-signal analysis and waveform generator are ported
// from the original simulator without change to the equations.
(function () {
    var VBE_ON = 0.7;    // V_BE turn-on (silicon), V
    var VCE_SAT = 0.2;   // V_CE saturation, V
    var VT = 0.026;      // thermal voltage kT/q at 300 K, V
    var IS = 1e-14;      // saturation current, A (I_C = 4.9 mA at V_BE = 0.7 V)

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'ampchange'; every figure reads them.
    var p = {
        vcc: 12, vbb: 2, rb: 100000, rc: 2200, hfe: 200,
        vin: 20, freq: 1, wave: 'sine',              // vin: peak, mV
        run: 'play', exact: 'on', tangent: 'on'
    };

    // Waveform normalised to -1..+1.
    function waveValue(t) {
        if (p.wave === 'dc') return 1;
        var phase = (t * p.freq) % 1;
        switch (p.wave) {
            case 'sine': return Math.sin(2 * Math.PI * phase);
            case 'square': return phase < 0.5 ? 1 : -1;
            case 'triangle': return phase < 0.5 ? (4 * phase - 1) : (3 - 4 * phase);
            default: return 0;
        }
    }

    // Solves V_source = (I_S exp(V_BE/V_T) / beta) R_B + V_BE by Newton's
    // method, starting just above the root so the iteration is monotone.
    function solveVBE(vSource) {
        if (vSource <= 0) return 0;
        var vbe = Math.min(vSource, VBE_ON + 0.1);
        for (var iter = 0; iter < 30; iter++) {
            var ib = IS * Math.exp(vbe / VT) / p.hfe;
            var f = vSource - ib * p.rb - vbe;
            var fp = -(ib / VT) * p.rb - 1;
            vbe -= f / fp;
            if (Math.abs(f) < 1e-9) break;
        }
        return Math.max(0, vbe);
    }

    // Operating point for a base-loop source voltage (no Early effect).
    function operatingPoint(vSource) {
        var vbe = solveVBE(vSource);
        var ib = Math.max(0, (vSource - vbe) / p.rb);
        var icSat = (p.vcc - VCE_SAT) / p.rc;
        var sat = p.hfe * ib > icSat;
        var ic = sat ? icSat : p.hfe * ib;
        return { vbe: vbe, ib: ib, ic: ic, vce: sat ? VCE_SAT : p.vcc - ic * p.rc };
    }

    // DC bias (v_in = 0). Cutoff when V_BB < V_BE(on).
    function computeDCBias() {
        var ibq, icq, vceq, region;
        if (p.vbb < VBE_ON) {
            ibq = 0; icq = 0; vceq = p.vcc; region = 'cutoff';
        } else {
            ibq = operatingPoint(p.vbb).ib;
            var icActive = p.hfe * ibq, icSat = (p.vcc - VCE_SAT) / p.rc;
            if (icActive <= icSat) { icq = icActive; vceq = p.vcc - icq * p.rc; region = 'active'; }
            else { icq = icSat; vceq = VCE_SAT; region = 'saturation'; }
        }
        return { ibq: ibq, icq: icq, vceq: vceq, region: region };
    }

    // Small-signal parameters at the DC bias.
    //   r_e = V_T / I_CQ, g_m = I_CQ / V_T, r_pi = beta r_e
    //   v_be = v_in r_pi / (R_B + r_pi)
    //   A_v = -g_m R_C r_pi / (R_B + r_pi) = -beta R_C / (R_B + r_pi)
    function computeSmallSignal(bias) {
        if (bias.icq <= 0) return { av: 0, av_intrinsic: 0, re_small: Infinity, gm: 0, zin: 0, vbe_fraction: 0 };
        var re_small = VT / bias.icq, gm = bias.icq / VT, r_pi = p.hfe * re_small;
        var av_intrinsic = -gm * p.rc, vbe_fraction = r_pi / (p.rb + r_pi);
        if (bias.region !== 'active') return { av: 0, av_intrinsic: 0, re_small: re_small, gm: gm, zin: r_pi, vbe_fraction: vbe_fraction };
        return { av: av_intrinsic * vbe_fraction, av_intrinsic: av_intrinsic, re_small: re_small, gm: gm, zin: r_pi, vbe_fraction: vbe_fraction };
    }

    // Shockley Q-point used by the transfer characteristic: Newton from
    // min(V_BB, V_BE(on)), I_CQ clamped at the saturation limit.
    function shockleyQ() {
        var vq = Math.min(p.vbb, VBE_ON);
        for (var iter = 0; iter < 15; iter++) {
            var ib = IS * Math.exp(vq / VT) / p.hfe;
            var f = p.vbb - ib * p.rb - vq, fp = -(ib / VT) * p.rb - 1, dv = f / fp;
            vq -= dv;
            if (Math.abs(dv) < 1e-9) break;
        }
        vq = Math.max(0, vq);
        var icSat = (p.vcc - VCE_SAT) / p.rc;
        var icq = Math.min(IS * Math.exp(vq / VT), icSat);
        return { vbe: vq, ic: icq, gm: icq / VT, icSat: icSat };
    }

    // ── Shared animation clock ──
    // Rolling buffer of v_in samples, one per frame. The clock runs while
    // p.run is 'play' and at least one animated figure is on screen; each
    // frame dispatches 'amptick'.
    var BUFFER_LEN = 600;
    var buf = { t: [], vin: [] }, simTime = 0, lastTs = 0, raf = 0, visible = 0;
    function clearBuffer() { buf.t = []; buf.vin = []; }
    function frame(ts) {
        if (!lastTs) lastTs = ts;
        var dt = Math.min((ts - lastTs) / 1000, 0.05);
        lastTs = ts;
        simTime += dt;
        buf.t.push(simTime);
        buf.vin.push(p.vin / 1000 * waveValue(simTime));
        if (buf.t.length > BUFFER_LEN) { buf.t.shift(); buf.vin.shift(); }
        window.dispatchEvent(new CustomEvent('amptick'));
        raf = requestAnimationFrame(frame);
    }
    function clock() {
        var want = p.run === 'play' && visible > 0;
        if (want && !raf) { lastTs = 0; raf = requestAnimationFrame(frame); }
        if (!want && raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    function watch(el) {
        var on = false;
        new IntersectionObserver(function (es) {
            var v = es[0].isIntersecting;
            if (v !== on) { visible += v ? 1 : -1; on = v; clock(); }
        }).observe(el);
    }
    window.addEventListener('ampchange', function (e) {
        if (e.detail.key === 'run') clock();
        if (e.detail.key === 'clear') clearBuffer();
    });
    // Present instantaneous input, 0 before the first frame.
    function vinNow() { return buf.vin.length ? buf.vin[buf.vin.length - 1] : 0; }

    function fmtR(r) { return r >= 1000 ? (r / 1000).toFixed(1) + ' kΩ' : r + ' Ω'; }
    function fmtV(v) { return Math.abs(v) < 0.01 ? (v * 1000).toFixed(1) + ' mV' : v.toFixed(2) + ' V'; }
    function fmtmA(a) { return (a * 1e3).toFixed(3) + ' mA'; }

    window.AMP = {
        VBE_ON: VBE_ON, VCE_SAT: VCE_SAT, VT: VT, IS: IS, BUFFER_LEN: BUFFER_LEN,
        p: p, buf: buf, waveValue: waveValue, solveVBE: solveVBE, operatingPoint: operatingPoint,
        computeDCBias: computeDCBias, computeSmallSignal: computeSmallSignal, shockleyQ: shockleyQ,
        watch: watch, vinNow: vinNow, fmtR: fmtR, fmtV: fmtV, fmtmA: fmtmA,
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
