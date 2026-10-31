// Binds sliders [data-param], segment buttons [data-param][data-value],
// on/off buttons [data-toggle] and action buttons [data-action] to the shared
// MYE state. Sliders for the same parameter in different sections stay in
// sync; every change dispatches 'myechange'.
(function () {
    var fmt = {
        speed:   function (v) { return v.toFixed(1) + '×'; },
        myelin:  function (v) { return v.toFixed(1); },
        internode: function (v) { return String(v); },
        density: function (v) { return String(v); }
    };

    function sync() {
        var p = window.MYE.p;
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
        document.querySelectorAll('button[data-toggle]').forEach(function (el) {
            el.classList.toggle('active', p[el.dataset.toggle] === 'on');
        });
    }

    function changed(k) {
        sync();
        window.dispatchEvent(new CustomEvent('myechange', { detail: { key: k } }));
    }

    function init() {
        var A = window.MYE;
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.addEventListener('input', function () { A.p[el.dataset.param] = parseFloat(el.value); changed(el.dataset.param); });
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.addEventListener('click', function () { A.p[el.dataset.param] = el.dataset.value; changed(el.dataset.param); });
        });
        document.querySelectorAll('button[data-toggle]').forEach(function (el) {
            el.addEventListener('click', function () {
                var k = el.dataset.toggle;
                A.p[k] = A.p[k] === 'on' ? 'off' : 'on';
                changed(k);
            });
        });
        document.querySelectorAll('button[data-action]').forEach(function (el) {
            el.addEventListener('click', function () { A.actions[el.dataset.action](); changed(el.dataset.action); });
        });
        sync();
        window.addEventListener('myechange', sync);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
