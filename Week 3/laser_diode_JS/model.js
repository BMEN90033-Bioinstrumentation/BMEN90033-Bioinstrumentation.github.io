// Laser diode model. Constants, band-diagram geometry and the L-I
// characteristic are ported from the original step-by-step simulator without
// change to the values. GaAs device, schematic units.
(function () {
    var BANDGAP = 1.42;                // eV (GaAs)
    var THRESHOLD_CURRENT = 40;        // mA, lasing threshold
    var CAVITY_LENGTH_UM = 300;        // um, typical cavity length
    var FACET_REFLECTIVITY = 0.32;     // cleaved GaAs facet (n = 3.5)
    var REAR_FACET_REFLECTIVITY = 0.95; // HR-coated rear facet
    var WAVELENGTH = 870;              // nm (GaAs)
    var I_MAX = 100;                   // mA, slider and L-I range

    var p = { I: 50 };   // injection current, mA

    function aboveThreshold(I) { return I >= THRESHOLD_CURRENT; }

    // Degenerately doped homojunction: each Fermi level lies DELTA inside its
    // majority band, so qV0 = E_g + 2 DELTA.
    var DELTA = 0.05;                  // eV
    var V0 = BANDGAP + 2 * DELTA;      // V, built-in potential
    var KT = 0.02585;                  // eV at 300 K
    var N_IDEAL = 2;                   // diode ideality factor
    var I_TR = 0.8 * THRESHOLD_CURRENT;   // mA, transparency current
    // Saturation current chosen so that qV_j = E_g at the transparency current.
    var I_S = I_TR / (Math.exp(BANDGAP / (N_IDEAL * KT)) - 1);   // mA

    // Junction voltage from the diode law, I = I_S (exp(qV/nkT) - 1). Above
    // threshold the carrier density, and with it V_j, is clamped.
    function vj(I) {
        return N_IDEAL * KT * Math.log(1 + Math.min(I, THRESHOLD_CURRENT) / I_S);
    }

    // Band edges in eV from the P-side valence band. The N side sits
    // q(V0 - V_j) lower and the quasi-Fermi levels separate by qV_j.
    // Inversion (Bernard-Duraffourg) when E_Fc - E_Fv > E_g, i.e. I > I_TR.
    function bands(step, I) {
        var V = step === 0 ? 0 : vj(I), off = V0 - V;
        var efc = BANDGAP - off + DELTA, efv = -DELTA;
        return { eg: BANDGAP, off: off, efp: efv, efn: efc, efc: efc, efv: efv, vj: V,
                 inverted: efc - efv > BANDGAP };
    }

    // Normalised optical output power, spontaneous below threshold and
    // linear in (I - I_th) above it.
    function power(I) {
        if (I < THRESHOLD_CURRENT) return 0.02 * I / THRESHOLD_CURRENT;
        return 0.02 + (I - THRESHOLD_CURRENT) / (I_MAX - THRESHOLD_CURRENT) * 0.95;
    }

    window.LD = {
        BANDGAP: BANDGAP, V0: V0, I_TR: I_TR, vj: vj, THRESHOLD_CURRENT: THRESHOLD_CURRENT,
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
