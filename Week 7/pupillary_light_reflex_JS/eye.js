// Shared helpers for the pupillary light reflex page: canvas sizing, colour
// lookup and the frontal eye drawing used by the anatomy and simulation panels.
(function () {
    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    // Size the backing store to the element and return a context in CSS pixels.
    function fit(canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        return { ctx, W: rect.width, H: rect.height };
    }

    // Frontal view of an eye. a is the half-width of the palpebral fissure and
    // areaRatio is A/A0, the pupil area relative to its dark-adapted value.
    // The pupil radius scales with the square root of the area. Returns the
    // radii so that callers can attach leaders to the structures.
    function drawEye(ctx, cx, cy, a, areaRatio) {
        const slate = window.T.c('slate');
        const ink = window.T.c('ink');
        const irisR = a * 0.46;
        const pupilR = irisR * Math.max(0.15, 0.62 * Math.sqrt(Math.max(0, areaRatio)));
        const sphR = pupilR + irisR * 0.14;        // outer edge of the sphincter band
        const up = a * 0.41, lo = a * 0.45;        // lid apex heights above and below the centre

        const upper = new Path2D();
        upper.moveTo(cx - a, cy);
        upper.quadraticCurveTo(cx, cy - 2 * up, cx + a, cy);
        const lower = new Path2D();
        lower.moveTo(cx - a, cy);
        lower.quadraticCurveTo(cx, cy + 2 * lo, cx + a, cy);
        const fissure = new Path2D();
        fissure.moveTo(cx - a, cy);
        fissure.quadraticCurveTo(cx, cy - 2 * up, cx + a, cy);
        fissure.quadraticCurveTo(cx, cy + 2 * lo, cx - a, cy);

        ctx.save();
        ctx.clip(fissure);

        // Sclera
        ctx.fillStyle = window.T.plotBg2;
        ctx.fillRect(cx - a, cy - a, 2 * a, 2 * a);

        // Iris stroma
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx, cy, irisR, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = slate;
        ctx.beginPath(); ctx.arc(cx, cy, irisR, 0, Math.PI * 2); ctx.fill();

        // Dilator pupillae: radial fibres from the sphincter to the iris root
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = slate;
        ctx.lineWidth = 1;
        const nFib = 72;
        ctx.beginPath();
        for (let i = 0; i < nFib; i++) {
            const ang = (i / nFib) * Math.PI * 2;
            const r1 = irisR * (0.93 + 0.05 * Math.sin(i * 2.3));
            ctx.moveTo(cx + sphR * Math.cos(ang), cy + sphR * Math.sin(ang));
            ctx.lineTo(cx + r1 * Math.cos(ang), cy + r1 * Math.sin(ang));
        }
        ctx.stroke();

        // Sphincter pupillae: annular band of circular fibres at the pupil margin
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = slate;
        ctx.beginPath();
        ctx.arc(cx, cy, sphR, 0, Math.PI * 2);
        ctx.arc(cx, cy, pupilR, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.globalAlpha = 0.8;
        for (const f of [0.35, 0.7, 1]) {
            ctx.beginPath(); ctx.arc(cx, cy, pupilR + (sphR - pupilR) * f, 0, Math.PI * 2); ctx.stroke();
        }

        // Limbus
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, irisR, 0, Math.PI * 2); ctx.stroke();

        // Pupil and corneal reflection
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(cx, cy, pupilR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx - irisR * 0.3, cy - irisR * 0.3, irisR * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Lid margins
        ctx.strokeStyle = ink;
        ctx.lineCap = 'round';
        ctx.lineWidth = 2;
        ctx.stroke(upper);
        ctx.lineWidth = 1.2;
        ctx.stroke(lower);
        // Upper lid crease
        ctx.strokeStyle = window.T.fg(0.3);
        ctx.beginPath();
        ctx.moveTo(cx - a * 0.86, cy - a * 0.2);
        ctx.quadraticCurveTo(cx, cy - 2 * up - a * 0.16, cx + a * 0.86, cy - a * 0.2);
        ctx.stroke();

        return { irisR, pupilR, sphR };
    }

    window.PLR = { cssVar, fit, drawEye };
})();
