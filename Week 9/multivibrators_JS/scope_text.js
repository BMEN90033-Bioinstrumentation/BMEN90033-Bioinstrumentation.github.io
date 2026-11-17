// Canvas text with subscripts for the three scope plots on this page.
// MV.text(ctx, [['v', 'C'], ' (V)'], x, y, align) draws "v" with subscript
// "C" followed by " (V)". align is 'left', 'center' or 'right'. The caller
// sets ctx.font (size in px first or after the weight) and ctx.fillStyle.
(function () {
    function subFont(font) {
        return font.replace(/(\d+(?:\.\d+)?)px/, function (m, n) {
            return (parseFloat(n) * 0.72).toFixed(1) + 'px';
        });
    }
    window.MV = {
        text: function (ctx, parts, x, y, align) {
            var font = ctx.font, small = subFont(font);
            var runs = [];
            parts.forEach(function (p) {
                if (typeof p === 'string') { runs.push({ s: p, f: font, dy: 0 }); return; }
                runs.push({ s: p[0], f: font, dy: 0 });
                runs.push({ s: p[1], f: small, dy: 4 });
            });
            var total = 0;
            runs.forEach(function (r) { ctx.font = r.f; r.w = ctx.measureText(r.s).width; total += r.w; });
            var cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            runs.forEach(function (r) {
                ctx.font = r.f;
                ctx.fillText(r.s, cx, y + r.dy);
                cx += r.w;
            });
            ctx.restore();
            ctx.font = font;
        }
    };
})();
