// Binds every slider [data-param] and button [data-param][data-value] to the
// shared BJT.p object. Sliders for the same parameter in different sections
// stay in sync, and every change dispatches 'bjtchange'.
(function () {
    var fmt = {
        vcc:  function (v) { return v.toFixed(1) + ' V'; },
        vin:  function (v) { return v.toFixed(1) + ' V'; },
        rl:   function (v) { return window.BJT.fmtR(v); },
        rb:   function (v) { return window.BJT.fmtR(v); },
        hfe:  function (v) { return String(v); },
        freq: function (v) { return v.toFixed(1) + ' Hz'; }
    };

    function sync() {
        var p = window.BJT.p;
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
        window.BJT.p[k] = v;
        sync();
        window.dispatchEvent(new CustomEvent('bjtchange', { detail: { key: k } }));
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
