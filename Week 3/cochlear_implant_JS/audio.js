// Microphone recording (hold to record, 5 s limit), playback of the input,
// of one vocoded channel, or of the sum of all vocoded channels. While
// playing, a frame loop writes CI.play.pos and CI.play.amps (each channel's
// envelope at the present position) and dispatches 'citick'.
(function () {
    var CI = window.CI, play = CI.play;
    var ctx = null, stream = null, analyser = null, recorder = null, chunks = [];
    var recording = false, recStart = 0, autoStop = 0, liveRaf = 0;
    var node = null, raf = 0, mode = null;

    function q(sel) { return document.querySelectorAll(sel); }
    function audioCtx() { ctx = ctx || new AudioContext({ sampleRate: CI.SR }); return ctx; }

    function setStatus(s) {
        play.status = s;
        q('[data-out="status"]').forEach(function (el) { el.textContent = s; });
    }
    function labelButtons() {
        q('button[data-action^="play"]').forEach(function (b) {
            var on = mode === b.dataset.action;
            b.classList.toggle('active', on);
            b.textContent = on ? 'stop' : b.dataset.label;
        });
    }

    // ── Playback ──
    function stop() {
        if (node) { try { node.stop(); } catch (e) { /* already stopped */ } node.disconnect(); node = null; }
        cancelAnimationFrame(raf); raf = 0;
        mode = null; play.active = false; play.amps.fill(0);
        setStatus('idle'); labelButtons();
        window.dispatchEvent(new CustomEvent('citick'));
    }

    function start(m) {
        var d = CI.data;
        if (!d.raw || !d.env.length) return;
        if (mode === m) { stop(); return; }
        stop();
        var buf, channels, n = CI.p.nch;
        if (m === 'play-orig') { buf = d.raw; channels = null; }
        else if (m === 'play-ch') { var c = n - CI.p.ch; buf = d.voc[c]; channels = [c]; }
        else {
            // Sum of all vocoded channels, scaled to a peak of 0.9.
            var len = d.voc[0].length, sum = new Float32Array(len), peak = 0;
            d.voc.forEach(function (v) { for (var i = 0; i < len; i++) sum[i] += v[i]; });
            for (var i = 0; i < len; i++) peak = Math.max(peak, Math.abs(sum[i]));
            if (peak > 0) for (i = 0; i < len; i++) sum[i] *= 0.9 / peak;
            buf = sum; channels = null;
        }
        var ac = audioCtx();
        if (ac.state === 'suspended') ac.resume();
        var ab = ac.createBuffer(1, buf.length, d.sr);
        ab.getChannelData(0).set(buf);
        node = ac.createBufferSource();
        node.buffer = ab;
        var speed = CI.p.speed;
        node.playbackRate.value = speed;
        node.connect(ac.destination);
        node.onended = function () { if (mode === m) stop(); };
        node.start();

        mode = m; play.active = true; setStatus('stimulating'); labelButtons();
        var dur = buf.length / d.sr, t0 = performance.now();
        function tick() {
            var el = (performance.now() - t0) / 1000 * speed;
            if (el >= dur) { stop(); return; }
            play.pos = el;
            var idx = Math.floor(el / dur * d.env[0].length);
            for (var c = 0; c < n; c++) {
                var on = !channels || channels.indexOf(c) >= 0;
                play.amps[c] = on ? d.env[c][Math.min(idx, d.env[c].length - 1)] : 0;
            }
            window.dispatchEvent(new CustomEvent('citick'));
            raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
    }

    // ── Microphone ──
    async function micAccess(btn) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            var ac = audioCtx();
            analyser = ac.createAnalyser();
            analyser.fftSize = 2048;
            ac.createMediaStreamSource(stream).connect(analyser);
            btn.style.display = 'none';
            q('button[data-action="record"]').forEach(function (b) { b.disabled = false; });
        } catch (err) {
            btn.textContent = 'microphone denied: retry';
        }
    }

    function startRecording(btn) {
        if (!stream || recording) return;
        stop();
        recorder = new MediaRecorder(stream);
        chunks = [];
        recorder.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = async function () {
            cancelAnimationFrame(liveRaf);
            document.getElementById('live-box').hidden = true;
            if (!chunks.length) return;
            var ab = await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer();
            var decoded = await audioCtx().decodeAudioData(ab);
            CI.data.recorded = { samples: decoded.getChannelData(0), sr: decoded.sampleRate };
            q('button[data-param="source"][data-value="mic"]').forEach(function (b) { b.disabled = false; });
            setStatus('processing');
            window.addEventListener('ciprocessed', function once() {
                window.removeEventListener('ciprocessed', once);
                start('play-orig');
            });
            CI.set('source', 'mic');
        };
        recorder.start();
        recording = true; recStart = performance.now();
        btn.classList.add('active'); btn.textContent = 'recording';
        setStatus('recording');
        document.getElementById('live-box').hidden = false;
        drawLive();
        autoStop = setTimeout(function () { stopRecording(btn); }, 5000);
    }
    function stopRecording(btn) {
        if (!recording) return;
        recording = false;
        clearTimeout(autoStop);
        recorder.stop();
        btn.classList.remove('active'); btn.textContent = 'hold to record';
    }

    // Live microphone trace while recording (Canvas2D, high-DPI).
    function drawLive() {
        if (!recording) return;
        liveRaf = requestAnimationFrame(drawLive);
        var cv = document.getElementById('live-canvas');
        var dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
        cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
        var g = cv.getContext('2d'), w = r.width, h = r.height;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        g.strokeStyle = window.T.grid; g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
        var buf = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buf);
        g.strokeStyle = window.CMP.cssVar('--c-rec'); g.lineWidth = 1.5;
        g.beginPath();
        for (var i = 0; i < buf.length; i++) {
            var x = i * w / buf.length, y = (0.5 - buf[i] * 0.45) * h;
            if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
        var el = document.getElementById('live-timer');
        if (el) el.textContent = ((performance.now() - recStart) / 1000).toFixed(1) + ' s / 5.0 s';
    }

    function init() {
        q('button[data-action^="play"]').forEach(function (b) {
            b.dataset.label = b.textContent;
            b.addEventListener('click', function () { start(b.dataset.action); });
        });
        q('button[data-action="mic"]').forEach(function (b) {
            b.addEventListener('click', function () { micAccess(b); });
        });
        q('button[data-action="record"]').forEach(function (b) {
            b.disabled = true;
            b.addEventListener('pointerdown', function (e) { e.preventDefault(); startRecording(b); });
            b.addEventListener('pointerup', function () { stopRecording(b); });
            b.addEventListener('pointerleave', function () { stopRecording(b); });
            b.addEventListener('pointercancel', function () { stopRecording(b); });
        });
        q('button[data-param="source"][data-value="mic"]').forEach(function (b) { b.disabled = true; });
        // A new parameter set invalidates the buffers being played.
        window.addEventListener('cichange', function (e) {
            if (play.active && e.detail.key !== 'ch') stop();
        });
        setStatus('idle');
    }

    window.CI.audio = { start: start, stop: stop };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
