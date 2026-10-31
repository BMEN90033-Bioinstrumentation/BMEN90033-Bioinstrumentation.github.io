// Sections 01 and 03 · Device cross-section with carrier animation
// (Canvas2D). Each .cs-box holds its own canvas, particle system and HTML
// overlay; both read the shared BJS.p. Particle rules, depletion widths,
// fixed ions, wires and wire electrons are ported from the original page.
//
// Layout (CSS px, from BJS.regions): block from y = top to 0.78 h; region
// labels (HTML, KaTeX doping) sit 6 to 40 px above the block; wires run
// from the block to h - 8 with terminal letters at their lower ends; the
// current labels (HTML, KaTeX) sit beside the arrows at 40 % of the wire.
(function () {
    function css(n) { return window.CMP.cssVar(n); }

    function Instance(box) {
        var cv = box.querySelector('canvas'), ov = box.querySelector('.cs-overlay');
        var particles = [], wireElectrons = [], w = 0, h = 0, visible = false, raf = 0;
        var MAX_PARTICLES = 200;

        function setup() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
            w = r.width; h = r.height;
            cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
            cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function initParticles() {
            particles = [];
            var npn = window.BJS.p.type === 'NPN', r = window.BJS.regions(w, h);
            function seed(n, reg, type, v) {
                for (var i = 0; i < n; i++) particles.push({
                    x: r[reg].x + Math.random() * r[reg].w, y: r.top + Math.random() * r.height,
                    vx: (Math.random() - 0.5) * v, vy: (Math.random() - 0.5) * v,
                    type: type, region: reg, life: 1
                });
            }
            seed(30, 'emitter', npn ? 'electron' : 'hole', 0.3);
            seed(8, 'base', npn ? 'hole' : 'electron', 0.2);
            seed(20, 'collector', npn ? 'electron' : 'hole', 0.3);
        }

        function updateParticles() {
            var p = window.BJS.p, npn = p.type === 'NPN', r = window.BJS.regions(w, h), ib = p.ib;
            var injectionRate = ib / 100;
            // Sub-threshold: exponentially small injection; active: proportional to I_B.
            var effectiveRate = ib < 15 ? injectionRate * 0.02 : injectionRate * 0.3;
            var carrier = npn ? 'electron' : 'hole';
            if (ib > 0 && Math.random() < effectiveRate) particles.push({
                x: r.base.x + 2, y: r.top + Math.random() * r.height,
                vx: 0.4 + injectionRate * 0.6, vy: (Math.random() - 0.5) * 0.2,
                type: carrier, region: 'injected', life: 1
            });
            // Collector-side injection ramps in as the BC junction nears forward bias.
            var sb = window.BJS.satBlend(ib);
            if (sb > 0 && Math.random() < sb * 0.15) particles.push({
                x: r.base.x + r.base.w - 2, y: r.top + Math.random() * r.height,
                vx: -0.3, vy: (Math.random() - 0.5) * 0.2, type: carrier, region: 'injected', life: 1
            });

            for (var i = particles.length - 1; i >= 0; i--) {
                var q = particles[i];
                if (q.region !== 'injected') {
                    q.vx += (Math.random() - 0.5) * 0.1; q.vy += (Math.random() - 0.5) * 0.1;
                    q.vx *= 0.95; q.vy *= 0.95;
                }
                q.x += q.vx; q.y += q.vy;
                if (q.y < r.top + 2 || q.y > r.top + r.height - 2) {
                    q.vy *= -1; q.y = Math.max(r.top + 2, Math.min(r.top + r.height - 2, q.y));
                }
                if (q.region === 'emitter') {
                    if (q.x < r.emitter.x + 2) { q.x = r.emitter.x + 2; q.vx = Math.abs(q.vx); }
                    if (q.x > r.emitter.x + r.emitter.w - r.beDepl) { q.x = r.emitter.x + r.emitter.w - r.beDepl; q.vx = -Math.abs(q.vx); }
                } else if (q.region === 'base') {
                    if (q.x < r.base.x + r.beDepl) { q.x = r.base.x + r.beDepl; q.vx = Math.abs(q.vx); }
                    if (q.x > r.base.x + r.base.w - r.bcDepl) { q.x = r.base.x + r.base.w - r.bcDepl; q.vx = -Math.abs(q.vx); }
                } else if (q.region === 'collector') {
                    if (q.x > r.collector.x + r.collector.w - 2) { q.x = r.collector.x + r.collector.w - 2; q.vx = -Math.abs(q.vx); }
                    if (q.x < r.collector.x + r.bcDepl) { q.x = r.collector.x + r.bcDepl; q.vx = Math.abs(q.vx); }
                } else {
                    // Injected carrier: recombines in the base with small probability,
                    // is swept through the collector, or returns to the emitter side.
                    if (q.x > r.base.x && q.x < r.base.x + r.base.w && Math.random() < 0.003) q.life = 0;
                    if (q.x > r.base.x + r.base.w) {
                        q.vx = Math.max(q.vx, 0.5);
                        if (q.x > r.collector.x + r.collector.w) q.life = 0;
                    }
                    if (q.vx < 0 && q.x < r.base.x) q.life = 0;
                }
                if (q.life <= 0) particles.splice(i, 1);
            }
            if (particles.length > MAX_PARTICLES) {
                var excess = particles.length - MAX_PARTICLES;
                for (i = particles.length - 1; i >= 0 && excess > 0; i--) {
                    if (particles[i].region === 'injected') { particles.splice(i, 1); excess--; }
                }
            }
        }

        // Electrons in the external wires (metal conducts by electrons for
        // both device types), flowing opposite to conventional current.
        function updateWireElectrons(wires) {
            var p = window.BJS.p, ib = p.ib, npn = p.type === 'NPN';
            if (ib < 15) { wireElectrons = []; return; }
            var rate = (ib - 15) / 85;
            function spawn(wire, prob, down, v0, v1) {
                if (Math.random() >= rate * prob) return;
                var wr = wires[wire];
                wireElectrons.push({ x: wr.x, y: down ? wr.top : wr.bottom, vy: (down ? 1 : -1) * (v0 + rate * v1), wr: wr });
            }
            spawn('emitter', 0.15, !npn, 0.6, 0.4);
            spawn('collector', 0.14, npn, 0.6, 0.4);
            spawn('base', 0.03, npn, 0.4, 0.2);
            for (var i = wireElectrons.length - 1; i >= 0; i--) {
                var e = wireElectrons[i];
                e.y += e.vy;
                e.x = e.wr.x + (Math.random() - 0.5) * 1.5;
                if (e.y < e.wr.top - 3 || e.y > e.wr.bottom + 3) wireElectrons.splice(i, 1);
            }
            if (wireElectrons.length > 60) wireElectrons.splice(0, wireElectrons.length - 60);
        }

        function arrow(g, x1, y1, x2, y2) {
            var a = Math.atan2(y2 - y1, x2 - x1), L = 6;
            g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
            g.beginPath(); g.moveTo(x2, y2);
            g.lineTo(x2 - L * Math.cos(a - Math.PI / 6), y2 - L * Math.sin(a - Math.PI / 6));
            g.lineTo(x2 - L * Math.cos(a + Math.PI / 6), y2 - L * Math.sin(a + Math.PI / 6));
            g.closePath(); g.fill();
        }

        function geometry() {
            var r = window.BJS.regions(w, h), bot = r.top + r.height, end = h - 8;
            r.wires = {
                emitter: { x: r.emitter.x + r.emitter.w / 2, top: bot, bottom: end },
                base: { x: r.base.x + r.base.w / 2, top: bot, bottom: end },
                collector: { x: r.collector.x + r.collector.w / 2, top: bot, bottom: end }
            };
            r.arrowY = bot + (end - bot) * 0.4;
            return r;
        }

        function ions(g, r, npn) {
            var cDon = css('--c-donor'), cAcc = css('--c-acceptor'), sp = 12;
            var rows = Math.floor(r.height / sp);
            g.font = "bold 10px 'JetBrains Mono', monospace"; g.textAlign = 'center'; g.textBaseline = 'middle';
            // n side of a junction holds + donor ions, p side holds - acceptor ions.
            function band(x0, x1, donor) {
                var cols = Math.max(1, Math.floor((x1 - x0) / sp));
                for (var row = 0; row < rows; row++) for (var c = 0; c < cols; c++) {
                    var x = x0 + sp / 2 + c * sp;
                    if (x > x0 && x < x1) { g.fillStyle = donor ? cDon : cAcc; g.fillText(donor ? '+' : '−', x, r.top + sp / 2 + row * sp); }
                }
            }
            var be = r.base.x, bc = r.base.x + r.base.w;
            band(be - r.beDepl, be, npn);       // emitter side
            band(be, be + r.beDepl, !npn);      // base side
            band(bc - r.bcDepl, bc, !npn);      // base side
            band(bc, bc + r.bcDepl, npn);       // collector side
        }

        function draw() {
            var T = window.T, p = window.BJS.p, npn = p.type === 'NPN';
            var g = cv.getContext('2d');
            g.clearRect(0, 0, w, h);
            var r = geometry();
            var cN = css('--c-ntype'), cP = css('--c-ptype');

            [['emitter', npn ? cN : cP, 0.15], ['base', npn ? cP : cN, 0.15], ['collector', npn ? cN : cP, 0.12]]
                .forEach(function (q) {
                    g.globalAlpha = q[2]; g.fillStyle = q[1];
                    g.fillRect(r[q[0]].x, r.top, r[q[0]].w, r.height);
                    g.globalAlpha = 1; g.strokeStyle = T.gridStrong; g.lineWidth = 1;
                    g.strokeRect(r[q[0]].x, r.top, r[q[0]].w, r.height);
                });

            // Depletion regions about each junction.
            g.setLineDash([3, 3]); g.strokeStyle = T.overlay20; g.fillStyle = T.gridLight;
            [[r.base.x, r.beDepl], [r.base.x + r.base.w, r.bcDepl]].forEach(function (d) {
                g.fillRect(d[0] - d[1], r.top, d[1] * 2, r.height);
                g.strokeRect(d[0] - d[1], r.top, d[1] * 2, r.height);
            });
            g.setLineDash([]);
            ions(g, r, npn);

            // Terminal wires and letters.
            g.strokeStyle = T.overlay35; g.lineWidth = 2;
            ['emitter', 'base', 'collector'].forEach(function (k) {
                var wr = r.wires[k];
                g.beginPath(); g.moveTo(wr.x, wr.top); g.lineTo(wr.x, wr.bottom); g.stroke();
            });
            g.fillStyle = T.text; g.font = "600 12px 'JetBrains Mono', monospace";
            g.textAlign = 'center'; g.textBaseline = 'alphabetic';
            g.fillText('E', r.wires.emitter.x - 11, r.wires.emitter.bottom - 4);
            g.fillText('B', r.wires.base.x - 11, r.wires.base.bottom - 4);
            g.fillText('C', r.wires.collector.x + 11, r.wires.collector.bottom - 4);

            // Conventional current arrows. NPN: into C and B, out of E. PNP: reversed.
            if (p.ib >= 15) {
                g.strokeStyle = T.overlay50; g.fillStyle = T.overlay50; g.lineWidth = 1;
                var ay = r.arrowY, off = 14, out = npn ? 1 : -1;
                arrow(g, r.wires.emitter.x + off, ay - out * 10, r.wires.emitter.x + off, ay + out * 10);
                arrow(g, r.wires.collector.x - off, ay + out * 10, r.wires.collector.x - off, ay - out * 10);
                arrow(g, r.wires.base.x + off, ay + out * 10, r.wires.base.x + off, ay - out * 10);
            }

            // Carriers: electrons filled, holes as rings.
            var cE = css('--c-electron'), cH = css('--c-hole');
            particles.forEach(function (q) {
                g.beginPath(); g.arc(q.x, q.y, 3, 0, Math.PI * 2);
                if (q.type === 'electron') { g.fillStyle = cE; g.fill(); }
                else { g.strokeStyle = cH; g.lineWidth = 1.5; g.stroke(); }
            });
            g.fillStyle = cE;
            wireElectrons.forEach(function (e) { g.beginPath(); g.arc(e.x, e.y, 2.5, 0, Math.PI * 2); g.fill(); });
            return r;
        }

        // HTML overlay: region names, doping (KaTeX) and current labels.
        function overlay() {
            var p = window.BJS.p, npn = p.type === 'NPN', r = geometry();
            var K = function (tex) { return window.katex ? window.katex.renderToString(tex) : tex; };
            var items = [
                ['emitter', 'Emitter (E)', npn ? '\\text{N}^{+}\\text{, phosphorus}' : '\\text{P}^{+}\\text{, boron}', npn],
                ['base', 'Base (B)', npn ? '\\text{P, boron}' : '\\text{N, phosphorus}', !npn],
                ['collector', 'Collector (C)', npn ? '\\text{N}^{-}\\text{, phosphorus}' : '\\text{P}^{-}\\text{, boron}', npn]
            ];
            var html = items.map(function (q) {
                return '<div class="cs-reg" style="left:' + (r[q[0]].x + r[q[0]].w / 2) + 'px;top:' + (r.top - 6) + 'px">' +
                    '<div class="t">' + q[1] + '</div><div class="d" style="color:var(' + (q[3] ? '--c-ntype' : '--c-ptype') + ')">' +
                    K(q[2]) + '</div></div>';
            }).join('');
            if (p.ib >= 15) {
                var ay = r.arrowY;
                html += '<div class="cs-cur" style="left:' + (r.wires.emitter.x + 20) + 'px;top:' + ay + 'px">' + K('I_E') + '</div>';
                html += '<div class="cs-cur" style="left:' + (r.wires.base.x + 20) + 'px;top:' + ay + 'px">' + K('I_B') + '</div>';
                html += '<div class="cs-cur right" style="left:' + (r.wires.collector.x - 20) + 'px;top:' + ay + 'px">' + K('I_C') + '</div>';
            }
            ov.innerHTML = html;
        }

        function frame() {
            var r = geometry();
            if (window.BJS.p.anim === 'play') { updateParticles(); updateWireElectrons(r.wires); }
            draw();
            raf = visible ? requestAnimationFrame(frame) : 0;
        }

        function refresh(reinit) {
            setup();
            if (reinit) initParticles();
            overlay();
            draw();
        }

        new IntersectionObserver(function (es) {
            visible = es[0].isIntersecting;
            if (visible && !raf) raf = requestAnimationFrame(frame);
        }).observe(box);
        window.addEventListener('resize', function () { refresh(true); });
        window.addEventListener('themechange', function () { overlay(); draw(); });
        window.addEventListener('bjschange', function (e) { refresh(e.detail.key === 'type'); });
        refresh(true);
    }

    function init() { document.querySelectorAll('.cs-box').forEach(function (b) { new Instance(b); }); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
