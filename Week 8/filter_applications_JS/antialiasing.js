// Section 02 · Anti-aliasing.
// Plots a continuous sinusoid, the samples taken at fs, and the
// ideal sinc-interpolated reconstruction. With the anti-aliasing
// filter off, frequencies above fs/2 fold down into the baseband
// and the reconstruction is a low-frequency alias. With the filter
// on (modelled as a brick wall at fs/2), those frequencies are
// removed before sampling and the reconstruction is flat.
(function () {
    var P = window.PlotHelpers;

    var selTime = '#plot-aa-time';
    var selSpec = '#plot-aa-spec';
    var sliderFsig = document.getElementById('aa-fsig-slider');
    var sliderFs   = document.getElementById('aa-fs-slider');
    var valFsig    = document.getElementById('aa-fsig-val');
    var valFs      = document.getElementById('aa-fs-val');
    var pillAAF    = document.getElementById('aa-aaf-toggle');

    var state = { fsig: 70, fs: 100, aaf: false };

    var dur = 0.20;
    var nDense = 800;

    function fmtHz(f) {
        if (f >= 100) return f.toFixed(0) + ' Hz';
        if (f >= 10)  return f.toFixed(1) + ' Hz';
        return f.toFixed(2) + ' Hz';
    }

    // sinc(x) with the normalised convention: sin(pi x) / (pi x), sinc(0)=1.
    function sinc(x) {
        if (Math.abs(x) < 1e-9) return 1;
        var px = Math.PI * x;
        return Math.sin(px) / px;
    }

    function aliasFreq(fsig, fs) {
        // fold into [0, fs/2]
        var f = fsig - Math.round(fsig / fs) * fs;
        return Math.abs(f);
    }

    function brickWallGain(fsig, cutoff) {
        return fsig < cutoff ? 1 : 0;
    }

    function renderTime() {
        var H = P.setupTimePlot({
            sel: selTime,
            xDomain: [0, dur],
            yDomain: [-1.35, 1.35],
            xTitle: 't \\, [\\mathrm{s}]',
            yTitle: '\\text{amplitude}',
            xTicks: [0, 0.04, 0.08, 0.12, 0.16, 0.20],
            yTicks: [-1.0, -0.5, 0, 0.5, 1.0],
            xTickFormat: function (d) { return d.toFixed(2); },
            margin: { top: 52, right: 28, bottom: 50, left: 76 }
        });

        var x = H.x, y = H.y;
        var fs = state.fs, fsig = state.fsig;
        var preGain = state.aaf ? brickWallGain(fsig, fs / 2) : 1;

        // ── Continuous input (faint) ──────────────────────────────
        var contPts = [];
        for (var i = 0; i < nDense; i++) {
            var ti = (i / (nDense - 1)) * dur;
            contPts.push({ t: ti, v: preGain * Math.sin(2 * Math.PI * fsig * ti) });
        }
        var contLine = d3.line()
            .x(function (d) { return x(d.t); })
            .y(function (d) { return y(d.v); });
        H.g.append('path').datum(contPts)
            .attr('class', 'trace clean faint')
            .attr('d', contLine);

        // ── Samples ───────────────────────────────────────────────
        var Ts = 1 / fs;
        var nSamples = Math.floor(dur / Ts) + 1;
        var samples = [];
        for (var n = 0; n < nSamples; n++) {
            var tn = n * Ts;
            samples.push({ t: tn, v: preGain * Math.sin(2 * Math.PI * fsig * tn) });
        }

        // sample stems
        H.g.append('g').selectAll('line.s').data(samples).join('line')
            .attr('class', 'sample-stem')
            .attr('x1', function (d) { return x(d.t); })
            .attr('x2', function (d) { return x(d.t); })
            .attr('y1', y(0))
            .attr('y2', function (d) { return y(d.v); });

        // ── Reconstruction (sinc interpolation through samples) ───
        var reconPts = [];
        for (var i2 = 0; i2 < nDense; i2++) {
            var ti2 = (i2 / (nDense - 1)) * dur;
            var v = 0;
            for (var k = 0; k < samples.length; k++) {
                v += samples[k].v * sinc((ti2 - samples[k].t) / Ts);
            }
            reconPts.push({ t: ti2, v: v });
        }
        var reconLine = d3.line()
            .x(function (d) { return x(d.t); })
            .y(function (d) { return y(Math.max(-1.35, Math.min(1.35, d.v))); });

        var fa = aliasFreq(fsig, fs);
        var actuallyAliased = !state.aaf && fsig > fs / 2;
        var reconClass = actuallyAliased
            ? 'trace aliased'
            : (state.aaf ? 'trace filtered' : 'trace clean');
        H.g.append('path').datum(reconPts)
            .attr('class', reconClass)
            .attr('d', reconLine);

        // sample dots on top
        H.g.append('g').selectAll('circle.s').data(samples).join('circle')
            .attr('class', 'sample-dot')
            .attr('cx', function (d) { return x(d.t); })
            .attr('cy', function (d) { return y(d.v); })
            .attr('r', 3.6);

        // ── Inline legend ─────────────────────────────────────────
        var captionText = state.aaf
            ? (preGain === 0
                ? '\\text{Filter on: input above } f_s/2 \\text{ removed before sampling}'
                : '\\text{Filter on: input below } f_s/2 \\text{ is transmitted}')
            : (Math.abs(fa - fsig) < 1e-3
                ? '\\text{Filter off: input below } f_s/2 \\text{, reconstruction matches input}'
                : '\\text{Filter off: input at ' + fmtHz(fsig) + ' aliases to ' + fmtHz(fa) + '}');
        // Caption in the top margin, below the panel label.
        window.renderKatex(H.svg, captionText,
            H.margin.left + H.innerW / 2, H.margin.top - 13,
            { width: H.innerW, height: 18, size: 13,
              color: actuallyAliased ? 'var(--c-aliased)'
                  : (state.aaf ? 'var(--c-filtered)' : 'var(--c-clean)') });
    }

    function renderSpec() {
        var fMax = 240;
        var H = P.setupMagPlot({
            sel: selSpec,
            xDomain: [0, fMax],
            yDomain: [0, 1.1],
            xTitle: 'f \\, [\\mathrm{Hz}]',
            yTitle: '|H(f)|',
            xTicks: [0, 50, 100, 150, 200],
            yTicks: [0, 0.5, 1.0],
            margin: { top: 88, right: 28, bottom: 50, left: 78 }
        });

        var x = H.x, y = H.y;
        var fs = state.fs;
        var nyq = fs / 2;

        // Pass band tint and stop band tint
        H.g.append('rect').attr('class', 'pass-band')
            .attr('x', 0).attr('y', 0)
            .attr('width', x(nyq)).attr('height', H.innerH);
        H.g.append('rect').attr('class', 'stop-band')
            .attr('x', x(nyq)).attr('y', 0)
            .attr('width', H.innerW - x(nyq)).attr('height', H.innerH);

        // Nyquist marker
        H.g.append('line')
            .attr('x1', x(nyq)).attr('x2', x(nyq))
            .attr('y1', 0).attr('y2', H.innerH)
            .attr('stroke', getColor('--c-mark'))
            .attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '5 4');
        var nyqLabelX = Math.min(Math.max(x(nyq), 30), H.innerW - 30);
        window.renderKatex(H.g, 'f_s/2', nyqLabelX, -50,
            { width: 60, height: 16, size: 13 });

        // AAF response (brick wall preview when on)
        if (state.aaf) {
            var pts = [
                { f: 0, m: 1 },
                { f: nyq * 0.999, m: 1 },
                { f: nyq * 1.001, m: 0 },
                { f: fMax, m: 0 }
            ];
            H.g.append('path').datum(pts)
                .attr('class', 'trace filtered')
                .attr('d', d3.line()
                    .x(function (d) { return x(d.f); })
                    .y(function (d) { return y(d.m); }));
        }

        // Input frequency component (vertical stem). labelDy shifts the
        // KaTeX label vertically so input and alias labels can be staggered
        // onto separate rows when their frequencies are close.
        function stem(freq, color, label, labelDx, labelDy) {
            if (freq < 0 || freq > fMax) return;
            var xc = x(freq);
            H.g.append('line')
                .attr('x1', xc).attr('x2', xc)
                .attr('y1', y(0)).attr('y2', y(1.0))
                .attr('stroke', color).attr('stroke-width', 2.2);
            H.g.append('circle')
                .attr('cx', xc).attr('cy', y(1.0)).attr('r', 4)
                .attr('fill', color);
            window.renderKatex(H.g, label, xc + (labelDx || 0), -13 + (labelDy || 0),
                { width: 90, height: 16, size: 13, color: color });
        }

        var fsig = state.fsig;
        var preGain = state.aaf ? brickWallGain(fsig, nyq) : 1;
        var aliasShown = !state.aaf && fsig > nyq;
        // Stem labels sit on the row directly above the frame. When both
        // stems are drawn close together the input label moves up one row.
        var fa = aliasFreq(fsig, state.fs);
        var inputDy = (aliasShown && Math.abs(x(fsig) - x(fa)) < 64) ? -18 : 0;
        if (preGain > 0) {
            stem(fsig, getColor('--c-clean'), '\\text{input}', 0, inputDy);
        } else {
            // input removed, draw a faded x at its location
            var xc = x(fsig);
            H.g.append('path')
                .attr('d', 'M' + (xc - 5) + ' ' + (y(0.5) - 5) + 'l10 10m0 -10l-10 10')
                .attr('fill', 'none').attr('stroke-width', 2)
                .attr('stroke', getColor('--c-stop'));
        }

        // Aliased component (only meaningful when AAF off and fsig > nyq)
        if (aliasShown) {
            stem(fa, getColor('--c-aliased'), '\\text{alias}', 0, 0);
            // arc from input to alias
            var xi = x(fsig), xj = x(fa);
            var yt = y(1.04);
            var midY = y(1.18);
            var arc = 'M ' + xi + ' ' + yt
                    + ' Q ' + ((xi + xj) / 2) + ' ' + midY + ' ' + xj + ' ' + yt;
            H.g.append('path').attr('d', arc)
                .attr('fill', 'none')
                .attr('stroke', getColor('--c-aliased'))
                .attr('stroke-width', 1.2)
                .attr('stroke-dasharray', '3 3')
                .attr('opacity', 0.7);
        }

        // Band labels share the top row with the f_s/2 label. The passband
        // label is omitted when the band is too narrow to hold it.
        function band(xc, label) {
            H.g.append('text')
                .attr('x', xc).attr('y', -46)
                .attr('text-anchor', 'middle')
                .text(label);
        }
        if (x(nyq) >= 120) band(x(nyq) / 2, 'passband');
        band(Math.max(x(nyq) + 70, x(nyq) + (H.innerW - x(nyq)) / 2), 'stopband');
    }

    function getColor(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    function renderAll() { renderTime(); renderSpec(); }

    function onSliderFsig() {
        state.fsig = parseFloat(sliderFsig.value);
        if (valFsig) valFsig.textContent = fmtHz(state.fsig);
        renderAll();
    }
    function onSliderFs() {
        state.fs = parseFloat(sliderFs.value);
        if (valFs) valFs.textContent = fmtHz(state.fs);
        renderAll();
    }

    function init() {
        if (sliderFsig) sliderFsig.addEventListener('input', onSliderFsig);
        if (sliderFs)   sliderFs.addEventListener('input', onSliderFs);
        if (sliderFsig) onSliderFsig();
        if (sliderFs)   onSliderFs();
        if (pillAAF) pillAAF.addEventListener('click', function () {
            state.aaf = !state.aaf;
            pillAAF.classList.toggle('active', state.aaf);
            pillAAF.textContent = state.aaf ? 'anti-alias filter on' : 'anti-alias filter off';
            renderAll();
        });
        renderAll();
        window.addEventListener('resize', renderAll);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
