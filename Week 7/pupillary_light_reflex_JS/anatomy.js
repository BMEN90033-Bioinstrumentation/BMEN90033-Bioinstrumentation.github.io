// Section 1: frontal view of the eye with the input, the output and the two
// iris muscles labelled. The light switches on and off every 3 s and the pupil
// follows through the model of this page: a 0.2 s delay and a 0.25 s lag.
(function () {
    const canvas = document.getElementById('anat-diagram');
    if (!canvas) return;
    const { cssVar, fit, drawEye } = window.PLR;
    const ov = id => document.getElementById(id);

    const PERIOD = 6, TD = 0.2, TAU = 0.25, K = 0.6;
    const lightAt = t => (t >= 0 && (t % PERIOD) < PERIOD / 2 ? 1 : 0);
    let a = 0, last = null;   // area deviation a(t) = A/A0 - 1

    function leader(ctx, x0, y0, x1, y1, color) {
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.beginPath(); ctx.arc(x0, y0, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    function place(el, css) {
        for (const k of ['left', 'right', 'top', 'bottom']) el.style[k] = k in css ? css[k] + 'px' : '';
    }

    function draw(now) {
        const t = now / 1000;
        const dt = last === null ? 0 : Math.min(0.1, t - last);
        last = t;
        // Exact first-order update toward the delayed target.
        a += (-K * lightAt(t - TD) - a) * (1 - Math.exp(-dt / TAU));

        const { ctx, W, H } = fit(canvas);
        const cx = W * 0.5, cy = H * 0.56, half = W * 0.36;
        const g = drawEye(ctx, cx, cy, half, 1 + a);
        const text = window.T.text;
        const cLight = cssVar('--c-light'), cArea = cssVar('--c-area');

        // Incident light: three parallel rays toward the pupil, ending short of the iris
        const dir = 35 * Math.PI / 180;
        const ux = Math.cos(dir), uy = Math.sin(dir);
        ctx.globalAlpha = lightAt(t) ? 1 : 0.18;
        ctx.strokeStyle = cLight; ctx.fillStyle = cLight; ctx.lineWidth = 2;
        for (const off of [-16, 0, 16]) {
            const ox = cx - uy * off, oy = cy + ux * off;
            const x0 = ox - ux * half * 1.42, y0 = oy - uy * half * 1.42;
            const x1 = ox - ux * (g.irisR + 16), y1 = oy - uy * (g.irisR + 16);
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * 6, y1 - uy * 6); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 - ux * 10 - uy * 4.5, y1 - uy * 10 + ux * 4.5);
            ctx.lineTo(x1 - ux * 10 + uy * 4.5, y1 - uy * 10 - ux * 4.5);
            ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Leaders from each structure to its label
        const at = (r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
        const [sx, sy] = at((g.pupilR + g.sphR) / 2, -50);
        leader(ctx, sx, sy, W - 96, 92, text);
        const [dx, dy] = at((g.sphR + g.irisR) / 2 + 2, 40);
        leader(ctx, dx, dy, W - 96, H - 82, text);
        const [px, py] = at(g.pupilR * 0.6, 140);
        leader(ctx, px, py, 72, H - 62, cArea);

        place(ov('an-L'), { left: 16, top: 46 });
        place(ov('an-sph'), { right: 16, top: 46 });
        place(ov('an-dil'), { right: 16, bottom: 38 });
        place(ov('an-A'), { left: 16, bottom: 34 });

        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
})();
