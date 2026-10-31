// pn-junction model: abrupt silicon junction at 300 K under the depletion
// approximation, with the Shockley diode equation and a SPICE-style
// breakdown term.
//   V0 = V_T ln(N_A N_D / n_i^2)
//   W  = sqrt(2 eps_s (V0 - V)(N_A + N_D) / (q N_A N_D)),  V < V0
//   x_p = W N_D / (N_A + N_D),  x_n = W N_A / (N_A + N_D)
//   I  = I_S (exp(V / V_T) - 1) - I_BV exp(-(V + V_BR) / V_T)
(function () {
    var Q = 1.602e-19;          // C
    var V_T = 0.025852;         // kT/q at 300 K, V
    var NI = 1.0e10;            // silicon intrinsic concentration at 300 K, cm^-3
    var EPS_S = 11.7 * 8.854e-14;   // silicon permittivity, F/cm
    var I_S = 1e-12;            // saturation current, A
    var V_BR = 1.5;             // breakdown voltage magnitude (display value), V
    var I_BV = 1e-3;            // current at V = -V_BR, A
    var V_TURN_ON = 0.5;        // label threshold for "forward bias", V
    var EG_EV = 1.12;           // silicon band gap at 300 K, eV
    var q_kT = 1 / V_T;

    // Shared page parameters. bias in V; doping as log10 of cm^-3.
    var p = { bias: 0, run: 'play', logNA: 16, logND: 16 };

    function NA() { return Math.pow(10, p.logNA); }
    function ND() { return Math.pow(10, p.logND); }
    function V0() { return V_T * Math.log(NA() * ND() / (NI * NI)); }

    // Total depletion width in cm; zero once V reaches V0.
    function W(V) {
        var na = NA(), nd = ND(), d = V0() - V;
        if (d <= 0) return 0;
        return Math.sqrt(2 * EPS_S * d * (na + nd) / (Q * na * nd));
    }
    function xp(V) { return W(V) * ND() / (NA() + ND()); }
    function xn(V) { return W(V) * NA() / (NA() + ND()); }

    // Signed diode current, A.
    function current(V) {
        return I_S * (Math.exp(V / V_T) - 1) - I_BV * Math.exp(-(V + V_BR) / V_T);
    }
    function currentMagnitude(V) { return Math.abs(current(V)); }

    function junctionState(V) {
        if (V <= -V_BR) return 'Breakdown';
        if (V < -0.01) return 'Reverse Bias';
        if (V >= V_TURN_ON) return 'Forward Bias';
        if (V > 0.01) return 'Forward Bias (sub-threshold)';
        return 'Equilibrium';
    }

    var STATE_VAR = {
        'Breakdown': '--c-st-bd', 'Reverse Bias': '--c-st-rev', 'Forward Bias': '--c-st-fwd',
        'Forward Bias (sub-threshold)': '--c-st-sub', 'Equilibrium': '--c-st-eq'
    };

    var DESC = {
        'Equilibrium': 'At equilibrium, carrier diffusion across the junction is balanced by the built-in electric field. The depletion region contains fixed donor and acceptor ions but few mobile carriers.',
        'Forward Bias (sub-threshold)': 'The forward bias lowers the potential barrier and narrows the depletion region, but the current is still small; with this saturation current it reaches only 0.25 mA at ' + V_TURN_ON.toFixed(1) + ' V.',
        'Forward Bias': 'Forward bias has lowered the barrier far enough for conduction. Electrons from the n-side conduction band cross into the p-side, where they recombine with holes, and current flows through the junction.',
        'Reverse Bias': 'Reverse bias: a brief transient removes majority carriers from the edges of the depletion region, which widens. The steady reverse current is only the saturation current Iₛ, carried by minority carriers generated near the junction. The animation exaggerates carrier loss; the neutral regions of a real diode stay populated.',
        'Breakdown': 'Breakdown: the field in the depletion region is high enough for carrier multiplication, and the reverse current rises steeply, by a factor of ten for every further 60 mV. The breakdown voltage is set to ' + V_BR.toFixed(1) + ' V for display.'
    };
    var FORM_DESC = [
        'The p-type and n-type materials have just been joined. Free electrons on the n-side (right) diffuse towards the abundant holes on the p-side (left).',
        'Electrons diffuse into the p-side and recombine with holes. This leaves positive donor ions on the n-side and negative acceptor ions on the p-side.',
        'The exposed fixed ions set up an electric field from n to p. The field opposes further diffusion as the depletion region widens.',
        'The built-in field now balances diffusion, and there is no further net carrier movement. The depletion region has reached its equilibrium width.'
    ];

    function fmtI(I) {
        I = Math.abs(I);
        if (I >= 1) return '> 1 A';
        if (I >= 1e-3) return (I * 1e3).toFixed(2) + ' mA';
        if (I >= 1e-6) return (I * 1e6).toFixed(2) + ' µA';
        if (I >= 1e-9) return (I * 1e9).toFixed(2) + ' nA';
        return (I * 1e12).toFixed(2) + ' pA';
    }

    window.PN = {
        Q: Q, V_T: V_T, NI: NI, EPS_S: EPS_S, I_S: I_S, V_BR: V_BR, I_BV: I_BV,
        V_BREAKDOWN: -V_BR, V_TURN_ON: V_TURN_ON, EG_EV: EG_EV, q_kT: q_kT,
        p: p, NA: NA, ND: ND, V0: V0, W: W, xp: xp, xn: xn,
        current: current, currentMagnitude: currentMagnitude,
        junctionState: junctionState, STATE_VAR: STATE_VAR, DESC: DESC, FORM_DESC: FORM_DESC, fmtI: fmtI,
        // Formation progress written by the 3D scene: null once formed.
        formation: null,
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('pnchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
