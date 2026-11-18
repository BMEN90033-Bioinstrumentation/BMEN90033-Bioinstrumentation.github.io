// Section 01 · Three.js scene of the Ag/AgCl electrode surface at atomic
// scale, 1 scene unit = 1 nm. A slab of fcc silver carries grains of
// rock-salt AgCl separated by pores that expose the metal. Each reaction
// event converts one formula unit at the base of a grain edge, where silver,
// silver chloride and electrolyte meet:
//     reduction   AgCl + e-  ->  Ag + Cl-    (electron arrives from the lead)
//     oxidation   Ag + Cl-   ->  AgCl + e-   (electron leaves to the lead)
// Sphere radii, lattice spacings and ion counts are to scale. Water is not
// drawn, and the time scale is not physical.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { guardWheel } from '../../components/orbit_wheel_guard.js';

const B = window.ELI, p = B.p;
const css = window.CMP.cssVar;
const host = document.getElementById('scene-interface');

// ── Geometry, nm ──
const D = 0.277;          // Ag-Cl distance in AgCl; one formula unit adds 2 D to a column
const DAG = 0.2045;       // (100) layer spacing of fcc Ag; one atom adds DAG to a column
// ponytail: one lateral pitch for both solids (AgCl 0.277, Ag 0.289), so the
// grains sit in registry with the metal. Use two lattices if the 4 % misfit matters.
const G = 0.283;
const N = 20;             // columns per side of the patch
const HALF = N * G / 2;   // half width of the patch in y and z
const S = 3;              // silver per column near the surface: Ag atoms + AgCl units
const SLAB = 4;           // layers of bulk silver behind the surface
const LX = 6.5;           // depth of electrolyte shown
const XTOP = S * 2 * D + 0.35;   // plane just clear of the tallest grain
const X_LEAD = -SLAB * DAG - 0.7;
// Ionic radii (Shannon), the metallic radius of Ag, and hydrated radii.
// Lattice ions are scaled by 0.94 so that neighbours touch at D.
const R = { ag: 0.144, agp: 0.108, cll: 0.169, cl: 0.181, na: 0.102, k: 0.138, e: 0.085 };
const SHELL = { cl: 0.332, na: 0.358, k: 0.331 };
// Events per second at 1x speed, [reduction, oxidation]. Equilibrium runs
// both directions at the same rate (the exchange current); a net current
// biases the ratio. The ratio is illustrative.
const RATE = { equil: [0.7, 0.7], reduce: [1.6, 0.3], oxidize: [0.3, 1.6] };

// ── Renderer, camera, controls ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
host.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
host.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const WHITE = window.T.sceneBg;
scene.background = new THREE.Color(WHITE);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(2.6, -0.3, 0);
camera.position.set(10.1, 3.1, 17);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 6;
controls.maxDistance = 30;
// The viewer stays on the electrolyte side, so the labels keep their order.
controls.minAzimuthAngle = -0.9;
controls.maxAzimuthAngle = 1.35;
guardWheel(controls, renderer.domElement, host.parentElement.querySelector('.hint'));

scene.add(new THREE.AmbientLight(WHITE, 1.0));
const key = new THREE.DirectionalLight(WHITE, 2.6);
key.position.set(8, 10, 12);
scene.add(key);
const fill = new THREE.DirectionalLight(WHITE, 0.7);
fill.position.set(10, -4, -6);
scene.add(fill);

// ── Solid: instanced atoms ──
function ball(r, seg) { return new THREE.SphereGeometry(r, seg || 14, seg ? seg - 4 : 10); }
function matte(v) { return new THREE.MeshStandardMaterial({ color: css(v), roughness: 0.55, metalness: 0 }); }
const agMat = new THREE.MeshPhongMaterial({ color: css('--c-ag'), shininess: 90, specular: window.T.hex('grey') });
const agMesh = new THREE.InstancedMesh(ball(R.ag), agMat, N * N * (SLAB + S));
const agpMesh = new THREE.InstancedMesh(ball(R.agp), matte('--c-agcl'), N * N * S);
const cllMesh = new THREE.InstancedMesh(ball(R.cll), matte('--c-cl'), N * N * S);
[agMesh, agpMesh, cllMesh].forEach(function (o) { o.frustumCulled = false; scene.add(o); });

// Column state: m Ag atoms above the bulk slab, then h AgCl units.
const m = new Uint8Array(N * N), h = new Uint8Array(N * N), busy = new Uint8Array(N * N);
let units = 0, units0 = 1;
function cy(j) { return (j - (N - 1) / 2) * G; }
function height(i) { return m[i] * DAG + h[i] * 2 * D; }
function colAt(y, z) {
    const j = Math.max(0, Math.min(N - 1, Math.round(y / G + (N - 1) / 2)));
    const k = Math.max(0, Math.min(N - 1, Math.round(z / G + (N - 1) / 2)));
    return j * N + k;
}
function nbrs(i) {
    const j = Math.floor(i / N), k = i % N, out = [];
    if (j > 0) out.push(i - N);
    if (j < N - 1) out.push(i + N);
    if (k > 0) out.push(i - 1);
    if (k < N - 1) out.push(i + 1);
    return out;
}

function initLattice() {
    for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
        const f = Math.sin(j * 0.55 + 1) * Math.cos(k * 0.5 + 0.3) + 0.5 * Math.sin((j + k) * 0.35 + 2);
        const i = j * N + k;
        h[i] = f > 0.75 ? 3 : f > 0.05 ? 2 : f > -0.15 ? 1 : 0;
        m[i] = S - h[i];
    }
    busy.fill(0);
    rebuild();
    units0 = units;
}

const M4 = new THREE.Matrix4();
function rebuild() {
    let a = 0, b = 0, c = 0;
    units = 0;
    for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
        const i = j * N + k, y = cy(j), z = cy(k);
        // fcc silver: alternate (100) layers are offset by half the pitch.
        for (let L = -SLAB; L < m[i]; L++) {
            const o = (L & 1) ? G / 2 : 0;
            agMesh.setMatrixAt(a++, M4.makeTranslation((L + 0.5) * DAG, y + o, z + o));
        }
        // Rock salt: Ag+ and Cl- alternate along every axis.
        const x0 = m[i] * DAG;
        for (let s = 0; s < 2 * h[i]; s++) {
            M4.makeTranslation(x0 + (s + 0.5) * D, y, z);
            if ((s + j + k) & 1) cllMesh.setMatrixAt(c++, M4); else agpMesh.setMatrixAt(b++, M4);
        }
        units += h[i];
    }
    agMesh.count = a; agpMesh.count = b; cllMesh.count = c;
    [agMesh, agpMesh, cllMesh].forEach(function (o) { o.instanceMatrix.needsUpdate = true; });
}

// Reactive column for one event, with the neighbouring column through which
// the chloride ion reaches or leaves it. Preference: a column beside a pore
// (bare silver), then a column at a step in the AgCl. Oxidation needs
// electrolyte access to silver, so it stops once the surface is covered.
function pick(red) {
    const tiers = [[], [], []];
    for (let i = 0; i < N * N; i++) {
        if (busy[i] || (red ? !h[i] : !m[i])) continue;
        const nb = nbrs(i);
        const pore = nb.find(function (n) { return h[n] === 0; });
        const step = nb.find(function (n) { return h[n] < h[i]; });
        if (!red && h[i] === 0) tiers[0].push([i, i]);
        else if (pore !== undefined) tiers[0].push([i, pore]);
        else if (step !== undefined) tiers[1].push([i, step]);
        else if (red) tiers[2].push([i, i]);
    }
    const t = tiers.find(function (q) { return q.length; });
    return t ? t[Math.floor(Math.random() * t.length)] : null;
}
// Point in the electrolyte beside the base of the AgCl in column i, above column n.
function site(i, n) {
    return new THREE.Vector3(Math.max(m[i] * DAG, height(n)) + R.cl, cy(Math.floor(n / N)), cy(n % N));
}

// ── Electrolyte volume, lead arrow, scale bar ──
const boxGeo = new THREE.BoxGeometry(LX, 2 * HALF, 2 * HALF);
const box = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({
    color: css('--c-body'), transparent: true, opacity: 0.22, side: THREE.BackSide, depthWrite: false
}));
box.position.set(LX / 2, 0, 0);
scene.add(box);
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo),
    new THREE.LineBasicMaterial({ color: css('--c-edge'), transparent: true, opacity: 0.25 }));
edges.position.copy(box.position);
scene.add(edges);

const INK = new THREE.Color(css('--c-edge'));
scene.add(new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(-SLAB * DAG - 0.25, 0, HALF), 1.1, INK, 0.3, 0.16));
const yLow = -HALF - 0.45;
scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(LX - 1, yLow, HALF), new THREE.Vector3(LX, yLow, HALF)
]), new THREE.LineBasicMaterial({ color: INK })));

// ── CSS2D labels ──
function label(html, x, y, z, cx, tex) {
    const div = document.createElement('div');
    div.className = 's3-label';
    if (tex && window.katex) window.katex.render(html, div, { throwOnError: false });
    else div.textContent = html;
    const o = new CSS2DObject(div);
    o.position.set(x, y, z);
    o.center.set(cx, 0.5);
    scene.add(o);
    return o;
}
// Ag right-aligned and AgCl left-aligned above the solid so the two never
// meet; the electrolyte label sits at the far top corner of the box. The
// lead arrow sits on the front edge, where the slab cannot hide it. The
// current arrow and the scale bar share the lower front edge, 2 nm apart.
label('Ag metal', -0.15, HALF + 0.5, 0, 1);
label('AgCl grains', 0.7, HALF + 0.5, 0, 0);
label('electrolyte', LX, HALF + 0.5, -HALF, 1);
label('to lead wire', -SLAB * DAG - 0.8, 0.42, HALF, 0.5);
label('1 nm', LX - 0.5, yLow - 0.42, HALF, 0.5);

// Conventional current: one arrow, since the current is continuous across
// the interface. Reduction: electrolyte to metal (-x). Oxidation: +x.
let arrow = [];
function buildArrow() {
    arrow.forEach(function (o) { scene.remove(o); if (o.element) o.element.remove(); });
    arrow = [];
    if (p.mode === 'equil') return;
    const c = css('--c-i'), ox = p.mode === 'oxidize';
    const a = new THREE.ArrowHelper(new THREE.Vector3(ox ? 1 : -1, 0, 0),
        new THREE.Vector3(ox ? -0.8 : 3.8, yLow, HALF), 4.6, new THREE.Color(c), 0.42, 0.22);
    scene.add(a);
    const l = label('\\text{conventional current } i', 1.5, yLow - 0.5, HALF, 0.5, true);
    l.element.style.color = c;
    arrow = [a, l];
}

// ── Mobile ions and electrons ──
const ionGeo = { cl: ball(R.cl, 20), na: ball(R.na, 20), k: ball(R.k, 20) };
const ionMat = { cl: matte('--c-cl'), na: matte('--c-na'), k: matte('--c-k') };
const shellGeo = { cl: ball(SHELL.cl, 20), na: ball(SHELL.na, 20), k: ball(SHELL.k, 20) };
const shellMat = {};
Object.keys(ionGeo).forEach(function (t) {
    shellMat[t] = new THREE.MeshBasicMaterial({ color: ionMat[t].color, transparent: true, opacity: 0.13, depthWrite: false });
});
// Electrons and reaction flashes are drawn over the atoms that would hide them.
const eGeo = ball(R.e, 12);
const eMat = new THREE.MeshBasicMaterial({ color: css('--c-e'), transparent: true, depthTest: false });
const flashGeo = ball(0.26, 16);

let ions = [], electrons = [], flashes = [];
let target = 0, netE = 0;
function rnd() { return Math.random() - 0.5; }

function addIon(type, x, y, z) {
    const mesh = new THREE.Mesh(ionGeo[type], ionMat[type]);
    const shell = new THREE.Mesh(shellGeo[type], shellMat[type]);
    mesh.add(shell);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const q = { type: type, mesh: mesh, shell: shell, pos: mesh.position, state: 'free',
        vel: new THREE.Vector3(rnd() * 0.02, rnd() * 0.02, rnd() * 0.02) };
    ions.push(q);
    return q;
}
function removeIon(q) { scene.remove(q.mesh); ions.splice(ions.indexOf(q), 1); }

function addElectron(from, to, done) {
    const mesh = new THREE.Mesh(eGeo, eMat);
    mesh.renderOrder = 5;
    mesh.position.copy(from);
    scene.add(mesh);
    electrons.push({ mesh: mesh, pos: mesh.position, path: [to], v: 3, done: done });
}
function flash(x, y, z) {
    const mesh = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({
        color: css('--c-i'), transparent: true, opacity: 0.7, depthTest: false, depthWrite: false
    }));
    mesh.renderOrder = 4;
    mesh.position.set(x, y, z);
    scene.add(mesh);
    flashes.push({ mesh: mesh, t: 0 });
}

// Ion counts from the concentration and the electrolyte volume shown:
// 1 mM is 6.022e-4 ions per nm^3. Cations split Na:K = 140:4 as in
// extracellular fluid, with at least one K+.
function spawnIons() {
    ions.slice().forEach(removeIon);
    electrons.forEach(function (e) { scene.remove(e.mesh); });
    electrons = [];
    busy.fill(0);
    let solid = 0;
    for (let i = 0; i < N * N; i++) solid += height(i);
    const vol = (LX - solid / (N * N)) * 4 * HALF * HALF;
    target = Math.max(2, Math.round(p.conc * 6.022e-4 * vol));
    const nK = Math.max(1, Math.round(target * 4 / 144));
    function put(type) { addIon(type, XTOP + Math.random() * (LX - XTOP - 0.4), rnd() * 2 * (HALF - 0.4), rnd() * 2 * (HALF - 0.4)); }
    for (let i = 0; i < target; i++) put('cl');
    for (let i = 0; i < target - nK; i++) put('na');
    for (let i = 0; i < nK; i++) put('k');
}

// The far face of the box is open to the bulk solution. A chloride ion
// leaves through it after each reduction and enters after each oxidation,
// so the electrolyte shown stays electroneutral.
function balance() {
    const cl = ions.filter(function (q) { return q.type === 'cl' && q.state !== 'leave'; });
    if (cl.length > target) {
        const free = cl.filter(function (q) { return q.state === 'free'; });
        if (free.length) free.reduce(function (a, b) { return a.pos.x > b.pos.x ? a : b; }).state = 'leave';
    } else if (cl.length < target) {
        addIon('cl', LX - 0.3, rnd() * 2 * (HALF - 0.4), rnd() * 2 * (HALF - 0.4)).vel.x = -0.03;
    }
}

function startReduction() {
    const c = pick(true);
    if (!c) return false;
    const i = c[0], y = cy(Math.floor(i / N)), z = cy(i % N);
    busy[i] = 1;
    addElectron(new THREE.Vector3(X_LEAD, y + rnd() * 0.8, z + rnd() * 0.8), new THREE.Vector3(m[i] * DAG, y, z), function () {
        busy[i] = 0;
        if (!h[i]) return;
        const exit = site(i, c[1]);
        flash(m[i] * DAG + D, y, z);
        h[i]--; m[i]++;
        rebuild();
        const q = addIon('cl', exit.x, exit.y, exit.z);
        q.state = 'out'; q.v = 1.6; q.shell.visible = false;
        q.path = [new THREE.Vector3(XTOP + Math.random() * 0.5, exit.y, exit.z)];
        netE--;
        balance();
        status();
    });
    return true;
}

function startOxidation() {
    const c = pick(false);
    if (!c) return false;
    const i = c[0], s = site(i, c[1]);
    let q = null, best = Infinity;
    ions.forEach(function (o) {
        const d = o.pos.distanceToSquared(s);
        if (o.type === 'cl' && o.state === 'free' && d < best) { best = d; q = o; }
    });
    if (!q) return true;
    busy[i] = 1;
    q.state = 'in'; q.v = 2.4;
    // Approach over the grains, then descend to the silver surface.
    q.path = [new THREE.Vector3(Math.max(XTOP, s.x), s.y, s.z), s];
    q.done = function () {
        busy[i] = 0;
        removeIon(q);
        if (m[i]) {
            const y = cy(Math.floor(i / N)), z = cy(i % N);
            m[i]--; h[i]++;
            rebuild();
            flash(m[i] * DAG + D, y, z);
            addElectron(new THREE.Vector3(m[i] * DAG, y, z), new THREE.Vector3(X_LEAD, y + rnd() * 0.8, z + rnd() * 0.8), null);
            netE++;
        }
        balance();
        status();
    };
    return true;
}

// Advance q along its path at speed q.v; true once the last point is reached.
const tmp = new THREE.Vector3();
function follow(q, dt) {
    const L = tmp.subVectors(q.path[0], q.pos).length(), s = q.v * dt;
    if (L > s) { q.pos.addScaledVector(tmp, s / L); return false; }
    q.pos.copy(q.path[0]);
    q.path.shift();
    return q.path.length === 0;
}

// Damped random walk for a free ion, confined by the box walls and by the
// solid surface under it.
function stepFree(q, dt) {
    const P = q.pos, V = q.vel, r = R[q.type] + 0.05, lim = HALF - r;
    V.x += rnd() * 0.007; V.y += rnd() * 0.007; V.z += rnd() * 0.007;
    V.multiplyScalar(0.96);
    if (q.state === 'leave') V.x += 0.0015;
    const oy = P.y, oz = P.z;
    P.addScaledVector(V, dt * 60);
    if (Math.abs(P.y) > lim) { P.y = Math.sign(P.y) * lim; V.y = -V.y; }
    if (Math.abs(P.z) > lim) { P.z = Math.sign(P.z) * lim; V.z = -V.z; }
    if (q.state === 'leave') { if (P.x > LX + 0.4) removeIon(q); return; }
    if (P.x > LX - r) { P.x = LX - r; V.x = -Math.abs(V.x); }
    const floor = height(colAt(P.y, P.z)) + r;
    if (P.x < floor) {
        if (P.x >= height(colAt(oy, oz)) + r) { P.y = oy; P.z = oz; V.y = -V.y; V.z = -V.z; }   // side of a grain
        else { P.x = floor; V.x = Math.abs(V.x); }
    }
}

// ── Readout ──
let stalled = '';
function status() {
    const n = { cl: 0, na: 0, k: 0 };
    ions.forEach(function (q) { n[q.type]++; });
    B.out({
        's-state': stalled || { equil: 'exchange only, no net current', reduce: 'net reduction, AgCl consumed', oxidize: 'net oxidation, AgCl formed' }[p.mode],
        's-agcl': units + ' (' + Math.round(100 * units / units0) + ' % of initial)',
        's-net': B.sgn(netE, 0) + ' e',
        's-ions': n.cl + ' Cl⁻ · ' + n.na + ' Na⁺ · ' + n.k + ' K⁺',
        's-debye': (0.304 / Math.sqrt(p.conc / 1000)).toFixed(2) + ' nm'
    });
}

// ── Loop ──
const clock = new THREE.Clock();
let raf = 0;
function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05) * p.speed;
    controls.update();
    if (!p.paused) {
        const rate = RATE[p.mode];
        const moving = electrons.length + ions.filter(function (q) { return q.path; }).length;
        if (moving < 6) {
            let msg = '';
            if (Math.random() < rate[0] * dt && !startReduction() && p.mode === 'reduce') msg = 'AgCl consumed, reduction has stopped';
            if (Math.random() < rate[1] * dt && !startOxidation() && p.mode === 'oxidize') msg = 'silver covered, oxidation has stopped';
            if (msg && msg !== stalled) { stalled = msg; status(); }
        }
        ions.slice().forEach(function (q) {
            if (!q.path) { stepFree(q, dt); return; }
            // An ion entering the lattice sheds its hydration shell on the last leg.
            if (q.state === 'in' && q.path.length === 1) q.shell.visible = false;
            if (!follow(q, dt)) return;
            q.path = null;
            if (q.state === 'in') { q.done(); return; }
            q.state = 'free'; q.shell.visible = true; q.vel.set(0.02, 0, 0);
        });
        electrons = electrons.filter(function (e) {
            if (!follow(e, dt)) return true;
            scene.remove(e.mesh);
            if (e.done) e.done();
            return false;
        });
        flashes = flashes.filter(function (f) {
            f.t += dt;
            f.mesh.scale.setScalar(0.6 + 2.4 * f.t);
            f.mesh.material.opacity = Math.max(0, 0.7 * (1 - f.t / 0.5));
            if (f.t < 0.5) return true;
            scene.remove(f.mesh); f.mesh.material.dispose();
            return false;
        });
    }
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
function start() { if (!raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } }
function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    labelRenderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function reset() {
    netE = 0; stalled = '';
    initLattice();
    spawnIons();
    buildArrow();
    status();
}

reset();
new ResizeObserver(resize).observe(host);
resize();
new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
}, { threshold: 0.05 }).observe(host);

window.addEventListener('elichange', function (e) {
    const k = e.detail && e.detail.key;
    if (k === 'mode') { stalled = ''; buildArrow(); status(); }
    if (k === 'conc') { spawnIons(); status(); }
    if (k === 'reset') reset();
});
