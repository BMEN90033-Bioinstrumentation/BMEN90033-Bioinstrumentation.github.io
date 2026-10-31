// Volume conductor model. Multipole source in concentric spherical tissue
// shells, ported from the original simulator without change to the
// equations or constants. Vectors are plain [x, y, z] arrays so the D3
// plots and the Three.js scene share one implementation.
//
// A bioelectric source is not a pure dipole: it carries quadrupole (l = 2),
// octupole (l = 3) and higher terms. Each harmonic l is scaled by a transfer
// coefficient from the concentric-sphere boundary conditions (see
// transfer()). For a single boundary, source medium sigma_in inside and
// sigma_out outside,
//     T_l = (2l+1) sigma_in / [l sigma_in + (l+1) sigma_out].
// With several shells the coefficients for l >= 2 fall below that of the
// dipole, and the multipole potential also decays as 1/r^(l+1), so higher
// spatial harmonics are attenuated more. Volume conduction is quasi-static
// (Plonsey and Heppner 1967): below about 1 kHz tissue is effectively
// resistive, so the medium scales the signal spatially but applies no
// temporal filtering.
(function () {
    // ── Tissue layers. Conductivity in S/m (approximate physiological values),
    // radius in model units. Colours live in the page CSS as --c-t-<key>. ──
    var TISSUE_DEFS = [
        { key: 'heart',  name: 'Heart (source)', sigma: 0.6,   radius: 3,    on: true },
        { key: 'brain',  name: 'Brain (source)', sigma: 0.33,  radius: 3,    on: false },
        { key: 'blood',  name: 'Blood',          sigma: 0.7,   radius: 5,    on: true },
        { key: 'lung',   name: 'Lung',           sigma: 0.04,  radius: 8,    on: true },
        { key: 'muscle', name: 'Muscle',         sigma: 0.4,   radius: 11,   on: true },
        { key: 'fat',    name: 'Fat',            sigma: 0.04,  radius: 13,   on: true },
        { key: 'bone',   name: 'Bone (ribs)',    sigma: 0.02,  radius: 12,   on: false },
        { key: 'skin',   name: 'Skin',           sigma: 0.001, radius: 14,   on: true },
        { key: 'gel',    name: 'Electrode gel',  sigma: 1.0,   radius: 14.3, on: false },
        { key: 'csf',    name: 'CSF (brain)',    sigma: 1.8,   radius: 6,    on: false },
        { key: 'skull',  name: 'Skull',          sigma: 0.01,  radius: 8.5,  on: false },
        { key: 'scalp',  name: 'Scalp',          sigma: 0.44,  radius: 9.5,  on: false }
    ];
    var layers = TISSUE_DEFS.map(function (d, i) {
        return { key: d.key, name: d.name, sigma: d.sigma, radius: d.radius, enabled: d.on, index: i };
    });
    var PRESETS = {
        ecg: ['heart', 'blood', 'lung', 'muscle', 'fat', 'skin'],
        eeg: ['brain', 'csf', 'skull', 'scalp']
    };

    var SRC_RADIUS = 3;       // source region radius
    var SURFACE_RADIUS = 14;  // measurement surface radius
    var SIGNAL_GAIN = 80;     // display gain on the electrode potentials
    var ECG_CYCLE = 0.8;      // s per beat (75 bpm)
    var WIN = 4;              // visible trace window, s

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'vcchange'; the scene and plots read them.
    var p = {
        mode: 'rotate',       // 'rotate' | 'manual' | 'ecg' | 'eeg'
        strength: 1,
        complexity: 0.4,      // 0 = pure dipole, 1 = strong higher harmonics
        density: 2,
        angle: 0,             // degrees, manual mode
        fields: 'both',       // 'true' | 'rec' | 'both'
        paused: false,
        lscale: 0             // log10 of the display scale on the recorded trace
    };

    // ── Vector helpers ──
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function len(a) { return Math.sqrt(dot(a, a)); }
    function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
    function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
    function norm(a) { var l = len(a); return l > 0 ? scale(a, 1 / l) : a; }

    // ── Legendre polynomials P_l(x) and P_l'(x) ──
    function legendreP(l, x) {
        if (l === 0) return 1;
        if (l === 1) return x;
        if (l === 2) return 0.5 * (3 * x * x - 1);
        if (l === 3) return 0.5 * (5 * x * x * x - 3 * x);
        if (l === 4) return 0.125 * (35 * x * x * x * x - 30 * x * x + 3);
        return 0;
    }
    function legendrePprime(l, x) {
        if (l === 0) return 0;
        if (l === 1) return 1;
        if (l === 2) return 3 * x;
        if (l === 3) return 0.5 * (15 * x * x - 3);
        if (l === 4) return 0.5 * (35 * x * x * x - 15 * x);
        return 0;
    }

    // Source amplitude with geometric compensation. Without it the l = 4 term
    // is about 2700 times weaker than l = 1 at r = 14, so the filtering would
    // be invisible. Each harmonic is scaled to contribute visibly at
    // SURFACE_RADIUS, with a gentle roll-off.
    function multipoleWeight(l) {
        if (l === 1) return 1.0;
        if (p.complexity < 1e-6) return 0;
        var compensation = Math.pow(SURFACE_RADIUS, l - 1);
        var rolloff = Math.pow(0.7, l - 2);
        return p.complexity * compensation * rolloff;
    }

    function sphericalBasis(dipoleDir, rVec, dist) {
        var rHat = scale(rVec, 1 / dist);
        var cosTheta = dot(rHat, dipoleDir);
        var sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
        var thetaHat;
        if (sinTheta > 1e-6) {
            thetaHat = scale(sub(scale(rHat, cosTheta), dipoleDir), 1 / sinTheta);
        } else {
            thetaHat = [0, 1, 0];
            if (Math.abs(dot(dipoleDir, thetaHat)) > 0.9) thetaHat = [1, 0, 0];
            thetaHat = norm(sub(thetaHat, scale(dipoleDir, dot(dipoleDir, thetaHat))));
        }
        return { rHat: rHat, thetaHat: thetaHat, cosTheta: cosTheta, sinTheta: sinTheta };
    }

    // ── Homogeneous medium ──
    function truePotential(pos, dir, point, strength) {
        var r = sub(point, pos), dist = len(r);
        if (dist < 1.0) return 0;
        var cosTheta = dot(r, dir) / dist, pot = 0;
        for (var l = 1; l <= 4; l++) {
            var w = multipoleWeight(l);
            if (Math.abs(w) < 1e-9) continue;
            pot += w * legendreP(l, cosTheta) / Math.pow(dist, l + 1);
        }
        return strength * pot;
    }
    function trueField(pos, dir, point, strength) {
        var r = sub(point, pos), dist = len(r);
        if (dist < 1.5) return [0, 0, 0];
        var b = sphericalBasis(dir, r, dist), Er = 0, Et = 0;
        for (var l = 1; l <= 4; l++) {
            var w = multipoleWeight(l);
            if (Math.abs(w) < 1e-9) continue;
            Er += w * (l + 1) * legendreP(l, b.cosTheta) / Math.pow(dist, l + 2);
            Et += w * b.sinTheta * legendrePprime(l, b.cosTheta) / Math.pow(dist, l + 2);
        }
        return add(scale(b.rHat, strength * Er), scale(b.thetaHat, strength * Et));
    }

    // ── l-dependent transfer through concentric shells ──
    // Exact concentric-sphere solution (cf. Rush and Driscoll 1968) for a
    // multipole of order l at the origin. The innermost enabled layer holds
    // the source; the outermost enabled layer extends to infinity. In shell k,
    // Phi_k = [A_k r^l + B_k r^-(l+1)] P_l(cos theta), with B_1 = 1 and
    // A_N = 0; Phi and sigma dPhi/dr are continuous at every boundary.
    // The shell coefficients depend only on the enabled layers, so they are
    // cached per l and rebuilt when a layer is toggled.
    var version = 0, cache = {};
    function shellCoeffs(l) {
        var c = cache[l];
        if (c && c.version === version) return c;
        var active = layers.filter(function (lay) { return lay.enabled; })
            .sort(function (a, b) { return a.radius - b.radius; });
        c = { version: version, active: active };
        if (active.length >= 2) {
            var u = [[1, 0]], v = [[0, 1]];
            for (var i = 0; i < active.length - 1; i++) {
                var R = active[i].radius, Rp = Math.pow(R, 2 * l + 1);
                var s1 = active[i].sigma, s2 = active[i + 1].sigma;
                var step = function (AB) {
                    var A = AB[0], B = AB[1], x1 = A * Rp, S = x1 + B;
                    var B2 = (s2 * l * S - s1 * (l * x1 - (l + 1) * B)) / ((2 * l + 1) * s2);
                    return [(S - B2) / Rp, B2];
                };
                u.push(step(u[i]));
                v.push(step(v[i]));
            }
            var N = active.length - 1;
            c.u = u; c.v = v; c.N = N; c.A1 = -v[N][0] / u[N][0];
        }
        cache[l] = c;
        return c;
    }
    // Multipliers on the homogeneous potential term (pot) and on the
    // homogeneous radial field term (er) at radius r.
    function transfer(l, rFromOrigin) {
        var c = shellCoeffs(l);
        if (c.active.length < 2) return { pot: 1, er: 1 };
        var k = 0;
        while (k < c.N && rFromOrigin > c.active[k].radius) k++;
        var A = c.A1 * c.u[k][0] + c.v[k][0], B = c.A1 * c.u[k][1] + c.v[k][1];
        var a = A * Math.pow(rFromOrigin, 2 * l + 1);
        return { pot: a + B, er: B - l * a / (l + 1) };
    }

    // ── Volume conductor (with tissue shells) ──
    function recPotential(pos, dir, point, strength) {
        var r = sub(point, pos), dist = len(r);
        if (dist < 1.0) return 0;
        var rFromOrigin = len(point), cosTheta = dot(r, dir) / dist, pot = 0;
        for (var l = 1; l <= 4; l++) {
            var w = multipoleWeight(l);
            if (Math.abs(w) < 1e-9) continue;
            pot += w * legendreP(l, cosTheta) / Math.pow(dist, l + 1) * transfer(l, rFromOrigin).pot;
        }
        return strength * pot;
    }
    function recField(pos, dir, point, strength) {
        var r = sub(point, pos), dist = len(r);
        if (dist < 1.5) return [0, 0, 0];
        var rFromOrigin = len(point), b = sphericalBasis(dir, r, dist), Er = 0, Et = 0;
        for (var l = 1; l <= 4; l++) {
            var w = multipoleWeight(l);
            if (Math.abs(w) < 1e-9) continue;
            var Tl = transfer(l, rFromOrigin);
            Er += w * Tl.er * (l + 1) * legendreP(l, b.cosTheta) / Math.pow(dist, l + 2);
            Et += w * Tl.pot * b.sinTheta * legendrePprime(l, b.cosTheta) / Math.pow(dist, l + 2);
        }
        return add(scale(b.rHat, strength * Er), scale(b.thetaHat, strength * Et));
    }

    // ── Cardiac vector loop over one beat (P, PR, Q, R, S, ST, T, baseline) ──
    function ecgDipole(t) {
        var phase = (t % ECG_CYCLE) / ECG_CYCLE;
        var mag = 0, azimuth = 0, elevation = 0, q, env;
        if (phase < 0.10) {            // P wave: small, rightward to leftward
            q = phase / 0.10; env = Math.sin(q * Math.PI);
            mag = 0.15 * env; azimuth = -0.3 + q * 1.0; elevation = -0.15 * env;
        } else if (phase < 0.16) {     // PR segment: isoelectric
            mag = 0;
        } else if (phase < 0.20) {     // Q wave: septal, rightward
            q = (phase - 0.16) / 0.04; env = Math.sin(q * Math.PI);
            mag = 0.2 * env; azimuth = Math.PI + 0.3; elevation = 0.1;
        } else if (phase < 0.26) {     // R wave: large, leftward and inferior
            q = (phase - 0.20) / 0.06; env = Math.sin(q * Math.PI);
            mag = 1.0 * env; azimuth = 0.4; elevation = -0.5 * env;
        } else if (phase < 0.30) {     // S wave: basal, rightward
            q = (phase - 0.26) / 0.04; env = Math.sin(q * Math.PI);
            mag = 0.25 * env; azimuth = Math.PI - 0.2; elevation = 0.3;
        } else if (phase < 0.42) {     // ST segment: near isoelectric
            q = (phase - 0.30) / 0.12;
            mag = 0.03 * Math.sin(q * Math.PI); azimuth = 0.3; elevation = -0.1;
        } else if (phase < 0.58) {     // T wave: broad, concordant with QRS
            q = (phase - 0.42) / 0.16; env = Math.sin(q * Math.PI);
            mag = 0.35 * env; azimuth = 0.5; elevation = -0.3 * env;
        } else {
            mag = 0;
        }
        // +y is superior; negative elevation is inferior.
        var dir = [Math.cos(azimuth) * Math.cos(elevation), Math.sin(elevation),
                   Math.sin(azimuth) * Math.cos(elevation)];
        if (len(dir) > 0.01) dir = norm(dir);
        return { dir: dir, mag: mag };
    }

    // ── Cortical oscillation: dominant alpha with delta to gamma components.
    // Band amplitudes give a dominant alpha peak; they do not follow 1/f. ──
    var EEG_BANDS = [
        { freq: 2.5,  amp: 0.20, phase: 0.0 },   // delta
        { freq: 6.0,  amp: 0.25, phase: 1.2 },   // theta
        { freq: 10.0, amp: 1.00, phase: 0.0 },   // alpha
        { freq: 11.5, amp: 0.60, phase: 0.7 },   // alpha 2
        { freq: 15.0, amp: 0.15, phase: 2.1 },   // beta 1
        { freq: 22.0, amp: 0.08, phase: 0.5 },   // beta 2
        { freq: 35.0, amp: 0.03, phase: 1.8 }    // gamma
    ];
    function eegDipole(t) {
        var mag = 0;
        EEG_BANDS.forEach(function (b) { mag += b.amp * Math.sin(2 * Math.PI * b.freq * t + b.phase); });
        var spindle = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.8 * t);   // alpha waxing and waning
        mag *= spindle * 0.3;                                        // EEG is microvolts, ECG millivolts
        // Mainly radial cortical dipole with a slow wobble.
        var azimuth = 0.2 * Math.sin(2 * Math.PI * 1.3 * t);
        var elevation = -Math.PI / 4 + 0.15 * Math.sin(2 * Math.PI * 0.7 * t);
        var sign = mag >= 0 ? 1 : -1;
        var dir = [sign * Math.cos(azimuth) * Math.cos(elevation), -sign * Math.sin(elevation),
                   sign * Math.sin(azimuth) * Math.cos(elevation)];
        if (len(dir) > 0.01) dir = norm(dir);
        return { dir: dir, mag: Math.abs(mag) };
    }

    // ── Electrodes (positions in model units) ──
    var electrodes = [], nextId = 0;
    function addElectrode(pos, label) {
        var id = nextId++;
        electrodes.push({ id: id, pos: pos.slice(), label: label || String.fromCharCode(65 + id), cvar: '--c-el' + (id % 10) });
        clearHistory();
    }
    function removeElectrode(id) {
        electrodes = electrodes.filter(function (e) { return e.id !== id; });
        VC.electrodes = electrodes;
        clearHistory();
    }
    function resetElectrodes() {
        electrodes = []; VC.electrodes = electrodes; nextId = 0;
        addElectrode([14, 0, 0], 'A');
        addElectrode([-14, 0, 0], 'B');
    }

    // ── Simulation state and the shared clock ──
    var animTime = 0, hist = [], tNow = 0;
    var state = { dir: [1, 0, 0], strength: 1 };
    function clearHistory() { hist = []; VC.hist = hist; }

    function dipoleState() {
        if (p.mode === 'ecg') {
            var e = ecgDipole(animTime);
            p.angle = Math.round((Math.atan2(e.dir[2], e.dir[0]) * 180 / Math.PI + 360) % 360);
            return { dir: e.dir, strength: p.strength * e.mag };
        }
        if (p.mode === 'eeg') {
            var g = eegDipole(animTime);
            p.angle = Math.round((Math.atan2(g.dir[2], g.dir[0]) * 180 / Math.PI + 360) % 360);
            return { dir: g.dir, strength: p.strength * g.mag };
        }
        if (p.mode === 'rotate') p.angle = (animTime * 60) % 360;
        var a = p.angle * Math.PI / 180;
        return { dir: [Math.cos(a), 0, Math.sin(a)], strength: p.strength };
    }

    // The lead is sampled at a fixed 1 kHz, independent of the display frame
    // rate, so the 35 Hz EEG component and the 50 ms QRS complex are resolved
    // rather than aliased by a 60 Hz frame clock.
    var FS = 1000, sampleAcc = 0;
    function sampleLead() {
        if (electrodes.length < 2) return;
        var S = dipoleState(), O = [0, 0, 0], eA = electrodes[0].pos, eB = electrodes[1].pos;
        var vt = truePotential(O, S.dir, eA, S.strength) * SIGNAL_GAIN -
                 truePotential(O, S.dir, eB, S.strength) * SIGNAL_GAIN;
        var vr = recPotential(O, S.dir, eA, S.strength) * SIGNAL_GAIN -
                 recPotential(O, S.dir, eB, S.strength) * SIGNAL_GAIN;
        hist.push([tNow, vt, vr]);
    }
    function step(dt) {
        sampleAcc += dt;
        while (sampleAcc >= 1 / FS) {
            sampleAcc -= 1 / FS;
            animTime += 1 / FS;
            tNow += 1 / FS;
            sampleLead();
        }
        while (hist.length && hist[0][0] < tNow - WIN) hist.shift();
        state = dipoleState();
    }

    // One RAF drives every animated view; each view runs only while its
    // element is on screen, and time advances only while one is visible.
    var views = [], raf = 0, last = 0;
    function frame(now) {
        raf = requestAnimationFrame(frame);
        var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
        last = now;
        var vis = views.filter(function (v) { return v.visible; });
        if (!vis.length) return;
        if (!p.paused && dt > 0) step(dt);
        vis.forEach(function (v) { v.fn(state); });
    }
    function addView(el, fn) {
        var v = { fn: fn, visible: false };
        views.push(v);
        new IntersectionObserver(function (es) {
            es.forEach(function (e) { v.visible = e.isIntersecting; });
            if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
        }, { threshold: 0.05 }).observe(el);
    }

    function setLayers(keys) {
        layers.forEach(function (l) { l.enabled = keys === true ? true : keys.indexOf(l.key) >= 0; });
        layersChanged();
    }
    function layersChanged() { version++; clearHistory(); }
    function restart() { animTime = 0; clearHistory(); }

    var VC = window.VC = {
        SRC_RADIUS: SRC_RADIUS, SURFACE_RADIUS: SURFACE_RADIUS, WIN: WIN, PRESETS: PRESETS,
        p: p, layers: layers, electrodes: electrodes, hist: hist,
        state: function () { return state; },
        now: function () { return tNow; },
        multipoleWeight: multipoleWeight, transfer: transfer,
        truePotential: truePotential, trueField: trueField,
        recPotential: recPotential, recField: recField,
        ecgDipole: ecgDipole, eegDipole: eegDipole,
        addElectrode: addElectrode, removeElectrode: removeElectrode, resetElectrodes: resetElectrodes,
        clearHistory: clearHistory, setLayers: setLayers, layersChanged: layersChanged, restart: restart,
        addView: addView,
        // Run fn now (after DOM ready) and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('vcchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
    resetElectrodes();
})();
