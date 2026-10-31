// Section 03 · Equilibrium electron and hole concentrations in silicon at
// the present temperature against dopant concentration (log-log, single
// quadrant). Donor or acceptor doping follows the page mode; in pure-silicon
// mode the donor curves are shown without markers. The n_i label is placed
// by collision test: candidate positions along its dashed line, above and
// below, are tried in order and the first whose box no curve enters is used.
(function () {
    var sel = '#plot-conc';
    var X0 = 1e8, X1 = 1e19, Y0 = 1, Y1 = 1e20;

    function render() {
        var D = window.DOP, p = D.p, T = window.T, css = window.CMP.cssVar;
        var type = p.mode === 'ptype' ? 'ptype' : 'ntype';
        var f = D.frame(sel, { margin: { left: 84, right: 28 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var x = d3.scaleLog().domain([X0, X1]).range([0, iw]);
        var y = d3.scaleLog().domain([Y0, Y1]).range([ih, 0]);
        var gl = css('--grid-line');

        d3.range(8, 20).forEach(function (k) {
            g.append('line').attr('x1', x(Math.pow(10, k))).attr('x2', x(Math.pow(10, k))).attr('y1', 0).attr('y2', ih).attr('stroke', gl);
        });
        d3.range(0, 21, 2).forEach(function (k) {
            g.append('line').attr('y1', y(Math.pow(10, k))).attr('y2', y(Math.pow(10, k))).attr('x1', 0).attr('x2', iw).attr('stroke', gl);
        });
        var xt = [1e8, 1e10, 1e12, 1e14, 1e16, 1e18], yt = [1, 1e5, 1e10, 1e15, 1e20];
        var blank = function () { return ''; };
        var xa = g.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(d3.axisBottom(x).tickValues(xt).tickFormat(blank).tickSizeOuter(0));
        var ya = g.append('g').call(d3.axisLeft(y).tickValues(yt).tickFormat(blank).tickSizeOuter(0));
        [xa, ya].forEach(window.CMP.styleAxis);
        xt.forEach(function (v) {
            window.renderKatex(f.svg, '10^{' + Math.round(Math.log10(v)) + '}', f.m.left + x(v), f.m.top + ih + 18,
                { width: 44, height: 18, size: 13, color: T.text });
        });
        yt.forEach(function (v) {
            window.renderKatex(f.svg, '10^{' + Math.round(Math.log10(v)) + '}', f.m.left - 30, f.m.top + y(v),
                { width: 40, height: 18, size: 13, color: T.text, align: 'right' });
        });
        window.renderKatex(f.svg, 'n,\\ p\\;[\\mathrm{cm^{-3}}]', 18, f.m.top + ih / 2,
            { width: 200, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, (type === 'ntype' ? 'N_D' : 'N_A') + '\\;[\\mathrm{cm^{-3}}]',
            f.m.left + iw / 2, f.H - 18, { width: 200, height: 22, size: 16 });

        var pts = d3.range(0, 401).map(function (i) {
            var N = Math.pow(10, 8 + 11 * i / 400); return [N, D.carriers(N, type, p.temp)];
        });
        var inR = function (v) { return v >= Y0 && v <= Y1; };
        [['n', '--c-n'], ['p', '--c-pc']].forEach(function (s) {
            g.append('path').attr('fill', 'none').attr('stroke', css(s[1])).attr('stroke-width', 2.4)
                .attr('d', d3.line().defined(function (d) { return inR(d[1][s[0]]); })
                    .x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1][s[0]]); })(pts));
        });

        // n_i reference and its label.
        var ni = D.niSi(p.temp);
        if (inR(ni)) {
            var yi = y(ni);
            g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yi).attr('y2', yi)
                .attr('stroke', T.fg(0.45)).attr('stroke-dasharray', '6 4');
            var lw = 28, lh = 18;
            var cands = [[iw - 20, yi - 13], [iw - 20, yi + 13], [iw * 0.75, yi - 13], [iw * 0.75, yi + 13],
                         [iw * 0.5, yi - 13], [iw * 0.5, yi + 13]];
            var hit = function (c) {
                if (c[1] - lh / 2 < 2 || c[1] + lh / 2 > ih - 2) return true;
                return pts.some(function (d) {
                    var px = x(d[0]);
                    if (px < c[0] - lw / 2 - 4 || px > c[0] + lw / 2 + 4) return false;
                    return ['n', 'p'].some(function (k) {
                        var v = d[1][k];
                        return inR(v) && Math.abs(y(v) - c[1]) < lh / 2 + 3;
                    });
                });
            };
            for (var i = 0; i < cands.length; i++) {
                if (!hit(cands[i])) {
                    window.renderKatex(f.svg, 'n_i', f.m.left + cands[i][0], f.m.top + cands[i][1],
                        { width: lw, height: lh, size: 15, color: T.textDim });
                    break;
                }
            }
        }

        if (p.mode !== 'pure') {
            var c = D.carriers(D.N(), type, p.temp);
            [['n', '--c-n'], ['p', '--c-pc']].forEach(function (s) {
                if (!inR(c[s[0]])) return;
                g.append('circle').attr('cx', x(D.N())).attr('cy', y(c[s[0]])).attr('r', 4.5)
                    .attr('fill', css(s[1])).attr('stroke', T.text).attr('stroke-width', 1);
            });
        }

        var lab = document.getElementById('conc-label');
        if (lab) lab.innerHTML = 'silicon at ' + Math.round(p.temp) + ' K · <b>$n$ and $p$ against dopant concentration</b>' +
            (p.mode === 'pure' ? ' · donor curves shown' : '');
        if (lab && window.renderMathInElement) window.renderMathInElement(lab, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
    }

    window.DOP.onRender(render);
})();
