// Doping model. Shared parameters, the material labels of the original
// simulator, and the equilibrium carrier concentrations used in section 03.
(function () {
    // Shared page parameters.
    //   mode:   'pure' | 'ntype' | 'ptype' (3D lattice and band diagram)
    //   size:   lattice cells per edge (1..4)
    //   dopant: dopant fraction of lattice sites, % (exaggerated for visibility)
    //   volt:   applied voltage, V (0..5); old slider 0..100 mapped to 0..5 V
    //   temp:   temperature, K (0..1000); old slider 0..100 mapped to 0..1000 K
    //   ctype:  'donor' | 'acceptor' (section 03)
    //   logN:   log10 of the dopant concentration in cm^-3 (section 03)
    var defaults = { mode: 'pure', size: 2, dopant: 4, volt: 0, temp: 300, run: 'play', ctype: 'donor', logN: 15 };
    var p = Object.assign({}, defaults);

    var LABELS = {
        pure:  { name: 'Pure silicon (Si)',     colorVar: '--c-si', dopant: 'none',               carrier: 'intrinsic' },
        ntype: { name: 'n-type silicon (Si:P)', colorVar: '--c-p',  dopant: 'phosphorus (group V)', carrier: 'electrons (majority)' },
        ptype: { name: 'p-type silicon (Si:B)', colorVar: '--c-b',  dopant: 'boron (group III)',    carrier: 'holes (majority)' }
    };

    // Conductivity label of the original status panel. For doped material
    // sigma = q(n mu_n + p mu_p) is set by doping, not by the applied voltage.
    function conductivity(nFree) {
        if (p.mode === 'pure') return nFree > 1 ? 'very low' : 'negligible';
        return p.dopant >= 10 ? 'high' : 'moderate';
    }
    function carrierLabel(nFree) {
        if (p.mode === 'pure') return nFree > 0 ? 'intrinsic (thermal)' : 'intrinsic (few)';
        return LABELS[p.mode].carrier;
    }

    // Equilibrium concentrations in silicon at 300 K with complete
    // ionisation: charge neutrality n + N_A = p + N_D and n p = n_i^2.
    var NI = 1.0e10;            // cm^-3 at 300 K
    var KT = 0.025852;          // eV at 300 K
    function carriers(N, type) {
        var maj = N / 2 + Math.sqrt(N * N / 4 + NI * NI), min = NI * NI / maj;
        return type === 'donor' ? { n: maj, p: min } : { n: min, p: maj };
    }
    // E_F - E_i in eV.
    function fermiOffset(c) { return KT * Math.log(c.n / NI); }

    function fmtSci(v) {
        if (!(v > 0)) return '0';
        var e = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, e);
        return m.toFixed(2) + '\\times10^{' + e + '}';
    }

    window.DOP = {
        p: p, defaults: defaults, LABELS: LABELS, NI: NI, KT: KT,
        conductivity: conductivity, carrierLabel: carrierLabel,
        carriers: carriers, fermiOffset: fermiOffset, fmtSci: fmtSci,
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
