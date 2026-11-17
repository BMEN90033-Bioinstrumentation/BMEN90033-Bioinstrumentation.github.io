// scene_chain_circuit.js  ·  Slide 5
// Block diagram of the MAV signal chain. Preamplifier -> precision rectifier
// -> low-pass filter. Single output line carries the running mean
// absolute value.
(function () {
    var SVG = '#plot-mav-chain-circuit';
    var svg = d3.select(SVG);
    if (svg.empty()) return;

    var VB_W = 980, VB_H = 230;
    var g;

    function clear() {
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H);
        svg.attr('preserveAspectRatio', 'xMidYMid meet');
        g = svg.append('g');
    }

    function block(x, y, w, h, title, sub) {
        g.append('rect')
            .attr('x', x).attr('y', y).attr('width', w).attr('height', h)
            .attr('rx', 6)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', 'var(--text)')
            .attr('stroke-width', 1.6);
        g.append('text')
            .attr('x', x + w / 2)
            .attr('y', y + h / 2 + (sub ? -7 : 5))
            .attr('text-anchor', 'middle')
            .attr('font-family', 'var(--font-text)')
            .attr('font-size', 18)
            .attr('font-weight', 400)
            .attr('fill', 'var(--text)')
            .text(title);
        if (sub) {
            MAV.label(g.append('text')
                .attr('x', x + w / 2)
                .attr('y', y + h / 2 + 16)
                .attr('text-anchor', 'middle')
                .attr('font-family', 'var(--font-text)')
                .attr('font-size', 16)
                .attr('fill', 'var(--muted)'), sub);
        }
        return { x: x, y: y, w: w, h: h, l: x, r: x + w, t: y, b: y + h, cx: x + w / 2, cy: y + h / 2 };
    }

    function arrowHead(x, y) {
        var s = 6;
        var d = 'M ' + (x - s) + ' ' + (y - s) + ' L ' + x + ' ' + y + ' L ' + (x - s) + ' ' + (y + s);
        g.append('path')
            .attr('d', d)
            .attr('fill', 'none')
            .attr('stroke', 'var(--text)')
            .attr('stroke-width', 1.6)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round');
    }

    function flowH(x1, y, x2) {
        g.append('line')
            .attr('x1', x1).attr('y1', y).attr('x2', x2 - 6).attr('y2', y)
            .attr('stroke', 'var(--text)').attr('stroke-width', 1.6);
        arrowHead(x2, y);
    }

    function tagLabel(x, y, txt, color) {
        g.append('text')
            .attr('x', x).attr('y', y)
            .attr('text-anchor', 'start')
            .attr('font-family', 'var(--font-mono)')
            .attr('font-size', 16)
            .attr('fill', color)
            .text(txt);
    }

    function draw() {
        clear();

        var BH = 68;
        var midY = 96;

        var inB = block(16,  midY - BH / 2, 170, BH, 'EMG input', 'x(t) = A·sin(ωt)');
        var amp = block(216, midY - BH / 2, 160, BH, 'Preamplifier', 'instrumentation');
        var rec = block(406, midY - BH / 2, 180, BH, 'Precision rectifier', '|x(t)|');
        var lpf = block(616, midY - BH / 2, 180, BH, 'Low-pass filter', 'f_{c} ≪ 2f_{sig}');

        flowH(inB.r, midY, amp.l);
        flowH(amp.r, midY, rec.l);
        flowH(rec.r, midY, lpf.l);

        var outX = lpf.r + 36;
        g.append('line')
            .attr('x1', lpf.r).attr('y1', midY)
            .attr('x2', outX - 6).attr('y2', midY)
            .attr('stroke', 'var(--text)').attr('stroke-width', 1.6);
        arrowHead(outX, midY);
        tagLabel(outX + 10, midY - 6, 'y(t) ≈ 2A/π', 'var(--c-output2)');
        tagLabel(outX + 10, midY + 18, 'MAV output', 'var(--text)');

        // Annotations under each stage
        var annY = midY + BH / 2 + 30;
        function ann(b, txt) {
            g.append('text')
                .attr('x', b.cx).attr('y', annY)
                .attr('text-anchor', 'middle')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', 16)
                .attr('fill', 'var(--muted)')
                .text(txt);
        }
        ann(amp, 'gain: mV to V');
        ann(rec, 'absolute value');
        ann(lpf, 'time average');
    }

    function init() {
        draw();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
