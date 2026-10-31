// Fills every [data-out] readout from the present bias and doping. Values
// tied to the 3D formation animation ("state3d", "v0", "w3d", "current3d")
// are refreshed by the scene through PN.updateLive while the junction forms.
(function () {
    function fmtV(v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + ' V'; }
    function um(cm) { return (cm * 1e4).toFixed(3) + ' µm'; }

    function render() {
        var P = window.PN, V = P.p.bias, css = window.CMP.cssVar;
        var st = P.junctionState(V), F = P.formation, v0 = P.V0();
        var out = {
            bias: fmtV(V),
            state: st,
            current: P.fmtI(P.current(V)),
            w: um(P.W(V)),
            xp: um(P.xp(V)),
            xn: um(P.xn(V)),
            v0eq: v0.toFixed(3) + ' V',
            barrier: Math.max(0, v0 - V).toFixed(2) + ' eV',
            split: Math.abs(V).toFixed(2) + ' eV',
            v0mv: fmtV(v0 - V),
            vt: (P.V_T * 1e3).toFixed(1) + ' mV',
            // 3D scene values: formation progress overrides while forming.
            state3d: F ? F.phase + ' ' + Math.round(F.progress * 100) + ' %' : st,
            v0: (F ? v0 * F.progress : v0).toFixed(2) + ' V',
            w3d: F ? um(P.W(0) * F.wfrac) : um(P.W(V)),
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
