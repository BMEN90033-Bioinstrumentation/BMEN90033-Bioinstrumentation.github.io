// Hydrogenic orbital model. Wavefunctions, element configurations, effective
// nuclear charges, Monte Carlo sampling and the excitation logic are ported
// from the original simulator without change to the equations or constants.
// Lengths are in Bohr radii (a0 = 1).
(function () {
    var a0 = 1.0;

    // ── Special functions ──
    var factCache = [1, 1];
    function factorial(n) {
        if (n < 0) return 1;
        if (factCache[n] !== undefined) return factCache[n];
        factCache[n] = n * factorial(n - 1);
        return factCache[n];
    }

    function assocLaguerre(n, alpha, x) {
        if (n === 0) return 1;
        if (n === 1) return 1 + alpha - x;
        var Lkm1 = 1, Lk = 1 + alpha - x;
        for (var k = 1; k < n; k++) {
            var Lkp1 = ((2 * k + 1 + alpha - x) * Lk - (k + alpha) * Lkm1) / (k + 1);
            Lkm1 = Lk; Lk = Lkp1;
        }
        return Lk;
    }

    function assocLegendre(l, m, x) {
        var am = Math.abs(m), Pmm = 1.0;
        if (am > 0) {
            var somx2 = Math.sqrt(1.0 - x * x), fact = 1.0;
            for (var i = 1; i <= am; i++) { Pmm *= -fact * somx2; fact += 2.0; }
        }
        if (l === am) return m < 0 ? Pmm * Math.pow(-1, am) * factorial(l - am) / factorial(l + am) : Pmm;
        var Pmm1 = x * (2 * am + 1) * Pmm;
        if (l === am + 1) return m < 0 ? Pmm1 * Math.pow(-1, am) * factorial(l - am) / factorial(l + am) : Pmm1;
        var Pll = 0;
        for (var ll = am + 2; ll <= l; ll++) {
            Pll = (x * (2 * ll - 1) * Pmm1 - (ll + am - 1) * Pmm) / (ll - am);
            Pmm = Pmm1; Pmm1 = Pll;
        }
        return m < 0 ? Pll * Math.pow(-1, am) * factorial(l - am) / factorial(l + am) : Pll;
    }

    // Real spherical harmonics: cos(m phi) for m > 0, sin(|m| phi) for m < 0.
    function realSphericalHarmonic(l, m, theta, phi) {
        var am = Math.abs(m);
        var norm = Math.sqrt((2 * l + 1) / (4 * Math.PI) * factorial(l - am) / factorial(l + am));
        var P = assocLegendre(l, am, Math.cos(theta));
        if (m > 0) return Math.SQRT2 * norm * P * Math.cos(m * phi);
        if (m === 0) return norm * P;
        return Math.SQRT2 * norm * P * Math.sin(am * phi);
    }

    function radialWavefunction(n, l, r, Z) {
        var rho = 2 * Z * r / (n * a0);
        var N = Math.sqrt(Math.pow(2 * Z / (n * a0), 3) * factorial(n - l - 1) / (2 * n * factorial(n + l)));
        return N * Math.pow(rho, l) * Math.exp(-rho / 2) * assocLaguerre(n - l - 1, 2 * l + 1, rho);
    }
    function psi(n, l, m, r, theta, phi, Z) {
        return radialWavefunction(n, l, r, Z) * realSphericalHarmonic(l, m, theta, phi);
    }
    function psiSquared(n, l, m, r, theta, phi, Z) {
        var v = psi(n, l, m, r, theta, phi, Z);
        return v * v;
    }

    // ── Orbitals. tex is the KaTeX label; colours live in the page CSS as
    // --c-o-<key>. ──
    var ORBITAL_DEFS = {
        '1s':     { n: 1, l: 0, m: 0,  tex: '1s' },
        '2s':     { n: 2, l: 0, m: 0,  tex: '2s' },
        '2px':    { n: 2, l: 1, m: 1,  tex: '2p_x' },
        '2py':    { n: 2, l: 1, m: -1, tex: '2p_y' },
        '2pz':    { n: 2, l: 1, m: 0,  tex: '2p_z' },
        '3s':     { n: 3, l: 0, m: 0,  tex: '3s' },
        '3px':    { n: 3, l: 1, m: 1,  tex: '3p_x' },
        '3py':    { n: 3, l: 1, m: -1, tex: '3p_y' },
        '3pz':    { n: 3, l: 1, m: 0,  tex: '3p_z' },
        '3dz2':   { n: 3, l: 2, m: 0,  tex: '3d_{z^2}' },
        '3dxz':   { n: 3, l: 2, m: 1,  tex: '3d_{xz}' },
        '3dyz':   { n: 3, l: 2, m: -1, tex: '3d_{yz}' },
        '3dxy':   { n: 3, l: 2, m: -2, tex: '3d_{xy}' },
        '3dx2y2': { n: 3, l: 2, m: 2,  tex: '3d_{x^2-y^2}' },
        '4s':     { n: 4, l: 0, m: 0,  tex: '4s' },
        '4px':    { n: 4, l: 1, m: 1,  tex: '4p_x' },
        '4py':    { n: 4, l: 1, m: -1, tex: '4p_y' },
        '4pz':    { n: 4, l: 1, m: 0,  tex: '4p_z' },
        '4dz2':   { n: 4, l: 2, m: 0,  tex: '4d_{z^2}' },
        '4dxz':   { n: 4, l: 2, m: 1,  tex: '4d_{xz}' },
        '4dyz':   { n: 4, l: 2, m: -1, tex: '4d_{yz}' },
        '4dxy':   { n: 4, l: 2, m: -2, tex: '4d_{xy}' },
        '4dx2y2': { n: 4, l: 2, m: 2,  tex: '4d_{x^2-y^2}' },
        '4f0':    { n: 4, l: 3, m: 0,  tex: '4f_0' },
        '4f1':    { n: 4, l: 3, m: 1,  tex: '4f_1' },
        '4fm1':   { n: 4, l: 3, m: -1, tex: '4f_{-1}' },
        '4f2':    { n: 4, l: 3, m: 2,  tex: '4f_2' },
        '4fm2':   { n: 4, l: 3, m: -2, tex: '4f_{-2}' },
        '4f3':    { n: 4, l: 3, m: 3,  tex: '4f_3' },
        '4fm3':   { n: 4, l: 3, m: -3, tex: '4f_{-3}' },
        '5s':     { n: 5, l: 0, m: 0,  tex: '5s' },
        '5px':    { n: 5, l: 1, m: 1,  tex: '5p_x' },
        '5py':    { n: 5, l: 1, m: -1, tex: '5p_y' },
        '5pz':    { n: 5, l: 1, m: 0,  tex: '5p_z' },
        '5dz2':   { n: 5, l: 2, m: 0,  tex: '5d_{z^2}' },
        '5dxz':   { n: 5, l: 2, m: 1,  tex: '5d_{xz}' },
        '5dyz':   { n: 5, l: 2, m: -1, tex: '5d_{yz}' },
        '5dxy':   { n: 5, l: 2, m: -2, tex: '5d_{xy}' },
        '5dx2y2': { n: 5, l: 2, m: 2,  tex: '5d_{x^2-y^2}' },
        '6s':     { n: 6, l: 0, m: 0,  tex: '6s' },
        '6pz':    { n: 6, l: 1, m: 0,  tex: '6p_z' }
    };

    // Upright subshell names in the labels, e.g. \text{2p}_x.
    Object.keys(ORBITAL_DEFS).forEach(function (k) {
        ORBITAL_DEFS[k].tex = ORBITAL_DEFS[k].tex.replace(/^(\d[spdf])/, '\\text{$1}');
    });

    var ELEMENT_ZEFF = {
        carbon:  { '1s': 5.7, '2s': 3.25, '2p': 3.25 },
        silicon: { '1s': 13.6, '2s': 9.95, '2p': 9.95, '3s': 4.90, '3p': 4.29 },
        gold:    { '1s': 77.5, '2s': 69.8, '2p': 69.8, '3s': 48.0, '3p': 48.0, '3d': 38.0,
                   '4s': 28.0, '4p': 28.0, '4d': 18.0, '4f': 10.0, '5s': 8.0, '5p': 8.0, '5d': 4.2, '6s': 2.2 }
    };

    function g(key, electrons, Zeff) { return { key: key, electrons: electrons, Zeff: Zeff }; }
    var ELEMENTS = {
        hydrogen: {
            name: 'Hydrogen', symbol: 'H', Z: 1,
            groundState: [g('1s', 1, 1.0)],
            excitationSequence: ['1s', '2s', '2pz', '3s', '3pz', '3dz2']
        },
        carbon: {
            name: 'Carbon', symbol: 'C', Z: 6,
            groundState: [g('1s', 2, 5.7), g('2s', 2, 3.25), g('2px', 1, 3.25), g('2py', 1, 3.25)],
            excitationSequence: ['2py', '3s', '3pz', '3dz2']
        },
        silicon: {
            name: 'Silicon', symbol: 'Si', Z: 14,
            groundState: [g('1s', 2, 13.6), g('2s', 2, 9.95), g('2px', 2, 9.95), g('2py', 2, 9.95),
                g('2pz', 2, 9.95), g('3s', 2, 4.90), g('3px', 1, 4.29), g('3py', 1, 4.29)],
            excitationSequence: ['3py', '4s', '4pz', '3dz2']
        },
        gold: {
            name: 'Gold', symbol: 'Au', Z: 79,
            groundState: [
                g('1s', 2, 77.5), g('2s', 2, 69.8), g('2px', 2, 69.8), g('2py', 2, 69.8), g('2pz', 2, 69.8),
                g('3s', 2, 48.0), g('3px', 2, 48.0), g('3py', 2, 48.0), g('3pz', 2, 48.0),
                g('3dz2', 2, 38.0), g('3dxz', 2, 38.0), g('3dyz', 2, 38.0), g('3dxy', 2, 38.0), g('3dx2y2', 2, 38.0),
                g('4s', 2, 28.0), g('4px', 2, 28.0), g('4py', 2, 28.0), g('4pz', 2, 28.0),
                g('4dz2', 2, 18.0), g('4dxz', 2, 18.0), g('4dyz', 2, 18.0), g('4dxy', 2, 18.0), g('4dx2y2', 2, 18.0),
                g('4f0', 2, 10.0), g('4f1', 2, 10.0), g('4fm1', 2, 10.0), g('4f2', 2, 10.0),
                g('4fm2', 2, 10.0), g('4f3', 2, 10.0), g('4fm3', 2, 10.0),
                g('5s', 2, 8.0), g('5px', 2, 8.0), g('5py', 2, 8.0), g('5pz', 2, 8.0),
                g('5dz2', 2, 4.2), g('5dxz', 2, 4.2), g('5dyz', 2, 4.2), g('5dxy', 2, 4.2), g('5dx2y2', 2, 4.2),
                g('6s', 1, 2.2)
            ],
            // 5d is full (5d10), so the 6s electron is promoted to 6p.
            excitationSequence: ['6s', '6pz']
        }
    };

    // Camera distance per element: higher Zeff gives tighter orbitals.
    var CAMERA_DIST = { hydrogen: 15, carbon: 10, silicon: 8, gold: 5 };

    function rMaxOf(n, Z) { return 4 * n * n * a0 / Z; }

    // Peak of r^2 |psi|^2 on a coarse (r, theta, phi) grid, used as the
    // rejection-sampling envelope.
    function computeMaxDensity(n, l, m, Z, rMax) {
        var maxVal = 0;
        for (var ir = 1; ir <= 200; ir++) {
            var r = (ir / 200) * rMax;
            for (var it = 0; it <= 50; it++) {
                var theta = (it / 50) * Math.PI;
                for (var ip = 0; ip < 8; ip++) {
                    var val = psiSquared(n, l, m, r, theta, (ip / 8) * 2 * Math.PI, Z) * r * r;
                    if (val > maxVal) maxVal = val;
                }
            }
        }
        return maxVal * 1.05;
    }

    // One rejection-sampled point from r^2 |psi|^2 (uniform in r, isotropic
    // in direction). Returns [x, y, z, density, sign].
    function samplePoint(n, l, m, Z, rMax, maxDensity) {
        for (;;) {
            var r = Math.random() * rMax;
            var theta = Math.acos(2 * Math.random() - 1);
            var phi = Math.random() * 2 * Math.PI;
            var density = psiSquared(n, l, m, r, theta, phi, Z) * r * r;
            if (Math.random() * maxDensity < density) {
                return [r * Math.sin(theta) * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(theta),
                        density / maxDensity, psi(n, l, m, r, theta, phi, Z) >= 0 ? 1.0 : -1.0];
            }
        }
    }

    function sampleOrbital(n, l, m, Z, numPoints) {
        var rMax = rMaxOf(n, Z), maxDensity = computeMaxDensity(n, l, m, Z, rMax);
        var positions = new Float32Array(numPoints * 3), densities = new Float32Array(numPoints);
        var signs = new Float32Array(numPoints);
        for (var i = 0; i < numPoints; i++) {
            var s = samplePoint(n, l, m, Z, rMax, maxDensity);
            positions[i * 3] = s[0]; positions[i * 3 + 1] = s[1]; positions[i * 3 + 2] = s[2];
            densities[i] = s[3]; signs[i] = s[4];
        }
        return { positions: positions, densities: densities, signs: signs, rMax: rMax, maxDensity: maxDensity };
    }

    // |psi|^2 on a cube of side 2 * 1.2 rMax, polygonised at 1 % of its peak.
    function isosurfaceVertices(key, Zeff) {
        var d = ORBITAL_DEFS[key], n = d.n, l = d.l, m = d.m;
        var bound = rMaxOf(n, Zeff) * 1.2, maxDen = 0, testStep = (2 * bound) / 20;
        function field(x, y, z) {
            var r = Math.sqrt(x * x + y * y + z * z);
            if (r < 0.001) return 0;
            return psiSquared(n, l, m, r, Math.acos(z / r), Math.atan2(y, x), Zeff);
        }
        for (var ix = 0; ix <= 20; ix++) for (var iy = 0; iy <= 20; iy++) for (var iz = 0; iz <= 20; iz++) {
            var v = field(-bound + ix * testStep, -bound + iy * testStep, -bound + iz * testStep);
            if (v > maxDen) maxDen = v;
        }
        return window.EO.marchingCubes(field, 64, [-bound, bound], maxDen * 0.01);
    }

    // Configuration after promoting one electron from seq[0] to seq[level].
    function configFor(element, level) {
        var el = ELEMENTS[element];
        var config = el.groundState.map(function (o) { return { key: o.key, electrons: o.electrons, Zeff: o.Zeff }; });
        if (level === 0) return config;
        var seq = el.excitationSequence, sourceKey = seq[0], targetKey = seq[level];
        var src = config.find(function (o) { return o.key === sourceKey; });
        if (src) {
            src.electrons--;
            if (src.electrons <= 0) config.splice(config.indexOf(src), 1);
        }
        var t = ORBITAL_DEFS[targetKey], Zeff;
        if (element === 'hydrogen') Zeff = 1.0;
        else {
            var table = ELEMENT_ZEFF[element];
            Zeff = (table && table[t.n + 'spdf'[t.l]]) || 2.0;
        }
        var ex = config.find(function (o) { return o.key === targetKey; });
        if (ex) ex.electrons++;
        else config.push({ key: targetKey, electrons: 1, Zeff: Zeff });
        return config;
    }

    // Hydrogenic energy estimate with an effective nuclear charge, eV.
    function energy(n, Zeff) { return -13.6 * Zeff * Zeff / (n * n); }

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'eochange'; the scene and plots read them.
    var p = {
        element: 'hydrogen', level: 0, config: [], visible: new Set(), focus: '1s',
        points: true, iso: false, wire: false, logb: false, opacity: 70,
        clip: false, clipPos: 50, sign: false, density: 50000, plane: 'xz'
    };

    function setConfig(config) {
        p.config = config;
        p.visible = new Set(config.map(function (o) { return o.key; }));
        p.focus = config[config.length - 1].key;   // the valence or promoted orbital
    }
    function zeffOf(key) {
        var c = p.config.find(function (o) { return o.key === key; });
        return c ? c.Zeff : 1.0;
    }
    // Configuration in subshell notation, e.g. 1s^2 2s^2 2p^2.
    function fmtConfig(config) {
        var order = [], sum = {};
        config.forEach(function (o) {
            var d = ORBITAL_DEFS[o.key], k = d.n + 'spdf'[d.l];
            if (!(k in sum)) { sum[k] = 0; order.push(k); }
            sum[k] += o.electrons;
        });
        return order.map(function (k) { return '\\text{' + k + '}^{' + sum[k] + '}'; }).join('\\,');
    }

    window.EO = {
        a0: a0, ORBITAL_DEFS: ORBITAL_DEFS, ELEMENTS: ELEMENTS, ELEMENT_ZEFF: ELEMENT_ZEFF, CAMERA_DIST: CAMERA_DIST,
        factorial: factorial, radialWavefunction: radialWavefunction, realSphericalHarmonic: realSphericalHarmonic,
        psi: psi, psiSquared: psiSquared, rMaxOf: rMaxOf,
        computeMaxDensity: computeMaxDensity, samplePoint: samplePoint, sampleOrbital: sampleOrbital,
        isosurfaceVertices: isosurfaceVertices, configFor: configFor, energy: energy,
        p: p, setConfig: setConfig, zeffOf: zeffOf, fmtConfig: fmtConfig,
        // Run fn now (after DOM ready) and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('eochange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
    setConfig(configFor('hydrogen', 0));
})();
