// Section 05 · Vocoded output v_i of the selected electrode in a window of
// about twelve carrier periods (4 to 40 ms) centred on the peak of its
// envelope, with the stimulation level +/- g(e_i) as dashed bounds. Single quadrant in time; no in-plot text.
(function () {
    var sel = '#plot-vocoder';

    function render() {
        var CI = window.CI, d = CI.data, p = CI.p, css = window.CMP.cssVar;
        var f = CI.frame(sel, {});
        if (!d.voc.length) return;
        var n = d.voc.length, c = Math.max(0, Math.min(n - 1, n - p.ch));
        var env = d.env[c], voc = d.voc[c], comp = p.compress === 'on';
        var g = function (e) { return comp ? CI.compress(e) : e; };

        var ipk = 0;
        for (var i = 1; i < env.length; i++) if (env[i] > env[ipk]) ipk = i;
        var fc = CI.config().freqs[c];
        var half = Math.round(Math.max(0.002, Math.min(0.02, 6 / fc)) * d.sr);
        var s0 = Math.max(0, ipk - half), s1 = Math.min(voc.length, ipk + half);
        var pts = [], vmax = 0;
        for (i = s0; i < s1; i++) {
            pts.push([i / d.sr * 1e3, voc[i], g(env[i])]);
            vmax = Math.max(vmax, Math.abs(voc[i]), g(env[i]));
        }
        vmax = Math.max(vmax, 1e-3) * 1.12;

        var x = d3.scaleLinear().domain([s0 / d.sr * 1e3, s1 / d.sr * 1e3]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-vmax, vmax]).range([f.ih, 0]).nice(5);
        CI.axes(f, f.g, x, y, f.ih, 0, {
            xFmt: d3.format((s1 - s0) / d.sr < 0.01 ? '.1f' : '.0f'), xTitle: 't\\;[\\mathrm{ms}]', yTitle: 'v_i(t)' });

        var line = function (get) {
            return d3.line().x(function (q) { return x(q[0]); }).y(function (q) { return y(get(q)); })(pts);
        };
        f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-voc')).attr('stroke-width', 1.4)
            .attr('d', line(function (q) { return q[1]; }));
        [1, -1].forEach(function (sgn) {
            f.g.append('path').attr('fill', 'none').attr('stroke', css('--c-guide')).attr('stroke-width', 1.4)
                .attr('stroke-dasharray', '6 4').attr('d', line(function (q) { return sgn * q[2]; }));
        });

        var names = { sine: 'sine carrier', noise: 'noise carrier', fs: 'fine-structure carrier' };
        var lab = document.getElementById('voc-label');
        if (lab) lab.innerHTML = 'vocoder · <b>E' + p.ch + ', ' + names[p.carrier] + '</b> · ' +
            (comp ? (window.katex ? window.katex.renderToString('\\mu') : 'mu') + '-law' : 'linear') + ' · window centred on envelope peak';
    }

    window.CI.onRender(render);
    window.addEventListener('cichange', function (e) { if (e.detail.key === 'ch') render(); });
})();
