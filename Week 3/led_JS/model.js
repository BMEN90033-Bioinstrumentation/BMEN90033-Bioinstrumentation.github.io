// LED model. Material table, depletion width and threshold logic ported from
// the original step-by-step simulator without change to the values. The
// junction is schematic: the depletion half-width is a fraction of the
// device width that narrows linearly with the applied voltage up to the
// material threshold.
(function () {
    // name, bandgap (eV), peak wavelength (nm), forward threshold (V).
    // col is the CSS variable that holds the emission colour.
    var MATERIALS = {
        'InGaN-blue':  { name: 'InGaN',   bandgap: 2.64, wavelength: 470, threshold: 2.6, label: 'Blue (470 nm)', col: '--c-em-ingan' },
        'AlGaInP-red': { name: 'AlGaInP', bandgap: 1.95, wavelength: 635, threshold: 1.8, label: 'Red (635 nm)',  col: '--c-em-algainp' },
        'GaAs-ir':     { name: 'GaAs',    bandgap: 1.42, wavelength: 870, threshold: 1.2, label: 'IR (870 nm)',   col: '--c-em-gaas' }
    };

    // Shared parameters. vf drives section 02 (forward bias), ve drives the
    // emission section; mat is common to every figure.
    var p = { mat: 'InGaN-blue', vf: 1.3, ve: 2.9 };

    function mat(q) { return MATERIALS[(q || p).mat]; }

    // Depletion half-width as a fraction of the device width. Step 0 is the
    // unbiased junction; otherwise the width falls to 5 % of its zero-bias
    // value at the threshold.
    function deplFrac(step, v, m) {
        var maxDepl = 0.1;
        if (step === 0) return maxDepl;
        var ratio = Math.min(v / m.threshold, 1);
        return maxDepl * (1 - ratio * 0.95);
    }

    function exceeded(v, m) { return v >= m.threshold; }

    // Band-diagram geometry in units of E_g, measured from the P-side valence
    // band edge. At zero bias the built-in drop is 2/3 E_g, so the Fermi level
    // stays inside the gap; it falls with bias and is nearly flat above the
    // threshold. The quasi-Fermi levels sit E_g / 6 inside each band edge.
    function bands(step, v, m) {
        var MAX_DROP = 16 / 24, EF_OFF = 4 / 24;
        var ratio = step === 0 ? 0 : Math.min(v / m.threshold, 1);
        var drop = step !== 0 && exceeded(v, m) ? 1 / 24 : MAX_DROP * (1 - ratio);
        return {
            ecP: 1, evP: 0, ecN: 1 - drop, evN: -drop,
            efP: EF_OFF, efN: 1 - drop - EF_OFF, ratio: ratio, drop: drop
        };
    }

    window.LED = {
        MATERIALS: MATERIALS, p: p, mat: mat,
        deplFrac: deplFrac, exceeded: exceeded, bands: bands,
        HC: 1239.84,   // h c in eV nm
        // Run fn after DOM ready and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('ledchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
