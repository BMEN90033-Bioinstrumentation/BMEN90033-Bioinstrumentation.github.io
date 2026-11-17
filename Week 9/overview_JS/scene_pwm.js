// Scene 05 · PWM dimmer.
// A square wave at chosen frequency and duty drives a thermal load (bulb).
// Three views are coupled:
//   * the time-domain PWM trace with its time-average overlaid;
//   * a frequency-response panel showing the steady-state envelope of the
//     bulb power as a function of PWM frequency, computed from the closed-form
//     ripple of a 1st-order RC filter with tau = 50 ms;
//   * a bulb graphic whose fill follows the filtered PWM output, so the
//     flicker is seen to vanish as the frequency passes the corner.
(function () {
    var svgSel    = '#plot-pwm-trace';
    var svgFreq   = '#plot-pwm-freq';
    var svgBulb   = '#plot-pwm-bulb';
    var dInp = document.getElementById('pwm-duty');
    var dLab = document.getElementById('pwm-duty-val');
    var fInp = document.getElementById('pwm-freq');
    var fLab = document.getElementById('pwm-freq-val');
    var rdD = document.getElementById('pwm-d');
    var rdAvg = document.getElementById('pwm-avg');
    var rdRipple = document.getElementById('pwm-ripple');
    var rdFlicker = document.getElementById('pwm-flicker');

    var WINDOW = 2.0;
    var TAU = 0.050;            // bulb thermal time constant, seconds
    var F_MIN = 1, F_MAX = 200; // freq plot domain, Hz

    var state = {
        duty: 40,
        freq: 5,
        t: 0,
        last: performance.now(),
        filt: 0.4    // thermal-filter output that drives the live bulb
    };

    // ─── helpers ─────────────────────────────────────────────
    function envelope(f, D) {
        // Steady-state V_min and V_max of a 1st-order RC fed a unit-amplitude
        // square wave at frequency f and duty D.
        var T = 1 / f;
        var a    = Math.exp(-T / TAU);
        var aD   = Math.exp(-(D) * T / TAU);
        var aOff = Math.exp(-(1 - D) * T / TAU);
        var Vmax = (1 - aD) / (1 - a);
        var Vmin = Vmax * aOff;
        return { vmax: Vmax, vmin: Vmin, ripple: Vmax - Vmin };
    }

    // ════════════════════════════════════════════════════════
    //  TIME-DOMAIN PWM TRACE
    // ════════════════════════════════════════════════════════
    var svg = d3.select(svgSel).classed('ov', true);
    var W = 600, H = 280;
    var margin = { top: 26, right: 30, bottom: 48, left: 78 };
    var iw, ih, x, y;

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gAvg  = gRoot.append('g');
    var gTrace = gRoot.append('g');
    var gAxis  = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');
    var gNow   = gRoot.append('g');

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(360, rect.width);
        H = Math.max(220, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        iw = W - margin.left - margin.right;
        ih = H - margin.top - margin.bottom;
        gRoot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        x = d3.scaleLinear().domain([-WINDOW, 0]).range([0, iw]);
        y = d3.scaleLinear().domain([-0.15, 1.15]).range([ih, 0]);
    }

    function drawStatic() {
        gGrid.selectAll('*').remove();
        gAxis.selectAll('*').remove();
        gTitles.selectAll('*').remove();

        [0, 0.5, 1].forEach(function (v) {
            gGrid.append('line')
                .attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });
        var yAxis = d3.axisLeft(y).tickValues([0]).tickFormat(d3.format('d')).tickSize(0).tickPadding(8);
        gAxis.append('g').call(yAxis).select('.domain').remove();
        [[0.5, '\\tfrac{1}{2}V_{cc}'], [1, 'V_{cc}']].forEach(function (tk) {
            window.renderKatex(gAxis, tk[1], -8 - 25, y(tk[0]),
                { size: 14, color: 'var(--muted)', align: 'right', width: 50, height: 18 });
        });
        var xAxis = d3.axisBottom(x).tickValues([-2, -1.5, -1, -0.5, 0]).tickFormat(function (d) { return d + ''; }).tickSize(0).tickPadding(8);
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')').call(xAxis).select('.domain').remove();

        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', iw / 2).attr('y', ih + 40)
            .attr('text-anchor', 'middle')
            .text('Time relative to present (s)');
        gTitles.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-62) + ',' + (ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('PWM output');
    }

    function drawTrace() {
        var T = 1 / state.freq;
        var d = state.duty / 100;
        var wHi = d * T;

        var tStart = state.t - WINDOW;
        var tEnd = state.t;

        // Collect rise / fall edges that fall strictly inside (tStart, tEnd],
        // each as [time_relative_to_now, new_level], then walk them in order
        // to emit a clean step waveform.
        var edges = [];
        var kFirst = Math.floor(tStart / T) - 1;
        var kLast  = Math.ceil(tEnd / T) + 1;
        for (var k = kFirst; k <= kLast; k++) {
            var rise = k * T;
            var fall = k * T + wHi;
            if (rise > tStart && rise <= tEnd) edges.push([rise - tEnd, 1]);
            if (fall > tStart && fall <= tEnd) edges.push([fall - tEnd, 0]);
        }
        edges.sort(function (a, b) { return a[0] - b[0]; });

        // Starting level at the left edge of the window
        var phaseStart = ((tStart % T) + T) % T;
        var lvl = phaseStart < wHi ? 1 : 0;

        var pts = [[-WINDOW, lvl]];
        for (var i = 0; i < edges.length; i++) {
            var e = edges[i];
            pts.push([e[0], lvl]);  // hold previous level up to the edge
            pts.push([e[0], e[1]]); // vertical jump to the new level
            lvl = e[1];
        }
        pts.push([0, lvl]);

        var line = d3.line()
            .x(function (p) { return x(p[0]); })
            .y(function (p) { return y(p[1]); });

        gTrace.selectAll('*').remove();
        gTrace.append('path').datum(pts)
            .attr('class', 'trace output')
            .attr('d', line);

        gAvg.selectAll('*').remove();
        var yAvg = y(d);
        gAvg.append('line')
            .attr('x1', 0).attr('x2', iw)
            .attr('y1', yAvg).attr('y2', yAvg)
            .style('stroke', 'var(--c-output2)').attr('stroke-width', 1.6)
            .attr('stroke-dasharray', '6 5').attr('opacity', 0.85);
        gNow.selectAll('*').remove();
        // Label sits above the average line, or below it when the line is
        // close to the upper rail of the square wave. It is drawn in the top
        // layer on a white plate so that the scrolling edges pass behind it.
        window.renderKatex(gNow, '\\text{average} = D \\cdot V_{cc}', iw - 8 - 90,
            d > 0.8 ? yAvg + 14 : yAvg - 13,
            { size: 14, color: 'var(--c-output2)', align: 'right', width: 180, height: 18 })
            .select('.katex').style('background', 'var(--white)').style('padding', '1px 4px');

        gNow.append('line')
            .attr('x1', x(0)).attr('x2', x(0))
            .attr('y1', 0).attr('y2', ih)
            .style('stroke', 'var(--c-now)').attr('stroke-width', 1.0)
            .attr('opacity', 0.4).attr('stroke-dasharray', '3 3');
    }

    // ════════════════════════════════════════════════════════
    //  FREQUENCY-RESPONSE PLOT
    // ════════════════════════════════════════════════════════
    var svgF = d3.select(svgFreq).classed('ov', true);
    var Wf, Hf, iwF, ihF, xF, yF;
    var marginF = { top: 66, right: 30, bottom: 48, left: 62 };
    var gRootF = svgF.append('g');
    var gGridF = gRootF.append('g').attr('class', 'grid');
    var gBandF = gRootF.append('g');
    var gAvgF  = gRootF.append('g');
    var gAxisF = gRootF.append('g').attr('class', 'axis');
    var gTitlesF = gRootF.append('g');
    var gMarkF = gRootF.append('g');

    function layoutF() {
        var rect = svgF.node().getBoundingClientRect();
        Wf = Math.max(360, rect.width);
        Hf = Math.max(180, rect.height);
        svgF.attr('viewBox', '0 0 ' + Wf + ' ' + Hf);
        iwF = Wf - marginF.left - marginF.right;
        ihF = Hf - marginF.top - marginF.bottom;
        gRootF.attr('transform', 'translate(' + marginF.left + ',' + marginF.top + ')');
        xF = d3.scaleLog().domain([F_MIN, F_MAX]).range([0, iwF]);
        yF = d3.scaleLinear().domain([0, 1]).range([ihF, 0]);
    }

    function drawFreqStatic() {
        gGridF.selectAll('*').remove();
        gAxisF.selectAll('*').remove();
        gTitlesF.selectAll('*').remove();

        [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
            gGridF.append('line')
                .attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iwF)
                .attr('y1', yF(v)).attr('y2', yF(v));
        });
        var ticks = [1, 2, 5, 10, 20, 50, 100, 200];
        ticks.forEach(function (f) {
            gGridF.append('line')
                .attr('x1', xF(f)).attr('x2', xF(f))
                .attr('y1', 0).attr('y2', ihF);
        });

        var yAxis = d3.axisLeft(yF).tickValues([0, 0.25, 0.5, 0.75, 1])
            .tickFormat(function (d) { return d.toFixed(2); }).tickSize(0).tickPadding(8);
        gAxisF.append('g').call(yAxis).select('.domain').remove();
        var xAxis = d3.axisBottom(xF).tickValues(ticks)
            .tickFormat(function (d) { return d + ''; }).tickSize(0).tickPadding(8);
        gAxisF.append('g').attr('transform', 'translate(0,' + ihF + ')').call(xAxis).select('.domain').remove();

        gTitlesF.append('text').attr('class', 'axis-title')
            .attr('x', iwF / 2).attr('y', ihF + 40)
            .attr('text-anchor', 'middle')
            .text('PWM frequency (Hz, logarithmic scale)');
        window.renderKatex(gTitlesF, '\\text{Bulb voltage} \\,/\\, V_{cc}', -50, ihF / 2,
            { size: 14, rotate: -90, width: 200, height: 18 });

        // 1/(2π·τ) corner reference
        var fc = 1 / (2 * Math.PI * TAU);
        gGridF.append('line')
            .attr('x1', xF(fc)).attr('x2', xF(fc))
            .attr('y1', 0).attr('y2', ihF)
            .style('stroke', 'var(--d-grey)').attr('stroke-width', 1)
            .attr('stroke-dasharray', '4 4');
        // Upper label row: corner frequency. The lower row carries the
        // operating-frequency label drawn in drawFreqDynamic.
        window.renderKatex(gTitlesF, '1/(2\\pi\\tau) \\approx ' + fc.toFixed(1) + '\\,\\text{Hz}',
            xF(fc), -30, { size: 14, color: 'var(--muted)', width: 180, height: 18 });
    }

    function drawFreqDynamic() {
        var d = state.duty / 100;

        // sample envelope across the log-frequency range
        var pts = [];
        var N = 200;
        for (var k = 0; k <= N; k++) {
            var u = k / N;
            var f = F_MIN * Math.pow(F_MAX / F_MIN, u);
            var env = envelope(f, d);
            pts.push({ f: f, vmax: env.vmax, vmin: env.vmin });
        }

        gBandF.selectAll('*').remove();
        var area = d3.area()
            .x(function (p) { return xF(p.f); })
            .y0(function (p) { return yF(p.vmin); })
            .y1(function (p) { return yF(p.vmax); });
        gBandF.append('path').datum(pts)
            .attr('d', area)
            .style('fill', 'var(--d-orange-soft)');

        var lineMax = d3.line()
            .x(function (p) { return xF(p.f); })
            .y(function (p) { return yF(p.vmax); });
        var lineMin = d3.line()
            .x(function (p) { return xF(p.f); })
            .y(function (p) { return yF(p.vmin); });
        gBandF.append('path').datum(pts).attr('d', lineMax)
            .attr('fill', 'none').style('stroke', 'var(--c-output)')
            .attr('stroke-width', 1.4).attr('opacity', 0.9);
        gBandF.append('path').datum(pts).attr('d', lineMin)
            .attr('fill', 'none').style('stroke', 'var(--c-output)')
            .attr('stroke-width', 1.4).attr('opacity', 0.9);

        // average (D · V_cc): flat
        gAvgF.selectAll('*').remove();
        var yAvg = yF(d);
        gAvgF.append('line')
            .attr('x1', 0).attr('x2', iwF)
            .attr('y1', yAvg).attr('y2', yAvg)
            .style('stroke', 'var(--c-output2)').attr('stroke-width', 2.2);
        // Label at the left, where the ripple band is widest and its edges
        // lie far from the average line; below the line at high duty.
        window.renderKatex(gAvgF, '\\text{average} = D \\cdot V_{cc}', 8 + 90,
            d > 0.8 ? yAvg + 14 : yAvg - 13,
            { size: 14, color: 'var(--c-output2)', align: 'left', width: 180, height: 18 });

        // current frequency marker
        gMarkF.selectAll('*').remove();
        var xM = xF(state.freq);
        var env = envelope(state.freq, d);
        gMarkF.append('line')
            .attr('x1', xM).attr('x2', xM)
            .attr('y1', 0).attr('y2', ihF)
            .style('stroke', 'var(--c-now)').attr('stroke-width', 1.3)
            .attr('stroke-dasharray', '5 4');
        gMarkF.append('circle')
            .attr('cx', xM).attr('cy', yF(env.vmax)).attr('r', 3.5)
            .style('fill', 'var(--c-now)');
        gMarkF.append('circle')
            .attr('cx', xM).attr('cy', yF(env.vmin)).attr('r', 3.5)
            .style('fill', 'var(--c-now)');
        gMarkF.append('text')
            .attr('x', Math.max(30, Math.min(iwF - 30, xM))).attr('y', -8)
            .attr('text-anchor', 'middle')
            .style('fill', 'var(--c-now)')
            .text(state.freq.toFixed(1) + ' Hz');
    }

    // ════════════════════════════════════════════════════════
    //  BULB
    // ════════════════════════════════════════════════════════
    var svgB = d3.select(svgBulb).classed('ov', true);
    var Wb, Hb;
    var gBulbBody = svgB.append('g');

    function layoutB() {
        var rect = svgB.node().getBoundingClientRect();
        Wb = Math.max(120, rect.width);
        Hb = Math.max(120, rect.height);
        svgB.attr('viewBox', '0 0 ' + Wb + ' ' + Hb);
    }

    function drawBulbStatic() {
        gBulbBody.selectAll('*').remove();

        // Bulb geometry
        var cx = Wb * 0.5;
        var cy = Hb * 0.46;
        var r = Math.min(Wb, Hb) * 0.26;

        // base and screw fitting
        var baseTop = cy + r * 0.85;
        var baseBot = baseTop + r * 0.95;
        var bw = r * 0.95;
        gBulbBody.append('rect')
            .attr('x', cx - bw / 2).attr('y', baseTop)
            .attr('width', bw).attr('height', r * 0.28)
            .attr('rx', 2)
            .style('fill', 'var(--d-grey)');
        // screw threads (3 stacked rounded rects)
        var threadH = (baseBot - baseTop - r * 0.28) / 3;
        for (var i = 0; i < 3; i++) {
            gBulbBody.append('rect')
                .attr('x', cx - bw * 0.45)
                .attr('y', baseTop + r * 0.28 + i * threadH + 1)
                .attr('width', bw * 0.9)
                .attr('height', Math.max(2, threadH - 2))
                .attr('rx', 2)
                .style('fill', 'var(--d-grey)');
        }
        // tip
        gBulbBody.append('rect')
            .attr('x', cx - bw * 0.18).attr('y', baseBot - 2)
            .attr('width', bw * 0.36).attr('height', 4)
            .attr('rx', 1.5)
            .style('fill', 'var(--d-slate)');
    }

    function drawBulbDynamic() {
        var b = Math.max(0, Math.min(1, state.filt)); // 0..1
        var cx = Wb * 0.5;
        var cy = Hb * 0.46;
        var r = Math.min(Wb, Hb) * 0.26;

        gBulbBody.selectAll('.bulb-glass').remove();
        gBulbBody.selectAll('.bulb-filament').remove();

        // Glass fill encodes the filtered bulb voltage: white when unlit,
        // the PWM output colour at full brightness.
        var fillCol = d3.interpolateRgb(T.plotBg, T.c('orange'))(b);

        gBulbBody.append('circle')
            .attr('class', 'bulb-glass')
            .attr('cx', cx).attr('cy', cy).attr('r', r)
            .attr('fill', fillCol)
            .style('stroke', 'var(--fg)').attr('stroke-width', 1);

        // filament arches
        var fr = r * 0.45;
        var fy = cy + r * 0.15;
        var path = '';
        var n = 4; // arches
        for (var i = 0; i < n; i++) {
            var x0 = cx - fr + (2 * fr) * (i / n);
            var x1 = cx - fr + (2 * fr) * ((i + 1) / n);
            var midX = (x0 + x1) / 2;
            var midY = fy - r * 0.32;
            path += (i === 0 ? 'M' : 'L') + x0.toFixed(2) + ',' + fy.toFixed(2) + ' ';
            path += 'Q' + midX.toFixed(2) + ',' + midY.toFixed(2) + ' ' + x1.toFixed(2) + ',' + fy.toFixed(2) + ' ';
        }
        gBulbBody.append('path')
            .attr('class', 'bulb-filament')
            .attr('d', path)
            .attr('fill', 'none').attr('stroke', 'var(--fg)')
            .attr('stroke-width', 1.6)
            .attr('stroke-linecap', 'round');
    }

    // ════════════════════════════════════════════════════════
    //  READOUTS + main loop
    // ════════════════════════════════════════════════════════
    function fmtFreq(f) {
        if (f >= 100) return f.toFixed(0) + ' Hz';
        if (f >= 10)  return f.toFixed(1) + ' Hz';
        return f.toFixed(2) + ' Hz';
    }

    function updateReadout() {
        var d = state.duty / 100;
        var env = envelope(state.freq, d);
        rdD.textContent = state.duty.toFixed(0) + ' %';
        rdAvg.textContent = d.toFixed(2);
        rdRipple.textContent = env.ripple.toFixed(2);
        // perceived flicker: visible when frequency below ~100 Hz (fusion threshold in the callout) AND ripple is appreciable
        var visible = (state.freq < 100) && (env.ripple > 0.03);
        rdFlicker.textContent = visible ? 'Visible' : 'Not perceptible';
        rdFlicker.className = 'v ' + (visible ? 'warn' : 'on');
    }

    function tick(now) {
        var dt = (now - state.last) / 1000;
        state.last = now;
        if (dt > 0.1) dt = 0.1;
        state.t += dt;

        // Advance bulb thermal filter with sub-steps small enough to resolve
        // PWM transitions (at least 8 sub-steps per period) and the filter
        // time constant (at least 4 per tau). Capped to keep work bounded.
        var T = 1 / state.freq;
        var wHi = (state.duty / 100) * T;
        var maxSub = Math.min(T / 8, TAU / 4);
        var nSub = Math.min(200, Math.max(1, Math.ceil(dt / maxSub)));
        var ddt = dt / nSub;
        var t0 = state.t - dt;
        for (var i = 0; i < nSub; i++) {
            var phase = ((t0 + (i + 0.5) * ddt) % T + T) % T;
            var inp = phase < wHi ? 1 : 0;
            state.filt += (inp - state.filt) * (ddt / TAU);
        }

        drawTrace();
        drawBulbDynamic();
        requestAnimationFrame(tick);
    }

    function init() {
        layout();  drawStatic();   drawTrace();
        layoutF(); drawFreqStatic(); drawFreqDynamic();
        layoutB(); drawBulbStatic(); drawBulbDynamic();
        updateReadout();

        // log-scale frequency slider (display value in Hz)
        function syncFreq() {
            state.freq = Math.pow(10, parseFloat(fInp.value));
            fLab.textContent = fmtFreq(state.freq);
            drawFreqDynamic();
            updateReadout();
        }
        fInp.addEventListener('input', syncFreq);
        syncFreq();

        dInp.addEventListener('input', function () {
            state.duty = parseFloat(dInp.value);
            dLab.textContent = state.duty.toFixed(0) + ' %';
            drawFreqDynamic();
            updateReadout();
        });

        window.addEventListener('resize', function () {
            layout();  drawStatic();   drawTrace();
            layoutF(); drawFreqStatic(); drawFreqDynamic();
            layoutB(); drawBulbStatic(); drawBulbDynamic();
        });

        state.last = performance.now();
        requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
