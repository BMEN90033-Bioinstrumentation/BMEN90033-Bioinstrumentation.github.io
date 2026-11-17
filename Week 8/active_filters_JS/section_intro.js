// Section 01 · Intro overlay: magnitude responses for all four families
// at the same order N = 4 with matching passband edge.
(function () {
    var sel = '#plot-intro-overlay';

    function colors() {
        return {
            butter: window.AFPlots.getCssVar('--c-butter'),
            cheb1:  window.AFPlots.getCssVar('--c-cheb1'),
            cheb2:  window.AFPlots.getCssVar('--c-cheb2'),
            ellip:  window.AFPlots.getCssVar('--c-ellip')
        };
    }

    function render() {
        var T = window.T;
        var col = colors();
        var BD = window.AFPlots.setupBodeSingle({
            sel: sel,
            xDomain: [0.1, 10],
            magDomain: [-80, 6],
            magTicks: [-80, -60, -40, -20, -3, 0]
        });

        var families = [
            { name: 'Butterworth',  filt: window.FilterMath.butterworth(4),     css: 'butter' },
            { name: 'Chebyshev I',  filt: window.FilterMath.chebyshev1(4, 0.35), css: 'cheb1' },
            { name: 'Chebyshev II', filt: window.FilterMath.chebyshev2(4, 0.10), css: 'cheb2' },
            { name: 'Elliptic',     filt: window.FilterMath.elliptic(4),         css: 'ellip' }
        ];

        var lineMag = window.AFPlots.makeMagLine(BD.x, BD.yMag);

        families.forEach(function (f) {
            var pts = window.FilterMath.sampleResponse(f.filt, 0.1, 10, 1200);
            BD.gMag.append('path').datum(pts)
                .attr('class', 'trace ' + f.css)
                .attr('d', lineMag);
        });

        // -3 dB reference and the normalised edge marker at ω = 1.
        BD.gMag.append('line').attr('class', 'ref-line')
            .attr('x1', 0).attr('x2', BD.innerW)
            .attr('y1', BD.yMag(-3)).attr('y2', BD.yMag(-3));
        var xc = BD.x(1);
        BD.gMag.append('line').attr('class', 'ref-line')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        window.renderKatex(BD.gMag, '\\omega_{\\mathrm{edge}} = 1',
            xc, BD.innerH - 16,
            { width: 120, height: 22, size: 13, pill: true });

        // Legend in the lower-left corner: below the passband and left of
        // the edge marker, where no trace or reference line passes.
        var legend = [
            { color: col.butter, label: 'Butterworth' },
            { color: col.cheb1,  label: 'Chebyshev I' },
            { color: col.cheb2,  label: 'Chebyshev II' },
            { color: col.ellip,  label: 'Elliptic' }
        ];
        window.AFPlots.drawLegend(BD.gMag, 150, BD.innerH - 14 - 18 * legend.length, legend, T);
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
