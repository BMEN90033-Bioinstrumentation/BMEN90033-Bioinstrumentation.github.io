// Binds every slider [data-param], toggle button [data-param][data-value] and
// action button [data-action] to the shared ELI.p object. Controls for the
// same parameter in different sections stay in sync, and every change
// dispatches 'elichange' with the changed key.
(function () {
    var fmt = {
        speed: function (v) { return v.toFixed(1) + '×'; },
        ions:  function (v) { return String(v); },
        lj0:   function (v) { var j = Math.pow(10, v); return j >= 1000 ? (j / 1000).toFixed(1) + ' mA/cm²' : j.toFixed(0) + ' µA/cm²'; },
        lacl:  function (v) { var a = Math.pow(10, v); return a < 0.01 ? a.toFixed(4) : a.toFixed(3); }
    };

    function sync() {
        var p = window.ELI.p;
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
        document.querySelectorAll('button[data-action="pause"]').forEach(function (el) {
            el.textContent = p.paused ? 'play' : 'pause';
            el.classList.toggle('active', p.paused);
        });
    }

    function set(k, v) {
        window.ELI.p[k] = v;
        sync();
        window.dispatchEvent(new CustomEvent('elichange', { detail: { key: k } }));
    }

    function init() {
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.addEventListener('input', function () { set(el.dataset.param, parseFloat(el.value)); });
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.addEventListener('click', function () { set(el.dataset.param, el.dataset.value); });
        });
        document.querySelectorAll('button[data-action]').forEach(function (el) {
            el.addEventListener('click', function () {
                if (el.dataset.action === 'pause') { set('paused', !window.ELI.p.paused); return; }
                // Reset: resume, return to reduction, and let listeners respawn.
                window.ELI.p.paused = false;
                window.ELI.p.mode = 'reduce';
                set('reset', Date.now());
            });
        });
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
