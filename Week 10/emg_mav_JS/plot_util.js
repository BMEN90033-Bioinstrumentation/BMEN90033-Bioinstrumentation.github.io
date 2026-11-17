// plot_util.js  ·  Shared SVG helpers for the emg_mav scenes: subscript
// labels, a legend row above the plot, and a dashed reference line.
// label() and legend() mirror the helpers in case_study_JS/eeg_signal.js,
// which cannot be loaded here because it also starts the EEG simulation.
(function () {
    // Sets SVG text with subscripts written as 'f_{c}'.
    function label(sel, s) {
        sel.text(null);
        s.split(/_\{([^}]*)\}/).forEach(function (part, i) {
            if (!part) return;
            var ts = sel.append('tspan').text(part);
            if (i % 2) ts.attr('baseline-shift', 'sub').attr('font-size', '0.75em');
        });
        return sel;
    }

    // Row of line swatches with labels above the plot area, left to right
    // from x = 0. items: [{ c: colour, text: 'label', dash: '5 4' (optional) }]
    function legend(g, items) {
        g.selectAll('*').remove();
        var x0 = 0, y = -14;
        items.forEach(function (it) {
            g.append('line')
                .attr('x1', x0).attr('x2', x0 + 18).attr('y1', y - 4).attr('y2', y - 4)
                .style('stroke', it.c).style('stroke-width', 2.2)
                .style('stroke-dasharray', it.dash || null);
            var t = g.append('text').attr('x', x0 + 24).attr('y', y)
                .style('font-size', '13px').style('fill', 'var(--text)')
                .text(it.text);
            x0 += 24 + t.node().getComputedTextLength() + 20;
        });
    }

    // Horizontal dashed reference line. Its label and value sit in the
    // legend row, clear of the traces.
    function refLine(g, yPix, iw, colour) {
        g.append('line')
            .attr('x1', 0).attr('x2', iw).attr('y1', yPix).attr('y2', yPix)
            .style('stroke', colour).style('stroke-width', 1.4)
            .style('stroke-dasharray', '5 4');
    }

    window.MAV = { label: label, legend: legend, refLine: refLine };
})();
