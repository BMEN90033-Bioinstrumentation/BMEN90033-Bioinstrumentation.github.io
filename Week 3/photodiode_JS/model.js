// Photodiode model. Material table and responsivity ported from the
// original simulator; built-in potential, depletion width and band edges
// follow the textbook abrupt-junction relations below.
(function () {
    // bandgap (eV), cutoff and peak-response wavelengths (nm). col is the CSS
    // variable holding the photon colour drawn for that material.
    var MATERIALS = {
        'Si':     { name: 'Silicon', short: 'Si',     bandgap: 1.12, cutoffWavelength: 1100, peakWavelength: 900,  label: 'Silicon (1100 nm cutoff)', col: '--c-ph-si' },
        'InGaAs': { name: 'InGaAs',  short: 'InGaAs', bandgap: 0.75, cutoffWavelength: 1700, peakWavelength: 1550, label: 'InGaAs (1700 nm cutoff)',  col: '--c-ph-ingaas' },
        'GaP':    { name: 'GaP',     short: 'GaP',    bandgap: 2.26, cutoffWavelength: 550,  peakWavelength: 440,  label: 'GaP (550 nm cutoff)',      col: '--c-ph-gap' }
    };
    var ETA = 0.8;       // quantum efficiency
    var DELTA = 0.1;     // eV, Fermi level depth below the majority band edge
    var P_MAX_UW = 100;  // optical power at 100 % light intensity, uW

    // vr: reverse bias (V); light: intensity (%); mat: material key.
    var p = { mat: 'Si', vr: 5, light: 50 };

    function mat(q) { return MATERIALS[(q || p).mat]; }

    // Non-degenerate doping: each Fermi level lies DELTA inside the gap from
    // its majority band edge, so qV_bi = E_g - 2 DELTA.
    function vbi(m) { return m.bandgap - 2 * DELTA; }

    // Depletion half-width as a fraction of the device width:
    // W = W0 sqrt((V_bi + V_R) / V_bi), drawn up to 0.22.
    function deplFrac(vr, m) { m = m || mat(); return Math.min(0.05 * Math.sqrt((vbi(m) + vr) / vbi(m)), 0.22); }

    // Band edges in eV from the P-side valence band. The N side sits
    // q(V_bi + V_R) lower; the quasi-Fermi levels separate by qV_R with E_Fn
    // below E_Fp.
    function bands(vr, m) {
        m = m || mat();
        var off = vbi(m) + vr;
        return { eg: m.bandgap, off: off, efp: DELTA, efn: m.bandgap - off - DELTA, vbi: vbi(m) };
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
        MATERIALS: MATERIALS, ETA: ETA, DELTA: DELTA, vbi: vbi, P_MAX_UW: P_MAX_UW,
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
