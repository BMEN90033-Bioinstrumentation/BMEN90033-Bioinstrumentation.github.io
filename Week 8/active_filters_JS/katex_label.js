// KaTeX-into-SVG helper. Inlined per the file_layout convention.
// opts.align ('start' | 'end') pins the label to the left or right edge of
// its box; the default centres it on (x, y).
(function () {
    var JUSTIFY = { start: 'flex-start', end: 'flex-end' };

    window.renderKatex = function (parent, latex, x, y, opts) {
        opts = opts || {};
        var T = window.T;
        var w = opts.width || 200;
        var h = opts.height || 28;
        var fo = parent.append('foreignObject')
            .attr('x', x - w / 2).attr('y', y - h / 2)
            .attr('width', w).attr('height', h)
            .style('overflow', 'visible');
        if (opts.rotate) {
            fo.attr('transform', 'rotate(' + opts.rotate + ' ' + x + ' ' + y + ')');
        }

        // Outer container is a full-size flex frame anchored on (x, y).
        var holder = fo.append('xhtml:div')
            .style('width', '100%')
            .style('height', '100%')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', JUSTIFY[opts.align] || 'center')
            .style('color', opts.color || T.text)
            .style('font-size', (opts.size || 14) + 'px')
            .style('line-height', '1')
            .style('white-space', 'nowrap');

        var target = holder;
        if (opts.pill) {
            // Boxed label: inline-block with no-wrap so it sizes to its
            // content and the text is never clipped.
            target = holder.append('xhtml:div')
                .style('display', 'inline-block')
                .style('background', T.plotBg)
                .style('border', '1px solid ' + T.fg(0.25))
                .style('border-radius', '4px')
                .style('padding', opts.pillPad || '2px 8px');
        }
        if (window.katex) {
            window.katex.render(latex, target.node(), { throwOnError: false, displayMode: !!opts.display });
        } else {
            target.text(latex);
        }
        return fo;
    };
})();
