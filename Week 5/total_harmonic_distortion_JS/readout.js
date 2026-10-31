// Fills every [data-out] readout and highlights the row of the THD reference
// table that contains the present THD.
(function () {
    function render() {
        var H = window.THD, p = H.p, n = +p.sel, thd = H.thd();
        var out = {
            f1: p.f + ' Hz', fn: (n * p.f) + ' Hz', T1: (1000 / p.f).toFixed(3) + ' ms',
            selname: H.ordinal(n) + ' harmonic',
            thd: thd.toFixed(2) + ' %'
        };
        for (var k = 2; k <= 5; k++) out['v' + k] = (H.amp(k) * 100).toFixed(1) + ' %';
        document.querySelectorAll('[data-out]').forEach(function (el) {
            if (el.dataset.out in out) el.textContent = out[el.dataset.out];
        });
        var bands = [0.1, 1, 5, 10, Infinity];
        var row = bands.findIndex(function (b) { return thd < b; });
        document.querySelectorAll('table.ref-table tbody tr').forEach(function (tr, i) {
            tr.classList.toggle('now', i === row);
        });
    }

    window.THD.onRender(render);
})();
