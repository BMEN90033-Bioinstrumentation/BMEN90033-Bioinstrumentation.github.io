// BJT semiconductor model. Qualitative: the base-current slider (0..100,
// I_B = 2 uA per step) selects the operating region by fixed thresholds and
// scales injection, depletion widths and concentration profiles. Ported from
// the original simulator; the base minority profile now uses the junction
// edge conditions (see profiles()).
(function () {
    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'bjschange'; every figure reads them.
    var p = { type: 'NPN', ib: 0, anim: 'play', scale: 'log' };

    // Doping (cm^-3) and intrinsic concentration of silicon at 300 K.
    var NE = 1e19, NB = 1e17, NC = 1e15, NI = 1.5e10;

    function region(ib) {
        ib = ib === undefined ? p.ib : ib;
        if (ib === 0) return 'cutoff';
        if (ib < 15) return 'subthreshold';
        if (ib < 55) return 'active';
        if (ib < 80) return 'approaching saturation';
        return 'saturation';
    }
    function ibMicro(ib) { return Math.round((ib === undefined ? p.ib : ib) * 2); }

    // Blend 0..1 as the base-collector junction moves towards forward bias.
    function satBlend(ib) { return Math.max(0, Math.min(1, (ib - 50) / 40)); }

    // Cross-section geometry for a canvas of w x h (CSS px). top is the upper
    // edge of the semiconductor block; the original used 0.12 h, raised here
    // to leave room for the region labels above the block.
    function regions(w, h) {
        var ib = p.ib;
        var margin = w * 0.08, top = Math.max(76, h * 0.17), bottom = h * 0.78;
        var regionW = w - 2 * margin;
        var emitterW = regionW * 0.35, baseW = regionW * 0.12, collectorW = regionW * 0.35;
        var eX = margin, bX = eX + emitterW, cX = bX + baseW;
        var maxDepl = Math.min(emitterW, collectorW) * 0.15;
        var beFrac = ib === 0 ? 1.0 : Math.max(0.15, 1.0 - ib / 100);
        // BC depletion widens under reverse bias, then narrows as saturation approaches.
        var sb = satBlend(ib);
        var bcWiden = 1.0 + ib / 200;
        var bcNarrow = 0.3 + (1.0 - sb) * 0.7;
        var bcFrac = ib === 0 ? 1.0 : ((1 - sb) * bcWiden + sb * bcNarrow);
        return {
            margin: margin, top: top, bottom: bottom,
            emitter: { x: eX, w: emitterW }, base: { x: bX, w: baseW }, collector: { x: cX, w: collectorW },
            beDepl: maxDepl * beFrac, bcDepl: maxDepl * bcFrac, maxDepl: maxDepl,
            height: bottom - top
        };
    }

    // Junction voltages implied by the slider (forward bias positive; for
    // the PNP these are V_EB and V_CB). V_BE raises the injected density by
    // the same number of decades as the original model, capped a decade
    // below N_B (low injection). V_BC is 0 V at I_B = 0 (unbiased device),
    // -2 V (reverse) in the active region, and blends towards forward bias
    // as saturation approaches. VT = kT/q = 25.85 mV at 300 K.
    var VT = 0.02585, V_REV = -2;
    function junctions() {
        var ib = p.ib, inj = ib / 100, sb = satBlend(ib), dec = VT * Math.LN10;
        var bMinEq = Math.log10(NI * NI / NB);
        var vbe = Math.min(inj * 12, 17 - 1 - bMinEq) * dec;
        var vbc = ib === 0 ? 0 : (1 - sb) * V_REV + sb * inj * 10 * dec;
        return { vbe: vbe, vbc: vbc };
    }

    // Concentration profiles along the device, position frac in 0..1.
    // Region fractions: emitter 0.42, base 0.15, collector 0.43.
    // Base minority profile (short base, negligible recombination): linear
    // in concentration between the junction-edge values
    //   n_B(0)   = n_B0 exp(V_BE / V_T)
    //   n_B(W_B) = n_B0 exp(V_BC / V_T)
    // Values are returned as log10(cm^-3), floored at 0 (1 cm^-3, the
    // bottom of the log axis), since n_B(W_B) is effectively 0 under reverse bias.
    var EF = 0.42, BF = 0.15, CF = 0.43, BEJ = EF, BCJ = EF + BF;
    function profiles() {
        var npn = p.type === 'NPN', j = junctions();
        var eMaj = 19, bMaj = 17, cMaj = 15;
        var LOG_NI2 = Math.log10(NI * NI);
        var eMin = LOG_NI2 - eMaj, bMinEq = LOG_NI2 - bMaj, cMin = LOG_NI2 - cMaj;
        var nB0 = Math.pow(10, bMinEq);
        var edge0 = nB0 * Math.exp(j.vbe / VT), edgeW = nB0 * Math.exp(j.vbc / VT);
        var lg = function (v) { return Math.max(0, Math.log10(Math.max(v, 1e-300))); };
        // Minority carriers in the base, linear between the two edges.
        function minority(frac) {
            var t = Math.min(1, Math.max(0, (frac - BEJ - 0.005) / (BF - 0.01)));
            return lg(edge0 + (edgeW - edge0) * t);
        }
        var n = { e: npn ? eMaj : eMin, b: npn ? minority : null, maj: bMaj, c: npn ? cMaj : cMin };
        var q = { e: npn ? eMin : eMaj, b: npn ? null : minority, maj: bMaj, c: npn ? cMin : cMaj };
        function logAt(s, frac) {
            var inBase = function (f) { return s.b ? s.b(f) : s.maj; };
            if (frac < BEJ - 0.005) return s.e;
            if (frac < BEJ + 0.005) return s.e + (inBase(BEJ + 0.005) - s.e) * (frac - (BEJ - 0.005)) / 0.01;
            if (frac < BCJ - 0.005) return inBase(frac);
            if (frac < BCJ + 0.005) { var b1 = inBase(BCJ - 0.005); return b1 + (s.c - b1) * (frac - (BCJ - 0.005)) / 0.01; }
            return s.c;
        }
        return {
            logN: function (f) { return logAt(n, f); },
            logP: function (f) { return logAt(q, f); }
        };
    }

    // Depletion half-widths in the concentration plot (fraction of length).
    function plotDepletion() {
        var ib = p.ib, sb = satBlend(ib);
        var be = ib === 0 ? 0.04 : Math.max(0.006, 0.04 * (1 - ib / 100));
        var widen = 0.04 * (1 + ib / 200), narrow = 0.012 + (1 - sb) * 0.028;
        var bc = ib === 0 ? 0.04 : ((1 - sb) * widen + sb * narrow);
        return { be: be, bc: bc };
    }

    window.BJS = {
        NE: NE, NB: NB, NC: NC, NI: NI, EF: EF, BF: BF, CF: CF, BEJ: BEJ, BCJ: BCJ,
        p: p, region: region, ibMicro: ibMicro, satBlend: satBlend,
        regions: regions, profiles: profiles, junctions: junctions, plotDepletion: plotDepletion,
        // Run fn now (after DOM ready) and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('bjschange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
