// Binds the page controls to the shared EO state and dispatches 'eochange'
// with the changed key:
//   input[data-param]               sliders (density commits on release)
//   button[data-param][data-value]  segmented choices (element, plane)
//   button[data-toggle]             boolean switches
//   button[data-action]             excite, de-excite, reset, show all, isolate
//   .orb-chips.vis / .orb-chips.focus  per-orbital visibility and focus chips
(function () {
    var fmt = {
        opacity: function (v) { return v + '%'; },
        clipPos: function (v) { return (v / 100 * 30 - 15).toFixed(1); },
        density: function (v) { return (v / 1000) + 'k'; }
    };

    function chipHTML(key) {
        var d = window.EO.ORBITAL_DEFS[key], span = document.createElement('span');
        if (window.katex) window.katex.render(d.tex, span, { throwOnError: false });
        else span.textContent = d.tex;
        return '<span class="sw" style="background:var(--c-o-' + key + ')"></span>' + span.innerHTML;
    }

    function buildChips() {
        var p = window.EO.p;
        document.querySelectorAll('.orb-chips').forEach(function (box) {
            var vis = box.classList.contains('vis');
            box.innerHTML = '';
            p.config.forEach(function (o) {
                var b = document.createElement('button');
                b.className = 'seg-btn orb-btn';
                b.dataset.key = o.key;
                b.innerHTML = chipHTML(o.key);
                b.addEventListener('click', function () {
                    if (vis) {
                        if (p.visible.has(o.key)) p.visible.delete(o.key); else p.visible.add(o.key);
                        emit('visible');
                    } else {
                        p.focus = o.key;
                        emit('focus');
                    }
                });
                box.appendChild(b);
            });
        });
    }

    function sync() {
        var p = window.EO.p;
        document.querySelectorAll('input[data-param]').forEach(function (el) { el.value = p[el.dataset.param]; });
        document.querySelectorAll('.val[data-param]').forEach(function (el) {
            var k = el.dataset.param;
            el.textContent = fmt[k] ? fmt[k](p[k]) : p[k];
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.classList.toggle('active', p[el.dataset.param] === el.dataset.value);
        });
        document.querySelectorAll('button[data-toggle]').forEach(function (el) {
            el.classList.toggle('active', !!p[el.dataset.toggle]);
        });
        document.querySelectorAll('input[data-param="clipPos"]').forEach(function (el) { el.disabled = !p.clip; });
        document.querySelectorAll('.orb-chips.vis .orb-btn').forEach(function (b) {
            b.classList.toggle('active', p.visible.has(b.dataset.key));
        });
        document.querySelectorAll('.orb-chips.focus .orb-btn').forEach(function (b) {
            b.classList.toggle('active', p.focus === b.dataset.key);
        });
    }

    function emit(k) {
        if (k === 'config' || k === 'element') buildChips();
        sync();
        window.dispatchEvent(new CustomEvent('eochange', { detail: { key: k } }));
    }

    function setLevel(level) {
        var EO = window.EO, p = EO.p;
        p.level = level;
        EO.setConfig(EO.configFor(p.element, level));
        emit('config');
    }

    var actions = {
        excite: function (p) {
            if (p.level < window.EO.ELEMENTS[p.element].excitationSequence.length - 1) setLevel(p.level + 1);
        },
        deexcite: function (p) { if (p.level > 0) setLevel(p.level - 1); },
        reset: function () { setLevel(0); },
        'show-all': function (p) { p.visible = new Set(p.config.map(function (o) { return o.key; })); emit('visible'); },
        isolate: function (p) { p.visible = new Set([p.focus]); emit('visible'); }
    };

    function init() {
        var p = window.EO.p;
        buildChips();
        document.querySelectorAll('input[data-param]').forEach(function (el) {
            var k = el.dataset.param;
            el.addEventListener('input', function () {
                p[k] = parseFloat(el.value);
                if (k === 'density') sync();   // resampling waits for release
                else emit(k);
            });
            if (k === 'density') el.addEventListener('change', function () { emit('density'); });
        });
        document.querySelectorAll('button[data-param]').forEach(function (el) {
            el.addEventListener('click', function () {
                var k = el.dataset.param;
                p[k] = el.dataset.value;
                if (k === 'element') {
                    p.level = 0;
                    window.EO.setConfig(window.EO.configFor(p.element, 0));
                    emit('element');
                    return;
                }
                emit(k);
            });
        });
        document.querySelectorAll('button[data-toggle]').forEach(function (el) {
            el.addEventListener('click', function () { p[el.dataset.toggle] = !p[el.dataset.toggle]; emit(el.dataset.toggle); });
        });
        document.querySelectorAll('button[data-action]').forEach(function (el) {
            el.addEventListener('click', function () { actions[el.dataset.action](p); });
        });
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
