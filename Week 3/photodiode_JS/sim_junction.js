// Particle model of the photodiode, one instance per canvas[data-sim-step].
// Step 0: unbiased. Step 1: reverse bias. Step 2: illuminated, photons
// absorbed in the depletion region generate electron-hole pairs that the
// field separates. Instances read PD.p (step 0 forces zero bias). The hole
// lattice is rebuilt when the bias changes, so it stays out of the widened
// depletion region.
//
// Particle rules are ported from the original page. The band strip that sat
// above the particles is now a separate D3 figure, so the carrier area starts
// at Y0 instead of 160 and the light cone ends at Y0 - 20 instead of 140. The
// h nu label is a KaTeX overlay at the top centre; status and photocurrent
// text moved to the readouts.
(function () {
    var Y0 = 100;

    var cache = {};
    function col(name, a) {
        var k = name + a;
        if (!cache[k]) {
            var c = d3.color(window.CMP.cssVar(name));
            c.opacity = a;
            cache[k] = c.formatRgb();
        }
        return cache[k];
    }

    function Sim(canvas) {
        var PD = window.PD;
        var step = +canvas.dataset.simStep;
        var ctx = canvas.getContext('2d');
        var W = 0, H = 0, time = 0, photonSpawnTimer = 0;
        var holes = [], electrons = [], incomingPhotons = [], absorptions = [], generatedPairs = [];

        var hv = null;
        if (step >= 2) {
            hv = document.createElement('div');
            hv.className = 'hv-label';
            window.katex.render('h\\nu \\downarrow', hv, { throwOnError: false });
            canvas.parentElement.appendChild(hv);
        }

        function vr() { return step === 0 ? 0 : PD.p.vr; }
        function light() { return step >= 2 ? PD.p.light : 0; }
        function getDepletionHalf() { return W * PD.deplFrac(vr()); }

        function resize() {
            var rect = canvas.getBoundingClientRect();
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.round(rect.width * dpr));
            canvas.height = Math.max(1, Math.round(rect.height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            var w = rect.width, big = !W || Math.abs(w - W) > 0.1 * W;
            W = w; H = rect.height;
            if (big) initParticles();
        }

        // P-side hole lattice, rebuilt when the bias moves the depletion edge
        // so that no hole sits inside the depletion region.
        function buildHoles() {
            holes = [];
            var jx = W * 0.5, dh = getDepletionHalf();
            var pLeft = 25, pRight = Math.max(pLeft + 40, jx - dh - 15), spacing = 40;
            for (var r = 0; ; r++) {
                var y = Y0 + r * spacing;
                if (y > H - 50) break;
                for (var c = 0; ; c++) {
                    var x = pLeft + c * spacing + (r % 2) * (spacing * 0.5);
                    if (x > pRight) break;
                    holes.push({ x: x, y: y, baseX: x, baseY: y, r: 7, vx: 0, vy: 0 });
                }
            }
        }

        function initParticles() {
            electrons = []; incomingPhotons = []; absorptions = []; generatedPairs = [];
            buildHoles();
            var jx = W * 0.5, dh = getDepletionHalf();
            var nLeft = Math.min(W - 60, jx + dh + 15), nRight = W - 20;
            for (var i = 0; i < 20; i++) {
                electrons.push({
                    x: nLeft + Math.random() * (nRight - nLeft),
                    y: Y0 + Math.random() * (H - 50 - Y0),
                    vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
                    r: 5, type: 'bulk'
                });
            }
        }

        function update() {
            var jx = W * 0.5, dh = getDepletionHalf(), jiggle = 0.3, L = light();

            holes.forEach(function (h) {   // thermal jiggle about the lattice site
                h.vx += (Math.random() - 0.5) * jiggle * 0.5;
                h.vy += (Math.random() - 0.5) * jiggle * 0.5;
                h.vx += (h.baseX - h.x) * 0.05;
                h.vy += (h.baseY - h.y) * 0.05;
                h.vx *= 0.9; h.vy *= 0.9;
                h.x += h.vx; h.y += h.vy;
            });

            electrons.forEach(function (e) {
                if (e.type !== 'bulk') return;
                e.vx += (Math.random() - 0.5) * jiggle;
                e.vy += (Math.random() - 0.5) * jiggle;
                e.vx *= 0.96; e.vy *= 0.96;
                e.x += e.vx; e.y += e.vy;
                if (e.x < jx + dh + e.r) { e.x = jx + dh + e.r; e.vx *= -0.8; }   // held on the N side
                if (e.x > W - e.r) { e.x = W - e.r; e.vx *= -0.8; }
                if (e.y < Y0 - 5 + e.r) { e.y = Y0 - 5 + e.r; e.vy *= -0.8; }
                if (e.y > H - e.r - 25) { e.y = H - e.r - 25; e.vy *= -0.8; }
            });

            if (step >= 2 && L > 0) {
                photonSpawnTimer++;
                if (photonSpawnTimer >= Math.max(3, 30 - L * 0.27)) {
                    photonSpawnTimer = 0;
                    var spread = dh * 1.5;
                    incomingPhotons.push({
                        x: jx + (Math.random() - 0.5) * spread * 2, y: -10,
                        vy: 1.5 + Math.random() * 0.8, vx: (Math.random() - 0.5) * 0.3,
                        phase: Math.random() * Math.PI * 2, life: 1.0, absorbed: false
                    });
                }
            }

            for (var i = incomingPhotons.length - 1; i >= 0; i--) {
                var ph = incomingPhotons[i];
                ph.x += ph.vx; ph.y += ph.vy;
                // Absorbed on entering the depletion region: one electron-hole pair.
                if (!ph.absorbed && ph.y > Y0 - 5 && ph.y < H - 50 && ph.x > jx - dh && ph.x < jx + dh) {
                    ph.absorbed = true; ph.life = 0;
                    absorptions.push({ x: ph.x, y: ph.y, life: 1.0 });
                    generatedPairs.push({
                        holeX: ph.x, holeY: ph.y, elecX: ph.x, elecY: ph.y,
                        holeVx: -1.5 - Math.random() * 1.0,   // hole to the P side
                        elecVx: 1.5 + Math.random() * 1.0,    // electron to the N side
                        holeVy: (Math.random() - 0.5) * 0.5,
                        elecVy: (Math.random() - 0.5) * 0.5,
                        life: 1.0
                    });
                }
                if (ph.y > H + 10 || ph.life <= 0) incomingPhotons.splice(i, 1);
            }

            for (var k = generatedPairs.length - 1; k >= 0; k--) {
                var g = generatedPairs[k];
                var sweepBoost = 1 + vr() * 0.1;   // stronger field, faster sweep
                g.holeX += g.holeVx * sweepBoost; g.holeY += g.holeVy;
                g.elecX += g.elecVx * sweepBoost; g.elecY += g.elecVy;
                if (g.holeX < 20 || g.elecX > W - 20) g.life -= 0.03;
                if (g.life <= 0 || g.holeX < -20 || g.elecX > W + 20) generatedPairs.splice(k, 1);
            }

            for (var n = absorptions.length - 1; n >= 0; n--) {
                absorptions[n].life -= 0.025;
                if (absorptions[n].life <= 0) absorptions.splice(n, 1);
            }
        }

        // ── Drawing ──
        function drawJunction() {
            var T = window.T, jx = W * 0.5, dh = getDepletionHalf();
            ctx.fillStyle = col('--c-hole', 0.05);
            ctx.fillRect(0, 0, jx - dh, H);
            ctx.fillStyle = col('--c-elec', 0.05);
            ctx.fillRect(jx + dh, 0, W - jx - dh, H);
            ctx.fillStyle = T.overlay03;
            ctx.fillRect(jx - dh, 0, dh * 2, H);
            ctx.strokeStyle = T.overlay20;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            [jx - dh, jx + dh].forEach(function (x) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
            });
            ctx.setLineDash([]);
            ctx.strokeStyle = T.gridMed;
            ctx.beginPath(); ctx.moveTo(jx, 0); ctx.lineTo(jx, H); ctx.stroke();

            if (dh >= 8) {
                var spacing = 28, rows = Math.floor((H - 80) / spacing);
                var cols = Math.max(1, Math.floor(dh / spacing));
                ctx.font = '700 10px JetBrains Mono';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                for (var r = 0; r < rows; r++) {
                    var y = 55 + r * spacing;
                    for (var c = 0; c < cols; c++) {
                        var xa = jx - dh + 14 + c * spacing;
                        if (xa < jx - 4) ion(xa, y, '--c-hole', '−');
                        var xd = jx + 14 + c * spacing;
                        if (xd < jx + dh - 4) ion(xd, y, '--c-elec', '+');
                    }
                }
            }
        }
        function ion(x, y, name, sign) {
            ctx.fillStyle = col(name, 0.25);
            ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = col(name, 0.85);
            ctx.fillText(sign, x, y + 1);
        }

        // Field arrow, N to P; opacity grows with reverse bias.
        function drawEField() {
            var jx = W * 0.5, dh = getDepletionHalf();
            if (dh < 15) return;
            var y = H * 0.5, len = dh * 1.2;
            var a = Math.min(0.3 + vr() * 0.02, 0.6) + 0.3;
            ctx.strokeStyle = col('--c-field', a);
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(jx + len * 0.4, y); ctx.lineTo(jx - len * 0.4, y); ctx.stroke();
            ctx.fillStyle = col('--c-field', a);
            ctx.beginPath();
            ctx.moveTo(jx - len * 0.4, y);
            ctx.lineTo(jx - len * 0.4 + 8, y - 5);
            ctx.lineTo(jx - len * 0.4 + 8, y + 5);
            ctx.fill();
        }

        function drawLightSource() {
            if (step < 2) return;
            var jx = W * 0.5, dh = getDepletionHalf(), pc = PD.mat().col;
            var yEnd = Y0 - 20;
            ctx.save();
            ctx.globalAlpha = 0.15 + (light() / 100) * 0.25;
            var grad = ctx.createLinearGradient(0, 0, 0, yEnd);
            grad.addColorStop(0, col(pc, 0.27));
            grad.addColorStop(1, col(pc, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(jx - dh * 1.5, 0);
            ctx.lineTo(jx + dh * 1.5, 0);
            ctx.lineTo(jx + dh * 0.8, yEnd);
            ctx.lineTo(jx - dh * 0.8, yEnd);
            ctx.fill();
            ctx.restore();
            if (hv) hv.style.color = window.CMP.cssVar(pc);
        }

        function drawHoles() {
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            holes.forEach(function (h) {
                ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
                ctx.fillStyle = col('--c-hole', 0.1); ctx.fill();
                ctx.strokeStyle = col('--c-hole', 0.75); ctx.lineWidth = 1.5; ctx.stroke();
                ctx.font = '700 9px JetBrains Mono';
                ctx.fillStyle = col('--c-hole', 0.9);
                ctx.fillText('+', h.x, h.y + 0.5);
            });
        }

        function drawElectrons() {
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            electrons.forEach(function (e) {
                ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                ctx.fillStyle = col('--c-elec', 0.9); ctx.fill();
                ctx.font = '700 8px JetBrains Mono';
                ctx.fillStyle = col('--bg-2', 1);
                ctx.fillText('−', e.x, e.y + 0.5);
            });
        }

        function drawIncomingPhotons() {
            if (step < 2) return;
            var pc = PD.mat().col;
            incomingPhotons.forEach(function (ph) {
                ctx.save();
                ctx.globalAlpha = Math.min(ph.life, 1);
                var grad = ctx.createRadialGradient(ph.x, ph.y, 0, ph.x, ph.y, 14);
                grad.addColorStop(0, col(pc, 0.4));
                grad.addColorStop(1, col(pc, 0));
                ctx.fillStyle = grad;
                ctx.fillRect(ph.x - 14, ph.y - 14, 28, 28);
                ctx.beginPath(); ctx.arc(ph.x, ph.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = col(pc, 1); ctx.fill();
                ctx.strokeStyle = col(pc, 0.55); ctx.lineWidth = 1;
                ctx.beginPath();
                for (var i = 0; i < 20; i++) {   // wave trail behind the falling photon
                    var dy = -i * 1.5, dx = Math.sin((i + time * 10 + ph.phase) * 0.7) * 4;
                    if (i === 0) ctx.moveTo(ph.x + dx, ph.y + dy); else ctx.lineTo(ph.x + dx, ph.y + dy);
                }
                ctx.stroke();
                ctx.restore();
            });
        }

        function drawAbsorptions() {
            var T = window.T;
            absorptions.forEach(function (a) {
                ctx.save();
                ctx.globalAlpha = a.life;
                var radius = (1 - a.life) * 25 + 5;
                ctx.strokeStyle = T.text; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(a.x, a.y, radius, 0, Math.PI * 2); ctx.stroke();
                var grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, radius);
                grad.addColorStop(0, T.overlay30);
                grad.addColorStop(1, T.fg(0));
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(a.x, a.y, radius, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });
        }

        function drawGeneratedPairs() {
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '700 8px JetBrains Mono';
            generatedPairs.forEach(function (g) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, g.life);
                ctx.beginPath(); ctx.arc(g.holeX, g.holeY, 6, 0, Math.PI * 2);
                ctx.fillStyle = col('--c-hole', 0.95); ctx.fill();
                ctx.fillStyle = col('--bg-2', 1);
                ctx.fillText('+', g.holeX, g.holeY + 0.5);
                ctx.beginPath(); ctx.arc(g.elecX, g.elecY, 5, 0, Math.PI * 2);
                ctx.fillStyle = col('--c-elec', 1); ctx.fill();
                ctx.fillStyle = col('--bg-2', 1);
                ctx.fillText('−', g.elecX, g.elecY + 0.5);
                ctx.restore();
            });
        }

        function drawLabels() {
            var jx = W * 0.5;
            ctx.font = '600 14px Inter';
            ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = col('--c-hole', 0.9);
            // Centred in each neutral region, which narrows as the bias rises.
            var dh = getDepletionHalf();
            ctx.fillText('P-type', (jx - dh) / 2, Y0 - 14);
            ctx.fillStyle = col('--c-elec', 0.9);
            ctx.fillText('N-type', (W + jx + dh) / 2, Y0 - 14);
            if (step > 0 && vr() > 0) {   // reverse bias: P contact negative
                ctx.font = '500 12px JetBrains Mono';
                ctx.textAlign = 'left';
                ctx.fillStyle = col('--c-hole', 0.9);
                ctx.fillText('− anode', 10, H - 8);
                ctx.textAlign = 'right';
                ctx.fillStyle = col('--c-elec', 0.9);
                ctx.fillText('cathode +', W - 10, H - 8);
            }
        }

        function draw() {
            cache = {};
            ctx.clearRect(0, 0, W, H);
            drawJunction();
            drawEField();
            drawLightSource();
            drawHoles();
            drawElectrons();
            drawIncomingPhotons();
            drawAbsorptions();
            drawGeneratedPairs();
            drawLabels();
        }

        var raf = 0, last = 0;
        function loop(ts) {
            raf = requestAnimationFrame(loop);
            if (ts - last < 33) return;
            last = ts;
            time += 0.01;
            update();
            draw();
        }
        function start() { if (!raf) raf = requestAnimationFrame(loop); }
        function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

        resize();
        draw();
        window.addEventListener('resize', function () { resize(); draw(); });
        window.addEventListener('themechange', draw);
        window.addEventListener('pdchange', function (e) {
            if (e.detail && e.detail.key === 'vr' && step > 0) buildHoles();
            draw();
        });
        new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
        }, { threshold: 0.05 }).observe(canvas);
    }

    function init() { document.querySelectorAll('canvas[data-sim-step]').forEach(Sim); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
