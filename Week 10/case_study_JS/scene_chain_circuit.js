// scene_chain_circuit.js  ·  Slide 5
// Block diagram of the full signal chain. Boxes for each functional stage,
// arrows for signal flow. No transistor-level detail; this is the
// architectural view that maps the brief (detect / measure / track) to
// course primitives.
(function () {
    var SVG = '#plot-chain-circuit';
    var svg = d3.select(SVG);
    if (svg.empty()) return;

    var VB_W = 930, VB_H = 330;
    var g;

    function clear() {
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H);
        svg.attr('preserveAspectRatio', 'xMidYMid meet');
        g = svg.append('g');
    }

    function block(x, y, w, h, title, sub, opts) {
        opts = opts || {};
        g.append('rect')
            .attr('x', x).attr('y', y).attr('width', w).attr('height', h)
            .attr('rx', 6)
            .attr('fill', opts.fill || 'var(--bg-2)')
            .attr('stroke', opts.stroke || 'var(--text)')
            .attr('stroke-width', 1.6);
        g.append('text')
            .attr('x', x + w / 2)
            .attr('y', y + h / 2 + (sub ? -7 : 5))
            .attr('text-anchor', 'middle')
            .attr('font-family', 'var(--font-text)')
            .attr('font-size', 16)
            .attr('font-weight', 400)
            .attr('fill', opts.titleFill || 'var(--text)')
            .text(title);
        if (sub) {
            EEG.label(g.append('text')
                .attr('x', x + w / 2)
                .attr('y', y + h / 2 + 15)
                .attr('text-anchor', 'middle')
                .attr('font-family', 'var(--font-mono)')
                .attr('font-size', 14.5)
                .attr('fill', 'var(--text-dim)'), sub);
        }
        return { x: x, y: y, w: w, h: h, l: x, r: x + w, t: y, b: y + h, cx: x + w / 2, cy: y + h / 2 };
    }

    function arrowHead(x, y, dir) {
        var s = 6;
        var d;
        if (dir === 'right') d = 'M ' + (x - s) + ' ' + (y - s) + ' L ' + x + ' ' + y + ' L ' + (x - s) + ' ' + (y + s);
        else if (dir === 'down') d = 'M ' + (x - s) + ' ' + (y - s) + ' L ' + x + ' ' + y + ' L ' + (x + s) + ' ' + (y - s);
        else if (dir === 'up') d = 'M ' + (x - s) + ' ' + (y + s) + ' L ' + x + ' ' + y + ' L ' + (x + s) + ' ' + (y + s);
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
        arrowHead(x2, y, 'right');
    }

    function wireRaw(x1, y1, x2, y2) {
        g.append('line')
            .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
            .attr('stroke', 'var(--text)').attr('stroke-width', 1.6);
    }

    function dot(x, y) {
        g.append('circle').attr('cx', x).attr('cy', y).attr('r', 4)
            .attr('fill', 'var(--text)');
    }

    function tagLabel(x, y, txt, anchor, color) {
        EEG.label(g.append('text')
            .attr('x', x).attr('y', y)
            .attr('text-anchor', anchor || 'start')
            .attr('font-family', 'var(--font-mono)')
            .attr('font-size', 14.5)
            .attr('fill', color || 'var(--text-dim)'), txt);
    }

    function draw() {
        clear();

        var BH = 64;
        var midY = 178;
        var topY = midY - 84;
        var botY = midY + 84;

        // Input
        var inB = block(20, midY - BH / 2, 120, BH, 'EEG input', 'v_{in} (mV)');
        // Preamplifier
        var amp = block(172, midY - BH / 2, 130, BH, 'Preamplifier', 'G ≈ 1000');

        var splitX = amp.r + 30;

        // Top branch
        var sch = block(splitX + 24, topY - BH / 2, 170, BH, 'Schmitt trigger', 'V_{T±} hysteresis');
        var mono = block(sch.r + 24, topY - BH / 2, 170, BH, 'Monostable', 'fixed-width pulse');

        // Bottom branch
        var pk = block(splitX + 24, botY - BH / 2, 364, BH, 'Peak detector', 'D + C || R_{leak}');

        // Wiring
        flowH(inB.r, midY, amp.l);
        wireRaw(amp.r, midY, splitX, midY);
        dot(splitX, midY);
        wireRaw(splitX, midY, splitX, topY);
        flowH(splitX, topY, sch.l);
        wireRaw(splitX, midY, splitX, botY);
        flowH(splitX, botY, pk.l);
        flowH(sch.r, topY, mono.l);

        // Output arrows + labels
        var outTopX = mono.r + 50;
        wireRaw(mono.r, topY, outTopX - 6, topY);
        arrowHead(outTopX, topY, 'right');
        tagLabel(outTopX + 8, topY - 7, 'spike pulses', 'start', 'var(--c-output)');
        tagLabel(outTopX + 8, topY + 15, 'detect, count', 'start', 'var(--muted)');

        var outBotX = pk.r + 50;
        wireRaw(pk.r, botY, outBotX - 6, botY);
        arrowHead(outBotX, botY, 'right');
        tagLabel(outBotX + 8, botY - 9, 'V_{held}', 'start', 'var(--c-output2)');
        tagLabel(outBotX + 8, botY + 15, 'measure, track', 'start', 'var(--muted)');
    }

    function init() {
        draw();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
