// Section 02 · Buffered RC cascade Bode response.
// With unity-gain buffers between stages the composite transfer function
// is the exact product (1+sRC)^N. Plotted against the loaded passive
// cascade for the same R, C to show that the loading error is removed.
(function () {
    var T = window.T;
    var sel = '#plot-bode-buffered';
    var H_helpers = window.BodeHelpers;

    function bufferedSamples(n) {
        n = n || 480;
        var wMin = 0.01, wMax = 100;
        var pts = [];
        var phaseRads = [];
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);
            var mag = 1 / (1 + w * w);                   // |1/(1+jw)^2|
            var phRad = -2 * Math.atan(w);
            pts.push({ w: w, magDb: 20 * Math.log10(mag) });
            phaseRads.push(phRad);
        }
        var unwrapped = H_helpers.unwrapPhase(phaseRads);
        for (var j = 0; j < pts.length; j++) {
            pts[j].phase = unwrapped[j] * 180 / Math.PI;
        }
        return pts;
    }

    function passiveSamples(n) {
        n = n || 480;
        var wMin = 0.01, wMax = 100;
        var stages = [{ R: 1, C: 1 }, { R: 1, C: 1 }];
        var pts = [];
        var phaseRads = [];
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);
            var Hjw = H_helpers.cascadeABCD(w, stages);
            pts.push({ w: w, magDb: 20 * Math.log10(H_helpers.cAbs(Hjw)) });
            phaseRads.push(H_helpers.cArg(Hjw));
        }
        var unwrapped = H_helpers.unwrapPhase(phaseRads);
        for (var j = 0; j < pts.length; j++) {
            pts[j].phase = unwrapped[j] * 180 / Math.PI;
        }
        return pts;
    }

    function render() {
        var H = H_helpers.setupBode({
            sel: sel,
            xDomain: [0.01, 100],
            magDomain: [-80, 6],
            phaseDomain: [-200, 10],
            magTicks: [-80, -60, -40, -20, -6, -3, 0],
            phaseTicks: [-180, -135, -90, -45, 0]
        });

        var x = H.x, yMag = H.yMag, yPhase = H.yPhase;
        var magMin = yMag.domain()[0];
        var magMax = yMag.domain()[1];
        var clipM = function (d) { return Math.min(Math.max(d, magMin), magMax); };

        var lineMag = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yMag(clipM(d.magDb)); });
        var linePhase = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yPhase(d.phase); });

        var pPts = passiveSamples();
        var bPts = bufferedSamples();

        H.gMag.append('path').datum(pPts).attr('class', 'trace passive faint').attr('d', lineMag);
        H.gPhase.append('path').datum(pPts).attr('class', 'trace passive faint').attr('d', linePhase);
        H.gMag.append('path').datum(bPts).attr('class', 'trace buffered').attr('d', lineMag);
        H.gPhase.append('path').datum(bPts).attr('class', 'trace buffered').attr('d', linePhase);

        // ω = 1 reference marker
        var x0 = x(1);
        H.gMag.append('line')
            .attr('x1', x0).attr('x2', x0)
            .attr('y1', 0).attr('y2', H.innerH)
            .attr('stroke', T.fg(0.35)).attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3');
        H.gPhase.append('line')
            .attr('x1', x0).attr('x2', x0)
            .attr('y1', 0).attr('y2', H.innerH)
            .attr('stroke', T.fg(0.35)).attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3');
        // Label at the foot of the magnitude panel, clear of every trace.
        window.renderKatex(H.gMag, '1/RC', x0 - 26, H.innerH - 12,
            { width: 40, height: 18, size: 13, color: T.textDim });

        H_helpers.attachHover(H, [
            { name: 'buffered cascade',  cssClass: 'buffered', pts: bPts },
            { name: 'passive cascade',   cssClass: 'passive',  pts: pPts }
        ]);
    }

    function init() {
        render();
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
