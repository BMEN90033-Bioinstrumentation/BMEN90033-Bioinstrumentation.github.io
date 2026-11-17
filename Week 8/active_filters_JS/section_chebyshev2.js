// Section 04 · Chebyshev Type II: zeros on the imaginary axis,
// poles obtained by reciprocating a Chebyshev I prototype.
(function () {
    var splaneSel = '#cheb2-splane';
    var bodeSel = '#cheb2-bode';
    var sliderN = document.getElementById('cheb2-N');
    var valN = document.getElementById('cheb2-N-val');
    var sliderEps = document.getElementById('cheb2-eps');
    var valEps = document.getElementById('cheb2-eps-val');
    var view3dButton = document.getElementById('cheb2-view-3d');

    var state = { N: 4, eps: 0.10, view3d: false, probe: { omega: 0, mode: 'off' } };
    var probeCtrl = null;
    var lastSP = null, lastBD = null, lastFilter = null;

    function colors() {
        return {
            pole: window.AFPlots.getCssVar('--c-cheb2'),
            zero: window.AFPlots.getCssVar('--c-cheb2'),
            ref:  window.AFPlots.getCssVar('--c-ref'),
            butter: window.AFPlots.getCssVar('--c-butter')
        };
    }

    function renderSPlane() {
        var T = window.T;
        var col = colors();
        var N = state.N, eps = state.eps;

        // Square window. The imaginary-axis zeros sit at jω = 1/cos(θ_k);
        // for N = 6 the highest finite zero is at about ω = 3.86, so a
        // ±4.5 window encompasses them while keeping the data aspect at
        // unity for true circle / ellipse rendering.
        var SP = window.AFPlots.setupSPlane({
            sel: splaneSel,
            xDomain: [-4.5, 4.5],
            yDomain: [-4.5, 4.5]
        });
        lastSP = SP;

        // Reference unit circle (faint)
        SP.g.append('circle')
            .attr('cx', SP.x(0)).attr('cy', SP.y(0))
            .attr('r', SP.x(1) - SP.x(0))
            .attr('fill', 'none')
            .attr('stroke', col.butter)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 5')
            .attr('opacity', 0.4);

        var filt = window.FilterMath.chebyshev2(N, eps);
        lastFilter = filt;
        window.AFPlots.drawMagnitudeUnityContour(SP, filt, col.ref);
        // Zeros first so poles render on top in any overlap
        filt.zeros.forEach(function (z) {
            window.AFPlots.drawZero(SP.g, SP.x(z.re), SP.y(z.im), col.zero, 7);
        });
        filt.poles.forEach(function (p) {
            window.AFPlots.drawPole(SP.g, SP.x(p.re), SP.y(p.im), col.pole, 7);
        });

        // Annotate the lowest zero (highest stopband notch first)
        var zPos = filt.zeros.filter(function (z) { return z.im > 0; });
        zPos.sort(function (a, b) { return a.im - b.im; });
        if (zPos.length) {
            var z0 = zPos[0];
            window.renderKatex(SP.g, '\\omega_z = ' + z0.im.toFixed(2),
                SP.x(0) + 14 + 50, SP.y(z0.im),
                { width: 100, height: 20, size: 13, align: 'start', pill: true }).attr('class', 'af-note');
        }

        var entries = [
            { color: col.pole, label: 'Chebyshev II poles', marker: 'pole' },
            { color: col.zero, label: 'Imaginary-axis zeros', marker: 'zero' },
            { color: col.ref, label: 'Unity-gain contour', marker: 'dash' }
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

        var filt = window.FilterMath.chebyshev2(state.N, state.eps);
        var pts = window.FilterMath.sampleResponse(filt, 0.05, 20, 1200);
        window.AFPlots.drawTrace(BD, pts, 'cheb2');
        lastBD = BD;

        // Stopband floor: -20·log10(1/ε) approximately.
        // Stopband edge at ω = 1 in this normalisation.
        var floorDb = -20 * Math.log10(1 / state.eps);
        // Floor level drawn across the panel. Its two-line label sits
        // below the line and left of ω = 1, where the trace is above the
        // floor and the region is empty.
        BD.gMag.append('line').attr('class', 'ref-line')
            .attr('x1', 0).attr('x2', BD.innerW)
            .attr('y1', BD.yMag(floorDb)).attr('y2', BD.yMag(floorDb));
        var floorLabel = BD.gMag.append('text')
            .attr('stroke', T.plotBg).attr('stroke-width', 4).attr('paint-order', 'stroke')
            .attr('fill', T.fg(0.6))
            .attr('font-family', window.AFPlots.MONO)
            .attr('font-size', 13);
        floorLabel.append('tspan').attr('x', 8).attr('y', BD.yMag(floorDb) + 18).text('Stopband floor');
        floorLabel.append('tspan').attr('x', 8).attr('dy', 16).text(floorDb.toFixed(1).replace('-', '−') + ' dB');

        // Stopband edge marker
        var xc = BD.x(1);
        BD.gMag.append('line').attr('class', 'ref-line')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        BD.gPhase.append('line').attr('class', 'ref-line')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        window.renderKatex(BD.gMag, '\\omega_s = 1',
            xc, BD.innerH - 16,
            { width: 80, height: 22, size: 13, pill: true });
    }

    function phaseDomainFor(N) { return [-90 * N - 30, 100]; }  // zeros lift the phase to about +76°
    function phaseTicksFor(N) {
        var ticks = [];
        for (var v = 90; v >= -90 * N; v -= 90) ticks.push(v);
        return ticks;
    }

    function render() {
        renderSPlane();
        renderBode();
        if (probeCtrl && lastSP && lastBD && lastFilter) {
            probeCtrl.attach({
                sp: lastSP, bd: lastBD, filter: lastFilter,
                color: colors().pole,
                wMin: 0, wMax: 4.5
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
            color: colors().pole,
            contourColor: colors().ref,
            xDomain: [-4.5, 4.5],
            yDomain: [-4.5, 4.5],
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
            slider:      document.getElementById('cheb2-probe'),
            valLabel:    document.getElementById('cheb2-probe-val'),
            modeButtons: {
                mag:   document.getElementById('cheb2-probe-mag'),
                angle: document.getElementById('cheb2-probe-angle')
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
