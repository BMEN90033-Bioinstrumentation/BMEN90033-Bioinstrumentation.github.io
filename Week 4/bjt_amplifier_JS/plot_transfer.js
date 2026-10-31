// Section 03 · Signal transfer through the exponential characteristic.
//   Curve panel (top left): i_C = I_S exp(v_BE/V_T), clamped at I_C(sat),
//   the Shockley Q-point and its tangent (slope g_m, +/-30 mV).
//   Input panel (below it, shared v_BE axis): v_BE(t), time running down.
//   Output panel (right of it, shared i_C axis): i_C(t), time running right;
//   exact response from the curve and linear response from the tangent.
// Static parts are drawn on parameter change; the waveforms, the sliding
// points and their projections are redrawn on every frame. The only in-plot
// text is the Q label (collision-tested) and the two time-axis letters,
// which sit in the margins. Ported from the original drawTimePlot().
//
// Layout (px, inner area iw x ih): curve panel width cw = 0.52 iw, height
// ch = 0.55 ih; x ticks and title in the 54 px band below it; input panel
// from ch + 54 to ih; output panel from cw + 16 to iw.
(function () {
    var sel = '#plot-transfer';
    var dyn = null, S = null;
    var VMIN = 0, VMAX = 0.85, TAN = 0.03;

    function render() {
        var A = window.AMP, p = A.p, T = window.T, css = window.CMP.cssVar;
        var f = A.frame(sel, { margin: { top: 36, right: 26, bottom: 14, left: 78 } });
        var g = f.g, iw = f.iw, ih = f.ih;
        var cw = iw * 0.52, ch = ih * 0.55, inT = ch + 54, inH = ih - inT, outL = cw + 16, outW = iw - outL;
        var bias = A.computeDCBias(), Q = A.shockleyQ();
        var icMax = Math.max(Q.icSat * 1.3, 0.001) * 1e3;   // mA

        var x = d3.scaleLinear().domain([VMIN, VMAX]).range([0, cw]);
        var y = d3.scaleLinear().domain([0, icMax]).range([ch, 0]);
        var css2 = { curve: css('--c-vout'), tan: css('--c-tan'), ic: css('--c-ic'), lin: css('--c-vce'), sat: css('--c-ib'), vbe: css('--c-guide') };

        // Panel backgrounds and grid.
        g.append('rect').attr('x', 0).attr('y', inT).attr('width', cw).attr('height', inH).attr('fill', T.overlay02);
        g.append('rect').attr('x', outL).attr('y', 0).attr('width', outW).attr('height', ch).attr('fill', T.overlay02);
        var cg = g.append('g');
        window.CMP.drawGrid(cg, x, y, cw, ch, { xTicks: x.ticks(8), yTicks: y.ticks(5) });
        var xa = g.append('g').attr('transform', 'translate(0,' + ch + ')')
            .call(d3.axisBottom(x).tickValues([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]).tickSizeOuter(0).tickFormat(d3.format('.1f')));
        var ya = g.append('g').call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));
        [xa, ya].forEach(window.CMP.styleAxis);
        window.renderKatex(f.svg, 'i_C\\;[\\mathrm{mA}]', 22, f.m.top + ch / 2, { width: 200, height: 22, rotate: -90, size: 16 });
        window.renderKatex(f.svg, 'v_{BE}\\;[\\mathrm{V}]', f.m.left + cw / 2, f.m.top + ch + 40, { width: 200, height: 22, size: 16 });

        // Time axes: input panel left edge (down), output panel at I_CQ (right).
        var qx = x(Q.vbe), qy = y(Q.ic * 1e3);
        function arrowHead(px, py, dir) {
            var pts = dir === 'down' ? [[px, py], [px - 4, py - 8], [px + 4, py - 8]] : [[px, py], [px - 8, py - 4], [px - 8, py + 4]];
            g.append('polygon').attr('points', pts.map(function (q) { return q.join(','); }).join(' ')).attr('fill', T.overlay40);
        }
        g.append('line').attr('x1', 0).attr('x2', 0).attr('y1', inT).attr('y2', ih).attr('stroke', T.gridAxis);
        arrowHead(0, ih, 'down');
        window.renderKatex(f.svg, 't', f.m.left - 14, f.m.top + ih - 8, { width: 16, height: 18, size: 15, color: T.textDim });
        g.append('line').attr('x1', outL).attr('x2', iw).attr('y1', qy).attr('y2', qy).attr('stroke', T.gridMed);
        arrowHead(iw, qy, 'right');
        window.renderKatex(f.svg, 't', f.m.left + iw + 13, f.m.top + qy, { width: 16, height: 18, size: 15, color: T.textDim });

        // Shockley curve, clamped at the saturation limit.
        var curvePts = d3.range(0, 301).map(function (i) {
            var v = VMIN + (VMAX - VMIN) * i / 300;
            return [x(v), y(Math.min(A.IS * Math.exp(v / A.VT), Q.icSat) * 1e3)];
        });
        g.append('clipPath').attr('id', 'tr-clip-c').append('rect').attr('x', 0).attr('y', -4).attr('width', cw).attr('height', ch + 4);
        g.append('path').attr('clip-path', 'url(#tr-clip-c)').attr('class', 'trace').attr('stroke', css2.curve)
            .attr('stroke-width', 2.5).attr('d', d3.line()(curvePts));
        var ySat = y(Q.icSat * 1e3);
        g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ySat).attr('y2', ySat)
            .attr('stroke', css2.sat).attr('stroke-opacity', 0.6).attr('stroke-dasharray', '4 3');

        // Q guides and tangent.
        g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', qy).attr('y2', qy)
            .attr('stroke', css2.ic).attr('stroke-opacity', 0.35).attr('stroke-dasharray', '5 4');
        // V_BE guide, broken across the tick and title band below the curve panel.
        g.append('path').attr('fill', 'none').attr('stroke', T.gridStrong).attr('stroke-dasharray', '5 4')
            .attr('d', 'M' + qx + ',0V' + ch + 'M' + qx + ',' + inT + 'V' + ih);
        var tanPts = [];
        if (Q.gm > 0) {
            d3.range(0, 51).forEach(function (s) {
                var dv = -TAN + 2 * TAN * s / 50, v = Q.vbe + dv;
                if (v < 0) return;
                tanPts.push([x(v), y(Math.max(0, Math.min(Q.ic + Q.gm * dv, Q.icSat)) * 1e3)]);
            });
            g.append('path').attr('class', 'trace').attr('stroke', css2.tan).attr('stroke-width', 2.5).attr('d', d3.line()(tanPts));
        }
        var cQ = bias.region === 'saturation' ? css2.sat : css2.curve;
        g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 5.5).attr('fill', cQ).attr('stroke', T.text).attr('stroke-width', 1);

        // Q label: first candidate clear of the curve, the tangent and the panel edges.
        var obst = curvePts.concat(tanPts);
        [[-22, -16], [-22, 16], [10, 18], [10, -18]].some(function (o) {
            var bx = qx + o[0], by = qy + o[1], b = [bx - 2, by - 9, bx + 14, by + 9];
            var ok = b[0] > 2 && b[1] > 2 && b[2] < cw - 2 && b[3] < ch - 2 &&
                !obst.some(function (q) { return q[0] > b[0] - 2 && q[0] < b[2] + 2 && q[1] > b[1] - 2 && q[1] < b[3] + 2; });
            if (ok) window.renderKatex(f.svg, 'Q', f.m.left + bx + 6, f.m.top + by, { width: 16, height: 18, size: 15, color: cQ });
            return ok;
        });

        // Layers redrawn on every frame.
        g.append('clipPath').attr('id', 'tr-clip-o').append('rect').attr('x', outL).attr('y', 0).attr('width', outW).attr('height', ch);
        g.append('clipPath').attr('id', 'tr-clip-i').append('rect').attr('x', 0).attr('y', inT).attr('width', cw).attr('height', inH);
        dyn = {
            proj: g.append('path').attr('fill', 'none').attr('stroke', T.overlay25).attr('stroke-dasharray', '3 3'),
            vbe: g.append('path').attr('clip-path', 'url(#tr-clip-i)').attr('fill', 'none').attr('stroke', css2.vbe).attr('stroke-width', 2),
            exact: g.append('path').attr('clip-path', 'url(#tr-clip-o)').attr('fill', 'none').attr('stroke', css2.ic).attr('stroke-width', 2),
            lin: g.append('path').attr('clip-path', 'url(#tr-clip-o)').attr('fill', 'none').attr('stroke', css2.lin)
                .attr('stroke-width', 2).attr('stroke-dasharray', '5 3'),
            dotT: g.append('circle').attr('r', 5).attr('fill', css2.lin),
            dotC: g.append('circle').attr('r', 5).attr('fill', css2.ic)
        };
        S = { x: x, y: y, Q: Q, bias: bias, ch: ch, inT: inT, inH: inH, outL: outL, outW: outW };
        tick();
    }

    function tick() {
        if (!dyn) return;
        var A = window.AMP, p = A.p, b = A.buf, N = b.t.length, s = S, Q = s.Q;
        var hide = function (el) { el.attr('d', null).style('display', 'none'); };
        if (N < 2) { ['proj', 'vbe', 'exact', 'lin'].forEach(function (k) { hide(dyn[k]); }); dyn.dotT.style('display', 'none'); dyn.dotC.style('display', 'none'); return; }
        var t0 = b.t[0], t1 = b.t[N - 1] || 1;
        var vbes = b.vin.map(function (v) { return A.solveVBE(p.vbb + v); });
        var tY = function (t) { return s.inT + (t - t0) / (t1 - t0 || 1) * s.inH; };
        var tX = function (t) { return s.outL + (t - t0) / (t1 - t0 || 1) * s.outW; };
        var icY = function (a) { return s.y(a * 1e3); };

        dyn.vbe.style('display', null).attr('d', d3.line()(vbes.map(function (v, i) { return [s.x(v), tY(b.t[i])]; })));
        dyn.exact.style('display', p.exact === 'on' ? null : 'none')
            .attr('d', d3.line()(vbes.map(function (v, i) { return [tX(b.t[i]), icY(Math.min(A.IS * Math.exp(v / A.VT), Q.icSat))]; })));
        var linOn = p.tangent === 'on' && Q.gm > 0;
        dyn.lin.style('display', linOn ? null : 'none')
            .attr('d', d3.line()(vbes.map(function (v, i) { return [tX(b.t[i]), icY(Math.max(0, Math.min(Q.ic + Q.gm * (v - Q.vbe), Q.icSat)))]; })));

        var vNow = vbes[N - 1];
        var icT = Math.max(0, Math.min(Q.ic + Q.gm * (vNow - Q.vbe), Q.icSat));
        var icC = Math.max(0, Math.min(A.IS * Math.exp(vNow / A.VT), Q.icSat));
        var px = s.x(vNow), pyT = icY(icT);
        var show = Q.gm > 0;
        dyn.dotT.style('display', show && s.bias.region === 'active' ? null : 'none').attr('cx', px).attr('cy', pyT);
        dyn.dotC.style('display', show ? null : 'none').attr('cx', px).attr('cy', icY(icC));
        // Projections: input point up to the curve, tangent point across to the output.
        dyn.proj.style('display', show ? null : 'none').attr('d', 'M' + px + ',' + tY(t1) + 'V' + pyT + 'M0,' + pyT + 'H' + tX(t1));
    }

    window.AMP.onRender(render);
    window.addEventListener('amptick', tick);
    window.AMP.watch(document.querySelector(sel));
})();
