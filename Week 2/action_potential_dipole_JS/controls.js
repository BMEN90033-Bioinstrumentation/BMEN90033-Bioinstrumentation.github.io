// Binds sliders [data-param], toggle buttons [data-param][data-value] and
// action buttons [data-action] to the shared APD state. Sliders for the same
// parameter in different sections stay in sync; every change dispatches
// 'apdchange'.
(function () {
    var fmt = {
        speed:   function (v) { return v.toFixed(1) + '×'; },
        density: function (v) { return String(v); }
    };

    function sync() {
        var p = window.APD.p;
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

    function changed(k) {
        sync();
        window.dispatchEvent(new CustomEvent('apdchange', { detail: { key: k } }));
    }

    function init() {
        var A = window.APD;
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.addEventListener('input', function () { A.p[el.dataset.param] = parseFloat(el.value); changed(el.dataset.param); });
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.addEventListener('click', function () { A.p[el.dataset.param] = el.dataset.value; changed(el.dataset.param); });
        });
        document.querySelectorAll('button[data-action]').forEach(function (el) {
            el.addEventListener('click', function () { A.actions[el.dataset.action](); changed(el.dataset.action); });
        });
        sync();
        window.addEventListener('apdchange', sync);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
