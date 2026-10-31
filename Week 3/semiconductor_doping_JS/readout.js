// Fills [data-out] values from the parameters and the carrier statistics,
// and [data-live] values from the counts the 3D scene writes each frame.
(function () {
    var D;

    function tex(el, s) {
        if (window.katex) window.katex.render(s, el, { throwOnError: false });
        else el.textContent = s;
    }

    function render() {
        D = window.DOP;
        var p = D.p, L = D.LABELS[p.mode], s = D.state();
        document.querySelectorAll('[data-out]').forEach(function (el) {
            var k = el.dataset.out;
            if (k === 'material') { el.textContent = L.name; el.style.color = window.CMP.cssVar(L.colorVar); }
            else if (k === 'dopant') el.textContent = L.dopant;
            else if (k === 'carrier') el.textContent = s.type;
            else if (k === 'temp') el.textContent = Math.round(p.temp) + ' K';
            else if (k === 'N') tex(el, p.mode === 'pure' ? '0' : D.fmtSci(D.N()) + '\\,\\text{cm}^{-3}');
            else if (k === 'n') tex(el, D.fmtSci(s.n) + '\\,\\text{cm}^{-3}');
            else if (k === 'p') tex(el, D.fmtSci(s.p) + '\\,\\text{cm}^{-3}');
            else if (k === 'ni') tex(el, D.fmtSci(s.ni) + '\\,\\text{cm}^{-3}');
            else if (k === 'sigma') tex(el, D.fmtSci(s.sigma) + '\\,\\text{S/cm}');
            else if (k === 'ef') el.textContent = isNaN(s.ef) ? 'undefined at 0 K'
                : (s.ef >= 0 ? '+' : '−') + Math.abs(s.ef * 1e3).toFixed(0) + ' meV';
        });
        live();
    }

    // Called by the scene every frame; only touches text that changed.
    function live() {
        var l = D.live;
        var vals = { atoms: String(l.atoms), bonds: String(l.bonds), free: String(l.free), holes: String(l.holes) };
        document.querySelectorAll('[data-live]').forEach(function (el) {
            var v = vals[el.dataset.live];
            if (el.textContent !== v) el.textContent = v;
        });
    }

    window.DOP.updateLive = function () { if (D) live(); };
    window.DOP.onRender(render);
})();
