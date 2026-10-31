// Doping model. Shared parameters, material labels, and the equilibrium
// carrier statistics used by the band diagram (section 02) and the
// concentration plot (section 03). Both read the same state:
//   n_i(T) = 1.0e10 cm^-3 (T/300)^(3/2) exp(-E_g(T)/2kT + E_g(300)/2k300)
//   E_g(T) = 1.17 - 4.73e-4 T^2 / (T + 636) eV       (Varshni, silicon)
//   n p = n_i^2, n + N_A = p + N_D (complete ionisation)
//   E_F - E_i = kT ln(n / n_i) = -kT ln(p / n_i)
//   sigma = q (n mu_n + p mu_p), mu_n = 1350, mu_p = 480 cm^2/(V s)
// The mobilities are the 300 K values for lightly doped silicon; their fall
// with doping and temperature is not modelled. Freeze-out at low temperature
// and degenerate statistics are not modelled either.
(function () {
    // Shared page parameters.
    //   mode:   'pure' | 'ntype' | 'ptype' (all sections)
    //   size:   lattice cells per edge (1..4)
    //   dopant: dopant fraction of lattice sites in the 3D model, % (exaggerated)
    //   volt:   applied voltage across the 3D model, V (0..5)
    //   temp:   temperature, K (0..1000)
    //   logN:   log10 of the dopant concentration in cm^-3 (sections 02, 03)
    var defaults = { mode: 'pure', size: 2, dopant: 4, volt: 0, temp: 300, run: 'play', logN: 15 };
    var p = Object.assign({}, defaults);

    var LABELS = {
        pure:  { name: 'Pure silicon (Si)',     colorVar: '--c-si', dopant: 'none' },
        ntype: { name: 'n-type silicon (Si:P)', colorVar: '--c-p',  dopant: 'phosphorus (group V)' },
        ptype: { name: 'p-type silicon (Si:B)', colorVar: '--c-b',  dopant: 'boron (group III)' }
    };

    var Q = 1.602e-19;          // C
    var K_B = 8.617e-5;         // eV/K
    var NI_300 = 1.0e10;        // cm^-3
    var MU_N = 1350, MU_P = 480;    // cm^2/(V s)
    var E_ION = 0.045;          // P donor and B acceptor ionisation energy, eV

    function egSi(T) { return 1.17 - 4.73e-4 * T * T / (T + 636); }
    function niSi(T) {
        if (T <= 0) return 0;
        var a = -egSi(T) / (2 * K_B * T) + egSi(300) / (2 * K_B * 300);
        return NI_300 * Math.pow(T / 300, 1.5) * Math.exp(a);
    }

    // Dopant concentration for the present mode (0 for pure silicon).
    function N() { return p.mode === 'pure' ? 0 : Math.pow(10, p.logN); }

    // Equilibrium n, p at temperature T for the present mode, or explicit args.
    function carriers(Nd, type, T) {
        var ni = niSi(T);
        if (type === 'pure' || !(Nd > 0)) return { n: ni, p: ni, ni: ni };
        var maj = Nd / 2 + Math.sqrt(Nd * Nd / 4 + ni * ni), min = ni * ni / maj;
        return type === 'ntype' ? { n: maj, p: min, ni: ni } : { n: min, p: maj, ni: ni };
    }
    function state() {
        var c = carriers(N(), p.mode, p.temp);
        var kT = K_B * p.temp;
        // E_F - E_i in eV; undefined at T = 0 where n_i = 0.
        c.ef = c.ni > 0 ? kT * Math.log(c.n / c.ni) : NaN;
        c.sigma = Q * (c.n * MU_N + c.p * MU_P);
        c.eg = egSi(p.temp);
        c.type = p.mode === 'pure' ? 'intrinsic (n = p = nᵢ)'
            : c.n > c.p ? 'electrons (majority)' : 'holes (majority)';
        return c;
    }

    function fmtSci(v) {
        if (!(v > 0)) return '0';
        var e = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, e);
        return m.toFixed(2) + '\\times10^{' + e + '}';
    }

    window.DOP = {
        p: p, defaults: defaults, LABELS: LABELS, Q: Q, K_B: K_B, MU_N: MU_N, MU_P: MU_P, E_ION: E_ION,
        egSi: egSi, niSi: niSi, N: N, carriers: carriers, state: state, fmtSci: fmtSci,
        // Live counts written by the 3D scene every frame.
        live: { atoms: 0, bonds: 0, free: 0, holes: 0 },
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('dopchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
