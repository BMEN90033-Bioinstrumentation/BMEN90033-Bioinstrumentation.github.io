// Binds every slider [data-param] and button [data-param][data-value] to the
// shared BANDS.p object. Sliders for the same parameter in different sections
// stay in sync, and every change dispatches 'bandschange'. A button with
// data-action="reset" restores the defaults.
(function () {
    var fmt = {
        temp: function (v) { return Math.round(v) + ' K'; }
    };

    function sync() {
        var p = window.BANDS.p;
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.value = p[el.dataset.param];
        });
        document.querySelectorAll('.val[data-param]').forEach(function (el) {
            var k = el.dataset.param;
            el.textContent = fmt[k] ? fmt[k](p[k]) : p[k];
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.classList.toggle('active', p[el.dataset.param] === el.dataset.value);
        });
    }

    function set(k, v) {
        window.BANDS.p[k] = v;
        sync();
        window.dispatchEvent(new CustomEvent('bandschange', { detail: { key: k } }));
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
                var d = window.BANDS.defaults;
                window.BANDS.p.temp = d.temp;
                set('run', d.run);
            });
        });
        window.addEventListener('bandschange', sync);
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
