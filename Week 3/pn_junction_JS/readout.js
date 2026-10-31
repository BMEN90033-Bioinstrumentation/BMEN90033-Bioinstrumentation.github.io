// Fills every [data-out] readout from the present bias. Values tied to the
// 3D formation animation ([data-out="state3d"], "v0", "w3d") are refreshed
// by the scene through PN.updateLive while the junction forms.
(function () {
    function fmtV(v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + ' V'; }

    function render() {
        var P = window.PN, V = P.p.bias, css = window.CMP.cssVar;
        var st = P.junctionState(V), F = P.formation;
        var W = P.depletionHalfWidth(V);
        var out = {
            bias: fmtV(V),
            state: st,
            current: P.fmtI(P.current(V)),
            w: W.toFixed(2) + ' W₀',
            barrier: Math.max(0, P.V0 - V).toFixed(2) + ' eV',
            split: Math.abs(V).toFixed(2) + ' eV',
            v0mv: fmtV(P.V0 - V),
            vt: (1e3 / P.q_kT).toFixed(1) + ' mV',
            // 3D scene values: formation progress overrides while forming.
            state3d: F ? F.phase + ' ' + Math.round(F.progress * 100) + ' %' : st,
            v0: (F ? P.V0 * F.progress : P.V0).toFixed(2) + ' V',
            w3d: (F ? F.w : W).toFixed(2) + ' W₀',
            current3d: F ? '~0 A' : P.fmtI(P.current(V))
        };
        document.querySelectorAll('[data-out]').forEach(function (el) {
            var k = el.dataset.out;
            if (el.textContent !== out[k]) el.textContent = out[k];
            if (k === 'state' || k === 'state3d') el.style.color = css(F && k === 'state3d' ? '--c-barrier' : P.STATE_VAR[st]);
        });
        var d = document.getElementById('pn-desc');
        if (d) {
            var txt = F ? P.FORM_DESC[F.progress < 0.15 ? 0 : F.progress < 0.5 ? 1 : F.progress < 0.85 ? 2 : 3] : P.DESC[st];
            if (d.textContent !== txt) d.textContent = txt;
        }
    }

    window.PN.updateLive = render;
    window.PN.onRender(render);
})();
