// Cochlear implant signal-processing model. The filter bank, rectifier,
// envelope detector, carriers, compression and Greenwood place map are
// ported from the original simulator without change to the equations.
// Added here: two synthetic test signals so the pipeline has an input
// before any microphone recording exists.
(function () {
    var SR = 44100;   // sample rate of recordings and test signals, Hz

    // Shared, page-wide parameters. controls.js writes these and dispatches
    // 'cichange'; processing and every plot read them.
    var p = {
        nch: 8, fmin: 250, fmax: 8000, cutoff: 200, speed: 1,
        carrier: 'sine', compress: 'off', preset: 'default',
        source: 'vowel', ch: 4   // ch: electrode number selected for playback
    };

    function formatFreq(hz) {
        if (hz >= 1000) return (hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 1) + ' kHz';
        return Math.round(hz) + ' Hz';
    }

    // N centre frequencies distributed logarithmically between min and max.
    function generateFreqs(n, minF, maxF) {
        var freqs = [], logMin = Math.log(minF), logMax = Math.log(maxF);
        for (var i = 0; i < n; i++) {
            var t = n === 1 ? 0.5 : i / (n - 1);
            freqs.push(Math.exp(logMin + t * (logMax - logMin)));
        }
        return freqs;
    }

    // Band edges: each band spans from the geometric mean with the channel
    // below to the geometric mean with the channel above.
    function bandEdges(freqs, minF, maxF, sr) {
        var n = freqs.length, bands = [];
        for (var i = 0; i < n; i++) {
            var lo, hi;
            if (n === 1) { lo = minF; hi = maxF; }
            else {
                lo = i === 0 ? minF * 0.8 : Math.sqrt(freqs[i - 1] * freqs[i]);
                hi = i === n - 1 ? Math.min(maxF * 1.2, sr / 2 - 1) : Math.sqrt(freqs[i] * freqs[i + 1]);
            }
            bands.push([lo, hi]);
        }
        return bands;
    }

    // Channel hue runs over 0..300 degrees, apical (low f) to basal (high f).
    // Saturation and lightness come from the page CSS so both themes read.
    function channelColor(i, n) {
        var css = window.CMP.cssVar;
        return 'hsl(' + ((i / n) * 300).toFixed(1) + ', ' + css('--ch-sat') + ', ' + css('--ch-light') + ')';
    }

    // Greenwood (1990) place map for the human cochlea: f = A (10^{a x} - k),
    // x the fractional distance from the apex. t is the position along the
    // 3D spiral, 0 at the base.
    var GW_A = 165.4, GW_a = 2.1, GW_k = 0.88;
    function greenwoodX(f) { return Math.log10((f / GW_A) + GW_k) / GW_a; }
    function greenwoodF(x) { return GW_A * (Math.pow(10, GW_a * x) - GW_k); }
    function freqToT(f) {
        var x = greenwoodX(f);
        var xClamped = Math.max(0, Math.min(1, x));
        return 0.03 + (1 - xClamped) * 0.92;
    }

    // ── Biquad sections (RBJ cookbook, Q = 0.707) ──
    function lpCoef(fc, sr) {
        var w0 = 2 * Math.PI * fc / sr, alpha = Math.sin(w0) / (2 * 0.707), c = Math.cos(w0);
        return { b0: (1 - c) / 2, b1: 1 - c, b2: (1 - c) / 2, a0: 1 + alpha, a1: -2 * c, a2: 1 - alpha };
    }
    function hpCoef(fc, sr) {
        var w0 = 2 * Math.PI * fc / sr, alpha = Math.sin(w0) / (2 * 0.707), c = Math.cos(w0);
        return { b0: (1 + c) / 2, b1: -(1 + c), b2: (1 + c) / 2, a0: 1 + alpha, a1: -2 * c, a2: 1 - alpha };
    }
    function runBiquad(input, k) {
        var len = input.length, out = new Float32Array(len);
        var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (var i = 0; i < len; i++) {
            var x0 = input[i];
            out[i] = (k.b0 * x0 + k.b1 * x1 + k.b2 * x2 - k.a1 * y1 - k.a2 * y2) / k.a0;
            x2 = x1; x1 = x0;
            y2 = y1; y1 = out[i];
        }
        return out;
    }
    function biquadLowpass(input, fc, sr) { return runBiquad(input, lpCoef(fc, sr)); }
    function biquadHighpass(input, fc, sr) { return runBiquad(input, hpCoef(fc, sr)); }
    // Bandpass: highpass at fLow chained with lowpass at fHigh.
    function biquadBandpass(input, fLow, fHigh, sr) {
        return biquadLowpass(biquadHighpass(input, fLow, sr), fHigh, sr);
    }
    // |H(e^{jw})| of one section at frequency f, used by the filter-bank plot.
    function biquadMag(k, f, sr) {
        var w = 2 * Math.PI * f / sr, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
        var nr = k.b0 + k.b1 * c1 + k.b2 * c2, ni = -(k.b1 * s1 + k.b2 * s2);
        var dr = k.a0 + k.a1 * c1 + k.a2 * c2, di = -(k.a1 * s1 + k.a2 * s2);
        return Math.sqrt((nr * nr + ni * ni) / (dr * dr + di * di));
    }

    // μ-law compression of a normalised envelope value.
    var MU = 255;
    function compress(a) { return Math.log(1 + MU * a) / Math.log(1 + MU); }

    // ── Synthetic test signals ──
    // Sweep: logarithmic chirp, 150 Hz to 8 kHz over 3 s.
    // Vowel: harmonic complex, f0 = 125 Hz, harmonics weighted by three
    // formant resonances (730, 1090, 2440 Hz), with a 2.5 Hz syllabic envelope
    // that peaks at the middle of the 2 s signal.
    function testSignal(kind) {
        var dur = kind === 'sweep' ? 3 : 2, n = Math.round(dur * SR), x = new Float32Array(n);
        if (kind === 'sweep') {
            var f0 = 150, f1 = 8000, K = Math.log(f1 / f0) / dur;
            for (var i = 0; i < n; i++) {
                var t = i / SR, ph = 2 * Math.PI * f0 * (Math.exp(K * t) - 1) / K;
                var ramp = Math.min(1, t / 0.05, (dur - t) / 0.05);
                x[i] = 0.6 * ramp * Math.sin(ph);
            }
        } else {
            var F = [[730, 90, 1], [1090, 110, 0.5], [2440, 160, 0.25]], amps = [];
            for (var h = 1; h * 125 < 5000; h++) {
                var fh = h * 125, w = 0;
                F.forEach(function (q) { w += q[2] / (1 + Math.pow((fh - q[0]) / q[1], 2)); });
                amps.push(w);
            }
            var peak = 0;
            for (var j = 0; j < n; j++) {
                var tt = j / SR, s = 0;
                for (var k = 0; k < amps.length; k++) s += amps[k] * Math.sin(2 * Math.PI * 125 * (k + 1) * tt);
                x[j] = s * 0.5 * (1 - Math.cos(2 * Math.PI * 2.5 * tt));
                if (Math.abs(x[j]) > peak) peak = Math.abs(x[j]);
            }
            for (var m = 0; m < n; m++) x[m] *= 0.6 / peak;
        }
        return x;
    }

    // Processed data shared by all figures.
    var data = { sr: SR, raw: null, recorded: null, bp: [], rect: [], env: [], voc: [] };

    // Channel configuration derived from p.
    function config() {
        var freqs = generateFreqs(p.nch, p.fmin, p.fmax);
        var colors = freqs.map(function (_, i) { return channelColor(i, p.nch); });
        return { freqs: freqs, colors: colors, labels: freqs.map(formatFreq), bands: bandEdges(freqs, p.fmin, p.fmax, data.sr) };
    }

    // Full pipeline, ported from processAudio(): bandpass, full-wave
    // rectification, envelope lowpass, global normalisation, vocoded carrier.
    function processAudio() {
        var raw = data.raw;
        if (!raw) return;
        var len = raw.length, sr = data.sr, cutoff = p.cutoff, n = p.nch;
        var cfg = config(), bands = cfg.bands, freqs = cfg.freqs;
        var useFineStructure = p.carrier === 'fs', useNoiseCarrier = p.carrier === 'noise';
        var useCompression = p.compress === 'on';
        var bpAll = [], rectAll = [], envAll = [], vocAll = [];

        for (var ch = 0; ch < n; ch++) {
            var bp = biquadBandpass(raw, bands[ch][0], bands[ch][1], sr);
            var rect = new Float32Array(len);
            for (var i = 0; i < len; i++) rect[i] = Math.abs(bp[i]);
            bpAll.push(bp); rectAll.push(rect);
            envAll.push(biquadLowpass(rect, cutoff, sr));
        }

        var globalMax = 0;
        envAll.forEach(function (e) { for (var i = 0; i < e.length; i++) if (e[i] > globalMax) globalMax = e[i]; });
        if (globalMax > 0) envAll.forEach(function (e) { for (var i = 0; i < e.length; i++) e[i] /= globalMax; });

        // Carriers: sine at the channel centre frequency; band-limited noise
        // normalised to unit RMS; or sign(bp), a unit-amplitude carrier that
        // keeps the zero-crossing timing of the band signal.
        for (ch = 0; ch < n; ch++) {
            var voc = new Float32Array(len), env = envAll[ch], bpc = bpAll[ch], fsBuf, noiseBuf;
            if (useFineStructure) {
                fsBuf = new Float32Array(len);
                for (i = 0; i < len; i++) {
                    var inst = rectAll[ch][i];
                    fsBuf[i] = inst > 1e-6 ? bpc[i] / inst : 0;
                }
            }
            if (useNoiseCarrier) {
                var white = new Float32Array(len);
                for (i = 0; i < len; i++) white[i] = Math.random() * 2 - 1;
                noiseBuf = biquadBandpass(white, bands[ch][0], bands[ch][1], sr);
                var rms = 0;
                for (i = 0; i < len; i++) rms += noiseBuf[i] * noiseBuf[i];
                rms = Math.sqrt(rms / len);
                if (rms > 0) for (i = 0; i < len; i++) noiseBuf[i] /= rms;
            }
            for (i = 0; i < len; i++) {
                var amplitude = useCompression ? compress(env[i]) : env[i];
                var carrier = useFineStructure ? fsBuf[i] : useNoiseCarrier ? noiseBuf[i]
                    : Math.sin(2 * Math.PI * freqs[ch] * i / sr);
                voc[i] = carrier * amplitude;
            }
            vocAll.push(voc);
        }
        data.bp = bpAll; data.rect = rectAll; data.env = envAll; data.voc = vocAll;
    }

    // Select the input for p.source and run the pipeline.
    function loadSource() {
        if (p.source === 'mic' && data.recorded) { data.raw = data.recorded.samples; data.sr = data.recorded.sr; }
        else { data.raw = testSignal(p.source === 'mic' ? 'sweep' : p.source); data.sr = SR; }
    }

    // Playback state written by audio.js each frame: position in seconds of
    // signal time, and the stimulation level of each channel (0..1).
    var play = { active: false, pos: 0, amps: new Float32Array(500), status: 'idle' };

    // Reprocess after a parameter change, debounced so slider drags with
    // many channels do not queue full passes. Fires 'ciprocessed'.
    var timer = 0;
    function reprocess(reload) {
        clearTimeout(timer);
        timer = setTimeout(function () {
            if (reload || !data.raw) loadSource();
            processAudio();
            window.dispatchEvent(new CustomEvent('ciprocessed'));
        }, 60);
    }
    window.addEventListener('cichange', function (e) {
        var k = e.detail && e.detail.key;
        if (k === 'speed' || k === 'ch') return;
        reprocess(k === 'source');
    });

    window.CI = {
        SR: SR, MU: MU, GW_A: GW_A, GW_a: GW_a, GW_k: GW_k,
        p: p, data: data, play: play,
        config: config, formatFreq: formatFreq, freqToT: freqToT, greenwoodX: greenwoodX, greenwoodF: greenwoodF,
        lpCoef: lpCoef, hpCoef: hpCoef, biquadMag: biquadMag, compress: compress,
        reprocess: reprocess,
        // Run fn now (after DOM ready) and on every processing, theme or size change.
        onRender: function (fn) {
            function go() {
                fn();
                window.addEventListener('ciprocessed', fn);
                window.addEventListener('themechange', fn);
                window.addEventListener('resize', fn);
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
            else go();
        }
    };

    function init() { reprocess(true); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
