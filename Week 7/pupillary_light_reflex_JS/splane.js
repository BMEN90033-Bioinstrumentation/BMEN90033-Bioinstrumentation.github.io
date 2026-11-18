// Section 2: pole-zero diagram of the rational part of G(s), drawn with D3.
// Both axes use the same scale. Tick values sit on the left and bottom edges
// of the frame; the axis titles sit outside it, Im(s) above the imaginary
// axis and Re(s) to the right of the real axis.
(function () {
    const node = document.getElementById('pz-plot');
    if (!node || !window.d3) return;
    const { cssVar } = window.PLR;
    const TAU = 0.25;              // nominal time constant, s
    const POLE = -1 / TAU;         // s^-1
    const minus = v => String(v).replace('-', '−');

    function styleAxis(sel) {
        sel.selectAll('path,line').attr('stroke', window.T.gridAxis);
        sel.selectAll('text').attr('fill', window.T.textDim)
            .attr('font-size', 13).attr('font-family', "'JetBrains Mono', monospace");
    }

    function draw() {
        const svg = d3.select(node);
        svg.selectAll('*').remove();
        const box = node.getBoundingClientRect();
        const W = box.width, H = box.height;
        svg.attr('viewBox', `0 0 ${W} ${H}`);
        const m = { top: 76, right: 96, bottom: 40, left: 48 };
        const iw = W - m.left - m.right, ih = H - m.top - m.bottom;

        const x = d3.scaleLinear().domain([-8, 4]).range([0, iw]);
        const yHalf = ih / 2 / (iw / 12);          // equal scale on both axes
        const y = d3.scaleLinear().domain([-yHalf, yHalf]).range([ih, 0]);
        const xt = d3.range(-8, 5, 2);
        const yMaxTick = Math.floor(yHalf / 2) * 2;
        const yt = d3.range(-yMaxTick, yMaxTick + 1, 2);
        const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

        // Stable half-plane
        g.append('rect').attr('width', x(0)).attr('height', ih).attr('fill', cssVar('--c-stable'));

        // Grid
        g.append('g').selectAll('line').data(xt).join('line')
            .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', 0).attr('y2', ih)
            .attr('stroke', window.T.grid);
        g.append('g').selectAll('line').data(yt).join('line')
            .attr('y1', d => y(d)).attr('y2', d => y(d)).attr('x1', 0).attr('x2', iw)
            .attr('stroke', window.T.grid);

        // Real and imaginary axes
        g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', window.T.gridAxis);
        g.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', ih).attr('stroke', window.T.gridAxis);

        // Tick values on the frame edges
        g.append('g').attr('transform', `translate(0,${ih})`)
            .call(d3.axisBottom(x).tickValues(xt).tickFormat(minus).tickSize(4).tickPadding(6)).call(styleAxis);
        g.append('g')
            .call(d3.axisLeft(y).tickValues(yt).tickFormat(minus).tickSize(4).tickPadding(6)).call(styleAxis);

        // Region labels inside the top corners
        const region = (txt, px, anchor) => g.append('text').text(txt)
            .attr('x', px).attr('y', 20).attr('text-anchor', anchor)
            .attr('fill', window.T.textDim).attr('font-size', 10)
            .attr('font-family', "'JetBrains Mono', monospace").attr('letter-spacing', '0.12em');
        region('STABLE', 10, 'start');
        region('UNSTABLE', iw - 10, 'end');

        // Pole of the first-order lag
        const pole = cssVar('--c-pole');
        const px = x(POLE), py = y(0), r = 7;
        g.append('path')
            .attr('d', `M${px - r},${py - r}L${px + r},${py + r}M${px - r},${py + r}L${px + r},${py - r}`)
            .attr('stroke', pole).attr('stroke-width', 2.4).attr('stroke-linecap', 'round').attr('fill', 'none');
        window.renderKatex(g, `s = -\\dfrac{1}{\\tau} = ${POLE}\\ \\mathrm{s^{-1}}`, px, py - 34,
            { width: 200, height: 40, color: pole, size: 14 });
        window.renderKatex(g, `\\tau = ${TAU}\\ \\mathrm{s}`, px, py + 24,
            { width: 120, height: 22, color: pole, size: 13 });

        // Axis titles outside the frame
        window.renderKatex(svg, '\\mathrm{Im}(s)\\ (\\mathrm{rad\\,s^{-1}})', m.left + x(0), m.top - 18,
            { width: 160, height: 24, size: 14 });
        window.renderKatex(svg, '\\mathrm{Re}(s)\\ (\\mathrm{s^{-1}})', m.left + iw + 10 + 43, m.top + y(0),
            { width: 86, height: 24, size: 14, align: 'left' });
    }

    draw();
    window.addEventListener('resize', () => requestAnimationFrame(draw));
})();
