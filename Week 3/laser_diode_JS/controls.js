// Binds every slider [data-param] to the shared LD.p object. Sliders for the
// same parameter in different sections stay in sync, and every change
// dispatches 'ldchange'.
(function () {
    var fmt = { I: function (v) { return v.toFixed(0) + ' mA'; } };

    function sync() {
        var p = window.LD.p;
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.value = p[el.dataset.param];
        });
        document.querySelectorAll('.val[data-param]').forEach(function (el) {
            var k = el.dataset.param;
            el.textContent = fmt[k] ? fmt[k](p[k]) : p[k];
        });
    }

    function set(k, v) {
        window.LD.p[k] = v;
        sync();
        window.dispatchEvent(new CustomEvent('ldchange', { detail: { key: k } }));
    }

    function init() {
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.addEventListener('input', function () { set(el.dataset.param, parseFloat(el.value)); });
        });
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
