// Class D amplifier model: sine input, triangle carrier, comparator PWM,
// a complementary MOSFET half-bridge on a single supply, a second-order LC
// filter and a DC-blocking capacitor in series with the load. The filter is
// simulated on the PWM waveform; the power budget is built from the
// simulated currents and stated device losses. Angles t are the phase of
// the input in radians (sin t); SI units unless stated.
(function () {
    var VCC = 12;          // half-bridge supply, V
    var RL = 8;            // load resistance (loudspeaker), ohm
    var L = 600e-6;        // filter inductor, H
    var CF = 4.7e-6;       // filter capacitor, F
    var CB = 470e-6;       // DC-blocking capacitor in series with R_L, F
    var F_SIG = 1000;      // input frequency, Hz; f_sw = ratio x F_SIG
    // Representative small power MOSFET and driver values (not a specific part).
    var RDS = 0.1;         // on-resistance of each device, ohm
    var TR = 20e-9, TF = 20e-9;   // switching-node rise and fall times, s
    var QG = 10e-9;        // total gate charge per device, C
    var VGS = 12;          // gate drive swing, V
    var IQ = 1e-3;         // comparator and driver quiescent current, A

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'cldchange'. amp is the input amplitude in % of the carrier peak,
    // speed the animation rate (rad/s of input phase), ratio = f_sw / f_sig.
    var p = { amp: 30, speed: 1, ratio: 8, paused: 'no' };

    function inputSignal(t, q) { q = q || p; return (q.amp / 100) * Math.sin(t); }

    // Triangle wave from -1 to 1 at ratio times the signal frequency.
    function triangleCarrier(t, q) {
        q = q || p;
        var phase = (t * q.ratio) / (2 * Math.PI);
        var frac = phase - Math.floor(phase);
        return frac < 0.5 ? (-1 + 4 * frac) : (3 - 4 * frac);
    }

    function pwmSignal(t, q) { return inputSignal(t, q) > triangleCarrier(t, q) ? 1 : 0; }

    // Duty cycle for a given input: D = (v_in + V_c,pk) / (2 V_c,pk).
    function duty(vin) { return (vin + 1) / 2; }

    // Filter response H(f) = 1 / (1 - (f/f_0)^2 + j f/(f_0 Q)) with the load
    // across C (C_B is a short circuit at these frequencies).
    var F0 = 1 / (2 * Math.PI * Math.sqrt(L * CF)), QF = RL * Math.sqrt(CF / L);
    function Hmag(f) {
        var x = f / F0;
        return 1 / Math.sqrt(Math.pow(1 - x * x, 2) + Math.pow(x / QF, 2));
    }

    // Time-domain simulation of the half-bridge, LC filter, C_B and R_L driven
    // by the PWM waveform. Semi-implicit Euler with 200 steps per switching
    // period; 12 warm-up cycles let the C_B and LC transients decay, then two
    // input cycles are recorded. Returns the node voltage v_C, the load
    // voltage v_out = v_C - v_B and the power budget in W. The power drawn
    // through the bridge equals the load power plus the conduction loss
    // (energy balance over whole cycles in the steady state); the switching,
    // gate-drive and quiescent terms are added to it. Signal power is the
    // load power at f_sig only.
    var cache = {};
    function sim(q) {
        q = q || p;
        var key = q.amp + '|' + q.ratio;
        if (cache[key]) return cache[key];
        var fsw = q.ratio * F_SIG, dt = 1 / (fsw * 200);
        var nCyc = Math.round(1 / F_SIG / dt), warm = 12 * nCyc, n = 2 * nCyc;
        var iL = 0, vC = VCC / 2, vB = VCC / 2, prev = -1;
        var th = new Float64Array(n + 1), vc = new Float64Array(n + 1), vo = new Float64Array(n + 1);
        var eL = 0, eCond = 0, eSw = 0, iSq = 0, sa = 0, sb = 0;
        for (var k = 0; k <= warm + n; k++) {
            var t = 2 * Math.PI * F_SIG * k * dt, s = pwmSignal(t, q);
            var rec = k >= warm, j = k - warm;
            if (rec && prev >= 0 && s !== prev) eSw += VCC * Math.abs(iL) * (s ? TR : TF) / 2;
            prev = s;
            iL += dt / L * (s * VCC - iL * RDS - vC);
            var iLoad = (vC - vB) / RL;
            vC += dt / CF * (iL - iLoad);
            vB += dt / CB * iLoad;
            if (rec) {
                th[j] = 2 * Math.PI * F_SIG * j * dt; vc[j] = vC; vo[j] = vC - vB;
                if (j < n) {
                    eL += (vC - vB) * (vC - vB) / RL * dt;
                    eCond += iL * iL * RDS * dt; iSq += iL * iL * dt;
                    sa += (vC - vB) * Math.sin(th[j]) * dt; sb += (vC - vB) * Math.cos(th[j]) * dt;
                }
            }
        }
        var T = n * dt;
        // Load voltage component at f_sig (Fourier coefficients over two
        // cycles); the rest of the load power is switching ripple.
        var vSig = Math.hypot(2 * sa / T, 2 * sb / T);
        var pw = {
            load: eL / T, signal: vSig * vSig / (2 * RL), cond: eCond / T, sw: eSw / T,
            gate: 2 * QG * VGS * fsw, quiet: VCC * IQ, iRms: Math.sqrt(iSq / T)
        };
        pw.dc = pw.load + pw.cond + pw.sw + pw.gate + pw.quiet;
        pw.drive = pw.gate + pw.quiet;
        pw.ripple = Math.max(0, pw.load - pw.signal);
        pw.heat = Math.max(0, pw.dc - pw.signal);
        pw.eff = pw.dc > 0 ? pw.signal / pw.dc * 100 : 0;
        pw.voutPeak = vSig;
        var r = { th: th, vc: vc, vo: vo, n: n, power: pw, fsw: fsw };
        if (Object.keys(cache).length > 6) cache = {};
        cache[key] = r;
        return r;
    }
    // Linear interpolation of a recorded trace at phase t (0..4 pi).
    function at(arr, t, q) {
        var r = sim(q), u = (t / (4 * Math.PI)) * r.n, i = Math.max(0, Math.min(r.n - 1, Math.floor(u)));
        return arr === 'vo' ? r.vo[i] + (r.vo[i + 1] - r.vo[i]) * (u - i) : r.vc[i] + (r.vc[i + 1] - r.vc[i]) * (u - i);
    }

    // PWM samples over [t0, t0 + span] with enough points per carrier cycle
    // to catch every transition; returns [t, level] pairs with the step
    // corners inserted, ready for a d3.line.
    function pwmSteps(t0, span, q) {
        q = q || p;
        var n = Math.max(800, Math.ceil(span / (2 * Math.PI) * q.ratio * 16));
        var out = [], prev = pwmSignal(t0, q);
        out.push([t0, prev]);
        for (var i = 1; i <= n; i++) {
            var t = t0 + span * i / n, v = pwmSignal(t, q);
            if (v !== prev) { out.push([t, prev]); out.push([t, v]); prev = v; }
        }
        out.push([t0 + span, prev]);
        return out;
    }

    window.CLD = {
        VCC: VCC, RL: RL, L: L, CF: CF, CB: CB, F_SIG: F_SIG, F0: F0, QF: QF,
        RDS: RDS, TR: TR, TF: TF, QG: QG, VGS: VGS, IQ: IQ, p: p,
        inputSignal: inputSignal, triangleCarrier: triangleCarrier, pwmSignal: pwmSignal,
        duty: duty, pwmSteps: pwmSteps, Hmag: Hmag, sim: sim,
        nodeAt: function (t) { return at('vc', t); },
        loadAt: function (t) { return at('vo', t); },
        power: function (q) { return sim(q).power; },
        WINDOW: 4 * Math.PI,   // two input cycles shown in the time plots
        // Animation clock advanced by anim.js: th is the input phase (0..WINDOW),
        // t is wall time in seconds (for current-flow dots).
        clock: { th: 0, t: 0 },
        // Run fn now (after DOM ready) and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('cldchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
