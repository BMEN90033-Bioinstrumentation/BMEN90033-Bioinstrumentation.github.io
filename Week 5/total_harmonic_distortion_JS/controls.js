// Binds every slider [data-param] and button [data-param][data-value] to the
// shared THD.p object and dispatches 'thdchange' on each change. A preset
// button loads its harmonic profile into h2..h5; moving a harmonic slider
// clears the preset highlight.
(function () {
    var fmt = {
        f:  function (v) { return v + ' Hz'; },
        h2: pct, h3: pct, h4: pct, h5: pct
    };
    function pct(v) { return v + ' %'; }

    function sync() {
        var p = window.THD.p;
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
        var p = window.THD.p;
        p[k] = v;
        if (k === 'preset') {
            var pr = window.THD.PRESETS[v];
            for (var n = 2; n <= 5; n++) p['h' + n] = pr[n];
        } else if (/^h\d$/.test(k)) {
            p.preset = '';
        }
        sync();
        window.dispatchEvent(new CustomEvent('thdchange', { detail: { key: k } }));
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
