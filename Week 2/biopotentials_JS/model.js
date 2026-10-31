// Hodgkin-Huxley membrane patch. The HH engine and the current-to-particle
// flux mapping are ported from the original simulator without change to the
// equations or constants. One shared clock advances the model four Euler
// steps per animation frame and keeps the last 70 ms of every trace.
(function () {
    var HH = {
        V: -65.0, m: 0.052, h: 0.596, n: 0.317,
        dt: 0.05,
        C_m: 1.0, g_Na: 120.0, E_Na: 50.0, g_K: 36.0, E_K: -77.0, g_L: 0.3, E_L: -54.387,

        stim: { active: false, cur: 20, timer: 0, dur: 1 },
        INa: 0, IK: 0,

        step: function () {
            var I_stim = 0;
            if (this.stim.active) {
                I_stim = this.stim.cur;
                this.stim.timer -= this.dt;
                if (this.stim.timer <= 0) this.stim.active = false;
            }

            var alpha_n = function (v) { return 0.01 * (v + 55) / (1 - Math.exp(-(v + 55) / 10)); };
            var beta_n = function (v) { return 0.125 * Math.exp(-(v + 65) / 80); };
            var alpha_m = function (v) { return 0.1 * (v + 40) / (1 - Math.exp(-(v + 40) / 10)); };
            var beta_m = function (v) { return 4.0 * Math.exp(-(v + 65) / 18); };
            var alpha_h = function (v) { return 0.07 * Math.exp(-(v + 65) / 20); };
            var beta_h = function (v) { return 1.0 / (1 + Math.exp(-(v + 35) / 10)); };

            var gNa_val = this.g_Na * Math.pow(this.m, 3) * this.h;
            var gK_val = this.g_K * Math.pow(this.n, 4);

            this.INa = gNa_val * (this.V - this.E_Na);
            this.IK = gK_val * (this.V - this.E_K);
            var IL = this.g_L * (this.V - this.E_L);

            var dV = (I_stim - this.INa - this.IK - IL) / this.C_m;
            var dm = alpha_m(this.V) * (1 - this.m) - beta_m(this.V) * this.m;
            var dh = alpha_h(this.V) * (1 - this.h) - beta_h(this.V) * this.h;
            var dn = alpha_n(this.V) * (1 - this.n) - beta_n(this.V) * this.n;

            this.V += dV * this.dt;
            this.m += dm * this.dt;
            this.h += dh * this.dt;
            this.n += dn * this.dt;

            return { V: this.V, I_stim: I_stim, gNa: gNa_val, gK: gK_val, INa: this.INa, IK: this.IK };
        },

        trigger: function () {
            this.stim.timer = this.stim.dur;
            this.stim.active = true;
        }
    };

    // Current density (uA/cm^2) to signed particle count per HH step.
    // Positive = influx (out -> in), negative = efflux (in -> out).
    var fluxMap = {
        patchArea_cm2: 1e-8,         // ~1 um^2 membrane patch
        ionsPerParticle: 1000,       // each rendered particle represents this many ions
        e_C: 1.602176634e-19
    };
    var pendingFlux = { na: 0, k: 0 };   // consumed by the 3D scene
    function addFluxFromCurrent(type, I_uAcm2, dt_ms) {
        var dt_s = dt_ms * 1e-3;
        var scale = (1e-6 * fluxMap.patchArea_cm2 * dt_s) / (fluxMap.e_C * fluxMap.ionsPerParticle);
        var signedParticles = (-I_uAcm2) * scale;
        pendingFlux[type] += signedParticles;
        return signedParticles;
    }

    // Trace buffers, one sample per HH step (1400 x 0.05 ms = 70 ms).
    var N = 1400, STEPS_PER_FRAME = 4;
    var keys = ['V', 'stim', 'm', 'h', 'n', 'gNa', 'gK', 'naFlux', 'kFlux'];
    var buf = {};
    keys.forEach(function (k) { buf[k] = []; });
    for (var i = 0; i < N; i++) {
        buf.V.push(-65); buf.stim.push(0); buf.m.push(HH.m); buf.h.push(HH.h); buf.n.push(HH.n);
        buf.gNa.push(0); buf.gK.push(0); buf.naFlux.push(0); buf.kFlux.push(0);
    }
    function push(k, v) { buf[k].push(v); buf[k].shift(); }

    var p = { stim: 20 };

    var ticks = [];
    function loop() {
        for (var i = 0; i < STEPS_PER_FRAME; i++) {
            var st = HH.step();
            var naStep = addFluxFromCurrent('na', st.INa, HH.dt);
            var kStep = addFluxFromCurrent('k', st.IK, HH.dt);
            push('V', st.V); push('stim', st.I_stim);
            push('m', HH.m); push('h', HH.h); push('n', HH.n);
            push('gNa', st.gNa); push('gK', st.gK);
            push('naFlux', naStep / HH.dt);       // Na influx, particles/ms
            push('kFlux', (-kStep) / HH.dt);      // K efflux, particles/ms
        }
        for (var j = 0; j < ticks.length; j++) ticks[j]();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function ready(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    window.addEventListener('biochange', function () { HH.stim.cur = p.stim; });

    window.BIO = {
        HH: HH, p: p, buf: buf, N: N, STEPS_PER_FRAME: STEPS_PER_FRAME,
        pendingFlux: pendingFlux,
        baselineConc_mM: { na: { out: 145, in: 15 }, k: { out: 5, in: 140 } },
        actions: { fire: function () { HH.stim.cur = p.stim; HH.trigger(); } },
        // Run fn after DOM ready and again on every parameter, theme or size change.
        onRender: function (fn) {
            ready(function () {
                fn();
                window.addEventListener('biochange', fn);
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
