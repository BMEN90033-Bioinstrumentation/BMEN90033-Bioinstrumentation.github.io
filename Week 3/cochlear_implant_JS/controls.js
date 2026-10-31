// Binds every slider [data-param] and button [data-param][data-value] to the
// shared CI.p object. Sliders for the same parameter in different sections
// stay in sync, and every change dispatches 'cichange'.
(function () {
    var fmtF = function (v) { return window.CI.formatFreq(v); };
    var fmt = {
        nch: String, fmin: fmtF, fmax: fmtF,
        cutoff: function (v) { return v + ' Hz'; },
        speed: function (v) { return v.toFixed(2) + '×'; },
        ch: function (v) { return 'E' + v; }
    };

    // Cochlear Nucleus 8 with ACE defaults: 22 electrodes, 188 to 7938 Hz,
    // 200 Hz envelope cutoff, noise carrier, log compression.
    var presets = {
        nucleus8: { nch: 22, fmin: 188, fmax: 7938, cutoff: 200, carrier: 'noise', compress: 'on' },
        default:  { nch: 8, fmin: 250, fmax: 8000, cutoff: 200, carrier: 'sine', compress: 'off' }
    };

    function sync() {
        var p = window.CI.p;
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            if (el.dataset.param === 'ch') el.max = p.nch;
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
        var p = window.CI.p;
        p[k] = v;
        // The lower band limit stays below the upper one (100 Hz gap).
        if (k === 'fmin' && p.fmin >= p.fmax) p.fmin = p.fmax - 100;
        if (k === 'fmax' && p.fmax <= p.fmin) p.fmax = p.fmin + 100;
        if (k === 'preset') Object.assign(p, presets[v]);
        p.ch = Math.min(p.ch, p.nch);
        sync();
        window.dispatchEvent(new CustomEvent('cichange', { detail: { key: k } }));
    }
    window.CI.set = set;

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
