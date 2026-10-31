// Fills every [data-out] readout value. data-vparam on the readout row names
// the voltage that row reports against.
(function () {
    function render() {
        var L = window.LED, m = L.mat();
        document.querySelectorAll('.readout[data-vparam]').forEach(function (row) {
            var v = L.p[row.dataset.vparam], on = L.exceeded(v, m);
            var dz = L.deplFrac(1, v, m) / L.deplFrac(0, 0, m), b = L.bands(1, v, m);
            var out = {
                mat: m.name,
                v0: b.v0.toFixed(2) + ' V',
                vj: b.vj.toFixed(2) + ' V',
                split: (b.efn - b.efp).toFixed(2) + ' eV',
                vth: m.threshold.toFixed(1) + ' V',
                state: on ? 'conducting' : 'blocking',
                depl: (dz * 100).toFixed(0) + ' %',
                eg: m.bandgap.toFixed(2) + ' eV',
                lam: m.wavelength + ' nm',
                lamcalc: (L.HC / m.bandgap).toFixed(0) + ' nm',
                band: m.label,
                emit: on ? 'emitting' : 'no emission'
            };
            row.querySelectorAll('[data-out]').forEach(function (el) {
                el.textContent = out[el.dataset.out];
                el.classList.toggle('on', (el.dataset.out === 'state' || el.dataset.out === 'emit') && on);
            });
        });
    }
    window.LED.onRender(render);
})();
