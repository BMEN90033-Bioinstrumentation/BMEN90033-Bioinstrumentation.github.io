// Total harmonic distortion model. A unit fundamental plus the 2nd to 5th
// harmonics, each with an amplitude relative to the fundamental. Presets and
// the THD expression are ported from the original page without change.
(function () {
    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'thdchange'. h2..h5 are harmonic amplitudes in % of the fundamental.
    var p = { f: 440, sel: '2', h2: 0, h3: 0, h4: 0, h5: 0, preset: 'clear' };

    // Illustrative harmonic profiles, % of the fundamental.
    var PRESETS = {
        A:     { 2: 2,   3: 1, 4: 0.5, 5: 0.2 },
        AB:    { 2: 0.5, 3: 3, 4: 0.2, 5: 1.5 },   // odd-dominated (push-pull symmetry): THD = 3.4 %
        B:     { 2: 3,   3: 8, 4: 1,   5: 4 },
        clear: { 2: 0,   3: 0, 4: 0,   5: 0 }
    };

    // Relative amplitude V_n / V_1 of harmonic n (n = 1 returns 1).
    function amp(n, q) { q = q || p; return n === 1 ? 1 : (q['h' + n] || 0) / 100; }

    // Combined waveform at phase th (radians of the fundamental).
    function combined(th, q) {
        var v = Math.sin(th);
        for (var n = 2; n <= 5; n++) v += amp(n, q) * Math.sin(n * th);
        return v;
    }

    // THD in %: root-sum-square of the harmonic amplitudes over the fundamental.
    function thd(q) {
        var s = 0;
        for (var n = 2; n <= 5; n++) s += amp(n, q) * amp(n, q);
        return Math.sqrt(s) * 100;
    }

    function ordinal(n) { return n + (n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }

    window.THD = {
        p: p, PRESETS: PRESETS, amp: amp, combined: combined, thd: thd, ordinal: ordinal,
        COL: { 1: '--c-fund', 2: '--c-h2', 3: '--c-h3', 4: '--c-h4', 5: '--c-h5' },
        CYCLES: 3,   // fundamental cycles shown in the time plots
        // Run fn now (after DOM ready) and on every parameter, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('thdchange', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };
})();
