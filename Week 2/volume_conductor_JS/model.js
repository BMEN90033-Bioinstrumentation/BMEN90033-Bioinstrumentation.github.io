// Volume conductor model. Multipole source at the centre of a body made of
// concentric spherical tissue shells and bounded by air. Vectors are plain
// [x, y, z] arrays so the D3 plots and the Three.js scene share one
// implementation.
//
// A bioelectric source is not a pure dipole: it carries quadrupole (l = 2),
// octupole (l = 3) and higher terms. Each harmonic l is scaled by a transfer
// coefficient from the concentric-sphere boundary conditions (see
// transfer()). For a single boundary, source medium sigma_in inside and
// sigma_out outside,
//     T_l = (2l+1) sigma_in / [l sigma_in + (l+1) sigma_out],
// which is (2l+1)/l for a homogeneous body in air (sigma_out = 0): 3 for the
// dipole, falling towards 2 as l rises. Poorly conducting shells steepen
// this fall, and the multipole potential also decays as 1/r^(l+1), so higher
// spatial harmonics are attenuated more. Volume conduction is quasi-static
// (Plonsey and Heppner 1967): below about 1 kHz tissue is effectively
// resistive, so the medium scales the signal spatially but applies no
// temporal filtering.
(function () {
    // ── Tissue layers of the two bodies. Conductivity in S/m (approximate
    // low-frequency values), outer radius in model units; both bodies have
    // outer radius 14. The first layer of each body holds the source. Colours
    // live in the page CSS as --c-t-<key>. ──
    var TISSUE_DEFS = [
        { body: 'torso', key: 'heart',  name: 'Heart and blood', sigma: 0.6,   radius: 4 },
        { body: 'torso', key: 'lung',   name: 'Lung',            sigma: 0.04,  radius: 10 },
        { body: 'torso', key: 'muscle', name: 'Muscle',          sigma: 0.4,   radius: 12.5 },
        { body: 'torso', key: 'fat',    name: 'Fat',             sigma: 0.04,  radius: 13.5 },
        { body: 'torso', key: 'skin',   name: 'Skin',            sigma: 0.001, radius: 14 },
        { body: 'head',  key: 'brain',  name: 'Brain',           sigma: 0.33,  radius: 12 },
        { body: 'head',  key: 'csf',    name: 'CSF',             sigma: 1.8,   radius: 12.3 },
        { body: 'head',  key: 'skull',  name: 'Skull',           sigma: 0.01,  radius: 13.2 },
        { body: 'head',  key: 'scalp',  name: 'Scalp',           sigma: 0.44,  radius: 14 }
    ];
    var layers = TISSUE_DEFS.map(function (d, i) {
        return { body: d.body, key: d.key, name: d.name, sigma: d.sigma, radius: d.radius,
                 enabled: true, index: i, source: i === 0 || TISSUE_DEFS[i - 1].body !== d.body };
    });
    var BODY_OF_MODE = { ecg: 'torso', eeg: 'head' };

    var SURFACE_RADIUS = 14;  // body surface, where the electrodes sit
    var SIGNAL_GAIN = 80;     // display gain on the electrode potentials
    var ECG_CYCLE = 0.8;      // s per beat (75 bpm)
    var WIN = 4;              // visible trace window, s

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'vcchange'; the scene and plots read them.
    var p = {
        mode: 'rotate',       // 'rotate' | 'manual' | 'ecg' | 'eeg'
        body: 'torso',        // 'torso' | 'head'
        strength: 1,
        complexity: 0.2,      // source extent d / R; 0 = pure dipole
        density: 14,          // number of current streamlines in the scene
        angle: 0,             // degrees, manual mode
        fields: 'rec',        // 'true' (unbounded homogeneous) | 'rec' (layered body)
        brain: 'on',          // 'on' | 'off': cortex shown above the section of the head
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

    // Source weights a_l. A source of spatial extent d has multipole moments
    // that scale as a_l = d^(l-1) relative to the dipole moment, so in a
    // homogeneous medium term l contributes (d/R)^(l-1) of the dipole term at
    // the surface radius R. The complexity parameter is d/R.
    function multipoleWeight(l) {
        return l === 1 ? 1 : Math.pow(p.complexity * SURFACE_RADIUS, l - 1);
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
    // multipole of order l at the origin. In shell k,
    // Phi_k = [A_k r^l + B_k r^-(l+1)] P_l(cos theta), with B_1 = 1 in the
    // source shell. Phi and sigma dPhi/dr are continuous at every internal
    // boundary, and dPhi/dr = 0 at the body surface because air carries no
    // current. A disabled layer takes the conductivity of the source region,
    // so the geometry is fixed and "all off" is a homogeneous body in air.
    // Coefficients are cached per l and rebuilt when the layers change.
    var version = 0, cache = {};
    function bodyLayers() {
        var act = layers.filter(function (lay) { return lay.body === p.body; });
        var s0 = act[0].sigma;
        return act.map(function (lay) {
            return { layer: lay, radius: lay.radius, sigma: lay.enabled ? lay.sigma : s0 };
        });
    }
    function shellCoeffs(l) {
        var c = cache[l];
        if (c && c.version === version) return c;
        var active = bodyLayers(), u = [[1, 0]], v = [[0, 1]];
        for (var i = 0; i < active.length - 1; i++) {
            var Rp = Math.pow(active[i].radius, 2 * l + 1);
            var s1 = active[i].sigma, s2 = active[i + 1].sigma;
            var step = function (AB) {
                var A = AB[0], B = AB[1], x1 = A * Rp, S = x1 + B;
                var B2 = (s2 * l * S - s1 * (l * x1 - (l + 1) * B)) / ((2 * l + 1) * s2);
                return [(S - B2) / Rp, B2];
            };
            u.push(step(u[i]));
            v.push(step(v[i]));
        }
        var N = active.length - 1, Rs = Math.pow(active[N].radius, 2 * l + 1);
        // Zero radial current at the surface: l A Rs - (l+1) B = 0.
        var A1 = -(l * v[N][0] * Rs - (l + 1) * v[N][1]) / (l * u[N][0] * Rs - (l + 1) * u[N][1]);
        c = { version: version, active: active, N: N, AB: u.map(function (uk, k) {
            return [A1 * uk[0] + v[k][0], A1 * uk[1] + v[k][1]];
        }) };
        cache[l] = c;
        return c;
    }
    // Multipliers on the homogeneous potential term (pot) and on the
    // homogeneous radial field term (er) at radius r inside the body.
    function transfer(l, rFromOrigin) {
        var c = shellCoeffs(l), r = Math.min(rFromOrigin, SURFACE_RADIUS), k = 0;
        while (k < c.N && r > c.active[k].radius) k++;
        var a = c.AB[k][0] * Math.pow(r, 2 * l + 1), B = c.AB[k][1];
        return { pot: a + B, er: B - l * a / (l + 1) };
    }
    // Shell table for the scene shader: radii, conductivity relative to the
    // source region, and A, B per order l (index l - 1) and shell. With
    // layered false it describes the unbounded homogeneous reference medium.
    function shellTable(layered) {
        if (!layered) return { radii: [SURFACE_RADIUS], sigma: [1], AB: [1, 2, 3, 4].map(function () { return [[0, 1]]; }) };
        var act = bodyLayers();
        return {
            radii: act.map(function (a) { return a.radius; }),
            sigma: act.map(function (a) { return a.sigma / act[0].sigma; }),
            AB: [1, 2, 3, 4].map(function (l) { return shellCoeffs(l).AB; })
        };
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

    // ── Cardiac vector over one beat (P, PR, Q, R, S, ST, T, baseline),
    // confined to the section plane y = 0 that the scene displays. ──
    function ecgDipole(t) {
        var phase = (t % ECG_CYCLE) / ECG_CYCLE;
        var mag = 0, azimuth = 0, q, env;
        if (phase < 0.10) {            // P wave: small, rightward to leftward
            q = phase / 0.10; env = Math.sin(q * Math.PI);
            mag = 0.15 * env; azimuth = -0.3 + q * 1.0;
        } else if (phase < 0.16) {     // PR segment: isoelectric
            mag = 0;
        } else if (phase < 0.20) {     // Q wave: septal, rightward
            q = (phase - 0.16) / 0.04; env = Math.sin(q * Math.PI);
            mag = 0.2 * env; azimuth = Math.PI + 0.3;
        } else if (phase < 0.26) {     // R wave: large, leftward
            q = (phase - 0.20) / 0.06; env = Math.sin(q * Math.PI);
            mag = 1.0 * env; azimuth = 0.4;
        } else if (phase < 0.30) {     // S wave: basal, rightward
            q = (phase - 0.26) / 0.04; env = Math.sin(q * Math.PI);
            mag = 0.25 * env; azimuth = Math.PI - 0.2;
        } else if (phase < 0.42) {     // ST segment: near isoelectric
            q = (phase - 0.30) / 0.12;
            mag = 0.03 * Math.sin(q * Math.PI); azimuth = 0.3;
        } else if (phase < 0.58) {     // T wave: broad, concordant with QRS
            q = (phase - 0.42) / 0.16; env = Math.sin(q * Math.PI);
            mag = 0.35 * env; azimuth = 0.5;
        } else {
            mag = 0;
        }
        return { dir: [Math.cos(azimuth), 0, Math.sin(azimuth)], mag: mag };
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
        // Fixed source axis in the section plane with a slow wobble; the
        // oscillation reverses the dipole along that axis.
        var azimuth = 0.6 + 0.2 * Math.sin(2 * Math.PI * 1.3 * t);
        var sign = mag >= 0 ? 1 : -1;
        return { dir: [sign * Math.cos(azimuth), 0, sign * Math.sin(azimuth)], mag: Math.abs(mag) };
    }

    // ── Electrodes A and B on the body surface (positions in model units) ──
    var electrodes = [{ label: 'A', pos: [0, 0, 0] }, { label: 'B', pos: [0, 0, 0] }];
    function resetElectrodes() {
        electrodes[0].pos = [SURFACE_RADIUS, 0, 0];
        electrodes[1].pos = [-SURFACE_RADIUS, 0, 0];
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
        var v = potentials(dipoleState());
        hist.push([tNow, v[0][0] - v[1][0], v[0][1] - v[1][1]]);
    }
    // Electrode potentials for source state S, in display units:
    // [[A reference, A body], [B reference, B body]].
    function potentials(S) {
        var O = [0, 0, 0];
        return electrodes.map(function (e) {
            return [truePotential(O, S.dir, e.pos, S.strength) * SIGNAL_GAIN,
                    recPotential(O, S.dir, e.pos, S.strength) * SIGNAL_GAIN];
        });
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

    // Enable or homogenise every non-source layer of the current body.
    function setLayers(on) {
        layers.forEach(function (l) { if (l.body === p.body && !l.source) l.enabled = on; });
        layersChanged();
    }
    function layersChanged() { version++; clearHistory(); }
    function restart() { animTime = 0; clearHistory(); }

    var VC = window.VC = {
        SURFACE_RADIUS: SURFACE_RADIUS, WIN: WIN, BODY_OF_MODE: BODY_OF_MODE,
        p: p, layers: layers, electrodes: electrodes, hist: hist,
        state: function () { return state; },
        now: function () { return tNow; },
        multipoleWeight: multipoleWeight, transfer: transfer, shellTable: shellTable, bodyLayers: bodyLayers,
        potentials: potentials,
        truePotential: truePotential, trueField: trueField,
        recPotential: recPotential, recField: recField,
        ecgDipole: ecgDipole, eegDipole: eegDipole,
        resetElectrodes: resetElectrodes,
        clearHistory: clearHistory, setLayers: setLayers, layersChanged: layersChanged, restart: restart,
        addView: addView,
        // Run fn now (after DOM ready) and on every parameter or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('vcchange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
    resetElectrodes();
})();
