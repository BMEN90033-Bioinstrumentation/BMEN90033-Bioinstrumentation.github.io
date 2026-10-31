// Myelinated versus unmyelinated conduction. The unmyelinated wavefront moves
// continuously; the myelinated wavefront dwells at each node of Ranvier and
// then jumps to the next. Dwell and jump durations both scale as 1/speed, so
// the speed ratio of the two fibres does not depend on the speed setting.
// The schematic action potential at the recording point is apShape(distance),
// continuous at every breakpoint.
(function () {
    var AXON_LENGTH = 60, HALF_LEN = AXON_LENGTH / 2;
    var AXON_RADIUS = 0.6, NODE_WIDTH = 0.6, DEPOL_WIDTH_UNMYEL = 8;
    var MYEL_Y = 5, UNMYEL_Y = -5;
    var UNMYEL_BASE_SPEED = 4;
    var DWELL_TIME = 0.08;      // s the dipole dwells at a node at speed 1
    var JUMP_DURATION = 0.12;   // s for the jump to the next node at speed 1
    var SUB_DT = 1 / 240;       // s, integration step at speed 1 (scaled by 1/speed)
    var RECORD_X = 15;

    // Shared parameters. controls.js writes these and dispatches 'myechange'.
    var p = {
        speed: 1, myelin: 0.8, internode: 7, density: 2,
        run: 'on', currents: 'off', xsec: 'off'
    };

    // Node positions for a given internode distance.
    function nodes(internode) {
        var pos = [], x = -HALF_LEN;
        pos.push(x);
        while (x < HALF_LEN) {
            x += internode;
            if (x < HALF_LEN) pos.push(x);
        }
        if (pos[pos.length - 1] < HALF_LEN - 1) pos.push(HALF_LEN);
        return pos;
    }

    function fresh() {
        return { unmyelX: -HALF_LEN, myelX: -HALF_LEN, node: 0, nodeTimer: 0,
                 jumping: false, jumpProgress: 0, t: 0 };
    }
    function resetMyel(st) {
        st.node = 0; st.nodeTimer = 0; st.jumping = false; st.jumpProgress = 0; st.myelX = -HALF_LEN;
    }

    // Advance state st by dt seconds with speed factor sp over node list np.
    // Returns true when the cycle wraps.
    function step(st, dt, sp, np) {
        st.t += dt;
        st.unmyelX += dt * UNMYEL_BASE_SPEED * sp;
        if (st.node < np.length - 1) {
            if (!st.jumping) {
                st.nodeTimer += dt * sp;                 // dwell lasts DWELL_TIME / sp
                if (st.nodeTimer >= DWELL_TIME) { st.jumping = true; st.jumpProgress = 0; }
                st.myelX = np[st.node];
            } else {
                st.jumpProgress += dt * sp / JUMP_DURATION;   // jump lasts JUMP_DURATION / sp
                if (st.jumpProgress >= 1) {
                    st.jumpProgress = 1;
                    st.jumping = false;
                    st.node++;
                    st.nodeTimer = 0;
                    st.myelX = np[Math.min(st.node, np.length - 1)];
                } else {
                    var e = st.jumpProgress, ease = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
                    st.myelX = np[st.node] + (np[st.node + 1] - np[st.node]) * ease;
                }
            }
        } else {
            st.myelX = np[np.length - 1];
        }
        if (st.unmyelX > HALF_LEN + 15 && st.node >= np.length - 1) {
            var f = fresh();
            for (var k in f) st[k] = f[k];
            return true;
        }
        return false;
    }

    // Schematic action potential (normalised) at distance dist ahead of the
    // front: rising foot over 2 units, exponential repolarisation reaching the
    // after-hyperpolarisation minimum -0.15 at dist = -3, and exponential
    // recovery to rest at dist = -8. Each piece is rescaled to meet its
    // neighbours, so a(dist) is continuous.
    var E2 = Math.exp(-2), E53 = Math.exp(-5 / 3), AHP = 0.15;
    function apShape(dist) {
        if (dist > 2) return 0;
        if (dist > 0) return Math.pow(1 - dist / 2, 2);
        if (dist > -3) return -AHP + (1 + AHP) * (Math.exp(dist / 1.5) - E2) / (1 - E2);
        if (dist > -8) return -AHP * (Math.exp((dist + 3) / 3) - E53) / (1 - E53);
        return 0;
    }
    var AP_BREAKS = [2, 0, -3, -8];   // breakpoints of apShape in dist
    // Display mapping used by the original trace labels: 0 -> -70 mV, 1 -> +40 mV.
    function vm(a) { return -70 + 110 * a; }

    // Advance by dt in sub-steps no longer than SUB_DT / sp.
    function advance(st, dt, sp, np) {
        var n = Math.max(1, Math.ceil(dt * sp / SUB_DT)), h = dt / n, wrapped = false;
        for (var i = 0; i < n; i++) wrapped = step(st, h, sp, np) || wrapped;
        return wrapped;
    }

    // One full cycle at the integration step for the present parameters.
    function simulate() {
        var st = fresh(), np = nodes(p.internode), dt = SUB_DT / p.speed, out = [];
        for (var i = 0; i < 20000; i++) {
            out.push({ t: st.t, u: st.unmyelX, m: st.myelX });
            if (step(st, dt, p.speed, np)) break;
        }
        return out;
    }

    var s = fresh();
    var np = nodes(p.internode);

    var ticks = [], last = performance.now();
    function loop(now) {
        var dt = Math.min((now - last) / 1000, 0.1);   // ponytail: clamp so a background tab does not jump the fronts
        last = now;
        if (p.run === 'on') advance(s, dt, p.speed, np);
        for (var i = 0; i < ticks.length; i++) ticks[i]();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    window.addEventListener('myechange', function (e) {
        if (e.detail && e.detail.key === 'internode') { np = nodes(p.internode); window.MYE.np = np; resetMyel(s); }
    });

    function ready(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    window.MYE = {
        AXON_LENGTH: AXON_LENGTH, HALF_LEN: HALF_LEN, AXON_RADIUS: AXON_RADIUS, NODE_WIDTH: NODE_WIDTH,
        DEPOL_WIDTH_UNMYEL: DEPOL_WIDTH_UNMYEL, MYEL_Y: MYEL_Y, UNMYEL_Y: UNMYEL_Y, RECORD_X: RECORD_X,
        UNMYEL_BASE_SPEED: UNMYEL_BASE_SPEED, DWELL_TIME: DWELL_TIME, JUMP_DURATION: JUMP_DURATION,
        p: p, s: s, np: np, nodes: nodes, apShape: apShape, AP_BREAKS: AP_BREAKS, vm: vm, simulate: simulate,
        actions: {
            reset: function () { var f = fresh(); for (var k in f) s[k] = f[k]; p.run = 'on'; }
        },
        onRender: function (fn) {
            ready(function () {
                fn();
                window.addEventListener('myechange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            });
        },
        onTick: function (fn, el) {
            var vis = !el;
            if (el) new IntersectionObserver(function (e) {
                vis = e[e.length - 1].isIntersecting;
            }).observe(el);
            ticks.push(function () { if (vis) fn(); });
        }
    };
})();
