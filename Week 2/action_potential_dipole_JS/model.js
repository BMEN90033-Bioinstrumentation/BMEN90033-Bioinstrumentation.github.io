// Action potential dipole model. A depolarisation front and a repolarisation
// front a fixed distance behind it travel along a tissue slab. Each front is a
// unit current dipole (+x and -x); potentials and fields superpose. Ported
// from the original simulator without change to the equations.
(function () {
    var TISSUE_LEN = 40, TISSUE_W = 16, TISSUE_H = 4;
    var HALF_LEN = TISSUE_LEN / 2;
    var REPOL_DISTANCE = 26;            // ~65 % of tissue length
    var FRONT_SPEED = 8;                // a.u./s at speed factor 1
    var POT_SCALE = 200;                // electrode potential scale
    var WF_START = -HALF_LEN - 2;       // wavefront position after a reset
    var WF_END = HALF_LEN + 5 + REPOL_DISTANCE;   // reset once wf exceeds this
    var EA = [10, TISSUE_H / 2 + 0.2, 0];   // electrode A (+)
    var EB = [-10, TISSUE_H / 2 + 0.2, 0];  // electrode B (-)

    // Shared parameters. controls.js writes these and dispatches 'apdchange'.
    var p = { speed: 1, density: 2, run: 'on' };
    var s = { wf: -HALF_LEN };

    // Potential of a dipole at c with direction d (+1 or -1 along x) at point q.
    function potential(c, d, q) {
        var rx = q[0] - c[0], ry = q[1] - c[1], rz = q[2] - c[2];
        var dist = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (dist < 0.5) return 0;
        return d * (rx / dist) / (dist * dist);
    }

    // Field of the same dipole: (3 (p.r) r - p) / r^3.
    function field(c, d, q) {
        var rx = q[0] - c[0], ry = q[1] - c[1], rz = q[2] - c[2];
        var dist = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (dist < 2) return [0, 0, 0];
        var nx = rx / dist, ny = ry / dist, nz = rz / dist;
        var pr = d * nx, d3 = dist * dist * dist;
        return [(3 * pr * nx - d) / d3, 3 * pr * ny / d3, 3 * pr * nz / d3];
    }

    function clampX(x) { return Math.max(-HALF_LEN, Math.min(HALF_LEN, x)); }

    // Geometry and electrode potentials for wavefront position wf.
    function state(wf) {
        var depolX = clampX(wf), repolRaw = wf - REPOL_DISTANCE, repolX = clampX(repolRaw);
        var depolIn = wf >= -HALF_LEN && wf <= HALF_LEN;
        var repolIn = repolRaw >= -HALF_LEN && repolRaw <= HALF_LEN;
        var depLeft = repolRaw >= -HALF_LEN ? repolX : -HALF_LEN;
        var depRight = wf >= -HALF_LEN ? depolX : -HALF_LEN;
        var dc = [depolX, 0, 0], rc = [repolX, 0, 0];
        var va = 0, vb = 0;
        if (depolIn) { va += potential(dc, 1, EA) * POT_SCALE; vb += potential(dc, 1, EB) * POT_SCALE; }
        if (repolIn) { va += potential(rc, -1, EA) * POT_SCALE; vb += potential(rc, -1, EB) * POT_SCALE; }
        return {
            depolX: depolX, repolX: repolX, depolIn: depolIn, repolIn: repolIn,
            depLeft: depLeft, depRight: depRight, depLen: depRight - depLeft,
            va: va, vb: vb, diff: va - vb
        };
    }

    // Total potential (electrode scale) at point q for a given state.
    function totalPotential(st, q) {
        var v = 0;
        if (st.depolIn) v += potential([st.depolX, 0, 0], 1, q);
        if (st.repolIn) v += potential([st.repolX, 0, 0], -1, q);
        return v * POT_SCALE;
    }

    // Time within one cycle, s, and cycle length, s, at the present speed.
    function cycleLength() { return (WF_END - WF_START) / (FRONT_SPEED * p.speed); }
    function wfAt(t) { return WF_START + t * FRONT_SPEED * p.speed; }
    function tNow() { return (s.wf - WF_START) / (FRONT_SPEED * p.speed); }

    // One shared clock. Per-frame callbacks registered with onTick run only
    // while their element is on screen.
    var ticks = [], last = performance.now();
    function loop(now) {
        var dt = Math.min((now - last) / 1000, 0.1);   // ponytail: clamp so a background tab does not jump the fronts
        last = now;
        if (p.run === 'on') {
            s.wf += dt * p.speed * FRONT_SPEED;
            if (s.wf - REPOL_DISTANCE > HALF_LEN + 5) s.wf = WF_START;
        }
        for (var i = 0; i < ticks.length; i++) ticks[i]();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function ready(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    window.APD = {
        TISSUE_LEN: TISSUE_LEN, TISSUE_W: TISSUE_W, TISSUE_H: TISSUE_H, HALF_LEN: HALF_LEN,
        REPOL_DISTANCE: REPOL_DISTANCE, EA: EA, EB: EB,
        p: p, s: s, potential: potential, field: field, state: state, totalPotential: totalPotential,
        cycleLength: cycleLength, wfAt: wfAt, tNow: tNow,
        actions: {
            reset: function () { s.wf = WF_START; p.run = 'on'; }
        },
        // Run fn after DOM ready and again on every parameter, theme or size change.
        onRender: function (fn) {
            ready(function () {
                fn();
                window.addEventListener('apdchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            });
        },
        // Run fn every frame while el is visible (always when el is omitted).
        onTick: function (fn, el) {
            var vis = !el;
            if (el) new IntersectionObserver(function (e) {
                vis = e[e.length - 1].isIntersecting;
            }).observe(el);
            ticks.push(function () { if (vis) fn(); });
        }
    };
})();
