// Section 01 readout: instantaneous electrode potentials, updated per frame.
(function () {
    function sgn(v) { return (v >= 0 ? '+' : '') + v.toFixed(3); }
    var els;
    window.APD.onTick(function () {
        els = els || document.querySelectorAll('[data-out]');
        var s = window.APD.state(window.APD.s.wf);
        var out = { va: sgn(s.va), vb: sgn(s.vb), diff: sgn(s.diff) };
        els.forEach(function (el) { el.textContent = out[el.dataset.out]; });
    }, document.getElementById('apd-readout'));
})();
