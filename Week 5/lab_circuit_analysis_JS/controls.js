// Binds every slider [data-param] and value label .val[data-param] to the
// shared LCA.p object; sliders marked data-log hold log10 of the value.
// Sliders for the same parameter in different sections stay in sync. A
// [data-reset] button restores the defaults. Every change dispatches
// 'lcachange'.
(function () {
    var L = window.LCA;
    var fmt = {
        cc1: L.fmtCap, cc2: L.fmtCap, ce: L.fmtCap, rl: L.fmtRes, rc: L.fmtRes,
        beta: function (v) { return String(Math.round(v)); }, f: L.fmtFreq
    };

    function sync() {
        var p = L.p;
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            var v = p[el.dataset.param];
            el.value = el.hasAttribute('data-log') ? Math.log10(v) : v;
        });
        document.querySelectorAll('.val[data-param]').forEach(function (el) {
            var k = el.dataset.param;
            el.textContent = fmt[k] ? fmt[k](p[k]) : p[k];
        });
    }

    function changed(k) {
        window.dispatchEvent(new CustomEvent('lcachange', { detail: { key: k } }));
    }

    function init() {
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.addEventListener('input', function () {
                var v = parseFloat(el.value);
                L.p[el.dataset.param] = el.hasAttribute('data-log') ? Math.pow(10, v) : v;
                changed(el.dataset.param);
            });
        });
        document.querySelectorAll('button[data-reset]').forEach(function (el) {
            el.addEventListener('click', function () {
                var f = L.p.f;
                Object.assign(L.p, L.DEFAULTS, { f: f });
                changed('reset');
            });
        });
        // Keep controls in step with changes made outside them.
        window.addEventListener('lcachange', sync);
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
