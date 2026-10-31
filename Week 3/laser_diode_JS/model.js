// Laser diode model. Constants, band-diagram geometry and the L-I
// characteristic are ported from the original step-by-step simulator without
// change to the values. GaAs device, schematic units.
(function () {
    var BANDGAP = 1.42;                // eV (GaAs)
    var BUILTIN_V = 1.2;               // V built-in potential
    var THRESHOLD_CURRENT = 40;        // mA, lasing threshold
    var CAVITY_LENGTH_UM = 300;        // um, typical cavity length
    var FACET_REFLECTIVITY = 0.32;     // cleaved GaAs facet (n = 3.5)
    var REAR_FACET_REFLECTIVITY = 0.95; // HR-coated rear facet
    var WAVELENGTH = 870;              // nm (GaAs)
    var I_MAX = 100;                   // mA, slider and L-I range

    var p = { I: 50 };   // injection current, mA

    function aboveThreshold(I) { return I >= THRESHOLD_CURRENT; }

    // Band diagram in units of E_g (the original drew E_g as 72 px), measured
    // upward from the P-side valence band. The N side sits lower by the
    // band bending, which falls to zero at 30 mA. The quasi-Fermi levels are
    // drawn above 5 mA; their separation reaches E_g at the transparency
    // current 0.8 I_th and is clamped above threshold.
    function bands(step, I) {
        var PX = 72;
        var ratio = step === 0 ? 0 : Math.min(I / 30, 1);
        var bend = (1 - ratio) * 22;
        var out = { ecP: 1, evP: 0, ecN: 1 - bend / PX, evN: -bend / PX, qfl: false };
        if (step >= 2 && I > 5) {
            var I_TR = 0.8 * THRESHOLD_CURRENT;
            var split = 20 * Math.min(I, THRESHOLD_CURRENT) / I_TR;
            out.qfl = true;
            out.efc = 1 - (bend / 2 + 8 - split * 0.4) / PX;
            out.efv = -(bend / 2 - 8 + split * 0.4) / PX;
            out.inverted = out.efc - out.efv > 1;
        }
        return out;
    }

    // Normalised optical output power, spontaneous below threshold and
    // linear in (I - I_th) above it.
    function power(I) {
        if (I < THRESHOLD_CURRENT) return 0.02 * I / THRESHOLD_CURRENT;
        return 0.02 + (I - THRESHOLD_CURRENT) / (I_MAX - THRESHOLD_CURRENT) * 0.95;
    }

    window.LD = {
        BANDGAP: BANDGAP, BUILTIN_V: BUILTIN_V, THRESHOLD_CURRENT: THRESHOLD_CURRENT,
        CAVITY_LENGTH_UM: CAVITY_LENGTH_UM, FACET_REFLECTIVITY: FACET_REFLECTIVITY,
        REAR_FACET_REFLECTIVITY: REAR_FACET_REFLECTIVITY, WAVELENGTH: WAVELENGTH, I_MAX: I_MAX,
        p: p, aboveThreshold: aboveThreshold, bands: bands, power: power,
        // Run fn after DOM ready and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('ldchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
