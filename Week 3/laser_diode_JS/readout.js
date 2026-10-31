// Fills every [data-out] readout value from the present injection current.
(function () {
    function render() {
        var LD = window.LD, I = LD.p.I, b = LD.bands(2, I), on = LD.aboveThreshold(I);
        var out = {
            I: I.toFixed(0) + ' mA',
            regime: I <= 5 ? 'no injection' : on ? 'lasing' : 'spontaneous (LED)',
            split: b.qfl ? ((b.efc - b.efv) * LD.BANDGAP).toFixed(2) + ' eV' : '–',
            inv: b.qfl && b.inverted ? 'yes' : 'no',
            power: (LD.power(I) * 100).toFixed(0) + ' %',
            lam: LD.WAVELENGTH + ' nm'
        };
        document.querySelectorAll('[data-out]').forEach(function (el) {
            el.textContent = out[el.dataset.out];
            var k = el.dataset.out;
            el.classList.toggle('on', (k === 'regime' && on) || (k === 'inv' && out.inv === 'yes'));
        });
    }
    window.LD.onRender(render);
})();
