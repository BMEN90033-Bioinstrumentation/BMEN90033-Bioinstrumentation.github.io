// Binds sliders [data-param], toggle buttons [data-param][data-value] and
// action buttons [data-action] to the shared BIO state. Sliders for the same
// parameter in different sections stay in sync; every change dispatches
// 'biochange'.
(function () {
    var fmt = {
        stim: function (v) { return v.toFixed(0) + ' µA/cm²'; }
    };

    function sync() {
        var p = window.BIO.p;
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
        window.dispatchEvent(new CustomEvent('biochange', { detail: { key: k } }));
    }

    function init() {
        var A = window.BIO;
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.addEventListener('input', function () { A.p[el.dataset.param] = parseFloat(el.value); changed(el.dataset.param); });
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.addEventListener('click', function () { A.p[el.dataset.param] = el.dataset.value; changed(el.dataset.param); });
        });
        document.querySelectorAll('button[data-action]').forEach(function (el) {
            el.addEventListener('click', function () { A.actions[el.dataset.action](); });
        });
        sync();
        window.addEventListener('biochange', sync);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
