// Section 01 · Schematic of the selected class with animated current flow.
// Drawn in a fixed 640 x 420 viewBox; all wires are orthogonal. render()
// draws the static schematic; tick() updates the flow overlays (dashed
// paths whose offset advances with time and whose opacity follows the
// original intensity model) and, for class AB, the base annotations.
//
// Layout (viewBox units):
//   Class A: VCC rail y = 46 (x 200..330). R1 / R2 divider on x = 200, base
//     node (200, 190). Source (70, 270) -> Cin (plates x 131 / 139) -> base.
//     BJT centre (330, 190), r = 26. RC box y 66..126 on x = 330, output tap
//     y = 145 -> Cout (plates x 446 / 454) -> terminal (546, 145).
//     RE box y 270..330, CE on x = 420 (plates y 290 / 298), ground y = 350.
//   Class B / AB: NPN (330, 130), PNP (330, 290), r = 26. VCC bar y = 40,
//     VEE bar y = 380. Bases joined on x = 270 with input node (270, 210).
//     Source (70, 290) -> Cin (plates x 185 / 193) -> (270, 210).
//     Output node (330, 210) -> Cout (plates x 420 / 428) -> node (500, 210),
//     RL box y 250..310 on x = 500, terminal (566, 210).
//     AB adds Rb1 (y 60..110) and Rb2 (y 310..360) on x = 270 and diodes
//     D1, D2 centred at y = 170 and y = 250. Annotations sit left of x = 258.
(function () {
    var sel = '#plot-circuit';
    var W = 640, H = 420;
    var flows = {}, abLabels = null;

    function css(n) { return window.CMP.cssVar(n); }

    function render() {
        var A = window.AMP, p = A.p, T = window.T, cls = p.cls;
        var wire = T.fg(0.6), ink = T.fg(0.85);
        var svg = d3.select(sel);
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 ' + W + ' ' + H).attr('preserveAspectRatio', 'xMidYMid meet');
        flows = {}; abLabels = null;

        function line(x1, y1, x2, y2, col, w) {
            svg.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', col || wire).attr('stroke-width', w || 1.6).attr('stroke-linecap', 'round');
        }
        function tex(latex, x, y, o) { return window.renderKatex(svg, latex, x, y, o); }
        function texL(latex, x, y, o) {
            o = Object.assign({ width: 180, height: 20, size: 14, align: 'left' }, o);
            return tex(latex, x + o.width / 2, y, o);
        }
        function texR(latex, x, y, o) {
            o = Object.assign({ width: 120, height: 20, size: 14, align: 'right' }, o);
            return tex(latex, x - o.width / 2, y, o);
        }
        function dot(x, y) { svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 3).attr('fill', ink); }
        function terminal(x, y) {
            svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 4)
                .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
        }
        function resV(x, y1, y2) {
            svg.append('rect').attr('x', x - 10).attr('y', y1).attr('width', 20).attr('height', y2 - y1)
                .attr('fill', css('--bg-2')).attr('stroke', ink).attr('stroke-width', 1.6);
        }
        // Capacitor with plates perpendicular to a horizontal (h) or vertical wire.
        function capH(xa, xb, y) {
            line(xa, y - 12, xa, y + 12, ink, 2.2); line(xb, y - 12, xb, y + 12, ink, 2.2);
        }
        function capV(x, ya, yb) {
            line(x - 12, ya, x + 12, ya, ink, 2.2); line(x - 12, yb, x + 12, yb, ink, 2.2);
        }
        function ground(x, y) {
            [12, 8, 4].forEach(function (hw, i) { line(x - hw, y + i * 5, x + hw, y + i * 5, wire, 1.6); });
        }
        function rail(x, y, label) {
            line(x - 16, y, x + 16, y, ink, 2);
            texL(label, x + 24, y, { width: 150 });
        }
        function source(x, y, label) {
            svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 20)
                .attr('fill', 'none').attr('stroke', ink).attr('stroke-width', 1.6);
            tex('+', x, y - 9, { width: 16, height: 16, size: 13 });
            tex('-', x, y + 9, { width: 16, height: 16, size: 13 });
            texL(label, x + 28, y, { width: 80 });
        }
        // Diode pointing down (anode at top), centred at (x, yc).
        function diode(x, yc) {
            svg.append('polygon').attr('points', [[x - 9, yc - 9], [x + 9, yc - 9], [x, yc + 9]]
                .map(function (q) { return q.join(','); }).join(' '))
                .attr('fill', T.fg(0.25)).attr('stroke', ink).attr('stroke-width', 1.4);
            line(x - 9, yc + 9, x + 9, yc + 9, ink, 2);
        }
        // BJT symbol, reference style. NPN: C top, E bottom, arrow out on E.
        // PNP: E top, C bottom, arrow in on E.
        function bjt(bx, by, npn) {
            var r = 26, top = by - r, bot = by + r;
            svg.append('circle').attr('cx', bx).attr('cy', by).attr('r', r)
                .attr('fill', 'none').attr('stroke', T.fg(0.3)).attr('stroke-width', 1.2);
            var barX = bx - r * 0.4, barH = r * 0.6;
            line(bx - r, by, barX, by, ink, 2);
            line(barX, by - barH, barX, by + barH, ink, 3);
            var yUp = by - barH * 0.45, yDn = by + barH * 0.45;
            line(barX, yUp, bx, top, ink, 1.8);
            line(barX, yDn, bx, bot, ink, 1.8);
            var tip, from;
            if (npn) { tip = [bx, bot]; from = [barX, yDn]; } else { tip = [barX, yUp]; from = [bx, top]; }
            var dx = tip[0] - from[0], dy = tip[1] - from[1], L = Math.hypot(dx, dy);
            var ux = dx / L, uy = dy / L, a = 8;
            svg.append('polygon').attr('fill', ink).attr('points', [
                tip,
                [tip[0] - ux * a - uy * a * 0.45, tip[1] - uy * a + ux * a * 0.45],
                [tip[0] - ux * a + uy * a * 0.45, tip[1] - uy * a - ux * a * 0.45]
            ].map(function (q) { return q.join(','); }).join(' '));
            var small = { width: 20, size: 12, color: T.textDim };
            texL('\\text{' + (npn ? 'C' : 'E') + '}', bx + 6, top - 4, small);
            texL('\\text{' + (npn ? 'E' : 'C') + '}', bx + 6, bot + 6, small);
            texR('\\text{B}', bx - r - 4, by - 12, small);
        }
        // Flow overlay: faint glow plus round-capped dashes that read as dots.
        function flow(name, pts) {
            var d = d3.line()(pts);
            flows[name] = {
                glow: svg.append('path').attr('d', d).attr('fill', 'none').attr('stroke-width', 5)
                    .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('stroke-opacity', 0),
                dots: svg.append('path').attr('d', d).attr('fill', 'none').attr('stroke-width', 4.5)
                    .attr('stroke-linecap', 'round').attr('stroke-dasharray', '0 18').attr('stroke-opacity', 0)
            };
        }

        if (cls === 'A') {
            line(200, 46, 330, 46, ink, 2);
            tex('V_{CC} = ' + A.VCC + '\\,\\text{V}', 265, 26, { width: 140, height: 20, size: 14 });
            line(200, 46, 200, 85); resV(200, 85, 145); line(200, 145, 200, 235);
            texR('R_1', 188, 115);
            resV(200, 235, 295); line(200, 295, 200, 350); ground(200, 350);
            texR('R_2', 188, 265);
            dot(200, 190);
            source(70, 270, 'v_\\text{in}');
            line(70, 250, 70, 190); line(70, 190, 131, 190); capH(131, 139, 190); line(139, 190, 304, 190);
            tex('C_\\text{in}', 135, 164, { width: 50, height: 20, size: 14 });
            line(70, 290, 70, 350); ground(70, 350);
            bjt(330, 190, true);
            line(330, 46, 330, 66); resV(330, 66, 126); line(330, 126, 330, 164);
            texR('R_C', 318, 96);
            dot(330, 145);
            line(330, 145, 446, 145); capH(446, 454, 145); line(454, 145, 542, 145); terminal(546, 145);
            tex('C_\\text{out}', 450, 119, { width: 50, height: 20, size: 14 });
            texL('v_\\text{out}', 556, 145, { width: 70 });
            line(330, 216, 330, 270); resV(330, 270, 330); line(330, 330, 330, 350); ground(330, 350);
            texR('R_E', 318, 300);
            dot(330, 250);
            line(330, 250, 420, 250); line(420, 250, 420, 290); capV(420, 290, 298);
            line(420, 298, 420, 350); line(420, 350, 330, 350);
            texL('C_E', 438, 294, { width: 40 });

            flow('collector', [[330, 46], [330, 350]]);
            flow('base', [[200, 46], [200, 190], [304, 190]]);
            flow('vin', [[70, 250], [70, 190], [304, 190]]);
            flow('vout', [[330, 145], [542, 145]]);
        } else {
            var ab = cls === 'AB';
            bjt(330, 130, true);
            bjt(330, 290, false);
            rail(330, 40, 'V_{CC} = +' + A.VCC + '\\,\\text{V}');
            rail(330, 380, 'V_{EE} = -' + A.VCC + '\\,\\text{V}');
            line(330, 40, 330, 104); line(330, 156, 330, 264); line(330, 316, 330, 380);
            dot(330, 210);
            line(270, 130, 304, 130); line(270, 290, 304, 290);
            if (ab) {
                line(270, 40, 330, 40, ink, 2); line(270, 380, 330, 380, ink, 2);
                line(270, 40, 270, 60); resV(270, 60, 110); line(270, 110, 270, 161);
                texR('R_{b1}', 258, 85);
                diode(270, 170); line(270, 179, 270, 241);
                diode(270, 250); line(270, 259, 270, 310);
                texR('D_1', 254, 170, { width: 40 }); texR('D_2', 254, 250, { width: 40 });
                resV(270, 310, 360); line(270, 360, 270, 380);
                texR('R_{b2}', 258, 335);
                dot(270, 130); dot(270, 290);
            } else {
                line(270, 130, 270, 290);
            }
            dot(270, 210);
            source(70, 290, A.GAIN + '\\,v_\\text{in}');
            line(70, 270, 70, 210); line(70, 210, 185, 210); capH(185, 193, 210); line(193, 210, 270, 210);
            tex('C_\\text{in}', 189, 184, { width: 50, height: 20, size: 14 });
            line(70, 310, 70, 380); ground(70, 380);
            line(330, 210, 420, 210); capH(420, 428, 210); line(428, 210, 562, 210); terminal(566, 210);
            tex('C_\\text{out}', 424, 184, { width: 50, height: 20, size: 14 });
            dot(500, 210);
            line(500, 210, 500, 250); resV(500, 250, 310); line(500, 310, 500, 350); ground(500, 350);
            texL('R_L', 514, 280, { width: 40 });
            texL('v_\\text{out}', 576, 210, { width: 60 });

            if (ab) flow('bias', [[270, 40], [270, 380]]);
            flow('vin', [[70, 270], [70, 210], [270, 210]]);
            flow('toNpn', [[270, 210], [270, 130], [304, 130]]);
            flow('toPnp', [[270, 210], [270, 290], [304, 290]]);
            flow('npn', [[330, 40], [330, 210]]);
            flow('pnp', [[330, 210], [330, 380]]);
            flow('vout', [[330, 210], [500, 210], [500, 350]]);
            flow('voutRev', [[500, 350], [500, 210], [330, 210]]);

            if (ab) {
                var o = { width: 110, height: 18, size: 13 };
                abLabels = {
                    vbN: texR('', 254, 120, Object.assign({ color: css('--c-npn') }, o)),
                    ibN: texR('', 254, 140, Object.assign({ color: css('--c-npn') }, o)),
                    vbP: texR('', 254, 282, Object.assign({ color: css('--c-pnp') }, o)),
                    ibP: texR('', 254, 302, Object.assign({ color: css('--c-pnp') }, o))
                };
            }
        }

        var lab = document.getElementById('circuit-label');
        if (lab) lab.innerHTML = 'circuit · <b>' + (cls === 'A' ? 'class A common-emitter stage'
            : cls === 'B' ? 'class B complementary push-pull' : 'class AB diode-biased push-pull') + '</b>';
        tick();
    }

    function setFlow(name, colVar, alpha) {
        var f = flows[name];
        if (!f) return;
        var a = Math.max(0, Math.min(1, alpha)), c = css(colVar);
        f.glow.attr('stroke', c).attr('stroke-opacity', a * 0.3);
        f.dots.attr('stroke', c).attr('stroke-opacity', a)
            .attr('stroke-dashoffset', -(window.AMP.clock.t * 80) % 18);
    }

    function setTex(fo, latex) {
        var div = fo.select('div').node();
        if (div.dataset.tex === latex) return;
        div.dataset.tex = latex;
        window.katex.render(latex, div, { throwOnError: false });
    }

    // Intensities follow the original drawClass*CurrentFlow functions.
    function tick() {
        var A = window.AMP, p = A.p, vin = A.vinNow(), s = A.state(vin), n = s.n;
        var sig = Math.abs(n), d = A.derived();
        Object.keys(flows).forEach(function (k) { setFlow(k, '--c-npn', 0); });
        if (p.cls === 'A') {
            var bi = 0.5 + n * 0.4;
            setFlow('collector', '--c-npn', bi);
            setFlow('base', '--c-bias', bi * 0.4);
            setFlow('vin', '--c-vin', sig * 0.6);
            setFlow('vout', '--c-npn', sig * 0.8);
        } else if (p.cls === 'B') {
            var dz = s.dz;
            setFlow('vin', '--c-vin', sig * 0.6);
            setFlow('toNpn', '--c-npn', sig * 0.5);
            setFlow('toPnp', '--c-pnp', sig * 0.5);
            if (n > dz) {
                var i1 = Math.min(1, (n - dz) / (1 - dz));
                setFlow('npn', '--c-npn', i1); setFlow('vout', '--c-npn', i1 * 0.8);
            } else if (n < -dz) {
                var i2 = Math.min(1, (-n - dz) / (1 - dz));
                setFlow('pnp', '--c-pnp', i2); setFlow('voutRev', '--c-pnp', i2 * 0.8);
            } else if (d.vinPeak > 0) {
                setFlow('vin', '--c-dead', 0.5);
            }
        } else {
            var ni = Math.max(0.15, Math.min(1, 0.5 + n * 0.6));
            var pi = Math.max(0.15, Math.min(1, 0.5 - n * 0.6));
            setFlow('bias', '--c-bias', 0.3);
            setFlow('vin', '--c-vin', Math.max(sig * 0.6, 0.15));
            setFlow('toNpn', '--c-npn', Math.max(sig * 0.5, 0.1));
            setFlow('toPnp', '--c-pnp', Math.max(sig * 0.5, 0.1));
            setFlow('npn', '--c-npn', ni);
            setFlow('pnp', '--c-pnp', pi);
            if (n >= 0) setFlow('vout', '--c-npn', Math.max(sig * 0.8, 0.15));
            else setFlow('voutRev', '--c-pnp', Math.max(sig * 0.8, 0.15));
            if (abLabels) {
                var icq = d.icq > 0 ? d.icq : 5;
                setTex(abLabels.vbN, 'V_B = ' + (A.VBE + vin).toFixed(2) + '\\,\\text{V}');
                setTex(abLabels.ibN, 'I_B = ' + (ni * icq / A.BETA * 1000).toFixed(0) + '\\,\\mu\\text{A}');
                setTex(abLabels.vbP, 'V_B = ' + (-A.VBE + vin).toFixed(2) + '\\,\\text{V}');
                setTex(abLabels.ibP, 'I_B = ' + (pi * icq / A.BETA * 1000).toFixed(0) + '\\,\\mu\\text{A}');
            }
        }
        var st = document.querySelector('[data-out="state"]');
        if (st) {
            var txt = (s.key === 'quiet' || s.key === 'dead' ? 'v_in ≈ 0: ' : n > 0 ? 'v_in > 0: ' : 'v_in < 0: ') + s.text;
            if (st.textContent !== txt) st.textContent = txt;
        }
    }

    window.AMP.onRender(render);
    window.AMP.onTick(tick);
})();
