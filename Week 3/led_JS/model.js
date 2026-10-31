// LED model. Material table, depletion width and threshold logic ported from
// the original step-by-step simulator. The built-in potential, junction
// voltage, depletion width and band edges follow the textbook abrupt
// junction relations below.
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

    // Heavily doped junction: each Fermi level lies DELTA inside its majority
    // band, so the built-in potential is qV0 = E_g + 2 DELTA.
    var DELTA = 0.05;   // eV
    function v0(m) { return m.bandgap + 2 * DELTA; }

    // Junction voltage. It follows the applied voltage up to the turn-on
    // voltage V_th; above it the current rises steeply, the junction voltage
    // stays at V_th and the excess drops across the series resistance of the
    // neutral regions. Step 0 is the unbiased junction.
    function vj(step, v, m) { return step === 0 ? 0 : Math.min(v, m.threshold); }

    // Depletion half-width as a fraction of the device width,
    // W = W0 sqrt((V0 - V_j) / V0) with W0 = 0.1.
    function deplFrac(step, v, m) {
        var V0 = v0(m);
        return 0.1 * Math.sqrt((V0 - vj(step, v, m)) / V0);
    }

    function exceeded(v, m) { return v >= m.threshold; }

    // Band edges in eV, measured from the P-side valence band. The N side
    // sits q(V0 - V_j) lower; the quasi-Fermi levels separate by qV_j.
    function bands(step, v, m) {
        var V = vj(step, v, m), off = v0(m) - V;
        return { eg: m.bandgap, off: off, efp: -DELTA, efn: m.bandgap - off + DELTA, vj: V, v0: v0(m) };
    }

    window.LED = {
        MATERIALS: MATERIALS, p: p, mat: mat,
        deplFrac: deplFrac, exceeded: exceeded, bands: bands, v0: v0, vj: vj, DELTA: DELTA,
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
