// BJT semiconductor model. Qualitative: the base-current slider (0..100,
// I_B = 2 uA per step) selects the operating region by fixed thresholds and
// scales injection, depletion widths and concentration profiles. Ported from
// the original simulator without change to the equations.
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

    // Concentration profiles along the device, position frac in 0..1.
    // Region fractions: emitter 0.42, base 0.15, collector 0.43.
    var EF = 0.42, BF = 0.15, CF = 0.43, BEJ = EF, BCJ = EF + BF;
    function profiles() {
        var ib = p.ib, npn = p.type === 'NPN';
        var eMaj = 19, bMaj = 17, cMaj = 15;
        var LOG_NI2 = Math.log10(NI * NI);
        var eMin = LOG_NI2 - eMaj, bMinEq = LOG_NI2 - bMaj, cMin = LOG_NI2 - cMaj;
        var inj = ib / 100, sb = satBlend(ib);
        // Injected minority density n_p0 exp(V_BE/V_T) stays below N_B (low injection).
        var injected = Math.min(bMinEq + inj * 12, bMaj - 1);
        var atBC = bMinEq + sb * inj * 10;
        var n = { e: npn ? eMaj : eMin, b0: npn ? injected : bMaj, b1: npn ? atBC : bMaj, c: npn ? cMaj : cMin };
        var q = { e: npn ? eMin : eMaj, b0: npn ? bMaj : injected, b1: npn ? bMaj : atBC, c: npn ? cMin : cMaj };
        function logAt(s, frac) {
            if (frac < BEJ - 0.005) return s.e;
            if (frac < BEJ + 0.005) return s.e + (s.b0 - s.e) * (frac - (BEJ - 0.005)) / 0.01;
            if (frac < BCJ - 0.005) {
                var t = (frac - BEJ - 0.005) / (BF - 0.01);
                return s.b0 + (s.b1 - s.b0) * Math.min(1, Math.max(0, t));
            }
            if (frac < BCJ + 0.005) return s.b1 + (s.c - s.b1) * (frac - (BCJ - 0.005)) / 0.01;
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
        regions: regions, profiles: profiles, plotDepletion: plotDepletion,
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
