// Binds every slider [data-param] and button [data-param][data-value] to the
// shared LED.p object. Sliders for the same parameter stay in sync, and every
// change dispatches 'ledchange'. As in the original simulator, selecting a
// material raises the emission voltage just above its threshold when it is
// below it.
(function () {
    var fmt = {
        vf: function (v) { return v.toFixed(2) + ' V'; },
        ve: function (v) { return v.toFixed(2) + ' V'; }
    };

    function sync() {
        var p = window.LED.p;
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
        var L = window.LED;
        L.p[k] = v;
        if (k === 'mat' && L.p.ve < L.mat().threshold) L.p.ve = L.mat().threshold + 0.3;
        sync();
        window.dispatchEvent(new CustomEvent('ledchange', { detail: { key: k } }));
    }

    function init() {
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.addEventListener('input', function () { set(el.dataset.param, parseFloat(el.value)); });
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.addEventListener('click', function () { set(el.dataset.param, el.dataset.value); });
        });
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
