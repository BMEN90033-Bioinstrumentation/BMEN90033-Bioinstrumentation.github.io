// Fills every [data-out] value: DC bias and small-signal values on each
// parameter change, instantaneous values on each animation frame.
(function () {
    function set(k, v) {
        document.querySelectorAll('[data-out="' + k + '"]').forEach(function (el) { el.textContent = v; });
    }

    function dc() {
        var A = window.AMP, b = A.computeDCBias(), ss = A.computeSmallSignal(b);
        set('region', b.region);
        set('ibq', A.fmtmA(b.ibq));
        set('icq', A.fmtmA(b.icq));
        set('vceq', A.fmtV(b.vceq));
        var active = b.region === 'active' && isFinite(ss.av);
        set('av', active ? ss.av.toFixed(1) : '–');
        set('avdb', active ? (20 * Math.log10(Math.max(Math.abs(ss.av), 1e-10))).toFixed(1) + ' dB' : '–');
        set('gm', b.icq > 0 ? (ss.gm * 1e3).toFixed(1) + ' mS' : '–');
        set('rpi', b.icq > 0 ? A.fmtR(Math.round(ss.zin)) : '–');
        set('avi', b.icq > 0 && b.region === 'active' ? ss.av_intrinsic.toFixed(0) : '–');
        set('bforced', b.region === 'saturation' && b.ibq > 0 ? (b.icq / b.ibq).toFixed(1) : '–');
        set('frac', b.icq > 0 ? ss.vbe_fraction.toFixed(3) : '–');
        tick();
    }

    function tick() {
        var A = window.AMP, op = A.operatingPoint(A.p.vbb + A.vinNow());
        set('ib', A.fmtmA(op.ib));
        set('ic', A.fmtmA(op.ic));
        set('vce', A.fmtV(op.vce));
        set('vbe', A.fmtV(op.vbe));
    }

    window.AMP.onRender(dc);
    window.addEventListener('amptick', tick);
})();
