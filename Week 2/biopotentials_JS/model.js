// Hodgkin-Huxley membrane patch of a squid giant axon at 6.3 C, with an
// electrogenic Na+/K+ pump.
//
// Reversal potentials come from the Nernst equation, E = (RT/zF) ln(c_o/c_i).
// The HH leak g_L (V - E_L) is split into a Na+ leak and a K+ leak, and a
// pump current I_p (3 Na+ out, 2 K+ in per cycle, one net charge out) is
// added. The split and the resting pump current are chosen so that
//   g_LNa (V - E_Na) + g_LK (V - E_K) + I_p0 = g_L (V - E_L)   for all V,
// so with I_p = I_p0 the voltage dynamics are those of the original HH
// model, and at rest the passive Na+ and K+ fluxes are exactly balanced by
// the pump. The pump rate is proportional to the intracellular Na+ content,
// so it speeds up after activity and restores the gradients.
//
// One shared clock advances the model four Euler steps per animation frame
// and keeps the last 70 ms of every trace. Ion amounts are tracked here in
// particle units (1 particle = 1000 ions) for a 1 um^2 patch.
(function () {
    // ── Nernst potentials ──
    var R = 8.314462618, F = 96485.33212, T_C = 6.3;
    var RT_F = 1000 * R * (273.15 + T_C) / F;      // mV
    var conc = { na: { out: 440, in: 55 }, k: { out: 16.3, in: 400 } };   // mM
    function nernst(c, z) { return RT_F / z * Math.log(c.out / c.in); }

    var alpha_n = function (v) { return 0.01 * (v + 55) / (1 - Math.exp(-(v + 55) / 10)); };
    var beta_n = function (v) { return 0.125 * Math.exp(-(v + 65) / 80); };
    var alpha_m = function (v) { return 0.1 * (v + 40) / (1 - Math.exp(-(v + 40) / 10)); };
    var beta_m = function (v) { return 4.0 * Math.exp(-(v + 65) / 18); };
    var alpha_h = function (v) { return 0.07 * Math.exp(-(v + 65) / 20); };
    var beta_h = function (v) { return 1.0 / (1 + Math.exp(-(v + 35) / 10)); };

    var HH = {
        V: -65.0, m: 0.052, h: 0.596, n: 0.317,
        dt: 0.05,
        C_m: 1.0, g_Na: 120.0, E_Na: nernst(conc.na, 1), g_K: 36.0, E_K: nernst(conc.k, 1),
        g_L: 0.3, E_L: -54.387,
        g_LNa: 0, g_LK: 0, Ip0: 0, Ip: 0,      // set by calibrate()
        pumpRatio: 1,                          // [Na+]_i / resting [Na+]_i, set by the clock

        stim: { active: false, cur: 20, timer: 0, dur: 1 },
        INa: 0, IK: 0, ILNa: 0, ILK: 0,

        // One Euler step. pump: false runs the original HH leak (calibration only).
        step: function (pump) {
            var I_stim = 0;
            if (this.stim.active) {
                I_stim = this.stim.cur;
                this.stim.timer -= this.dt;
                if (this.stim.timer <= 0) this.stim.active = false;
            }
            var V = this.V;
            var gNa_val = this.g_Na * Math.pow(this.m, 3) * this.h;
            var gK_val = this.g_K * Math.pow(this.n, 4);
            this.INa = gNa_val * (V - this.E_Na);
            this.IK = gK_val * (V - this.E_K);
            var Iother;
            if (pump === false) {
                Iother = this.g_L * (V - this.E_L);
            } else {
                this.ILNa = this.g_LNa * (V - this.E_Na);
                this.ILK = this.g_LK * (V - this.E_K);
                this.Ip = this.Ip0 * this.pumpRatio;
                Iother = this.ILNa + this.ILK + this.Ip;
            }

            var dV = (I_stim - this.INa - this.IK - Iother) / this.C_m;
            var dm = alpha_m(V) * (1 - this.m) - beta_m(V) * this.m;
            var dh = alpha_h(V) * (1 - this.h) - beta_h(V) * this.h;
            var dn = alpha_n(V) * (1 - this.n) - beta_n(V) * this.n;
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

    // Settle the original HH model to rest, then split the leak and size the
    // resting pump. With x = g_LNa and g_LK = g_L - x, the passive currents at
    // rest are I_Na,p = I_Na0 + x a and I_K,p = I_K0 + (g_L - x) b, where
    // a = V0 - E_Na and b = V0 - E_K. A 3:2 pump balances them when
    // I_Na,p = -3 I_p0 and I_K,p = 2 I_p0, i.e. I_Na,p = -1.5 I_K,p.
    (function calibrate() {
        for (var i = 0; i < 8000; i++) HH.step(false);
        var V0 = HH.V, a = V0 - HH.E_Na, b = V0 - HH.E_K;
        var INa0 = HH.g_Na * Math.pow(HH.m, 3) * HH.h * a;
        var IK0 = HH.g_K * Math.pow(HH.n, 4) * b;
        HH.g_LNa = -(1.5 * (IK0 + HH.g_L * b) + INa0) / (a - 1.5 * b);
        HH.g_LK = HH.g_L - HH.g_LNa;
        HH.Ip0 = (IK0 + HH.g_LK * b) / 2;
        HH.Ip = HH.Ip0;
        HH.V0 = V0;
    })();

    // Current density (uA/cm^2) to particles per HH step; positive = influx.
    var fluxMap = {
        patchArea_cm2: 1e-8,         // ~1 um^2 membrane patch
        ionsPerParticle: 1000,       // each rendered particle represents this many ions
        e_C: 1.602176634e-19
    };
    var SCALE = (1e-6 * fluxMap.patchArea_cm2 * HH.dt * 1e-3) / (fluxMap.e_C * fluxMap.ionsPerParticle);

    // Ion amounts in particle units: 2000 particles of each species, split
    // between the compartments in proportion to the concentrations (equal
    // compartment volumes in the scene).
    var TOTAL = 2000;
    var frac = { na: conc.na.out / (conc.na.out + conc.na.in), k: conc.k.out / (conc.k.out + conc.k.in) };
    var amount0 = {
        na: { out: TOTAL * frac.na, in: TOTAL * (1 - frac.na) },
        k: { out: TOTAL * frac.k, in: TOTAL * (1 - frac.k) }
    };
    var amount = { na: { out: amount0.na.out, in: amount0.na.in }, k: { out: amount0.k.out, in: amount0.k.in } };
    // Transfers owed to the 3D scene, by route (passive: channel + leak).
    var pending = { passive: { na: 0, k: 0 }, pump: { na: 0, k: 0 } };
    function move(type, route, n) {
        amount[type].in += n; amount[type].out -= n;
        pending[route][type] += n;
    }

    // Trace buffers, one sample per HH step (1400 x 0.05 ms = 70 ms).
    var N = 1400, STEPS_PER_FRAME = 4;
    var keys = ['V', 'stim', 'm', 'h', 'n', 'gNa', 'gK', 'naFlux', 'kFlux'];
    var buf = {};
    keys.forEach(function (k) { buf[k] = []; });
    for (var i = 0; i < N; i++) {
        buf.V.push(HH.V); buf.stim.push(0); buf.m.push(HH.m); buf.h.push(HH.h); buf.n.push(HH.n);
        buf.gNa.push(HH.g_Na * Math.pow(HH.m, 3) * HH.h); buf.gK.push(HH.g_K * Math.pow(HH.n, 4));
        buf.naFlux.push(0); buf.kFlux.push(0);
    }
    function push(k, v) { buf[k].push(v); buf[k].shift(); }

    var p = { stim: 20 };

    var ticks = [];
    function loop() {
        for (var i = 0; i < STEPS_PER_FRAME; i++) {
            HH.pumpRatio = amount.na.in / amount0.na.in;
            var st = HH.step();
            var naPass = -(HH.INa + HH.ILNa) * SCALE;     // passive Na influx, particles
            var kPass = -(HH.IK + HH.ILK) * SCALE;        // passive K influx (negative = efflux)
            move('na', 'passive', naPass);
            move('k', 'passive', kPass);
            move('na', 'pump', -3 * HH.Ip * SCALE);       // 3 Na+ out per cycle
            move('k', 'pump', 2 * HH.Ip * SCALE);         // 2 K+ in per cycle
            push('V', st.V); push('stim', st.I_stim);
            push('m', HH.m); push('h', HH.h); push('n', HH.n);
            push('gNa', st.gNa); push('gK', st.gK);
            push('naFlux', naPass / HH.dt);        // passive Na influx, particles/ms
            push('kFlux', -kPass / HH.dt);         // passive K efflux, particles/ms
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
        RT_F: RT_F, T_C: T_C, conc: conc, TOTAL: TOTAL, frac: frac,
        amount: amount, amount0: amount0, pending: pending, SCALE: SCALE,
        // Concentration (mM) of a species in a compartment from its amount.
        concNow: function (type, side) { return amount[type][side] / amount0[type][side] * conc[type][side]; },
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
