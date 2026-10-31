// Band-theory model. Material configurations and the temperature
// dependence of the drawn conduction-shell radius are ported from the
// original simulator without change. Shell radius stands in for energy:
// the valence shell sits at a fixed radius and the conduction shell
// contracts slightly as temperature rises.
(function () {
    var NUM_ATOMS = 6;
    var ATOM_SPACING = 7;
    var INNER_RADIUS = 1.8;
    var MAX_R = 6;          // radius mapped to the top of the band diagram
    var T_MAX = 1000;       // K; old slider 0..100 mapped to 0..1000 K

    var MATERIALS = {
        insulator: {
            label: 'Insulator (SiO₂)',
            bandGapEV: '~9 eV',
            colorVar: '--c-ins', nucleusVar: '--c-nucleus',
            innerShellElectrons: 4,
            valenceElectrons: 4,
            valenceRadius: 2.8,
            conductionRadiusBase: 5.5,   // at T = 0
            conductionRadiusMin: 5.3,    // at T = max: gap narrows by under 10 %
            freeElectronCurve: function (t) { return t > 0.9 ? Math.floor((t - 0.9) * 20) : 0; },
            conductivityLabel: function (t) { return t > 0.9 ? 'negligible' : 'none'; }
        },
        semiconductor: {
            label: 'Semiconductor (Si)',
            bandGapEV: '~1.1 eV',
            colorVar: '--c-semi', nucleusVar: '--c-nucleus-sc',
            innerShellElectrons: 4,
            valenceElectrons: 4,
            valenceRadius: 2.8,
            conductionRadiusBase: 4.5,
            conductionRadiusMin: 4.08,   // Varshni: Si Eg 1.17 eV (0 K) to 0.88 eV (1000 K); gap never closes
            freeElectronCurve: function (t) { return Math.floor(t * t * 12); },
            conductivityLabel: function (t) {
                if (t < 0.15) return 'very low';
                if (t < 0.4) return 'low';
                if (t < 0.7) return 'moderate';
                return 'high';
            }
        },
        conductor: {
            label: 'Conductor (Cu)',
            bandGapEV: 'none',
            colorVar: '--c-cond', nucleusVar: '--c-nucleus-m',
            innerShellElectrons: 6,
            valenceElectrons: 1,
            valenceRadius: 2.8,
            conductionRadiusBase: 2.8,   // drawn touching: partly filled band, no gap
            conductionRadiusMin: 2.8,
            freeElectronCurve: function () { return 6; },
            conductivityLabel: function () { return 'very high'; }
        }
    };

    // Shared page parameters. temp in K.
    var p = { mode: 'semiconductor', temp: 300, run: 'play' };

    // Present state derived from p.
    function state(q) {
        q = q || p;
        var cfg = MATERIALS[q.mode];
        var t = q.temp / T_MAX;
        var cR = cfg.conductionRadiusBase + (cfg.conductionRadiusMin - cfg.conductionRadiusBase) * t;
        return {
            cfg: cfg, tNorm: t, cRadius: cR, gap: cR - cfg.valenceRadius,
            numFree: cfg.freeElectronCurve(t),
            numValence: NUM_ATOMS * cfg.valenceElectrons,
            conductivity: cfg.conductivityLabel(t)
        };
    }

    // Silicon band gap (Varshni form) and intrinsic carrier concentration,
    // n_i proportional to T^(3/2) exp(-Eg / 2kT), normalised to
    // 1.0e10 cm^-3 at 300 K.
    var K_B = 8.617e-5;           // eV/K
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
        MAX_R: MAX_R, T_MAX: T_MAX, MATERIALS: MATERIALS, K_B: K_B,
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
