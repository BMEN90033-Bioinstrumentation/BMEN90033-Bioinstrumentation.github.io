// Section 01 · Low-pass filter as a smoother.
// Builds a noisy version of a slow biosignal, then runs a first-order
// low-pass at a user-chosen cutoff. Shows the noisy input, the filtered
// output, and the underlying clean signal on one time axis. A small
// magnitude-response panel below marks where the signal and the noise sit.
(function () {
    var S = window.Signals;
    var P = window.PlotHelpers;

    var selTime = '#plot-lpf-time';
    var selMag  = '#plot-lpf-mag';
    var slider  = document.getElementById('lpf-fc-slider');
    var valLab  = document.getElementById('lpf-fc-val');
    var pillTruth = document.getElementById('lpf-show-truth');
    var pillNoisy = document.getElementById('lpf-show-noisy');

    var state = { fc: 5, showTruth: true, showNoisy: true };

    // Pre-build the input signal once so the picture is stable.
    var fs = 500;
    var dur = 2.0;
    var N = Math.round(fs * dur);
    var t = S.timeAxis(N, fs);

    var clean = new Array(N);
    for (var i = 0; i < N; i++) {
        clean[i] = 0.6 * Math.sin(2 * Math.PI * 1.5 * t[i])
                 + 0.35 * Math.cos(2 * Math.PI * 0.6 * t[i]);
    }
    var noise = S.gaussianNoise(N, 0.18, 7);
    var hum   = S.sineWave(t, 50, 0.18);
    var noisy = S.addArrays(clean, noise, hum);

    function fmtFreq(f) {
        if (f >= 100) return f.toFixed(0) + ' Hz';
        if (f >= 10)  return f.toFixed(1) + ' Hz';
        return f.toFixed(2) + ' Hz';
    }

    function renderTime() {
        var H = P.setupTimePlot({
            sel: selTime,
            xDomain: [0, dur],
            yDomain: [-1.6, 1.6],
            xTitle: 't \\, [\\mathrm{s}]',
            yTitle: '\\text{amplitude}',
            xTicks: [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0],
            yTicks: [-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5],
            legend: [
                { color: getColor('--c-noisy'),    label: 'noisy input',     show: state.showNoisy },
                { color: getColor('--c-clean'),    label: 'clean reference', show: state.showTruth, dashed: true },
                { color: getColor('--c-filtered'), label: 'low-pass output' }
            ]
        });

        var x = H.x, y = H.y;
        var line = d3.line()
            .x(function (d, k) { return x(t[k]); })
            .y(function (d) { return y(Math.max(-1.6, Math.min(1.6, d))); });

        if (state.showNoisy) {
            H.g.append('path').datum(noisy)
                .attr('class', 'trace noisy').attr('d', line)
                .attr('stroke-width', 1.1).attr('opacity', 0.65);
        }
        if (state.showTruth) {
            H.g.append('path').datum(clean)
                .attr('class', 'trace clean faint').attr('d', line);
        }

        var filt = S.filtfiltLPF(noisy, state.fc, fs);
        H.g.append('path').datum(filt)
            .attr('class', 'trace filtered').attr('d', line);
    }

    function renderMag() {
        var fMax = 100;
        var H = P.setupMagPlot({
            sel: selMag,
            xDomain: [0, fMax],
            yDomain: [0, 1.05],
            xTitle: 'f \\, [\\mathrm{Hz}]',
            yTitle: '|H(f)|^2',
            xTicks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
            yTicks: [0, 0.25, 0.5, 0.707, 1.0],
            margin: { top: 80, right: 36, bottom: 50, left: 78 }
        });

        var x = H.x, y = H.y;

        // Magnitude curve
        var pts = [];
        for (var k = 0; k <= 400; k++) {
            var f = (k / 400) * fMax;
            pts.push({ f: f, m: Math.pow(S.magLPF(f, state.fc), 2) });  // forward-backward: |H|^2
        }
        var line = d3.line()
            .x(function (d) { return x(d.f); })
            .y(function (d) { return y(d.m); });
        H.g.append('path').datum(pts)
            .attr('class', 'trace filtered')
            .attr('d', line);

        // -6 dB horizontal marker (|H|^2 = 0.5 at f_c)
        H.g.append('line')
            .attr('class', 'marker-line')
            .attr('x1', 0).attr('x2', H.innerW)
            .attr('y1', y(0.5)).attr('y2', y(0.5))
            .attr('opacity', 0.5);

        // Vertical markers for signal energy (low) and noise (broadband)
        // Signal frequencies: 0.6 and 1.5 Hz
        // Hum frequency: 50 Hz
        function vmark(freq, label, cls) {
            if (freq < 0 || freq > fMax) return;
            var xc = x(freq);
            var color = cls === 'clean' ? getColor('--c-clean') : getColor('--c-noisy');
            H.g.append('line')
                .attr('x1', xc).attr('x2', xc)
                .attr('y1', 0).attr('y2', H.innerH)
                .attr('stroke', color)
                .attr('stroke-width', 1.2)
                .attr('stroke-dasharray', '3 3')
                .attr('opacity', 0.7);
            window.renderKatex(H.g, label, xc, -46,
                { width: 80, height: 16, size: 13, color: color });
        }
        vmark(1.5,  '1.5\\,\\mathrm{Hz}', 'clean');
        vmark(50,   '50\\,\\mathrm{Hz}',  'noisy');

        // Cutoff marker (drawn last so its label sits on a row of its own)
        var xc = x(state.fc);
        if (state.fc <= fMax) {
            H.g.append('line')
                .attr('class', 'marker-line')
                .attr('x1', xc).attr('x2', xc)
                .attr('y1', 0).attr('y2', H.innerH);
            var fcLabelX = Math.min(Math.max(xc, 24), H.innerW - 24);
            window.renderKatex(H.g, 'f_c', fcLabelX, -18,
                { width: 50, height: 16, size: 14, color: getColor('--c-mark') });
        }
    }

    function getColor(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    function renderAll() { renderTime(); renderMag(); }

    function onSlider() {
        var v = parseFloat(slider.value); // log10 scale
        state.fc = Math.pow(10, v);
        if (valLab) valLab.textContent = fmtFreq(state.fc);
        renderAll();
    }

    function init() {
        if (slider) {
            slider.addEventListener('input', onSlider);
            onSlider();
        } else {
            renderAll();
        }
        if (pillTruth) pillTruth.addEventListener('click', function () {
            state.showTruth = !state.showTruth;
            pillTruth.classList.toggle('active', state.showTruth);
            renderAll();
        });
        if (pillNoisy) pillNoisy.addEventListener('click', function () {
            state.showNoisy = !state.showNoisy;
            pillNoisy.classList.toggle('active', state.showNoisy);
            renderAll();
        });
        window.addEventListener('resize', renderAll);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
