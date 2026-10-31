// Fills [data-out] values from the parameters and [data-live] values from
// the counts the 3D scene writes each frame.
(function () {
    var D;

    function tex(el, s) {
        if (window.katex) window.katex.render(s, el, { throwOnError: false });
        else el.textContent = s;
    }

    function render() {
        D = window.DOP;
        var p = D.p, L = D.LABELS[p.mode];
        var c = D.carriers(Math.pow(10, p.logN), p.ctype);
        var ef = D.fermiOffset(c) * 1e3;
        document.querySelectorAll('[data-out]').forEach(function (el) {
            var k = el.dataset.out;
            if (k === 'material') { el.textContent = L.name; el.style.color = window.CMP.cssVar(L.colorVar); }
            else if (k === 'dopant') el.textContent = L.dopant;
            else if (k === 'volt') el.textContent = p.volt.toFixed(1) + ' V';
            else if (k === 'temp') el.textContent = Math.round(p.temp) + ' K';
            else if (k === 'N') tex(el, D.fmtSci(Math.pow(10, p.logN)) + '\\,\\text{cm}^{-3}');
            else if (k === 'n') tex(el, D.fmtSci(c.n) + '\\,\\text{cm}^{-3}');
            else if (k === 'p') tex(el, D.fmtSci(c.p) + '\\,\\text{cm}^{-3}');
            else if (k === 'ef') el.textContent = (ef >= 0 ? '+' : '−') + Math.abs(ef).toFixed(0) + ' meV';
        });
        live();
    }

    // Called by the scene every frame; only touches text that changed.
    function live() {
        var l = D.live;
        var vals = {
            atoms: String(l.atoms), bonds: String(l.bonds), free: String(l.free), holes: String(l.holes),
            carrier: D.carrierLabel(l.free), cond: D.conductivity(l.free)
        };
        document.querySelectorAll('[data-live]').forEach(function (el) {
            var v = vals[el.dataset.live];
            if (el.textContent !== v) el.textContent = v;
        });
    }

    window.DOP.updateLive = function () { if (D) live(); };
    window.DOP.onRender(render);
})();
