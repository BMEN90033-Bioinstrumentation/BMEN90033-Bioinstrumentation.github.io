// Binds every slider [data-param], value label .val[data-param], toggle
// button [data-param][data-value] and preset button [data-preset] to the
// shared AMP.p object. Sliders marked data-log hold log10 of the value.
// Sliders for the same parameter in different sections stay in sync, and
// every change dispatches 'ampchange'.
(function () {
    var A = window.AMP;
    var fmt = {
        R: A.fmtR, C: A.fmtC, testFreq: A.fmtFreq, GBP: A.fmtFreq,
        Av: A.fmtAv
    };

    function sync() {
        var p = A.p;
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            var v = p[el.dataset.param];
            el.value = el.hasAttribute('data-log') ? Math.log10(v) : v;
        });
        document.querySelectorAll('.val[data-param]').forEach(function (el) {
            var k = el.dataset.param;
            el.textContent = fmt[k] ? fmt[k](p[k]) : p[k];
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.classList.toggle('active', p[el.dataset.param] === el.dataset.value);
        });
    }

    function changed(k) {
        window.dispatchEvent(new CustomEvent('ampchange', { detail: { key: k } }));
    }

    function init() {
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.addEventListener('input', function () {
                var v = parseFloat(el.value);
                A.p[el.dataset.param] = el.hasAttribute('data-log') ? Math.pow(10, v) : v;
                changed(el.dataset.param);
            });
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.addEventListener('click', function () {
                A.p[el.dataset.param] = el.dataset.value;
                changed(el.dataset.param);
            });
        });
        // Presets set R, C and A_v, then place the test frequency at w0.
        document.querySelectorAll('button[data-preset]').forEach(function (el) {
            el.addEventListener('click', function () {
                Object.assign(A.p, A.presets[el.dataset.preset]);
                A.p.testFreq = A.omega0();
                changed('preset');
            });
        });
        // Keep controls in step with changes made outside them.
        window.addEventListener('ampchange', sync);
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
