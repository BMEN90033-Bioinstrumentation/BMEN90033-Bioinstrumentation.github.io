// Binds every slider [data-param] and button [data-param][data-value] to the
// shared PN.p object. Sliders for the same parameter in different sections
// stay in sync, and every change dispatches 'pnchange'. A button with
// data-action="reset" sets the bias to zero and restarts junction formation.
(function () {
    var fmt = {
        bias: function (v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + ' V'; },
        logNA: conc,
        logND: conc
    };

    // 10^v as mantissa × power of ten in cm^-3, returned as HTML.
    function conc(v) {
        var s = Math.pow(10, v).toExponential(1).split('e+');
        return s[0] + '×10<sup>' + s[1] + '</sup> cm<sup>−3</sup>';
    }

    function sync() {
        var p = window.PN.p;
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.value = p[el.dataset.param];
        });
        document.querySelectorAll('.val[data-param]').forEach(function (el) {
            var k = el.dataset.param;
            el.innerHTML = fmt[k] ? fmt[k](p[k]) : p[k];   // formatter output only, no user text
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.classList.toggle('active', p[el.dataset.param] === el.dataset.value);
        });
    }

    function set(k, v) {
        window.PN.p[k] = v;
        window.dispatchEvent(new CustomEvent('pnchange', { detail: { key: k } }));
    }

    function init() {
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.addEventListener('input', function () { set(el.dataset.param, parseFloat(el.value)); });
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.addEventListener('click', function () { set(el.dataset.param, el.dataset.value); });
        });
        document.querySelectorAll('button[data-action="reset"]').forEach(function (el) {
            el.addEventListener('click', function () {
                window.PN.p.bias = 0;
                window.PN.p.run = 'play';
                set('reset', true);
            });
        });
        window.addEventListener('pnchange', sync);
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
