// Fills every [data-out] readout value from the present operating point.
(function () {
    function amps(a) {
        if (a <= 0) return '0 mA';
        if (a < 1e-3) return (a * 1e6).toFixed(1) + ' µA';
        return (a * 1e3).toFixed(2) + ' mA';
    }

    function render() {
        var B = window.BJT, s = B.compute(B.p.vin);
        var out = {
            region: s.region,
            ib: amps(s.ib), ic: amps(s.ic), ie: amps(s.ie),
            vce: s.vce.toFixed(2) + ' V',
            hfef: s.region === 'saturation' ? s.hfeForced.toFixed(1) : '–',
            pd: B.fmtP(s.pd),
            tj: s.tj.toFixed(0) + ' °C'
        };
        document.querySelectorAll('.k[data-vk]').forEach(function (el) {
            if (window.katex) window.katex.render(B.p.type === 'NPN' ? 'V_{CE}' : 'V_{EC}', el);
        });
        document.querySelectorAll('[data-out]').forEach(function (el) {
            el.textContent = out[el.dataset.out];
            if (el.dataset.out === 'tj') el.classList.toggle('warn', s.tj > 150);
        });
    }

    window.BJT.onRender(render);
})();
