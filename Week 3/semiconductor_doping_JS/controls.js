// Binds every slider [data-param] and button [data-param][data-value] to the
// shared DOP.p object. Sliders for the same parameter in different sections
// stay in sync, and every change dispatches 'dopchange'. A button with
// data-action="reset" restores voltage, temperature and dopant fraction,
// as the original Reset did.
(function () {
    var fmt = {
        size:   function (v) { return v + '×' + v + '×' + v; },
        dopant: function (v) { return Math.round(v) + ' %'; },
        volt:   function (v) { return v.toFixed(1) + ' V'; },
        temp:   function (v) { return Math.round(v) + ' K'; },
        logN:   function (v) { return Math.pow(10, v).toExponential(1).replace('e+', 'e') + ' cm⁻³'; }
    };

    function sync() {
        var p = window.DOP.p;
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
        window.DOP.p[k] = v;
        window.dispatchEvent(new CustomEvent('dopchange', { detail: { key: k } }));
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
                var d = window.DOP.defaults, p = window.DOP.p;
                p.volt = d.volt; p.temp = d.temp; p.dopant = d.dopant; p.run = d.run;
                set('reset', true);
            });
        });
        window.addEventListener('dopchange', sync);
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
