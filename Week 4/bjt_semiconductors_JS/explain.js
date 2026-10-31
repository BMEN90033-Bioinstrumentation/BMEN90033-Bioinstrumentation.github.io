// Readouts and the region description card (section 03). The card text is
// the original page's explanation for each region, set with KaTeX.
(function () {
    function text(B) {
        var npn = B.p.type === 'NPN';
        var maj = npn ? 'electrons' : 'holes', min = npn ? 'holes' : 'electrons';
        var eT = npn ? '$\\text{N}^{+}$' : '$\\text{P}^{+}$', bT = npn ? 'P' : 'N', cT = npn ? '$\\text{N}^{-}$' : '$\\text{P}^{-}$';
        var eD = npn ? 'phosphorus' : 'boron', bD = npn ? 'boron' : 'phosphorus';
        switch (B.region()) {
            case 'cutoff': return ['Cutoff: transistor off',
                '<p>No base current is applied. The base-emitter junction is unbiased, so no minority carriers are injected into the base, and both depletion regions are at their equilibrium width.</p>' +
                '<p>The ' + eT + ' emitter (' + eD + '-doped) holds abundant majority ' + maj + ', but they cannot cross the base-emitter depletion region. The ' + bT + ' base (' + bD + '-doped, thin and lightly doped) and the ' + cT + ' collector are at equilibrium. No collector current flows.</p>',
                'At equilibrium, diffusion of carriers across each junction is balanced by drift in the built-in field of its depletion region.'];
            case 'subthreshold': return ['Subthreshold: below $V_{BE(\\text{on})}$',
                '<p>The base-emitter voltage is positive but below the turn-on voltage, about 0.6 to 0.7 V for silicon. The depletion region narrows slightly, but the remaining barrier is too high for significant injection.</p>' +
                '<p>The few ' + maj + ' with enough thermal energy to cross the reduced barrier are swept through, but the collector current remains small.</p>',
                'The current follows the Shockley relation $I \\propto e^{V_{BE}/V_T} - 1$, so conduction rises exponentially rather than at a sharp threshold.'];
            case 'active': return ['Forward active: transistor action',
                '<p>The base-emitter junction is forward biased and its depletion region narrows. Majority ' + maj + ' from the heavily doped ' + eT + ' emitter are injected into the thin, lightly doped ' + bT + ' base as minority carriers.</p>' +
                '<p>Most of them diffuse across the base before recombining with its majority ' + min + ', reach the reverse-biased base-collector depletion region, and are swept into the collector. The small fraction that recombines in the base forms the base current, giving $I_C / I_B \\approx \\beta$, typically 50 to 300.</p>',
                'Carriers cross the base by diffusion and enter the collector by drift in the base-collector field. The thin, lightly doped base limits recombination.'];
            case 'approaching saturation': return ['Approaching saturation',
                '<p>As $I_B$ rises further, $V_{CE}$ falls and the base-collector junction moves from reverse bias towards forward bias, so its depletion region narrows.</p>' +
                '<p>$I_C$ still rises with $I_B$ but the ratio between them falls. Minority carriers accumulate at the collector side of the base because the base-collector junction no longer extracts every injected carrier. The transition is gradual.</p>',
                'Saturation begins as $V_{BC}$ becomes positive. The rising $I_C$ increases the drop across the collector resistor until $V_{CE} < V_{BE}$.'];
            default: return ['Saturation: both junctions forward biased',
                '<p>Both junctions are forward biased, and carriers are injected into the base from the emitter and from the collector.</p>' +
                '<p>$I_C$ no longer rises in proportion to $I_B$; $V_{CE} = V_{BE} - V_{BC}$ has fallen to about 0.1 to 0.2 V, the readout values in section 02. Excess minority ' + maj + ' are stored throughout the base, visible in section 02 as an elevated concentration across it.</p>',
                'The stored base charge must be removed by recombination or reverse extraction before the transistor returns to cutoff. This delay is the storage time $t_s$.'];
        }
    }

    function render() {
        var B = window.BJS, t = text(B);
        document.querySelectorAll('[data-out="region"]').forEach(function (el) { el.textContent = B.region(); });
        document.querySelectorAll('[data-out="ib"]').forEach(function (el) { el.textContent = B.ibMicro() + ' µA'; });
        document.querySelectorAll('[data-out="type"]').forEach(function (el) { el.textContent = B.p.type; });
        // Junction voltages: V_BE, V_BC for the NPN; V_EB, V_CB for the PNP.
        var j = B.junctions(), npn = B.p.type === 'NPN';
        document.querySelectorAll('[data-out="vj1"]').forEach(function (el) { el.textContent = j.vbe.toFixed(3) + ' V'; });
        document.querySelectorAll('[data-out="vj2"]').forEach(function (el) { el.textContent = j.vbc.toFixed(3) + ' V'; });
        document.querySelectorAll('[data-jk]').forEach(function (el) {
            var t = el.dataset.jk === '1' ? (npn ? 'V_{BE}' : 'V_{EB}') : (npn ? 'V_{BC}' : 'V_{CB}');
            if (window.katex) window.katex.render(t, el);
        });
        var card = document.getElementById('region-card');
        if (!card) return;
        card.innerHTML = '<h3>' + t[0] + '</h3>' + t[1] + '<p class="mech"><strong>Mechanism.</strong> ' + t[2] + '</p>';
        if (window.renderMathInElement) window.renderMathInElement(card, {
            delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false
        });
    }

    window.BJS.onRender(render);
})();
