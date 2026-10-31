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

    function mw(w) { return w >= 1 ? w.toFixed(2) + ' W' : (w * 1000).toFixed(w < 0.01 ? 2 : 1) + ' mW'; }

    function render() {
        var C = window.CLD, p = C.p, m = p.amp / 100, pw = C.power(), fsw = p.ratio * C.F_SIG;
        var h = C.Hmag(fsw);
        set('m', m.toFixed(2));
        set('dmax', (C.duty(m) * 100).toFixed(0) + ' %');
        set('dmin', (C.duty(-m) * 100).toFixed(0) + ' %');
        set('ratio', p.ratio + '× (' + (fsw / 1000).toFixed(0) + ' kHz)');
        set('hsw', (20 * Math.log10(h)).toFixed(1) + ' dB');
        // Peak of the switching-frequency component at the filter output for
        // D = 0.5: square-wave fundamental 2 V_CC / pi times |H(f_sw)|.
        set('ripple', (2 * C.VCC / Math.PI * h).toFixed(3) + ' V');
        set('pdc', mw(pw.dc));
        set('pl', mw(pw.signal));
        set('ploss', mw(pw.dc - pw.signal));
        set('eta', pw.eff.toFixed(1) + ' %');
        set('vpk', pw.voutPeak.toFixed(2) + ' V');
        set('irms', (pw.iRms * 1000).toFixed(0) + ' mA');
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
