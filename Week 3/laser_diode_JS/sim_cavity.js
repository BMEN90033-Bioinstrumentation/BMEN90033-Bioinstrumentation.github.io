// Particle model of the laser diode, one instance per canvas[data-sim-step].
// Step 0: unbiased junction. Step 2: injection, spontaneous recombination and
// (above 32 mA) inversion. Step 3: stimulated emission. Step 4: Fabry-Perot
// facets. Step 5: coherent output beam. All instances read LD.p.I.
//
// Particle rules are ported from the original page. The band diagram and L-I
// insets are now separate D3 figures, and the in-canvas status text moved to
// the readouts. Drawing is shifted down by DY so the plot-box label stays
// clear; the facet reflectivities are KaTeX overlays above the mirrors, the
// left one right-aligned to the rear facet and the right one left-aligned to
// the front facet, so they never meet over the active region.
(function () {
    var DY = 24;

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
        var LD = window.LD;
        var step = +canvas.dataset.simStep;
        var ctx = canvas.getContext('2d');
        var W = 0, H = 0, time = 0, spawnTimer = 0, photonSpawnTimer = 0;
        var holes = [], electrons = [], photons = [], recombinations = [];

        // KaTeX overlays for the facet reflectivities (steps 4 and 5).
        var ovl = [];
        if (step >= 4) {
            ovl = ['R_1 = ' + LD.REAR_FACET_REFLECTIVITY, 'R_2 = ' + LD.FACET_REFLECTIVITY].map(function (s, i) {
                var d = document.createElement('div');
                d.className = 'facet-label';
                d.style.transform = i === 0 ? 'translate(-100%, -50%)' : 'translate(0, -50%)';
                window.katex.render(s, d, { throwOnError: false });
                canvas.parentElement.appendChild(d);
                return d;
            });
        }

        function current() { return step === 0 ? 0 : LD.p.I; }
        function isAboveThreshold() { return LD.aboveThreshold(current()); }

        function getDepletionHalf() {
            var maxDepl = W * 0.08;
            if (step === 0) return maxDepl;
            var ratio = Math.min(current() / 20, 1);
            return maxDepl * (1 - ratio * 0.85);
        }
        function getActiveRegionBounds() {
            var jx = W * 0.5, halfWidth = 20;
            return { left: jx - halfWidth, right: jx + halfWidth, top: 50, bottom: H - 50 };
        }

        function resize() {
            var rect = canvas.getBoundingClientRect();
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.round(rect.width * dpr));
            canvas.height = Math.max(1, Math.round(rect.height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            var w = rect.width, big = !W || Math.abs(w - W) > 0.1 * W;
            W = w; H = rect.height - DY;
            if (big) initParticles();
            ovl.forEach(function (d, i) {
                d.style.left = (W * 0.5 + (i === 0 ? -40 : 40)) + 'px';
                d.style.top = (DY + 28) + 'px';
            });
        }

        function makeElectron(x, y) {
            return {
                x: x, y: y,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                r: 5,
                hopping: false, targetHole: null, hopProgress: 0,
                hopFromX: 0, hopFromY: 0, lastHoleIdx: -1
            };
        }
        function makePhoton(x, y, vx) {
            return {
                x: x, y: y,
                vx: vx || (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 0.5),
                vy: 0, life: 1.0, phase: Math.random() * Math.PI * 2,
                stimulated: false, bounces: 0
            };
        }

        function initParticles() {
            holes = []; electrons = []; photons = []; recombinations = [];
            var jx = W * 0.5;
            var pLeft = 30, pRight = jx - 40, hSpacingX = 38, hSpacingY = 36;
            for (var r = 0; ; r++) {
                var y = 60 + r * hSpacingY;
                if (y > H - 50) break;
                for (var c = 0; ; c++) {
                    var x = pLeft + c * hSpacingX + (r % 2) * (hSpacingX * 0.5);
                    if (x > pRight) break;
                    holes.push({ x: x, y: y, r: 6, baseX: x, baseY: y });
                }
            }
            var nLeft = jx + 40, nRight = W - 30;
            for (var i = 0; i < 18; i++) {
                electrons.push(makeElectron(nLeft + Math.random() * (nRight - nLeft), 60 + Math.random() * (H - 120)));
            }
        }

        // ── Physics update ──
        function update() {
            var jx = W * 0.5, I = current();
            var active = getActiveRegionBounds();
            var aboveThresh = isAboveThreshold();

            electrons.forEach(function (e) {
                if (e.hopping) return;
                e.vx += (Math.random() - 0.5) * 0.3;
                e.vy += (Math.random() - 0.5) * 0.3;
                if (step >= 1 && I > 0) e.vx -= Math.min(I / 100, 1) * 0.12;
                e.vx *= 0.94; e.vy *= 0.94;
                e.x += e.vx; e.y += e.vy;
                if (e.y < 50) { e.y = 50; e.vy *= -1; }
                if (e.y > H - 50) { e.y = H - 50; e.vy *= -1; }
                if (e.x > W + 10) { e.x = W + 10; e.vx *= -1; }
                if (e.x < -10) e.dead = true;
                if (step === 0 && e.x < jx + 20) e.vx += 0.3;   // contained on the N side
            });

            holes.forEach(function (h) {
                h.x = h.baseX + Math.sin(time * 2 + h.baseY) * 1.5;
                h.y = h.baseY + Math.cos(time * 1.8 + h.baseX) * 1;
            });

            // Recombination in the active region; the electron then hops
            // into the nearest free P-side hole.
            if (step >= 2 && I > 5) {
                electrons.forEach(function (e) {
                    if (e.dead || e.hopping) return;
                    if (e.x > active.left - 30 && e.x < active.right + 30 && e.y > active.top && e.y < active.bottom) {
                        if (Math.random() < (aboveThresh ? 0.03 : 0.008)) {
                            var bestIdx = -1, bestDist = Infinity;
                            holes.forEach(function (h, idx) {
                                if (h.occupied) return;
                                var d = (h.x - e.x) * (h.x - e.x) + (h.y - e.y) * (h.y - e.y);
                                if (d < bestDist) { bestDist = d; bestIdx = idx; }
                            });
                            recombinations.push({ x: e.x, y: e.y, life: 1.0 });
                            if (aboveThresh && step >= 3) {
                                photons.push(makePhoton(e.x, e.y, 2.5));
                                if (Math.random() < 0.4) photons.push(makePhoton(e.x, e.y, -2.5));
                            } else {
                                var angle = Math.random() * Math.PI * 2;
                                var sp = makePhoton(e.x, e.y, Math.cos(angle) * 1.5);
                                sp.vy = Math.sin(angle) * 1.5;
                                photons.push(sp);
                            }
                            if (bestIdx >= 0) {
                                e.hopping = true; e.targetHole = bestIdx; e.hopProgress = 0;
                                e.hopFromX = e.x; e.hopFromY = e.y; e.vx = 0; e.vy = 0;
                            } else {
                                e.dead = true;
                            }
                        }
                    }
                });
            }

            // Electron hopping through the P-side vacancies.
            electrons.forEach(function (e) {
                if (!e.hopping || e.dead) return;
                e.hopProgress += 0.04;
                var target = holes[e.targetHole];
                if (!target) { e.dead = true; return; }
                if (e.hopProgress < 1) {
                    var t = e.hopProgress;
                    e.x = e.hopFromX + (target.baseX - e.hopFromX) * t;
                    e.y = e.hopFromY + (target.baseY - e.hopFromY) * t - Math.sin(t * Math.PI) * 12;
                } else if (!e.settled) {
                    e.settled = true; e.settleTimer = 8;
                    e.x = target.baseX; e.y = target.baseY;
                    if (e.lastHoleIdx >= 0 && holes[e.lastHoleIdx]) holes[e.lastHoleIdx].occupied = false;
                    target.occupied = true;
                    e.lastHoleIdx = e.targetHole;
                } else {
                    e.x = target.baseX; e.y = target.baseY;
                    e.settleTimer--;
                    if (e.settleTimer <= 0) {
                        var nextIdx = -1, best = Infinity;
                        holes.forEach(function (h, idx) {
                            if (h.occupied || idx === e.targetHole || h.baseX >= target.baseX) return;
                            var d = (h.baseX - target.baseX) * (h.baseX - target.baseX) + (h.baseY - target.baseY) * (h.baseY - target.baseY);
                            if (d < best) { best = d; nextIdx = idx; }
                        });
                        if (nextIdx >= 0) {
                            e.targetHole = nextIdx; e.hopProgress = 0; e.settled = false;
                            e.hopFromX = e.x; e.hopFromY = e.y;
                        } else {
                            target.occupied = false;   // leaves at the P contact
                            e.dead = true;
                        }
                    }
                }
            });

            // Injection from the N contact.
            if (step >= 1 && I > 5) {
                spawnTimer++;
                if (spawnTimer >= Math.max(4, 25 - I * 0.2)) {
                    spawnTimer = 0;
                    electrons.push(makeElectron(W + 5, 60 + Math.random() * (H - 120)));
                }
            }

            photons.forEach(function (ph) {
                // A facet is tested only when a photon crosses it from inside
                // the cavity, so each arrival is reflected with probability R
                // or transmitted with probability 1 - R exactly once.
                var mirrorLeft = active.left - 26, mirrorRight = active.right + 26;
                var inside = ph.x > mirrorLeft && ph.x < mirrorRight;
                ph.x += ph.vx;
                ph.y += (ph.vy || 0);
                if (step >= 4 && inside) {
                    if (ph.x <= mirrorLeft && ph.vx < 0) {
                        if (Math.random() < LD.REAR_FACET_REFLECTIVITY) {
                            ph.vx *= -1; ph.x = mirrorLeft + 2; ph.bounces++; ph.stimulated = true;
                        }   // otherwise it leaves through the rear facet
                    }
                    if (ph.x >= mirrorRight && ph.vx > 0) {
                        if (Math.random() < LD.FACET_REFLECTIVITY) {
                            ph.vx *= -1; ph.x = mirrorRight - 2; ph.bounces++; ph.stimulated = true;
                        } else if (aboveThresh) {
                            ph.vx = 4; ph.stimulated = true;   // transmitted, joins the beam
                        }
                    }
                }
                if (step >= 4) {
                    // Photons in the cavity stimulate further, in-phase emission.
                    if (aboveThresh && ph.x > active.left && ph.x < active.right && ph.bounces > 0 && Math.random() < 0.01) {
                        var np = makePhoton(ph.x, ph.y, ph.vx > 0 ? 2.5 : -2.5);
                        np.stimulated = true; np.phase = ph.phase;
                        photons.push(np);
                    }
                }
                ph.life -= 0.003;
                if (ph.x < -20 || ph.x > W + 40 || ph.y < -20 || ph.y > H + 20) ph.life = 0;
            });

            if (step >= 5 && aboveThresh) {
                photonSpawnTimer++;
                if (photonSpawnTimer >= 3) {
                    photonSpawnTimer = 0;
                    var bp = makePhoton(active.right + 30, (active.top + active.bottom) / 2 + (Math.random() - 0.5) * 8, 4);
                    bp.stimulated = true; bp.life = 1.5;
                    photons.push(bp);
                }
            }

            recombinations.forEach(function (r) { r.life -= 0.03; });
            electrons.forEach(function (e) {
                if (e.dead && e.lastHoleIdx >= 0 && holes[e.lastHoleIdx]) holes[e.lastHoleIdx].occupied = false;
            });
            electrons = electrons.filter(function (e) { return !e.dead; });
            photons = photons.filter(function (ph) { return ph.life > 0; });
            recombinations = recombinations.filter(function (r) { return r.life > 0; });
            if (electrons.length > 60) electrons.splice(0, electrons.length - 60);
            if (photons.length > 80) photons.splice(0, photons.length - 80);
        }

        // ── Drawing ──
        function drawJunction() {
            var T = window.T, jx = W * 0.5, dh = getDepletionHalf(), a = getActiveRegionBounds();
            ctx.fillStyle = col('--c-hole', 0.05);
            ctx.fillRect(0, -DY, jx - dh, H + DY);
            ctx.fillStyle = col('--c-elec', 0.05);
            ctx.fillRect(jx + dh, -DY, W - jx - dh, H + DY);
            ctx.fillStyle = T.overlay03;
            ctx.fillRect(jx - dh, -DY, dh * 2, H + DY);

            if (step >= 1) {   // active region (quantum well)
                ctx.fillStyle = col('--c-active', 0.08);
                ctx.fillRect(a.left, a.top, a.right - a.left, a.bottom - a.top);
                ctx.strokeStyle = col('--c-active', 0.5);
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(a.left, a.top, a.right - a.left, a.bottom - a.top);
                ctx.setLineDash([]);
            }

            ctx.strokeStyle = T.overlay20;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            [jx - dh, jx + dh].forEach(function (x) {
                ctx.beginPath(); ctx.moveTo(x, -DY); ctx.lineTo(x, H); ctx.stroke();
            });
            ctx.setLineDash([]);
            ctx.strokeStyle = T.overlay10;
            ctx.beginPath(); ctx.moveTo(jx, -DY); ctx.lineTo(jx, H); ctx.stroke();

            if (dh >= 8) {   // fixed ions
                var spacing = 26, rows = Math.floor((H - 80) / spacing);
                var cols = Math.max(1, Math.floor(dh / spacing));
                ctx.font = '700 9px JetBrains Mono';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                for (var r = 0; r < rows; r++) {
                    var y = 55 + r * spacing;
                    for (var c = 0; c < cols; c++) {
                        var xa = jx - dh + 12 + c * spacing;
                        if (xa < jx - 4) ion(xa, y, '--c-hole', '−');
                        var xd = jx + 12 + c * spacing;
                        if (xd < jx + dh - 4) ion(xd, y, '--c-elec', '+');
                    }
                }
            }
        }
        function ion(x, y, name, sign) {
            ctx.fillStyle = col(name, 0.22);
            ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = col(name, 0.8);
            ctx.fillText(sign, x, y + 1);
        }

        function drawEField() {
            var jx = W * 0.5, dh = getDepletionHalf();
            if (dh < 12) return;
            var y = H * 0.5, len = dh * 1.1;
            ctx.strokeStyle = col('--c-field', 0.75);
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(jx + len * 0.4, y); ctx.lineTo(jx - len * 0.4, y); ctx.stroke();
            ctx.fillStyle = col('--c-field', 0.75);
            ctx.beginPath();
            ctx.moveTo(jx - len * 0.4, y);
            ctx.lineTo(jx - len * 0.4 + 7, y - 4);
            ctx.lineTo(jx - len * 0.4 + 7, y + 4);
            ctx.fill();
        }

        function drawMirrors() {
            if (step < 4) return;
            var T = window.T, mw = 6, a = getActiveRegionBounds();
            var top = a.top - 10, bot = a.bottom + 10;
            var xl = a.left - mw - 20, xr = a.right + 20;
            // Rear facet, HR-coated: solid with hatching.
            ctx.fillStyle = T.overlay25;
            ctx.fillRect(xl, top, mw, bot - top);
            ctx.strokeStyle = T.overlay50;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(xl, top, mw, bot - top);
            ctx.strokeStyle = T.gridStrong;
            ctx.lineWidth = 0.5;
            for (var y = top; y < bot; y += 8) {
                ctx.beginPath(); ctx.moveTo(xl, y); ctx.lineTo(xl + mw, y + 6); ctx.stroke();
            }
            // Front facet, output coupler: lighter, dashed outline.
            ctx.fillStyle = T.gridStrong;
            ctx.fillRect(xr, top, mw, bot - top);
            ctx.strokeStyle = T.overlay40;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(xr, top, mw, bot - top);
            ctx.setLineDash([]);
        }

        function drawHoles() {
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            holes.forEach(function (h) {
                if (h.occupied) return;
                ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
                ctx.fillStyle = col('--c-hole', 0.08); ctx.fill();
                ctx.strokeStyle = col('--c-hole', 0.7); ctx.lineWidth = 1.2; ctx.stroke();
                ctx.font = '700 8px JetBrains Mono';
                ctx.fillStyle = col('--c-hole', 0.85);
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

        function drawPhotons() {
            photons.forEach(function (ph) {
                ctx.save();
                ctx.globalAlpha = Math.min(ph.life, 1);
                var grad = ctx.createRadialGradient(ph.x, ph.y, 0, ph.x, ph.y, 14);
                grad.addColorStop(0, col('--c-photon', 0.33));
                grad.addColorStop(1, col('--c-photon', 0));
                ctx.fillStyle = grad;
                ctx.fillRect(ph.x - 14, ph.y - 14, 28, 28);
                ctx.beginPath(); ctx.arc(ph.x, ph.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = col('--c-photon', ph.stimulated ? 1 : 0.7); ctx.fill();
                ctx.strokeStyle = col('--c-photon', 0.4); ctx.lineWidth = 1;
                ctx.beginPath();
                var dir = ph.vx >= 0 ? -1 : 1;
                for (var i = 0; i < 18; i++) {
                    var dx = dir * i * 1.8, dy = Math.sin((i + time * 8 + ph.phase) * 0.8) * 3.5;
                    if (i === 0) ctx.moveTo(ph.x + dx, ph.y + dy); else ctx.lineTo(ph.x + dx, ph.y + dy);
                }
                ctx.stroke();
                ctx.restore();
            });
            recombinations.forEach(function (r) {
                ctx.save();
                ctx.globalAlpha = r.life;
                ctx.strokeStyle = col('--c-photon', 1); ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(r.x, r.y, (1 - r.life) * 20 + 4, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            });
        }

        function drawBeam() {
            if (step < 5 || !isAboveThreshold()) return;
            var a = getActiveRegionBounds();
            var by = (a.top + a.bottom) / 2, bx = a.right + 30;
            var grad = ctx.createLinearGradient(bx, 0, W, 0);
            grad.addColorStop(0, col('--c-photon', 0.3));
            grad.addColorStop(0.5, col('--c-photon', 0.15));
            grad.addColorStop(1, col('--c-photon', 0));
            ctx.fillStyle = grad;
            var bw = 4 + Math.sin(time * 3) * 0.5;
            ctx.fillRect(bx, by - bw, W - bx, bw * 2);
        }

        function drawLabels() {
            var T = window.T, jx = W * 0.5, a = getActiveRegionBounds();
            ctx.font = '600 14px Inter';
            ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = col('--c-hole', 0.9);
            ctx.fillText('P-type', jx * 0.4, 28);
            ctx.fillStyle = col('--c-elec', 0.9);
            ctx.fillText('N-type', jx * 1.6, 28);
            if (step >= 1) {
                ctx.font = '500 11px JetBrains Mono';
                ctx.fillStyle = T.textDim;
                ctx.fillText('active region', jx, a.bottom + 24);
            }
            if (step > 0 && current() > 0) {
                ctx.font = '500 12px JetBrains Mono';
                ctx.textAlign = 'left';
                ctx.fillStyle = col('--c-hole', 0.9);
                ctx.fillText('+ anode', 10, H - 6);
                ctx.textAlign = 'right';
                ctx.fillStyle = col('--c-elec', 0.9);
                ctx.fillText('cathode −', W - 10, H - 6);
            }
        }

        function draw() {
            cache = {};
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H + DY);
            ctx.translate(0, DY);
            drawJunction();
            drawEField();
            drawMirrors();
            drawHoles();
            drawElectrons();
            drawPhotons();
            drawBeam();
            drawLabels();
        }

        var raf = 0;
        function loop() {
            raf = requestAnimationFrame(loop);
            time += 0.016;
            update();
            draw();
        }
        function start() { if (!raf) raf = requestAnimationFrame(loop); }
        function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

        resize();
        draw();
        window.addEventListener('resize', function () { resize(); draw(); });
        window.addEventListener('themechange', draw);
        new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
        }, { threshold: 0.05 }).observe(canvas);
    }

    function init() { document.querySelectorAll('canvas[data-sim-step]').forEach(Sim); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
