// Binds sliders [data-param], toggle buttons [data-param][data-value],
// action buttons [data-action] and the tissue-layer chips to the shared VC
// state. Controls for the same parameter in different sections stay in sync,
// and every change dispatches 'vcchange' with the changed key.
(function () {
    var fmt = {
        strength:   function (v) { return v.toFixed(1); },
        complexity: function (v) { return v.toFixed(2); },
        density:    function (v) { return String(v); },
        angle:      function (v) { return Math.round(v) + '°'; },
        lscale:     function (v) { var s = Math.pow(10, v); return '×' + (s < 10 ? s.toFixed(1) : Math.round(s)); }
    };

    function syncAngle() {
        var a = window.VC.p.angle;
        document.querySelectorAll('input[data-param="angle"]').forEach(function (el) { el.value = a; });
        document.querySelectorAll('.val[data-param="angle"]').forEach(function (el) { el.textContent = fmt.angle(a); });
    }

    function sync() {
        var VC = window.VC, p = VC.p;
        document.querySelectorAll('input[data-param]').forEach(function (el) { el.value = p[el.dataset.param]; });
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
        document.querySelectorAll('button[data-layer]').forEach(function (el) {
            el.classList.toggle('active', VC.layers[+el.dataset.layer].enabled);
        });
    }

    function emit(k) {
        sync();
        window.dispatchEvent(new CustomEvent('vcchange', { detail: { key: k } }));
    }

    function set(k, v) {
        var VC = window.VC, p = VC.p;
        p[k] = v;
        if (k === 'angle') p.mode = 'manual';
        if (k === 'mode') {
            if (VC.PRESETS[v]) VC.setLayers(VC.PRESETS[v]);
            VC.restart();
        }
        if (k === 'complexity') VC.clearHistory();
        emit(k);
    }

    var actions = {
        pause: function (VC) { VC.p.paused = !VC.p.paused; emit('paused'); },
        'preset-ecg': function () { set('mode', 'ecg'); },
        'preset-eeg': function () { set('mode', 'eeg'); },
        'all-on': function (VC) { VC.setLayers(true); emit('layers'); },
        'all-off': function (VC) { VC.setLayers([]); emit('layers'); },
        place: function () { emit('place'); },
        'reset-electrodes': function (VC) { VC.resetElectrodes(); emit('electrodes'); }
    };

    function buildChips() {
        document.querySelectorAll('.layer-chips').forEach(function (box) {
            window.VC.layers.forEach(function (l, i) {
                var b = document.createElement('button');
                b.className = 'seg-btn layer-btn';
                b.dataset.layer = i;
                b.innerHTML = '<span class="sw" style="background:var(--c-t-' + l.key + ')"></span>' +
                    l.name + ' <span class="sig"></span>';
                if (window.katex) window.katex.render('\\sigma = ' + l.sigma, b.querySelector('.sig'), { throwOnError: false });
                b.addEventListener('click', function () {
                    l.enabled = !l.enabled;
                    window.VC.layersChanged();
                    emit('layers');
                });
                box.appendChild(b);
            });
        });
    }

    function init() {
        buildChips();
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            el.addEventListener('input', function () { set(el.dataset.param, parseFloat(el.value)); });
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.addEventListener('click', function () { set(el.dataset.param, el.dataset.value); });
        });
        document.querySelectorAll('button[data-action]').forEach(function (el) {
            el.addEventListener('click', function () { actions[el.dataset.action](window.VC); });
        });
        sync();
        // The angle follows the dipole in the animated modes.
        var tb = document.querySelector('input[data-param="angle"]');
        if (tb) window.VC.addView(tb, syncAngle);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
