// Binds every slider [data-param] and button [data-param][data-value] to the
// shared AMP.p object. Sliders for the same parameter in different sections
// stay in sync, and every change dispatches 'ampchange'. Selecting a class
// resets the bias as the original page did (A: centre of the load line,
// B: cutoff, AB: just above cutoff); the bias slider is disabled for B and AB.
(function () {
    var fmt = {
        amp:   function (v) { return (v / 100).toFixed(2) + ' V'; },
        bias:  function (v) { return (v / 100 * window.AMP.MAX_IC).toFixed(1) + ' mA'; },
        speed: function (v) { return (v / 100).toFixed(2) + ' Hz'; }
    };
    var BIAS = { A: 50, B: 0, AB: 5 };

    function sync() {
        var p = window.AMP.p;
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.value = p[el.dataset.param];
            if (el.dataset.param === 'bias') el.disabled = p.cls !== 'A';
        });
        document.querySelectorAll('.val[data-param]').forEach(function (el) {
            var k = el.dataset.param;
            el.textContent = fmt[k] ? fmt[k](p[k]) : p[k];
        });
        document.querySelectorAll('.note[data-bias-note]').forEach(function (el) {
            el.textContent = p.cls === 'B' ? 'fixed at cutoff' : p.cls === 'AB' ? 'fixed near cutoff' : '';
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.classList.toggle('active', p[el.dataset.param] === el.dataset.value);
        });
    }

    function set(k, v) {
        window.AMP.p[k] = v;
        if (k === 'cls') window.AMP.p.bias = BIAS[v];
        sync();
        window.dispatchEvent(new CustomEvent('ampchange', { detail: { key: k } }));
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
