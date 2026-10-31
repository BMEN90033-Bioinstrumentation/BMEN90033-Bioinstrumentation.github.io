// pn-junction model. Constants and the depletion-width, current and state
// functions are ported from the original simulator without change.
(function () {
    var V0 = 0.7;              // built-in potential, V
    var V_BREAKDOWN = -1.5;    // scaled for display
    var V_TURN_ON = 0.5;       // forward turn-on threshold, V
    var I0 = 1e-12;            // saturation current, A
    var q_kT = 38.68;          // 1/V_T at 300 K, 1/V
    var EG_EV = 1.12;          // silicon band gap, eV
    var W0 = 1;                // equilibrium half-width (normalised; the 3D scene scales it)

    // Shared page parameters. bias in V (old slider -200..200 mapped to -2..2 V).
    var p = { bias: 0, run: 'play' };

    function depletionHalfWidth(V, w0) {
        w0 = w0 || W0;
        if (V >= V0) return 0;
        if (V >= 0) return w0 * Math.sqrt(Math.max(0, 1 - V / V0));
        return w0 * Math.sqrt(1 + Math.abs(V) / V0);
    }

    function currentMagnitude(V) {
        if (V <= V_BREAKDOWN) return 1e-3;
        return Math.abs(I0 * (Math.exp(q_kT * V) - 1));
    }

    // Signed current: positive in forward bias, negative in reverse.
    function current(V) { return V < 0 ? -currentMagnitude(V) : currentMagnitude(V); }

    function junctionState(V) {
        if (V <= V_BREAKDOWN) return 'Breakdown';
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
        'Forward Bias (sub-threshold)': 'The forward bias lowers the potential barrier and narrows the depletion region, but the voltage is below the turn-on threshold (about ' + V_TURN_ON.toFixed(1) + ' V for Si). The current is negligible.',
        'Forward Bias': 'Forward bias has lowered the barrier far enough for conduction. Electrons from the n-side conduction band cross into the p-side, where they recombine with holes, and current flows through the junction.',
        'Reverse Bias': 'Reverse bias: a brief transient removes majority carriers from the edges of the depletion region, which widens. The steady reverse current is only the saturation current I₀, carried by minority carriers generated near the junction. The animation exaggerates carrier loss; the neutral regions of a real diode stay populated.',
        'Breakdown': 'Avalanche breakdown: the strong field accelerates carriers until impact ionisation creates additional electron-hole pairs, and carrier multiplication produces a large reverse current. The breakdown voltage is scaled to ' + V_BREAKDOWN.toFixed(1) + ' V for display.'
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
        V0: V0, V_BREAKDOWN: V_BREAKDOWN, V_TURN_ON: V_TURN_ON, I0: I0, q_kT: q_kT, EG_EV: EG_EV, W0: W0,
        p: p, depletionHalfWidth: depletionHalfWidth, currentMagnitude: currentMagnitude, current: current,
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
