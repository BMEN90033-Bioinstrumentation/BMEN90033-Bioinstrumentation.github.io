// Section 03 · Fourier decomposition. With progress k = 0 every component
// is drawn about a common centre line together with their sum; as k rises
// to 1 (0.5 per second while running) the sum fades out and each component
// moves to its own lane. Lane names sit in the left margin, outside the
// plot area, so they cannot cross a trace. Ported from the original
// decomposition animation; the stacked view is scaled so the sum fits.
(function () {
    var sel = '#plot-fourier';
    var st = { k: 0, running: false, raf: 0, last: 0 };
    var view = null;

    function render() {
        var H = window.THD, p = H.p, css = window.CMP.cssVar, T = window.T;
        var f = H.frame(sel, {});
        var g = f.g, iw = f.iw, ih = f.ih;
        var tEnd = H.CYCLES / p.f * 1000, N = 600;
        var x = d3.scaleLinear().domain([0, tEnd]).range([0, iw]);
        var th = d3.range(0, N + 1).map(function (i) { return i / N * H.CYCLES * 2 * Math.PI; });

        var xa = g.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));
        window.CMP.styleAxis(xa);
        window.renderKatex(f.svg, 't~[\\mathrm{ms}]', f.m.left + iw / 2, f.H - 18, { width: 200, height: 22, size: 16 });

        var comps = [1];
        for (var n = 2; n <= 5; n++) if (H.amp(n) > 0.001) comps.push(n);
        var laneH = ih / comps.length;
        var vmax = Math.max(1, d3.max(th, function (t) { return Math.abs(H.combined(t)); }));
        var stackedAmp = ih * 0.3 / vmax;

        var seps = comps.slice(1).map(function (c, i) {
            return g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', laneH * (i + 1)).attr('y2', laneH * (i + 1))
                .attr('stroke', css('--grid-zero'));
        });
        var lanes = comps.map(function (c, i) {
            return {
                n: c, a: H.amp(c), mid: laneH * (i + 0.5),
                path: g.append('path').attr('class', 'trace').attr('stroke', css(H.COL[c]))
                    .attr('stroke-width', c === 1 ? 2 : 1.8),
                label: window.renderKatex(f.svg, (c === 1 ? '' : c) + 'f_1', f.m.left - 26, f.m.top + laneH * (i + 0.5),
                    { width: 44, height: 20, size: 15, color: css(H.COL[c]) })
            };
        });
        var sum = g.append('path').attr('class', 'trace').attr('stroke', css('--c-fund')).attr('stroke-width', 2.6);
        var yTitle = window.renderKatex(f.svg, '\\text{component}', 18, f.m.top + ih / 2,
            { width: 200, height: 22, rotate: -90, size: 15 });

        view = { x: x, th: th, N: N, tEnd: tEnd, ih: ih, laneH: laneH, stackedAmp: stackedAmp,
            lanes: lanes, seps: seps, sum: sum, yTitle: yTitle, single: comps.length === 1 };
        var hint = document.getElementById('fourier-hint');
        if (hint) hint.style.display = comps.length === 1 ? '' : 'none';
        draw();
    }

    function draw() {
        if (!view) return;
        var v = view, k = st.k, mid0 = v.ih / 2;
        function line(fn) {
            return d3.line()(v.th.map(function (t, i) { return [v.x(i / v.N * v.tEnd), fn(t)]; }));
        }
        v.lanes.forEach(function (L) {
            var mid = mid0 + (L.mid - mid0) * k;
            var a = v.stackedAmp * L.a + (v.laneH * 0.35 * L.a - v.stackedAmp * L.a) * k;
            L.path.attr('d', line(function (t) { return mid - a * Math.sin(L.n * t); }))
                .attr('stroke-opacity', L.n === 1 ? 0.4 + 0.6 * k : 1);
            L.label.style('opacity', v.single ? 1 : k);
        });
        v.seps.forEach(function (s) { s.attr('stroke-opacity', k); });
        v.yTitle.style('opacity', v.single ? 1 : k);
        v.sum.attr('d', line(function (t) { return mid0 - v.stackedAmp * window.THD.combined(t); }))
            .attr('stroke-opacity', (1 - k) * 0.8);
    }

    function frame(now) {
        var dt = st.last ? Math.min(0.1, (now - st.last) / 1000) : 0;
        st.last = now;
        st.k = Math.min(1, st.k + dt * 0.5);
        draw();
        if (st.running && st.k < 1) st.raf = requestAnimationFrame(frame);
        else { st.raf = 0; st.running = st.k < 1 && st.running; label(); }
    }
    function label() {
        var b = document.querySelector('[data-action="decompose"]');
        if (b) { b.textContent = st.running ? 'stop' : 'decompose'; b.classList.toggle('active', st.running); }
    }
    function init() {
        document.querySelectorAll('[data-action]').forEach(function (b) {
            b.addEventListener('click', function () {
                if (b.dataset.action === 'decompose') {
                    st.running = !st.running;
                    if (st.running && !st.raf) { st.last = 0; st.raf = requestAnimationFrame(frame); }
                } else {
                    st.running = false; st.k = 0; draw();
                }
                label();
            });
        });
        label();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    window.THD.onRender(render);
    window.THD.setDecompose = function (k) { st.k = k; draw(); };
})();
