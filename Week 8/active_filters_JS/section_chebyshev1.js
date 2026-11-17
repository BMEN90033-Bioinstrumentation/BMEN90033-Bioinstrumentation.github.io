// Section 03 · Chebyshev Type I: poles on an ellipse.
(function () {
    var splaneSel = '#cheb1-splane';
    var bodeSel = '#cheb1-bode';
    var sliderN = document.getElementById('cheb1-N');
    var valN = document.getElementById('cheb1-N-val');
    var sliderEps = document.getElementById('cheb1-eps');
    var valEps = document.getElementById('cheb1-eps-val');
    var view3dButton = document.getElementById('cheb1-view-3d');

    var state = { N: 4, eps: 0.35, view3d: false, probe: { omega: 0, mode: 'off' } };
    var probeCtrl = null;
    var lastSP = null, lastBD = null, lastFilter = null;

    function colors() {
        return {
            cheb1:  window.AFPlots.getCssVar('--c-cheb1'),
            butter: window.AFPlots.getCssVar('--c-butter')
        };
    }

    function renderSPlane() {
        var T = window.T;
        var col = colors();
        var N = state.N, eps = state.eps;
        // Square window. The Chebyshev I poles sit on an ellipse with
        // semi-major axis cosh μ on the imaginary axis; for the smallest
        // ε allowed by the slider this can extend past 2, so the window
        // is sized to ±2.4 on both axes.
        var SP = window.AFPlots.setupSPlane({
            sel: splaneSel,
            xDomain: [-2.4, 2.4],
            yDomain: [-2.4, 2.4]
        });
        lastSP = SP;

        var mu = Math.asinh(1 / eps) / N;
        var sh = Math.sinh(mu);
        var ch = Math.cosh(mu);

        // Reference: Butterworth unit circle (faint) for visual contrast.
        SP.g.append('circle')
            .attr('cx', SP.x(0)).attr('cy', SP.y(0))
            .attr('r', SP.x(1) - SP.x(0))
            .attr('fill', 'none')
            .attr('stroke', col.butter)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 5')
            .attr('opacity', 0.45);

        // Pole ellipse: x²/sinh²μ + y²/cosh²μ = 1, restricted to LHP.
        // Sample as a closed curve so the dashed stroke renders cleanly.
        var ellipsePts = [];
        var nSamples = 240;
        for (var i = 0; i <= nSamples; i++) {
            var t = (i / nSamples) * 2 * Math.PI;
            ellipsePts.push([SP.x(sh * Math.cos(t)), SP.y(ch * Math.sin(t))]);
        }
        SP.g.append('path')
            .attr('class', 'pole-ellipse')
            .attr('stroke', col.cheb1)
            .attr('stroke-dasharray', '4 4')
            .attr('fill', 'none')
            .attr('d', d3.line()(ellipsePts));

        // Filter poles
        var filt = window.FilterMath.chebyshev1(N, eps);
        lastFilter = filt;
        window.AFPlots.drawMagnitudeUnityContour(SP, filt, window.AFPlots.getCssVar('--c-ref'));
        filt.poles.forEach(function (p) {
            window.AFPlots.drawPole(SP.g, SP.x(p.re), SP.y(p.im), col.cheb1, 7);
        });

        // Annotate semi-axes. The labels are boxed so the reference circle
        // and the ellipse pass behind them.
        SP.g.append('line')
            .attr('x1', SP.x(0)).attr('x2', SP.x(-sh))
            .attr('y1', SP.y(0)).attr('y2', SP.y(0))
            .attr('stroke', col.cheb1).attr('stroke-width', 1.2)
            .attr('opacity', 0.55);
        window.renderKatex(SP.g, '\\sinh\\mu = ' + sh.toFixed(2),
            SP.x(-sh) - 8 - 60, SP.y(0) - 13,
            { width: 120, height: 20, size: 13, align: 'end', pill: true }).attr('class', 'af-note');

        SP.g.append('line')
            .attr('x1', SP.x(0)).attr('x2', SP.x(0))
            .attr('y1', SP.y(0)).attr('y2', SP.y(ch))
            .attr('stroke', col.cheb1).attr('stroke-width', 1.2)
            .attr('opacity', 0.55);
        window.renderKatex(SP.g, '\\cosh\\mu = ' + ch.toFixed(2),
            SP.x(0) + 8 + 60, SP.y(ch / 2),
            { width: 120, height: 20, size: 13, align: 'start', pill: true }).attr('class', 'af-note');

        // Legend below the plot frame.
        var entries = [
            { color: col.cheb1, label: 'Chebyshev I poles', marker: 'pole' },
            { color: col.butter, label: 'Butterworth circle', marker: 'dash' },
            { color: window.AFPlots.getCssVar('--c-ref'), label: 'Unity-gain contour', marker: 'dash' }
        ];
        window.AFPlots.drawLegend(SP.g, SP.legendX, SP.legendY, entries, T);
    }

    function renderBode() {
        var T = window.T;
        var col = colors();
        var BD = window.AFPlots.setupBodePair({
            sel: bodeSel,
            xDomain: [0.05, 20],
            magDomain: [-80, 6],
            phaseDomain: phaseDomainFor(state.N),
            magTicks: [-80, -60, -40, -20, -3, 0],
            phaseTicks: phaseTicksFor(state.N)
        });

        var filt = window.FilterMath.chebyshev1(state.N, state.eps);
        var pts = window.FilterMath.sampleResponse(filt, 0.05, 20, 800);
        window.AFPlots.drawTrace(BD, pts, 'cheb1');
        lastBD = BD;

        // Passband ripple band: shade the strip between 0 dB and the
        // ripple floor of -20·log10(sqrt(1+ε²)) dB across [0, 1].
        var ripDb = -10 * Math.log10(1 + state.eps * state.eps);
        var xL = BD.x(BD.x.domain()[0]);
        var xR = BD.x(1);
        BD.gMag.append('rect')
            .attr('x', xL).attr('y', BD.yMag(0))
            .attr('width', xR - xL).attr('height', BD.yMag(ripDb) - BD.yMag(0))
            .attr('fill', col.cheb1).attr('opacity', 0.07);
        BD.gMag.append('line').attr('class', 'ref-line')
            .attr('x1', xL).attr('x2', xR)
            .attr('y1', BD.yMag(ripDb)).attr('y2', BD.yMag(ripDb));
        // Two-line label below the ripple-floor line, inside the passband
        // region where the trace stays above the line.
        var ripLabel = BD.gMag.append('text')
            .attr('fill', T.fg(0.6))
            .attr('font-family', window.AFPlots.MONO)
            .attr('font-size', 13);
        ripLabel.append('tspan').attr('x', xL + 8).attr('y', BD.yMag(ripDb) + 18).text('Ripple floor');
        ripLabel.append('tspan').attr('x', xL + 8).attr('dy', 16).text(ripDb.toFixed(2).replace('-', '−') + ' dB');

        // Passband edge marker
        var xc = BD.x(1);
        BD.gMag.append('line').attr('class', 'ref-line')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        BD.gPhase.append('line').attr('class', 'ref-line')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        window.renderKatex(BD.gMag, '\\omega_p = 1',
            xc, BD.innerH - 16,
            { width: 80, height: 22, size: 11, pill: true });
    }

    function phaseDomainFor(N) { return [-90 * N - 30, 10]; }
    function phaseTicksFor(N) {
        var ticks = [];
        for (var v = 0; v >= -90 * N; v -= 90) ticks.push(v);
        return ticks;
    }

    function render() {
        renderSPlane();
        renderBode();
        if (probeCtrl && lastSP && lastBD && lastFilter) {
            probeCtrl.attach({
                sp: lastSP, bd: lastBD, filter: lastFilter,
                color: colors().cheb1,
                wMin: 0, wMax: 2.4
            });
        }
        render3D();
    }

    function render3D() {
        if (view3dButton) view3dButton.classList.toggle('active', state.view3d);
        if (!window.AFD3SPlane || !lastFilter) return;
        window.AFD3SPlane.setEnabled({
            svgSelector: splaneSel,
            enabled: state.view3d,
            filter: lastFilter,
            color: colors().cheb1,
            contourColor: window.AFPlots.getCssVar('--c-ref'),
            xDomain: [-2.4, 2.4],
            yDomain: [-2.4, 2.4],
            probeOmega: state.probe.omega,
            probeActive: state.probe.mode !== 'off',
            probeMode: state.probe.mode
        });
    }

    function onSlider() {
        state.N = parseInt(sliderN.value, 10);
        state.eps = parseFloat(sliderEps.value);
        if (valN) valN.textContent = String(state.N);
        if (valEps) valEps.textContent = state.eps.toFixed(2);
        render();
    }

    function init() {
        probeCtrl = window.JwProbe.init({
            slider:      document.getElementById('cheb1-probe'),
            valLabel:    document.getElementById('cheb1-probe-val'),
            modeButtons: {
                mag:   document.getElementById('cheb1-probe-mag'),
                angle: document.getElementById('cheb1-probe-angle')
            },
            state: state.probe,
            onChange: render3D
        });
        if (sliderN) sliderN.addEventListener('input', onSlider);
        if (sliderEps) sliderEps.addEventListener('input', onSlider);
        if (view3dButton) {
            view3dButton.addEventListener('click', function () {
                state.view3d = !state.view3d;
                render();
            });
        }
        onSlider();
        window.addEventListener('resize', render);
        window.addEventListener('af-d3-ready', render3D);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
