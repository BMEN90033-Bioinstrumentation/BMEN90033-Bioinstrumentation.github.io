// Ag/AgCl electrode interface model: shared page parameters and the
// electrochemistry used by the plots. Current follows the IUPAC sign
// convention (anodic positive). The 3D scene keeps its own particle state in
// scene_interface.js and reads only the parameters from here.
(function () {
    var E0 = 0.222;                                   // Ag/AgCl standard potential vs SHE, V (a_Cl = 1)
    var RT_F = 8.314462618 * 298.15 / 96485.33212;    // thermal voltage at 25 C, V

    // Page-wide parameters. controls.js writes these and dispatches 'elichange'.
    var p = {
        mode: 'equil',            // 'equil' | 'reduce' | 'oxidize'
        speed: 1,
        conc: 150,                // chloride salt concentration in the scene, mM
        paused: false,
        lj: 2,                    // log10 of the drive magnitude |j|, uA/cm^2
        lj0: 3,                   // log10 of the exchange current density j0, uA/cm^2
        lacl: Math.log10(0.08),   // log10 chloride activity at electrode 1
        lacl2: Math.log10(0.12),  // log10 chloride activity at electrode 2
        area: 1,                  // electrode area, cm^2
        cdl: 20,                  // double-layer capacitance per area, uF/cm^2
        lrs: 2.3                  // log10 of the series resistance, ohm
    };

    // Nernst equation for AgCl + e- <-> Ag + Cl- with unit solid activities.
    function nernst(aCl) { return E0 - RT_F * Math.log(aCl); }

    // Butler-Volmer for a one-electron reaction with symmetric transfer
    // coefficients (alpha = 0.5): j = 2 j0 sinh(F eta / 2RT). j and j0 in
    // uA/cm^2, eta in V. j0 is a representative value, not a measured constant.
    function bv(eta, j0) { return 2 * j0 * Math.sinh(eta / (2 * RT_F)); }
    function overpotential(j, j0) { return 2 * RT_F * Math.asinh(j / (2 * j0)); }
    function rct(j0) { return RT_F / (j0 * 1e-6); }   // ohm cm^2

    // Signed drive current density for the selected mode, uA/cm^2.
    function drive() {
        var mag = Math.pow(10, p.lj);
        return p.mode === 'oxidize' ? mag : p.mode === 'reduce' ? -mag : 0;
    }

    // Equivalent circuit: R_s in series with R_ct parallel to C_dl.
    function circuit() {
        var Rct = rct(Math.pow(10, p.lj0)) / p.area;   // ohm
        var C = p.cdl * 1e-6 * p.area;                 // F
        return { Rct: Rct, C: C, Rs: Math.pow(10, p.lrs), fc: 1 / (2 * Math.PI * Rct * C) };
    }
    function zmag(f, c) {
        var wt = 2 * Math.PI * f * c.Rct * c.C, d = 1 + wt * wt;
        var re = c.Rs + c.Rct / d, im = -c.Rct * wt / d;
        return Math.sqrt(re * re + im * im);
    }

    function fmtOhm(R) {
        return R >= 1e6 ? (R / 1e6).toPrecision(3) + ' MΩ' : R >= 1e3 ? (R / 1e3).toPrecision(3) + ' kΩ' : R.toPrecision(3) + ' Ω';
    }
    // Signed number with a typographic minus sign (U+2212).
    function sgn(v, d) { return (v < 0 ? '−' : '+') + Math.abs(v).toFixed(d); }
    function out(map) {
        Object.keys(map).forEach(function (k) {
            document.querySelectorAll('[data-out="' + k + '"]').forEach(function (el) { el.textContent = map[k]; });
        });
    }

    window.ELI = {
        E0: E0, RT_F: RT_F, p: p,
        nernst: nernst, bv: bv, overpotential: overpotential, rct: rct, drive: drive,
        circuit: circuit, zmag: zmag, fmtOhm: fmtOhm, sgn: sgn, out: out,
        // Run fn now (after DOM ready) and on every parameter or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('elichange', fn);
                window.addEventListener('resize', fn);
                // Label widths depend on the KaTeX fonts; draw again once they load.
                if (document.fonts && document.fonts.ready) document.fonts.ready.then(fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };

    // Self-check of the closed forms: bv and overpotential are inverses, and
    // the impedance tends to R_s + R_ct at DC and to R_s at high frequency.
    var c = { Rct: 100, C: 1e-5, Rs: 10 };
    console.assert(Math.abs(bv(overpotential(123, 45), 45) - 123) < 1e-9, 'ELI: Butler-Volmer inverse');
    console.assert(Math.abs(zmag(1e-6, c) - 110) < 1e-3 && Math.abs(zmag(1e9, c) - 10) < 1e-3, 'ELI: impedance limits');
})();
