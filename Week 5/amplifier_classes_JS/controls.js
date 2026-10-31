// Binds every slider [data-param] and button [data-param][data-value] to the
// shared AMP.p object. Sliders for the same parameter in different sections
// stay in sync, and every change dispatches 'ampchange'. The bias slider
// sets the class A Q-point and is disabled for B and AB, whose output devices
// idle at cutoff; the diode-drop slider applies to class AB only.
(function () {
    var fmt = {
        amp:   function (v) { return (v / 100).toFixed(2) + ' V'; },
        bias:  function (v) { return (v / 100 * window.AMP.MAX_IC).toFixed(1) + ' mA'; },
        speed: function (v) { return (v / 100).toFixed(2) + ' Hz'; },
        vd:    function (v) { return v.toFixed(2) + ' V'; }
    };

    function sync() {
        var p = window.AMP.p;
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.value = p[el.dataset.param];
            if (el.dataset.param === 'bias') el.disabled = p.cls !== 'A';
            if (el.dataset.param === 'vd') el.disabled = p.cls !== 'AB';
        });
        document.querySelectorAll('.val[data-param]').forEach(function (el) {
            var k = el.dataset.param;
            el.textContent = fmt[k] ? fmt[k](p[k]) : p[k];
        });
        document.querySelectorAll('.note[data-bias-note]').forEach(function (el) {
            el.textContent = p.cls === 'A' ? '' : 'class A only';
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.classList.toggle('active', p[el.dataset.param] === el.dataset.value);
        });
    }

    function set(k, v) {
        window.AMP.p[k] = v;
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
