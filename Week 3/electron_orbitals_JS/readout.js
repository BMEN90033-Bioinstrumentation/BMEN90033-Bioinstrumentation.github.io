// Fills every [data-out] readout from the present configuration and the
// focus orbital. Values with symbols are rendered with KaTeX.
(function () {
    function tex(el, s) {
        if (window.katex) window.katex.render(s, el, { throwOnError: false });
        else el.textContent = s;
    }

    function render() {
        var EO = window.EO, p = EO.p, el = EO.ELEMENTS[p.element];
        var d = EO.ORBITAL_DEFS[p.focus], Z = EO.zeffOf(p.focus), seq = el.excitationSequence;
        var out = {
            element: el.name + ' (Z = ' + el.Z + ')',
            state: p.level === 0 ? 'ground state' : 'excited: ' + seq[0] + ' → ' + seq[p.level],
            n: d.n, l: d.l, m: d.m,
            rnodes: d.n - d.l - 1, anodes: d.l,
            zeff: Z.toFixed(2),
            energy: (function () { var o = EO.orbitalEnergy(p.element, d.n, d.l, Z); return o.E.toFixed(o.src === 'measured' ? 2 : 1) + ' eV (' + o.src + ')'; })(),
            electrons: p.config.reduce(function (a, o) { return a + o.electrons; }, 0)
        };
        Object.keys(out).forEach(function (k) {
            document.querySelectorAll('[data-out="' + k + '"]').forEach(function (e) { e.textContent = out[k]; });
        });
        document.querySelectorAll('[data-out="config"]').forEach(function (e) { tex(e, EO.fmtConfig(p.config)); });
        document.querySelectorAll('[data-out="focus"]').forEach(function (e) { tex(e, d.tex); });
    }

    window.EO.onRender(render);
})();
