// Particle model of the p-n junction, one instance per canvas[data-sim-step].
// Step 0: unbiased. Step 1: forward bias, drift only. Step 2: recombination
// with hole hopping and photon emission. data-vparam names the LED.p voltage
// that drives the instance. The particle rules (hole lattice, neighbour hops,
// electron state machine, photon rise) are ported from the original page; the
// band diagram that sat above the particles is now a separate D3 figure, so
// the vertical offsets start at Y0 instead of 160.
(function () {
    var Y0 = 60;              // top of the carrier area (below the plot-box label)
    var HOP_SPEED = 3.0;      // pixels per frame while hopping
    var SIT_DURATION = 6;     // frames to sit in a hole before hopping

    // Colour from a CSS variable with alpha, cached per frame.
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
    window.addEventListener('themechange', function () { cache = {}; });

    function Sim(canvas) {
        var step = +canvas.dataset.simStep;
        var vparam = canvas.dataset.vparam;
        var ctx = canvas.getContext('2d');
        var W = 0, H = 0, time = 0, spawnTimer = 0;
        var holes = [], electrons = [], photons = [], recombinations = [];

        function voltage() { return step === 0 ? 0 : window.LED.p[vparam]; }
        function mat() { return window.LED.mat(); }
        function getDepletionHalf() { return W * window.LED.deplFrac(step, voltage(), mat()); }
        function getThresholdExceeded() { return window.LED.exceeded(voltage(), mat()); }

        function resize() {
            var rect = canvas.getBoundingClientRect();
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var w = rect.width, h = rect.height;
            canvas.width = Math.max(1, Math.round(w * dpr));
            canvas.height = Math.max(1, Math.round(h * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // Rebuild the lattice only for a substantial change of size, so
            // scrollbar or zoom jitter does not restart the animation.
            var big = !W || Math.abs(w - W) > 0.1 * W;
            W = w; H = h;
            if (big) initParticles();
        }

        function makeElectron(x, y) {
            return {
                x: x, y: y,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                r: 5,
                state: 'free',      // 'free' | 'hopping' | 'sitting'
                targetHole: null, sittingIn: null, sitTimer: 0,
                firstHop: false     // true only for the conduction to valence band drop
            };
        }

        function initParticles() {
            holes = []; electrons = []; photons = []; recombinations = [];
            var jx = W * 0.5;
            // Section 02 starts from the unbiased lattice, as the original
            // forward-bias step did when entered from step 1.
            var depletionHalf = step === 1 ? W * 0.1 : getDepletionHalf();

            // P-side holes: fixed lattice vacancies in a staggered grid.
            var pLeft = 25;
            var pRight = Math.max(pLeft + 40, jx - depletionHalf - 10);
            var hSpacingX = 42, hSpacingY = 40;
            for (var r = 0; ; r++) {
                var y = Y0 + r * hSpacingY;
                if (y > H - 50) break;
                for (var c = 0; ; c++) {
                    var x = pLeft + c * hSpacingX + (r % 2) * (hSpacingX * 0.5);
                    if (x > pRight) break;
                    holes.push({ x: x, y: y, r: 7, filled: false, reserved: false, neighbours: [] });
                }
            }

            // Each hole links to its nearest left neighbours.
            var maxNeighbourDist = Math.sqrt(hSpacingX * hSpacingX + hSpacingY * hSpacingY) * 1.2;
            holes.forEach(function (hi, i) {
                holes.forEach(function (hj, j) {
                    if (i === j || hj.x >= hi.x - 2) return;
                    if (Math.hypot(hi.x - hj.x, hi.y - hj.y) <= maxNeighbourDist) hi.neighbours.push(j);
                });
                hi.neighbours.sort(function (a, b) {
                    return Math.hypot(holes[a].x - hi.x, holes[a].y - hi.y) -
                        Math.hypot(holes[b].x - hi.x, holes[b].y - hi.y);
                });
            });

            // N-side electrons: free conduction-band carriers.
            var nLeft = Math.min(W - 60, jx + depletionHalf + 10);
            var nRight = W - 20;
            for (var i = 0; i < 20; i++) {
                electrons.push(makeElectron(nLeft + Math.random() * (nRight - nLeft),
                    Y0 + Math.random() * (H - 40 - Y0)));
            }
        }

        function isHoleAvailable(i) { return !holes[i].filled && !holes[i].reserved; }

        // Rightmost available hole to the left of x, preferring the same row.
        function findEntryHole(x, y) {
            var best = -1, bestScore = Infinity;
            for (var i = 0; i < holes.length; i++) {
                if (!isHoleAvailable(i) || holes[i].x >= x) continue;
                var score = (x - holes[i].x) + Math.abs(holes[i].y - y) * 0.5;
                if (score < bestScore) { bestScore = score; best = i; }
            }
            return best;
        }

        function findNeighbourLeft(hi) {
            var nb = holes[hi].neighbours;
            for (var i = 0; i < nb.length; i++) if (isHoleAvailable(nb[i])) return nb[i];
            return -1;
        }

        function resetElectron(e) {
            e.dead = true;
            if (e.targetHole !== null && holes[e.targetHole]) holes[e.targetHole].reserved = false;
            if (e.sittingIn !== null && holes[e.sittingIn]) holes[e.sittingIn].filled = false;
        }

        function update() {
            var jx = W * 0.5;
            var deplHalf = getDepletionHalf();
            var exceeded = getThresholdExceeded();
            var jiggle = 0.4;
            var driftStrength = exceeded ? 0.6 : 0;

            // Inject electrons from the right edge while current flows.
            if (exceeded && step >= 2) {
                spawnTimer++;
                if (spawnTimer >= 12) {
                    spawnTimer = 0;
                    electrons.push(makeElectron(W + 5, Y0 + Math.random() * (H - 40 - Y0)));
                }
            }

            electrons.forEach(function (e) {
                if (e.dead) return;
                if (e.state === 'free') {
                    e.vx += (Math.random() - 0.5) * jiggle;
                    e.vy += (Math.random() - 0.5) * jiggle;
                    if (step >= 1 && voltage() > 0) e.vx -= driftStrength * 0.08;
                    e.vx *= 0.96; e.vy *= 0.96;
                    e.x += e.vx; e.y += e.vy;

                    // Barrier: no crossing below threshold.
                    if (!exceeded && e.x < jx + deplHalf + e.r) { e.x = jx + deplHalf + e.r; e.vx *= -0.8; }
                    if (e.x > W - e.r) { e.x = W - e.r; e.vx *= -0.8; }
                    if (e.y < Y0 - 5 + e.r) { e.y = Y0 - 5 + e.r; e.vy *= -0.8; }
                    if (e.y > H - e.r - 25) { e.y = H - e.r - 25; e.vy *= -0.8; }

                    if (exceeded && step >= 2 && e.x < jx) {
                        var hi = findEntryHole(e.x, e.y);
                        if (hi >= 0) {
                            holes[hi].reserved = true;
                            e.state = 'hopping'; e.targetHole = hi; e.firstHop = true;
                            e.vx = 0; e.vy = 0;
                        } else {
                            e.x = jx - 2; e.vx = 0; e.vy *= 0.9;   // wait at the junction
                        }
                    }
                } else if (e.state === 'hopping') {
                    var h = holes[e.targetHole];
                    var dx = h.x - e.x, dy = h.y - e.y, dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 3) {
                        e.x = h.x; e.y = h.y;
                        h.reserved = false; h.filled = true;
                        e.state = 'sitting'; e.sittingIn = e.targetHole; e.targetHole = null;
                        e.sitTimer = SIT_DURATION + Math.floor(Math.random() * 4);
                        // Photon only on the first drop from conduction to valence band.
                        if (e.firstHop && step >= 2) {
                            photons.push({ x: h.x, y: h.y, vx: 0, vy: -0.5 - Math.random() * 0.4,
                                phase: Math.random() * Math.PI * 2, life: 1.0 });
                            recombinations.push({ x: h.x, y: h.y, life: 1.0 });
                            e.firstHop = false;
                        }
                    } else {
                        e.x += (dx / dist) * HOP_SPEED;
                        e.y += (dy / dist) * HOP_SPEED;
                    }
                } else if (e.state === 'sitting') {
                    if (e.sitTimer > 0) { e.sitTimer--; return; }
                    var prev = e.sittingIn;
                    if (holes[prev].neighbours.length === 0) {   // leftmost hole: leaves at the contact
                        holes[prev].filled = false;
                        resetElectron(e);
                        return;
                    }
                    var next = findNeighbourLeft(prev);
                    if (next >= 0) {
                        holes[next].reserved = true; holes[prev].filled = false;
                        e.state = 'hopping'; e.targetHole = next; e.sittingIn = null;
                    }
                }
            });

            for (var i = electrons.length - 1; i >= 0; i--) if (electrons[i].dead) electrons.splice(i, 1);

            for (var k = photons.length - 1; k >= 0; k--) {
                var ph = photons[k];
                ph.vx = Math.sin(time * 12 + ph.phase) * 0.4;
                ph.x += ph.vx; ph.y += ph.vy;
                ph.life -= 0.006;
                if (ph.life <= 0 || ph.y < -10 || ph.x < -10 || ph.x > W + 10) photons.splice(k, 1);
            }
            for (var n = recombinations.length - 1; n >= 0; n--) {
                recombinations[n].life -= 0.02;
                if (recombinations[n].life <= 0) recombinations.splice(n, 1);
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

            drawFixedIons(jx, dh);
        }

        function drawFixedIons(jx, dh) {
            if (dh < 8) return;
            var spacing = 28;
            var rows = Math.floor((H - 80) / spacing);
            var cols = Math.max(1, Math.floor(dh / spacing));
            ctx.font = '700 10px JetBrains Mono';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (var r = 0; r < rows; r++) {
                var y = 55 + r * spacing;
                for (var c = 0; c < cols; c++) {
                    var xa = jx - dh + 14 + c * spacing;   // acceptor ions, P side
                    if (xa < jx - 4) ion(xa, y, '--c-hole', '−');
                    var xd = jx + 14 + c * spacing;        // donor ions, N side
                    if (xd < jx + dh - 4) ion(xd, y, '--c-elec', '+');
                }
            }
        }
        function ion(x, y, name, sign) {
            ctx.fillStyle = col(name, 0.25);
            ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = col(name, 0.85);
            ctx.fillText(sign, x, y + 1);
        }

        // Built-in field arrow, N to P, across the depletion region midline.
        function drawEField() {
            var jx = W * 0.5, dh = getDepletionHalf();
            if (dh < 15) return;
            var y = H * 0.5, len = dh * 1.2;
            ctx.strokeStyle = col('--c-field', 0.75);
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(jx + len * 0.4, y); ctx.lineTo(jx - len * 0.4, y); ctx.stroke();
            ctx.fillStyle = col('--c-field', 0.75);
            ctx.beginPath();
            ctx.moveTo(jx - len * 0.4, y);
            ctx.lineTo(jx - len * 0.4 + 8, y - 5);
            ctx.lineTo(jx - len * 0.4 + 8, y + 5);
            ctx.fill();
        }

        function drawHoles() {
            holes.forEach(function (h) {
                if (h.filled) return;
                ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
                ctx.fillStyle = col('--c-hole', 0.1); ctx.fill();
                ctx.strokeStyle = col('--c-hole', 0.75); ctx.lineWidth = 1.5; ctx.stroke();
                ctx.font = '700 9px JetBrains Mono';
                ctx.fillStyle = col('--c-hole', 0.9);
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('+', h.x, h.y + 0.5);
            });
        }

        function drawElectrons() {
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            electrons.forEach(function (e) {
                if (e.state === 'sitting') {   // electron occupying a vacancy
                    ctx.beginPath(); ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
                    ctx.fillStyle = col('--c-elec', 0.35); ctx.fill();
                    ctx.font = '700 8px JetBrains Mono';
                    ctx.fillStyle = col('--c-elec', 0.7);
                    ctx.fillText('−', e.x, e.y + 0.5);
                    return;
                }
                ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                ctx.fillStyle = col('--c-elec', 0.9); ctx.fill();
                ctx.font = '700 8px JetBrains Mono';
                ctx.fillStyle = col('--bg-2', 1);
                ctx.fillText('−', e.x, e.y + 0.5);
            });
        }

        function drawPhotons() {
            var pc = mat().col;
            photons.forEach(function (ph) {
                ctx.save();
                ctx.globalAlpha = ph.life > 0.7 ? 1 : ph.life;
                var grad = ctx.createRadialGradient(ph.x, ph.y, 0, ph.x, ph.y, 16);
                grad.addColorStop(0, col(pc, 0.4));
                grad.addColorStop(1, col(pc, 0));
                ctx.fillStyle = grad;
                ctx.fillRect(ph.x - 16, ph.y - 16, 32, 32);
                ctx.beginPath(); ctx.arc(ph.x, ph.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = col(pc, 1); ctx.fill();
                // Wave trail behind the rising photon.
                ctx.strokeStyle = col(pc, 0.55); ctx.lineWidth = 1;
                ctx.beginPath();
                for (var i = 0; i < 24; i++) {
                    var dy = i * 1.5, dx = Math.sin((i + time * 10 + ph.phase) * 0.7) * 4;
                    if (i === 0) ctx.moveTo(ph.x + dx, ph.y + dy); else ctx.lineTo(ph.x + dx, ph.y + dy);
                }
                ctx.stroke();
                ctx.restore();
            });
            recombinations.forEach(function (r) {
                ctx.save();
                ctx.globalAlpha = r.life;
                ctx.strokeStyle = col(pc, 1); ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(r.x, r.y, (1 - r.life) * 25 + 5, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            });
        }

        // Region names at the top; terminal polarity at the bottom corners.
        function drawLabels() {
            var jx = W * 0.5;
            ctx.font = '600 14px Inter';
            ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = col('--c-hole', 0.9);
            ctx.fillText('P-type', jx * 0.5, Y0 - 14);
            ctx.fillStyle = col('--c-elec', 0.9);
            ctx.fillText('N-type', jx * 1.5, Y0 - 14);
            if (step > 0 && voltage() > 0) {
                ctx.font = '500 12px JetBrains Mono';
                ctx.textAlign = 'left';
                ctx.fillStyle = col('--c-hole', 0.9);
                ctx.fillText('+ anode', 10, H - 8);
                ctx.textAlign = 'right';
                ctx.fillStyle = col('--c-elec', 0.9);
                ctx.fillText('cathode −', W - 10, H - 8);
            }
        }

        function draw() {
            cache = {};
            ctx.clearRect(0, 0, W, H);
            drawJunction();
            drawEField();
            drawHoles();
            drawElectrons();
            if (step >= 2) drawPhotons();
            drawLabels();
        }

        // ~30 fps loop, paused while the canvas is off screen.
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
        new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
        }, { threshold: 0.05 }).observe(canvas);
    }

    function init() { document.querySelectorAll('canvas[data-sim-step]').forEach(Sim); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
