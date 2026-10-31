// Fills every [data-out] readout. Parameter-dependent values update on
// render; instantaneous values (comparator inputs, device states) update on
// every animation tick.
(function () {
    function set(k, v, cls) {
        document.querySelectorAll('[data-out="' + k + '"]').forEach(function (el) {
            if (el.textContent !== v) el.textContent = v;
            if (cls !== undefined) { el.classList.toggle('hi', cls === 'hi'); el.classList.toggle('lo', cls === 'lo'); }
        });
    }

    function render() {
        var C = window.CLD, p = C.p, m = p.amp / 100, pw = C.power();
        set('m', m.toFixed(2));
        set('dmax', (C.duty(m) * 100).toFixed(0) + ' %');
        set('dmin', (C.duty(-m) * 100).toFixed(0) + ' %');
        set('ratio', p.ratio + '×');
        set('ripple', (8 / (p.ratio * p.ratio) * C.VCC / 2).toFixed(3) + ' V');
        set('pdc', pw.dc.toFixed(2) + ' mW');
        set('pl', pw.signal.toFixed(2) + ' mW');
        set('pd', pw.heat.toFixed(2) + ' mW');
        set('eta', pw.eff.toFixed(0) + ' % (assumed)');
        set('vpk', pw.voutPeak.toFixed(2) + ' V');
        tick();
    }

    function tick() {
        var C = window.CLD, th = C.clock.th, vin = C.inputSignal(th), vc = C.triangleCarrier(th);
        var hi = C.pwmSignal(th) === 1, s = hi ? 'hi' : 'lo';
        set('vin', vin.toFixed(2));
        set('vc', vc.toFixed(2));
        set('cmp', hi ? 'v_in > v_c: HIGH' : 'v_in < v_c: LOW', s);
        set('duty', (C.duty(vin) * 100).toFixed(0) + ' %');
        set('pmos', hi ? 'ON' : 'OFF', hi ? 'hi' : '');
        set('nmos', hi ? 'OFF' : 'ON', hi ? '' : 'lo');
        set('vsw', (hi ? C.VCC : 0) + ' V', s);
        set('lcstate', hi ? 'PWM high: L and C charge' : 'PWM low: L releases stored energy', s);
    }

    window.CLD.onRender(render);
    window.CLD.onTick(tick);
})();
