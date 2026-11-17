// Section 02 LHS · Live non-inverting Schmitt schematic.
// Topology, matching the standard non-inverting form:
//   v_in ──[R_1]──┬──(+) op-amp ──● v_out
//                 │   (-) op-amp ──── GND
//                 └──[R_2]── (above the op-amp, returning from v_out)
// Resistors are drawn at fixed equal length; only their displayed
// numeric values change with beta. The output wire is coloured by the
// current rail. Live values for v_in, V_+, v_out are shown both inline
// and in an HTML overlay panel.
(function () {
    var sel = '#plot-live-circuit';

    var Vsat = 5;
    var R_TOTAL_KOHM = 100;

    window.SCH = window.SCH || {};
    window.SCH.state = window.SCH.state ||
        { beta: 0.20, probe: 0, branch: +1 };

    var VB_W = 420;
    var VB_H = 300;

    // Op-amp triangle, +input on top, -input on bottom.
    var TRI = {
        topLeft: [210, 130],
        botLeft: [210, 200],
        apex:    [290, 165]
    };
    var Y_PLUS  = 145;
    var Y_MINUS = 185;

    // Wire and resistor coordinates
    var X_VIN_DOT = 40;
    var X_R1_L    = 75;
    var X_R1_R    = 135;
    var X_NODE    = 175;       // node A: + input wire, R_1 right end, R_2 descender
    var X_PIN_PLUS  = TRI.topLeft[0];
    var X_PIN_MINUS = TRI.topLeft[0];
    var X_OUT_TAP   = 340;     // descender from R_2 returns here
    var X_VOUT_DOT  = 390;
    var Y_R2        = 80;
    var X_R2_L      = 220;
    var X_R2_R      = 280;
    var R_THICK     = 12;

    // Ground stub for (-) input
    var X_GND   = 185;
    var Y_GND_TOP = Y_MINUS;
    var Y_GND     = 235;

    function ratio(beta) { return beta / (1 - beta); }   // R_1 / R_2

    function fmt(v, digits) {
        digits = digits == null ? 2 : digits;
        var sign = v >= 0 ? '+' : '';
        return sign + v.toFixed(digits);
    }
    // Plain-text form with a true minus sign, for the HTML overlay.
    function txt(v, digits) { return fmt(v, digits).replace('-', '\u2212'); }
    function fmtR(kohm) {
        if (kohm < 1)  return (kohm * 1000).toFixed(0) + ' \\, \\mathrm{\\Omega}';
        if (kohm < 10) return kohm.toFixed(1) + ' \\, \\mathrm{k\\Omega}';
        return kohm.toFixed(0) + ' \\, \\mathrm{k\\Omega}';
    }

    // KaTeX markup for the overlay row names, rendered once per symbol.
    var texCache = {};
    function tex(src) {
        if (!window.katex) return src;
        return texCache[src] ||
            (texCache[src] = window.katex.renderToString(src, { throwOnError: false }));
    }

    function render() {
        var s = window.SCH.state;
        var Vout  = s.branch > 0 ? +Vsat : -Vsat;
        var Vplus = s.probe * (1 - s.beta) + Vout * s.beta;
        var R1k   = R_TOTAL_KOHM * s.beta;
        var R2k   = R_TOTAL_KOHM * (1 - s.beta);

        var root = d3.select(sel);
        root.selectAll('*').remove();

        var svg = root.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var wire   = window.T.wire;
        var fill   = window.T.plotBg;
        var text   = window.T.text;
        var dim    = window.T.textDim;
        var rcol   = window.CMP.cssVar('--c-resistor');
        var cHigh  = window.CMP.cssVar('--c-high');
        var cLow   = window.CMP.cssVar('--c-low');
        var stroke = 1.6;
        var outColor = s.branch > 0 ? cHigh : cLow;

        function ln(x1, y1, x2, y2, color, w) {
            svg.append('line')
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', color || wire)
                .attr('stroke-width', w || stroke)
                .attr('stroke-linecap', 'square');
        }
        function dot(cx, cy, color) {
            svg.append('circle')
                .attr('cx', cx).attr('cy', cy).attr('r', 3.2)
                .attr('fill', color || wire).attr('stroke', 'none');
        }

        // ── Op-amp triangle ──
        svg.append('polygon')
            .attr('points', [TRI.topLeft, TRI.botLeft, TRI.apex]
                .map(function (p) { return p.join(','); }).join(' '))
            .attr('fill', fill)
            .attr('stroke', wire)
            .attr('stroke-width', stroke)
            .attr('stroke-linejoin', 'round');

        // +/- pin markers (inside the triangle, near the input edge)
        // Plus marker (top, non-inverting input)
        ln(220 - 5, Y_PLUS, 220 + 5, Y_PLUS, text);
        ln(220, Y_PLUS - 5, 220, Y_PLUS + 5, text);
        // Minus marker (bottom, inverting input)
        ln(220 - 5, Y_MINUS, 220 + 5, Y_MINUS, text);

        // ── v_in input path: dot, R_1, node A, (+) input pin ──
        ln(X_VIN_DOT, Y_PLUS, X_R1_L, Y_PLUS);
        ln(X_R1_R, Y_PLUS, X_PIN_PLUS, Y_PLUS);
        dot(X_VIN_DOT, Y_PLUS);

        // R_1 resistor (fixed size, value shown numerically)
        svg.append('rect')
            .attr('x', X_R1_L).attr('y', Y_PLUS - R_THICK / 2)
            .attr('width', X_R1_R - X_R1_L).attr('height', R_THICK)
            .attr('fill', rcol)
            .attr('stroke', wire).attr('stroke-width', 1);

        // ── Feedback path: node A UP, RIGHT through R_2, DOWN to output tap ──
        ln(X_NODE, Y_PLUS, X_NODE, Y_R2);
        ln(X_NODE, Y_R2, X_R2_L, Y_R2);
        ln(X_R2_R, Y_R2, X_OUT_TAP, Y_R2);
        ln(X_OUT_TAP, Y_R2, X_OUT_TAP, TRI.apex[1], outColor, 2.2);

        // R_2 resistor
        svg.append('rect')
            .attr('x', X_R2_L).attr('y', Y_R2 - R_THICK / 2)
            .attr('width', X_R2_R - X_R2_L).attr('height', R_THICK)
            .attr('fill', rcol)
            .attr('stroke', wire).attr('stroke-width', 1);

        // ── Output wire (op-amp apex, output tap, V_out terminal) ──
        ln(TRI.apex[0], TRI.apex[1], X_OUT_TAP, TRI.apex[1], outColor, 2.2);
        ln(X_OUT_TAP, TRI.apex[1], X_VOUT_DOT, TRI.apex[1], outColor, 2.2);
        dot(X_VOUT_DOT, TRI.apex[1], outColor);
        dot(X_OUT_TAP, TRI.apex[1], outColor);

        // ── Junction dot at node A ──
        dot(X_NODE, Y_PLUS);

        // ── (-) input to GND ──
        ln(X_PIN_MINUS, Y_MINUS, X_GND, Y_MINUS);
        ln(X_GND, Y_MINUS, X_GND, Y_GND - 4);
        // Ground symbol: three horizontal lines, decreasing in width
        ln(X_GND - 14, Y_GND,     X_GND + 14, Y_GND,     wire, 2);
        ln(X_GND - 9,  Y_GND + 5, X_GND + 9,  Y_GND + 5, wire, 1.6);
        ln(X_GND - 4,  Y_GND + 10, X_GND + 4, Y_GND + 10, wire, 1.4);

        // ── Resistor names and live values (KaTeX), below each rectangle ──
        window.renderKatex(svg, 'R_1 = ' + fmtR(R1k),
            (X_R1_L + X_R1_R) / 2, Y_PLUS + 22,
            { width: 120, height: 20, size: 15, color: text });
        window.renderKatex(svg, 'R_2 = ' + fmtR(R2k),
            (X_R2_L + X_R2_R) / 2, Y_R2 + 22,
            { width: 120, height: 20, size: 15, color: text });

        // ── Inline live values on the schematic ──
        // v_in label above its wire (combined symbol + value)
        window.renderKatex(svg,
            'v_\\text{in} = ' + fmt(s.probe) + '\\,\\text{V}',
            80, Y_PLUS - 24,
            { width: 140, height: 20, size: 16, color: text });
        // v_out terminal symbol above the output wire, clear of the tap
        // descender and the terminal dot. The numeric value is in the
        // overlay panel.
        window.renderKatex(svg, 'v_\\text{out}',
            X_VOUT_DOT - 18, TRI.apex[1] - 16,
            { width: 40, height: 22, size: 16, color: outColor });
        // V_+ tap label, just below node A so it does not collide with R_2
        window.renderKatex(svg, 'V_+',
            X_NODE, Y_PLUS + 18,
            { width: 32, height: 20, size: 15, color: dim });

        // ── HTML overlay with the four live values ──
        var box = root.node().closest('.plot-box');
        if (box) {
            var panel = box.querySelector('.live-values');
            if (!panel) {
                panel = document.createElement('div');
                panel.className = 'live-values';
                box.appendChild(panel);
            }
            var stateClass = s.branch > 0 ? 'high' : 'low';
            panel.innerHTML = '' +
                '<div class="row"><span class="name">' + tex('v_\\text{in}') + '</span>' +
                  '<span class="val">' + txt(s.probe) + ' V</span></div>' +
                '<div class="row"><span class="name">' + tex('V_+') + '</span>' +
                  '<span class="val">' + txt(Vplus)   + ' V</span></div>' +
                '<div class="row"><span class="name">' + tex('v_\\text{out}') + '</span>' +
                  '<span class="val ' + stateClass + '">' +
                    txt(Vout, 1) + ' V</span></div>' +
                '<div class="row"><span class="name">' + tex('R_1/R_2') + '</span>' +
                  '<span class="val">' + ratio(s.beta).toFixed(2) + '</span></div>';
        }
    }

    function init() {
        render();
        window.addEventListener('sch-update', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
})();
