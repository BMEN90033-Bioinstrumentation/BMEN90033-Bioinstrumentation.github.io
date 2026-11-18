// Section 02 · Butler-Volmer polarisation curve: net current density j
// against overpotential eta, with the anodic and cathodic partial currents,
// the linear (R_ct) approximation and the operating point set by the drive.
// The plot spans all four quadrants. Curves are identified in the HTML
// legend, so no label inside the plot can collide with a moving curve.
(function () {
    var sel = '#plot-bv';
    var ETA = 400, J = 1000;   // axis limits: mV and uA/cm^2

    var modeText = {
        equil:   ['equilibrium', '\\text{none: } j_a = |j_c| = j_0'],
        reduce:  ['reduction', '\\text{AgCl} + e^- \\rightarrow \\text{Ag} + \\text{Cl}^-'],
        oxidize: ['oxidation', '\\text{Ag} + \\text{Cl}^- \\rightarrow \\text{AgCl} + e^-']
    };

    function render() {
        var B = window.ELI, p = B.p, css = window.CMP.cssVar;
        var f = B.frame(sel, { margin: { top: 62, right: 78, bottom: 34, left: 58 } });
        var g = f.g;
        var x = d3.scaleLinear().domain([-ETA, ETA]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-J, J]).range([f.ih, 0]);
        B.axes(f, g, x, y, {
            quad: true,
            xTicks: [-400, -200, 0, 200, 400],
            yTicks: [-1000, -500, 0, 500, 1000],
            yFormat: function (d) { return (d / 1000).toFixed(1).replace('-', '\u2212'); },
            xFormat: function (d) { return String(d).replace('-', '\u2212'); },
            xTitle: '\\eta\\;[\\mathrm{mV}]',
            yTitle: 'j\\;[\\mathrm{mA/cm^2}]'
        });

        var j0 = Math.pow(10, p.lj0), k = 1 / (2 * B.RT_F * 1e3);   // 1/mV
        var etas = d3.range(-ETA, ETA + 0.5, 1);
        // Curves are cut where they leave the frame.
        var line = d3.line().defined(function (d) { return Math.abs(d[1]) <= J * 1.02; })
            .x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
        function curve(fn, colour, dash, w) {
            g.append('path').attr('class', 'trace').attr('stroke', colour).attr('stroke-width', w)
                .attr('stroke-dasharray', dash)
                .attr('d', line(etas.map(function (e) { return [e, fn(e)]; })));
        }
        curve(function (e) { return e * 1e-3 / B.rct(j0) * 1e6; }, css('--c-ref'), '2 5', 1.6);   // j = eta / R_ct
        curve(function (e) { return j0 * Math.exp(k * e); }, css('--c-i'), '6 5', 1.6);            // anodic partial
        curve(function (e) { return -j0 * Math.exp(-k * e); }, css('--c-i'), '6 5', 1.6);          // cathodic partial
        curve(function (e) { return B.bv(e * 1e-3, j0); }, css('--c-i'), null, 2.6);

        // Operating point with guides to both axes.
        var j = B.drive(), eta = B.overpotential(j, j0);
        var qx = x(eta * 1e3), qy = y(j);
        g.append('path').attr('fill', 'none').attr('stroke', css('--c-ref')).attr('stroke-dasharray', '4 4')
            .attr('d', 'M' + qx + ',' + f.ih + 'V' + qy + 'H0');
        g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 9).attr('fill', css('--c-i')).attr('fill-opacity', 0.22);
        g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 4.5).attr('fill', css('--c-i'))
            .attr('stroke', window.T.text).attr('stroke-width', 1);

        var lin = j * 1e-6 * B.rct(j0);   // linear estimate of eta, V
        B.out({
            mode: modeText[p.mode][0],
            j: B.sgn(j, 0) + ' µA/cm²',
            eta: B.sgn(eta * 1e3, 2) + ' mV',
            'eta-lin': Math.abs(lin) >= 1 ? B.sgn(lin, 2) + ' V' : B.sgn(lin * 1e3, 2) + ' mV',
            e: B.sgn(B.nernst(Math.pow(10, p.lacl)) + eta, 4) + ' V',
            rct: B.fmtOhm(B.rct(j0)) + '·cm²'
        });
        document.querySelectorAll('[data-out="reaction"]').forEach(function (el) {
            if (window.katex) window.katex.render(modeText[p.mode][1], el, { throwOnError: false });
        });
    }

    window.ELI.onRender(render);
})();
