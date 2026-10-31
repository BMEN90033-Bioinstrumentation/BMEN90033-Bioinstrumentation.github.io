// Fills every [data-out] readout value (status is written by audio.js).
(function () {
    function render() {
        var CI = window.CI, d = CI.data, p = CI.p, cfg = CI.config(), fmt = CI.formatFreq;
        var n = p.nch, c = Math.max(0, Math.min(n - 1, n - p.ch)), peak = 0, epk = 0;
        if (d.raw) for (var i = 0; i < d.raw.length; i++) peak = Math.max(peak, Math.abs(d.raw[i]));
        if (d.env[c]) for (i = 0; i < d.env[c].length; i++) epk = Math.max(epk, d.env[c][i]);
        var out = {
            dur: d.raw ? (d.raw.length / d.sr).toFixed(2) + ' s' : '–',
            sr: (d.sr / 1000).toFixed(1) + ' kHz',
            peak: peak.toFixed(2),
            elec: 'E' + p.ch + ' of ' + n,
            fc: fmt(cfg.freqs[c]),
            band: fmt(cfg.bands[c][0]) + ' – ' + fmt(cfg.bands[c][1]),
            epk: d.env[c] ? epk.toFixed(2) : '–'
        };
        document.querySelectorAll('[data-out]').forEach(function (el) {
            if (el.dataset.out in out) el.textContent = out[el.dataset.out];
        });
    }

    window.CI.onRender(render);
    window.addEventListener('cichange', render);
})();
