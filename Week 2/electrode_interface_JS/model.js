// Ag/AgCl electrode interface model. Geometry and particle kinematics are
// ported from the original simulator. The electrode current follows the
// IUPAC sign convention (anodic positive), the potential is the Nernst
// equilibrium value plus a Butler-Volmer charge-transfer overpotential.
// Particles are plain {x, y, z} objects so the Three.js scene only renders.
(function () {
    // ── Geometry (scene units) ──
    var ELECTRODE_W = 6;
    var ELECTRODE_H = 14;
    var ELECTRODE_D = 0.8;
    var AGCL_THICKNESS = 0.6;
    var ELECTROLYTE_W = 20;
    var ELECTROLYTE_H = 14;
    var ELECTROLYTE_D = 14;
    var WIRE_HEIGHT = 8;
    // Electrode on the left, electrolyte on the right.
    var ELECTRODE_X = -ELECTROLYTE_W / 2 + 1;
    var INTERFACE_X = ELECTRODE_X + ELECTRODE_D / 2 + AGCL_THICKNESS / 2;
    var ELECTROLYTE_CX = 3;   // centre of the electrolyte box in x

    // ── Electrochemistry ──
    var E0 = 0.222;           // Ag/AgCl standard potential vs SHE, V (a_Cl = 1)
    var RT_F = 8.314462618 * 298.15 / 96485.33212;   // thermal voltage at 25 C, V

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'elichange'; the scene and plots read them.
    var p = {
        mode: 'reduce',       // 'equil' | 'reduce' | 'oxidize'
        speed: 1,
        ions: 15,
        paused: false,
        lacl: Math.log10(0.08),  // log10 of chloride activity (Nernst section)
        lj0: 3                   // log10 of the exchange current density j0, uA/cm^2
    };

    function rnd() { return Math.random() - 0.5; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function vec(x, y, z) { return { x: x, y: y, z: z }; }

    function particle(type, pos) {
        return {
            type: type, pos: pos,
            vel: vec(rnd() * 0.02, rnd() * 0.02, rnd() * 0.02),
            brownianAmp: 0.015
        };
    }

    // Initial population: count Cl-, 0.7 count Na+, 0.3 count K+ in the
    // electrolyte, and 0.6 count electrons in the metal and wire.
    function spawn(count) {
        var out = [];
        var bodyLeft = INTERFACE_X + AGCL_THICKNESS / 2 + 0.5;
        var bodyRight = 3 + ELECTROLYTE_W / 2 - 1;
        var halfH = ELECTROLYTE_H / 2 - 1;
        var halfD = ELECTROLYTE_D / 2 - 1;
        function inBody() {
            return vec(bodyLeft + Math.random() * (bodyRight - bodyLeft),
                rnd() * halfH * 2, rnd() * halfD * 2);
        }
        var i;
        for (i = 0; i < count; i++) out.push(particle('cl', inBody()));
        for (i = 0; i < Math.floor(count * 0.7); i++) out.push(particle('na', inBody()));
        for (i = 0; i < Math.floor(count * 0.3); i++) out.push(particle('k', inBody()));

        var metalLeft = ELECTRODE_X - ELECTRODE_D / 2 + 0.1;
        var metalRight = ELECTRODE_X + ELECTRODE_D / 2 - 0.1;
        var eCount = Math.floor(count * 0.6);
        for (i = 0; i < eCount; i++) {
            var pos = Math.random() < 0.3
                ? vec(ELECTRODE_X + Math.random() * 15,
                      ELECTRODE_H / 2 + WIRE_HEIGHT * Math.random(), rnd() * 0.3)
                : vec(metalLeft + Math.random() * (metalRight - metalLeft),
                      rnd() * ELECTRODE_H * 0.9, rnd() * ELECTRODE_W * 0.4);
            out.push(particle('electron', pos));
        }
        return out;
    }

    function advance(o, k) {
        o.pos.x += o.vel.x * k; o.pos.y += o.vel.y * k; o.pos.z += o.vel.z * k;
    }

    // Electrons stay in the metal and the wire. Reduction drifts them towards
    // the AgCl interface; oxidation drifts them back up the wire.
    function stepElectron(o, dt, mode, speed) {
        var metalLeft = ELECTRODE_X - ELECTRODE_D / 2;
        var metalRight = ELECTRODE_X + ELECTRODE_D / 2;
        var wireY = ELECTRODE_H / 2;
        var P = o.pos, V = o.vel;

        if (mode === 'reduce') {
            V.x += 0.005 * speed;
            if (P.y > wireY - 1) V.y -= 0.003 * speed;
        } else if (mode === 'oxidize') {
            V.x -= 0.003 * speed;
            if (P.x < metalLeft + 0.5) V.y += 0.005 * speed;
        }
        advance(o, dt * speed * 60);

        var halfH = ELECTRODE_H / 2, halfW = ELECTRODE_W / 2;
        if (P.y > halfH) {   // wire region above the electrode
            P.y = Math.min(P.y, halfH + WIRE_HEIGHT);
            P.z = clamp(P.z, -0.3, 0.3);
            P.x = clamp(P.x, metalLeft, ELECTRODE_X + 15);
        } else {             // electrode body
            P.x = clamp(P.x, metalLeft, metalRight);
            P.y = clamp(P.y, -halfH, halfH);
            P.z = clamp(P.z, -halfW, halfW);
        }
        // Electrons consumed at the interface re-enter at the far end of the wire.
        if (mode === 'reduce' && P.x >= metalRight - 0.1 && P.y < halfH - 1) {
            P.x = ELECTRODE_X + 10 + Math.random() * 5;
            P.y = halfH + WIRE_HEIGHT - 0.5;
            P.z = rnd() * 0.3;
        }
        // Electrons leaving along the wire are replaced at the interface.
        if (mode === 'oxidize' && P.x > ELECTRODE_X + 12) {
            P.x = metalRight - 0.2;
            P.y = rnd() * halfH;
            P.z = rnd() * halfW * 0.5;
        }
    }

    // Ions stay in the electrolyte. Cl- leaves the surface during reduction
    // and is drawn to it during oxidation; Na+ and K+ drift weakly the other way.
    function stepIon(o, dt, mode, speed) {
        var bodyLeft = INTERFACE_X + AGCL_THICKNESS / 2 + 0.3;
        var bodyRight = 3 + ELECTROLYTE_W / 2 - 0.5;
        var halfH = ELECTROLYTE_H / 2 - 0.5;
        var halfD = ELECTROLYTE_D / 2 - 0.5;
        var P = o.pos, V = o.vel;

        if (o.type === 'cl') {
            if (mode === 'reduce') V.x += 0.003 * speed;
            else if (mode === 'oxidize') V.x -= 0.005 * speed;
            if (mode === 'reduce' && P.x > bodyRight) {
                P.x = bodyLeft + 0.5;
                P.y = rnd() * ELECTROLYTE_H * 0.8;
                P.z = rnd() * ELECTROLYTE_D * 0.6;
            }
            if (mode === 'oxidize' && P.x < bodyLeft) {
                P.x = bodyRight - 1;
                P.y = rnd() * ELECTROLYTE_H * 0.8;
                P.z = rnd() * ELECTROLYTE_D * 0.6;
            }
        } else {
            if (mode === 'reduce') V.x -= 0.001 * speed;
            else if (mode === 'oxidize') V.x += 0.001 * speed;
        }
        advance(o, dt * speed * 60);
        P.x = clamp(P.x, bodyLeft, bodyRight);
        P.y = clamp(P.y, -halfH, halfH);
        P.z = clamp(P.z, -halfD, halfD);
    }

    // One time step: Brownian kick, damping, then type-specific drift.
    function step(o, dt, mode, speed) {
        o.vel.x += rnd() * o.brownianAmp;
        o.vel.y += rnd() * o.brownianAmp;
        o.vel.z += rnd() * o.brownianAmp;
        o.vel.x *= 0.96; o.vel.y *= 0.96; o.vel.z *= 0.96;
        if (o.type === 'electron') stepElectron(o, dt, mode, speed);
        else stepIon(o, dt, mode, speed);
    }

    // Current density imposed by the external circuit at simulation time t,
    // in uA/cm^2, with the IUPAC sign convention: anodic (oxidation) current
    // positive, cathodic (reduction) current negative. The waveform is an
    // illustrative drive of about 50 uA/cm^2 with a slow ripple and noise;
    // at equilibrium only noise remains.
    var J_SCALE = 100;   // uA/cm^2 per unit of the normalised drive
    function current(t, mode) {
        var u;
        if (mode === 'oxidize') u = 0.5 + Math.sin(t * 2) * 0.15 + rnd() * 0.05;
        else if (mode === 'reduce') u = -0.5 - Math.sin(t * 2) * 0.15 + rnd() * 0.05;
        else u = rnd() * 0.02;
        return J_SCALE * u;
    }

    // Charge-transfer overpotential from the Butler-Volmer equation for a
    // one-electron reaction with symmetric transfer coefficients
    // (alpha_a = alpha_c = 0.5):
    //     j = j0 [exp(F eta / 2RT) - exp(-F eta / 2RT)] = 2 j0 sinh(F eta / 2RT)
    // so  eta = (2RT/F) asinh(j / 2 j0).  For |eta| << RT/F this reduces to
    // eta = R_ct j with R_ct = RT / (F j0). j and j0 in uA/cm^2, eta in V.
    // j0 is a representative value set on the page, not a measured constant.
    function overpotential(j, j0) { return 2 * RT_F * Math.asinh(j / (2 * j0)); }
    function rct(j0) { return RT_F / (j0 * 1e-6); }   // ohm cm^2

    // Electrode potential: equilibrium (Nernst) value at the selected
    // chloride activity plus the charge-transfer overpotential.
    function potential(j, mode) {
        var eq = nernst(Math.pow(10, p.lacl));
        return mode === 'equil' ? eq : eq + overpotential(j, Math.pow(10, p.lj0));
    }

    // Nernst equation for AgCl + e- <-> Ag + Cl- with unit solid activities.
    function nernst(aCl) { return E0 - RT_F * Math.log(aCl); }

    window.ELI = {
        ELECTRODE_W: ELECTRODE_W, ELECTRODE_H: ELECTRODE_H, ELECTRODE_D: ELECTRODE_D,
        AGCL_THICKNESS: AGCL_THICKNESS, ELECTROLYTE_W: ELECTROLYTE_W,
        ELECTROLYTE_H: ELECTROLYTE_H, ELECTROLYTE_D: ELECTROLYTE_D,
        WIRE_HEIGHT: WIRE_HEIGHT, ELECTRODE_X: ELECTRODE_X, INTERFACE_X: INTERFACE_X,
        ELECTROLYTE_CX: ELECTROLYTE_CX,
        E0: E0, RT_F: RT_F,
        p: p, spawn: spawn, step: step, current: current, potential: potential, nernst: nernst,
        overpotential: overpotential, rct: rct,
        // Run fn now (after DOM ready) and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('elichange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
