// Photodiode model. Material table, depletion width, band-diagram geometry
// and responsivity ported from the original step-by-step simulator without
// change to the values.
(function () {
    // bandgap (eV), cutoff and peak-response wavelengths (nm). col is the CSS
    // variable holding the photon colour drawn for that material.
    var MATERIALS = {
        'Si':     { name: 'Silicon', short: 'Si',     bandgap: 1.12, cutoffWavelength: 1100, peakWavelength: 900,  label: 'Silicon (1100 nm cutoff)', col: '--c-ph-si' },
        'InGaAs': { name: 'InGaAs',  short: 'InGaAs', bandgap: 0.75, cutoffWavelength: 1700, peakWavelength: 1550, label: 'InGaAs (1700 nm cutoff)',  col: '--c-ph-ingaas' },
        'GaP':    { name: 'GaP',     short: 'GaP',    bandgap: 2.26, cutoffWavelength: 550,  peakWavelength: 440,  label: 'GaP (550 nm cutoff)',      col: '--c-ph-gap' }
    };
    var ETA = 0.8;       // quantum efficiency
    var V_BI = 0.7;      // built-in potential used for the depletion width, V
    var P_MAX_UW = 100;  // optical power at 100 % light intensity, uW

    // vr: reverse bias (V); light: intensity (%); mat: material key.
    var p = { mat: 'Si', vr: 5, light: 50 };

    function mat(q) { return MATERIALS[(q || p).mat]; }

    // Depletion half-width as a fraction of the device width:
    // W = W0 sqrt(1 + V_R / V_bi), capped at 0.22.
    function deplFrac(vr) { return Math.min(0.05 * Math.sqrt(1 + vr / V_BI), 0.22); }

    // Band diagram in units of E_g (the original drew E_g as 24 px), upward
    // from the P-side valence band. The N side drops by the built-in step
    // (16 px, about 2/3 E_g) plus a schematic 0.8 px per volt of reverse bias.
    // Quasi-Fermi levels sit E_g / 6 inside the majority band edge.
    function bands(vr) {
        var drop = (16 + vr * 0.8) / 24, off = 4 / 24;
        return { ecP: 1, evP: 0, ecN: 1 - drop, evN: -drop, efP: off, efN: 1 - drop - off };
    }

    // Ideal responsivity R = eta q lambda / (h c) = eta lambda[nm] / 1240 A/W
    // below the cutoff wavelength, zero above it.
    function responsivity(lam, m) { return lam <= m.cutoffWavelength ? ETA * lam / 1240 : 0; }

    // Photocurrent in uA at the material's peak-response wavelength.
    function photocurrent(q) {
        q = q || p;
        var m = mat(q);
        return responsivity(m.peakWavelength, m) * (q.light / 100) * P_MAX_UW;
    }

    window.PD = {
        MATERIALS: MATERIALS, ETA: ETA, V_BI: V_BI, P_MAX_UW: P_MAX_UW,
        p: p, mat: mat, deplFrac: deplFrac, bands: bands,
        responsivity: responsivity, photocurrent: photocurrent,
        // Run fn after DOM ready and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('pdchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
