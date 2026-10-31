// Band-theory model. Shell radius stands in for energy: the valence shell
// sits at a fixed radius and the conduction shell lies E_g above it.
//   Silicon: r_C = r_V + K E_g(T), with E_g(T) in Varshni form and
//   K = 1.7 / 1.17 radius units per eV, so the 1.17 eV gap at 0 K gives the
//   original 4.5-unit shell and 0.88 eV at 1000 K gives 4.08 units.
//   Insulator (SiO2, about 9 eV): no verified temperature dependence is
//   used; the shell is fixed at 5.5 units, a compressed, not-to-scale gap.
//   Conductor (Cu): shells touch, a partly filled band with no gap.
// Promoted electrons are proportional to the intrinsic density:
//   count = round(N_val n_i(T) / n_i,Si(1000 K)),
// so all valence electrons are drawn promoted for silicon at 1000 K. The
// insulator uses the silicon density-of-states prefactor with a 9 eV gap,
// which gives a count of zero at every temperature shown. In copper the
// single 4s electron of every atom is free at all temperatures.
(function () {
    var NUM_ATOMS = 6;
    var ATOM_SPACING = 7;
    var INNER_RADIUS = 1.8;
    var MAX_R = 6;          // radius mapped to the top of the band diagram
    var T_MAX = 1000;       // K
    var R_V = 2.8;          // valence shell radius
    var K_R = 1.7 / 1.17;   // radius units per eV (silicon)
    var EG_INS = 9;         // eV, SiO2
    var MU_N = 1350, MU_P = 480;   // silicon mobilities at 300 K, cm^2/(V s)
    var SIGMA_CU = 5.96e5;  // copper conductivity near room temperature, S/cm
    var Q = 1.602e-19;      // C
    var K_B = 8.617e-5;     // eV/K

    var MATERIALS = {
        insulator: {
            label: 'Insulator (SiO₂)',
            bandGapEV: '~9 eV',
            colorVar: '--c-ins', nucleusVar: '--c-nucleus',
            innerShellElectrons: 4,
            valenceElectrons: 4,
            valenceRadius: 2.8,
            conductionRadiusBase: 5.5,
            gapAt: function () { return EG_INS; },
            radiusAt: function () { return 5.5; },
            ni: function (T) { return T > 0 ? niSi(T) * Math.exp(-(EG_INS - egSi(T)) / (2 * K_B * T)) : 0; }
        },
        semiconductor: {
            label: 'Semiconductor (Si)',
            bandGapEV: '~1.1 eV',
            colorVar: '--c-semi', nucleusVar: '--c-nucleus-sc',
            innerShellElectrons: 4,
            valenceElectrons: 4,
            valenceRadius: 2.8,
            conductionRadiusBase: R_V + K_R * 1.17,
            gapAt: function (T) { return egSi(T); },
            radiusAt: function (T) { return R_V + K_R * egSi(T); },
            ni: function (T) { return niSi(T); }
        },
        conductor: {
            label: 'Conductor (Cu)',
            bandGapEV: 'none',
            colorVar: '--c-cond', nucleusVar: '--c-nucleus-m',
            innerShellElectrons: 6,
            valenceElectrons: 1,
            valenceRadius: 2.8,
            conductionRadiusBase: R_V,   // drawn touching: partly filled band, no gap
            gapAt: function () { return 0; },
            radiusAt: function () { return R_V; },
            ni: null
        }
    };

    // Shared page parameters. temp in K.
    var p = { mode: 'semiconductor', temp: 300, run: 'play' };

    // Present state derived from p.
    function state(q) {
        q = q || p;
        var cfg = MATERIALS[q.mode];
        var T = q.temp;
        var cR = cfg.radiusAt(T);
        var nVal = NUM_ATOMS * cfg.valenceElectrons;
        var ni = cfg.ni ? cfg.ni(T) : null;
        var numFree = cfg.ni ? Math.min(nVal, Math.round(nVal * ni / niSi(T_MAX))) : nVal;
        // Intrinsic conductivity with the 300 K mobilities held fixed.
        var sigma = cfg.ni ? Q * ni * (MU_N + MU_P) : SIGMA_CU;
        return {
            cfg: cfg, tNorm: T / T_MAX, cRadius: cR, gap: cR - cfg.valenceRadius,
            eg: cfg.gapAt(T), ni: ni, numFree: numFree, numValence: nVal, sigma: sigma
        };
    }

    // Silicon band gap (Varshni form) and intrinsic carrier concentration,
    // n_i proportional to T^(3/2) exp(-Eg / 2kT), normalised to
    // 1.0e10 cm^-3 at 300 K.
    var EG0 = 1.17, ALPHA = 4.73e-4, BETA = 636;
    var NI_300 = 1.0e10;          // cm^-3
    function egSi(T) { return EG0 - ALPHA * T * T / (T + BETA); }
    function niSi(T) {
        if (T <= 0) return 0;
        var a = -egSi(T) / (2 * K_B * T) + egSi(300) / (2 * K_B * 300);
        return NI_300 * Math.pow(T / 300, 1.5) * Math.exp(a);
    }

    function fmtSci(v) {
        if (!(v > 0)) return '0';
        var e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e);
        return m.toFixed(2) + '\\times10^{' + e + '}';
    }

    window.BANDS = {
        NUM_ATOMS: NUM_ATOMS, ATOM_SPACING: ATOM_SPACING, INNER_RADIUS: INNER_RADIUS,
        MAX_R: MAX_R, T_MAX: T_MAX, MATERIALS: MATERIALS, K_B: K_B, MU_N: MU_N, MU_P: MU_P,
        p: p, state: state, egSi: egSi, niSi: niSi, fmtSci: fmtSci,
        defaults: { mode: 'semiconductor', temp: 300, run: 'play' },
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('bandschange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
