// Section 01 · Three.js membrane patch drawn to scale, 1 scene unit = 1 nm.
// The block is 50 nm wide and 10 nm deep and is sectioned at z = 0 through the
// protein axes; the protein lobes in front of the section are drawn as ghosts.
//
//   Bilayer   phospholipids at 0.85 nm pitch, head groups 3.9 nm apart.
//   Channels  four pore domains around a central pore with a selectivity
//             filter at the outer end. The inner ends of the pore domains
//             form the activation gate; the pore area follows the open
//             fraction (m^3 for Na+, n^4 for K+). Four voltage sensors, each
//             with an S4 helix that moves outward with its gating variable:
//             m for three Na+ sensors, 1 - h for the fourth, n for K+. The
//             Na+ inactivation particle docks at the inner mouth as h falls.
//   Leak      one always-open pore per ion carries the leak current.
//   Pump      Na+/K+-ATPase, two transmembrane halves that rock between the
//             inward-open (E1) and outward-open (E2) states, with the
//             cytoplasmic head and the beta-subunit ectodomain. One cycle
//             runs for every 3 Na+ of pump flux owed by the model.
//   Ions      every sphere is one ion; counts follow the concentrations
//             (B.amount0). Ions cross as the model requires (B.pending).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { guardWheel } from '../../components/orbit_wheel_guard.js';

const B = window.BIO, HH = B.HH, BOX = B.box;
const host = document.getElementById('bio-three');
const col = (n) => new THREE.Color(window.CMP.cssVar(n));
const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp;
const rnd = (a) => (Math.random() - 0.5) * a;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const solidMat = (v) => new THREE.MeshStandardMaterial({ color: col(v), roughness: 0.5 });
// Lighter (k > 0) or darker (k < 0) shade of a material, to separate the domains of one protein.
const shade = (m, k) => { const c = m.clone(); c.color.lerp(new THREE.Color(k > 0 ? 0xffffff : 0x000000), Math.abs(k)); return c; };
const ghostOf = (m) => { const g = m.clone(); g.transparent = true; g.opacity = 0.3; g.depthWrite = false; return g; };

// Protein axes along x [nm].
const X = { leakNa: -20.5, na: -10.5, pump: 0, k: 10.5, leakK: 20.5 };
// Lipid-free footprint of each protein: [x, radius].
const FOOTPRINT = [[X.leakNa, 2.8], [X.na, 4.3], [X.pump, 3.5], [X.k, 4.3], [X.leakK, 2.8]];
// Ion spheres are drawn at about twice the ionic radii (0.10 and 0.14 nm).
const R_ION = { na: 0.2, k: 0.27 };
// Random-walk noise per frame, in the ratio sqrt(D_K / D_Na) = 1.21.
const NOISE = { na: 0.10, k: 0.12 };

// ───────── Scene, camera, renderers ─────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(window.T.sceneBg);
scene.fog = new THREE.Fog(window.T.sceneBg, 44, 95);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
camera.position.set(0, 5, 49);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
host.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.domElement.className = 'scene-labels';
host.appendChild(labels.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, -3);
controls.minDistance = 12;
controls.maxDistance = 95;
// Keep the sectioned face towards the viewer.
controls.minAzimuthAngle = -Math.PI / 3;
controls.maxAzimuthAngle = Math.PI / 3;
controls.minPolarAngle = Math.PI / 6;
controls.maxPolarAngle = 5 * Math.PI / 6;
guardWheel(controls, renderer.domElement, host.parentElement.querySelector('.hint'));

scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(8, 20, 24);
scene.add(key);

function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    renderer.setSize(r.width, r.height);
    labels.setSize(r.width, r.height);
}
new ResizeObserver(resize).observe(host);

function add(parent, geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
}

function label(tex, x, y) {
    const el = document.createElement('div');
    el.className = 'scene-label';
    window.katex.render(tex, el, { throwOnError: false });
    const o = new CSS2DObject(el);
    o.position.set(x, y, 0);
    scene.add(o);
}

// ───────── Bilayer ─────────
(function buildMembrane() {
    const pitch = 0.85, lipids = [];
    const clear = (x, z) => FOOTPRINT.every(([gx, r]) => (x - gx) * (x - gx) + z * z > r * r);
    for (let i = 0, x = -BOX.x - 0.4; x <= BOX.x + 0.4; x += pitch, i++) {
        for (let z = -BOX.depth - 0.4 + (i % 2) * pitch / 2; z <= 0.45; z += pitch) {
            for (const s of [1, -1]) {                     // the two leaflets are not in register
                const lx = x + rnd(0.3), lz = z + rnd(0.3);
                if (clear(lx, lz)) lipids.push([lx, s, lz]);
            }
        }
    }
    const headMat = solidMat('--c-lipid');
    const tailMat = solidMat('--c-lipid');
    tailMat.color.lerp(new THREE.Color(0xffffff), 0.45);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 12, 10), headMat, lipids.length);
    const tails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 5), tailMat, lipids.length * 2);
    const d = new THREE.Object3D();
    lipids.forEach(([x, s, z], i) => {
        d.rotation.set(0, 0, 0);
        d.position.set(x, s * (1.95 + rnd(0.15)), z);
        d.updateMatrix();
        heads.setMatrixAt(i, d.matrix);
        for (let t = 0; t < 2; t++) {                      // two acyl chains per lipid
            d.rotation.set(rnd(0.3), 0, rnd(0.3));
            d.position.set(x + (t ? 0.2 : -0.2), s * 0.93, z + rnd(0.2));
            d.updateMatrix();
            tails.setMatrixAt(2 * i + t, d.matrix);
        }
    });
    scene.add(heads, tails);
})();

// ───────── Channels ─────────
// Four pore domains at 0, 90, 180 and 270 degrees about the pore axis. Each is
// hinged at its outer end, so rotation.z of the pivot swings the inner end
// towards (closed) or away from (open) the axis. The domain at 90 degrees is
// in front of the section and is drawn as a ghost.
function buildChannel(x, colourVar, o) {
    const g = new THREE.Group();
    g.position.x = x;
    scene.add(g);
    const solid = solidMat(colourVar), ghost = ghostOf(solid);
    const rear = shade(solid, -0.3), light = shade(solid, 0.35), dark = shade(solid, -0.5);
    const rTop = o.vsd ? 1.7 : 1.5, pds = [], s4s = [];
    const pdGeo = new THREE.CapsuleGeometry(0.95, 3.0, 6, 16);
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2, piv = new THREE.Group();
        piv.position.set(Math.cos(a) * rTop, 2.2, Math.sin(a) * rTop);
        piv.rotation.y = -a;                               // local +x points radially outward
        add(piv, pdGeo, i === 1 ? ghost : i === 3 ? rear : solid, 0, -2.2, 0);   // rear wall darker, so the pore reads in section
        g.add(piv);
        pds.push(piv);
    }
    // Selectivity filter: rear half of a ring that narrows the outer pore.
    for (let i = 0; i < o.filter; i++) {
        add(g, new THREE.TorusGeometry(0.62, 0.3, 10, 24, Math.PI), solid, 0, 1.7 - 0.6 * i, 0).rotation.x = -Math.PI / 2;
    }
    if (o.vsd) {
        const vsdGeo = new THREE.CapsuleGeometry(0.85, 2.9, 6, 16);
        const s4Geo = new THREE.CapsuleGeometry(0.3, 3.4, 4, 10);
        for (let i = 0; i < 4; i++) {                      // 45 (front right), 135 (front left), 225, 315 degrees
            const a = Math.PI / 4 + i * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
            add(g, vsdGeo, s > 0 ? ghostOf(light) : light, 3.0 * c, 0, 3.0 * s);
            s4s.push(add(g, s4Geo, dark, 3.75 * c, 0, 3.75 * s));
        }
    }
    return { g, pds, s4s };
}

// open: open fraction (pore area), sensors: outward displacement of each S4, 0 to 1.
function setChannel(ch, open, sensors) {
    const th = lerp(-0.16, 0.07, Math.sqrt(open));
    ch.pds.forEach((p) => { p.rotation.z = th; });
    ch.s4s.forEach((s, i) => { s.position.y = -0.45 + 0.9 * sensors[i]; });
}

const naCh = buildChannel(X.na, '--c-nachan', { vsd: true, filter: 1 });
const kCh = buildChannel(X.k, '--c-kchan', { vsd: true, filter: 2 });
setChannel(buildChannel(X.leakNa, '--c-nachan', { vsd: false, filter: 1 }), 0.45, []);
setChannel(buildChannel(X.leakK, '--c-kchan', { vsd: false, filter: 2 }), 0.45, []);

// Na+ inactivation particle on its linker, hinged below the right-hand pore domain.
const lidMat = solidMat('--c-gate');
const lid = add(naCh.g, new THREE.SphereGeometry(0.6, 20, 14), lidMat, 0, 0, 0);
const tether = add(naCh.g, new THREE.CylinderGeometry(0.11, 0.11, 1, 8), lidMat, 0, 0, 0);
const HINGE = V3(2.4, -2.6, 0), DOCK = V3(0, -3.05, 0), AWAY = V3(3.6, -4.7, 0), UP = V3(0, 1, 0), tmp = V3(0, 0, 0);

function animateChannels() {
    const m = HH.m, h = HH.h, n = HH.n;
    setChannel(naCh, m * m * m, [1 - h, m, m, m]);
    setChannel(kCh, n * n * n * n, [n, n, n, n]);
    lid.position.lerpVectors(DOCK, AWAY, h);
    tmp.subVectors(lid.position, HINGE);
    tether.scale.y = tmp.length();
    tether.position.copy(HINGE).addScaledVector(tmp, 0.5);
    tether.quaternion.setFromUnitVectors(UP, tmp.normalize());
}

// ───────── Na+/K+-ATPase ─────────
const PUMP = { state: 0, t: 0, rock: 1, held: [], jaws: [], nDom: null };
// Spheres that free ions cannot enter (pump head and beta ectodomain), world coordinates.
const BLOCK = [];
(function buildPump() {
    const g = new THREE.Group();
    g.position.x = X.pump;
    scene.add(g);
    const solid = solidMat('--c-pump'), ghost = ghostOf(solid);
    solid.roughness = 0.35;
    const lobe = new THREE.CapsuleGeometry(1.1, 3.0, 6, 16), lip = new THREE.SphereGeometry(0.5, 14, 10);
    for (const s of [-1, 1]) {                             // the two rocking halves, pivoted mid-membrane
        const piv = new THREE.Group();
        piv.position.x = s * 1.55;
        add(piv, lobe, solid, 0, 0, 0);
        add(piv, lip, solid, -s * 1.0, 2.3, 0);            // outer gate
        add(piv, lip, solid, -s * 1.0, -2.3, 0);           // inner gate
        g.add(piv);
        PUMP.jaws.push(piv);
    }
    const light = shade(solid, 0.22);
    add(g, lobe, light, 0, 0, -1.7);                       // rear wall of the ion pathway
    add(g, lobe, ghost, 0, 0, 1.7);
    const blob = (r, x, y, z) => {
        BLOCK.push({ c: V3(X.pump + x, y, z), r: r + 0.3 });
        return add(g, new THREE.SphereGeometry(r, 24, 16), solid, x, y, z);
    };
    blob(1.6, 1.9, -4.2, -1.8);                            // P domain
    PUMP.nDom = blob(1.9, 2.6, -6.9, -1.8);                // N domain (binds ATP)
    blob(1.6, -1.9, -4.3, -1.8);                           // A domain
    add(g, new THREE.CapsuleGeometry(0.4, 3.6, 4, 10), light, -2.7, 0, -1.3);   // beta subunit helix
    blob(1.3, -2.5, 3.9, -1.3).material = light;           // beta subunit ectodomain
})();

// ───────── Ions ─────────
const ions = { na: [], k: [] }, meshes = {};
const inBlock = (q) => BLOCK.some((b) => q.distanceToSquared(b.c) < b.r * b.r);
function randomPos(region) {
    const sy = region === 'out' ? 1 : -1, q = V3(0, 0, 0);
    do q.set(rnd(2 * BOX.x), sy * lerp(BOX.yMem, BOX.yMax, Math.random()), -Math.random() * BOX.depth);
    while (inBlock(q));
    return q;
}
for (const type of ['na', 'k']) {
    for (const region of ['out', 'in']) {
        for (let i = Math.round(B.amount0[type][region]); i > 0; i--) {
            ions[type].push({ pos: randomPos(region), vel: V3(0, 0, 0), region, mode: 'free', pts: null, t: 0, frames: 1, to: null });
        }
    }
    const mat = new THREE.MeshLambertMaterial({ color: col('--c-' + type) });
    meshes[type] = new THREE.InstancedMesh(new THREE.SphereGeometry(R_ION[type], 10, 8), mat, ions[type].length);
    scene.add(meshes[type]);
}

// Transports started this frame, by direction.
const moved = { naIn: 0, naOut: 0, kIn: 0, kOut: 0 };
const tally = (type, dir) => { moved[type + (dir > 0 ? 'In' : 'Out')]++; };

function nearest(type, region, pt) {
    let best = null, bd = Infinity;
    for (const p of ions[type]) {
        if (p.mode !== 'free' || p.region !== region) continue;
        const d = p.pos.distanceToSquared(pt);
        if (d < bd) { bd = d; best = p; }
    }
    return best;
}

// Move ion p through the points pts in the given number of frames, then
// release it into region `to`, or hold it at the last point if `to` is null.
function send(p, pts, frames, to) {
    p.mode = 'path';
    p.pts = [p.pos.clone()].concat(pts);
    p.t = 0; p.frames = frames; p.to = to;
}

function stepPath(p) {
    const n = p.pts.length - 1;
    p.t = Math.min(1, p.t + 1 / p.frames);
    const u = p.t * n, i = Math.min(Math.floor(u), n - 1);
    p.pos.lerpVectors(p.pts[i], p.pts[i + 1], u - i);
    if (p.t < 1) return;
    if (!p.to) { p.mode = 'held'; return; }
    p.region = p.to;
    p.mode = 'free';
    p.vel.set(0, p.to === 'out' ? 0.1 : -0.1, 0);
}

const mouth = (xc, sy) => V3(xc + rnd(0.3), sy * 2.9, -Math.random() * 0.3);

// Start the whole-ion transports owed on a passive route through the pore at
// xc. The nearest free ion on the source side is used. A backlog of more than
// eight (the scene was off screen) is moved without animation.
function cross(type, route, xc) {
    const pend = B.pending[route];
    let n = Math.trunc(pend[type]);
    if (!n) return;
    const dir = Math.sign(n), from = dir > 0 ? 'out' : 'in', to = dir > 0 ? 'in' : 'out';
    for (n = Math.abs(n); n > 0; n--) {
        const m = mouth(xc, dir), p = nearest(type, from, m);
        if (!p) break;
        if (n > 8) { p.region = to; p.pos.copy(randomPos(to)); }
        else send(p, [m, mouth(xc, -dir)], 22, to);
        pend[type] -= dir;
        tally(type, dir);
    }
}

// Post-Albers cycle of the pump: [rock target, frames]. rock = +1 is open to
// the cytoplasm (E1), -1 open to the outside (E2), 0 occluded.
const CYCLE = [
    [1, 0],      // 0  E1, empty, waiting for three Na+ of pump flux
    [1, 12],     // 1  three Na+ bind from the cytoplasm
    [0, 5],      // 2  E1P, occluded: ATP hydrolysed, pump phosphorylated
    [-1, 10],    // 3  E2P, Na+ released outside
    [-1, 12],    // 4  two K+ bind from outside
    [0, 5],      // 5  E2, occluded: pump dephosphorylated
    [1, 10]      // 6  E1, K+ released to the cytoplasm
];
const SITE = { na: [0.75, 0, -0.75], k: [0.4, -0.4] };   // binding sites along the pump axis

function pumpBind(type, from, sy) {
    const gate = V3(X.pump, sy * 3.1, 0), pend = B.pending.pump;
    SITE[type].forEach((y) => {
        const p = nearest(type, from, gate);
        if (!p) return;
        send(p, [gate, V3(X.pump, y, 0)], 10, null);
        PUMP.held.push(p);
        pend[type] -= sy;                                  // Na+ leaves (sy = -1), K+ enters (sy = +1)
        tally(type, sy);
    });
}

function pumpRelease(to, sy) {
    // The first, zero-length segment holds the ions while the gate opens.
    PUMP.held.forEach((p) => send(p, [p.pos.clone(), V3(X.pump + rnd(0.3), sy * 3.1, 0)], 10, to));
    PUMP.held = [];
}

function stepPump() {
    const P = PUMP, pend = B.pending.pump;
    while (pend.na <= -18) {                               // backlog from time off screen: move without animation
        for (let i = 0; i < 5; i++) {
            const type = i < 3 ? 'na' : 'k', to = i < 3 ? 'out' : 'in';
            const p = nearest(type, i < 3 ? 'in' : 'out', V3(X.pump, 0, 0));
            if (p) { p.region = to; p.pos.copy(randomPos(to)); }
            tally(type, i < 3 ? -1 : 1);
        }
        pend.na += 3; pend.k -= 2;
    }
    P.rock += (CYCLE[P.state][0] - P.rock) * 0.3;
    P.jaws[0].rotation.z = -0.15 * P.rock;
    P.jaws[1].rotation.z = 0.15 * P.rock;
    P.nDom.position.x = 2.6 - 0.25 * (1 - P.rock);

    if (P.state === 0) { if (pend.na > -3) return; }
    else if ((P.t += clamp(-pend.na / 3, 1, 3)) < CYCLE[P.state][1]) return;
    P.state = (P.state + 1) % CYCLE.length;
    P.t = 0;
    if (P.state === 1) pumpBind('na', 'in', -1);
    if (P.state === 3) pumpRelease('out', 1);
    if (P.state === 4) pumpBind('k', 'out', 1);
    if (P.state === 6) pumpRelease('in', -1);
}

const mat4 = new THREE.Matrix4();
function stepIons(type) {
    const list = ions[type], mesh = meshes[type], s = NOISE[type];
    for (let i = 0; i < list.length; i++) {
        const p = list[i], q = p.pos, v = p.vel;
        if (p.mode === 'path') stepPath(p);
        else if (p.mode === 'free') {
            // Velocity with a short memory: a random walk without frame-to-frame jitter.
            v.multiplyScalar(0.88);
            v.x += rnd(s); v.y += rnd(s); v.z += rnd(s);
            q.add(v);
            const sy = p.region === 'out' ? 1 : -1, ay = q.y * sy;
            if (Math.abs(q.x) > BOX.x) { q.x = Math.sign(q.x) * BOX.x; v.x = -v.x; }
            if (q.z > 0 || q.z < -BOX.depth) { q.z = clamp(q.z, -BOX.depth, 0); v.z = -v.z; }
            if (ay < BOX.yMem || ay > BOX.yMax) { q.y = sy * clamp(ay, BOX.yMem, BOX.yMax); v.y = -v.y; }
            if (inBlock(q)) { q.sub(v); v.negate(); }
        }
        mesh.setMatrixAt(i, mat4.makeTranslation(q.x, q.y, q.z));
    }
    mesh.instanceMatrix.needsUpdate = true;
}

// ───────── Labels and scale bar ─────────
label('\\text{Na}^+\\ \\text{channel}', X.na, 5.9);
label('\\text{K}^+\\ \\text{channel}', X.k, 5.9);
label('\\text{Na}^+\\ \\text{leak}', X.leakNa, -4.6);
label('\\text{K}^+\\ \\text{leak}', X.leakK, -4.6);
label('\\text{Na}^+/\\text{K}^+\\text{-ATPase}', X.pump, -10.6);
label('\\text{extracellular fluid}', 0, 12.6);
label('\\text{cytoplasm}', -12, -12.6);
add(scene, new THREE.BoxGeometry(5, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: col('--d-ink') }), -21.5, -14, 0);
label('5\\,\\text{nm}', -21.5, -12);

// ───────── Frame loop ─────────
// Started transports in ions per ms of model time, smoothed over about 20 frames.
const elFlux = document.querySelector('[data-out3d="flux"]');
const rate = { naIn: 0, naOut: 0, kIn: 0, kOut: 0 };

resize();
B.onTick(() => {
    controls.update();
    moved.naIn = moved.naOut = moved.kIn = moved.kOut = 0;
    animateChannels();
    cross('na', 'chan', X.na);
    cross('na', 'leak', X.leakNa);
    cross('k', 'chan', X.k);
    cross('k', 'leak', X.leakK);
    stepPump();
    stepIons('na');
    stepIons('k');
    renderer.render(scene, camera);
    labels.render(scene, camera);

    const dtFrame = B.STEPS_PER_FRAME * HH.dt;
    for (const k in rate) rate[k] += (moved[k] / dtFrame - rate[k]) * 0.05;
    const r = (v) => v.toFixed(1);
    elFlux.textContent = 'Na ' + r(rate.naIn) + '/' + r(rate.naOut) + ' · K ' + r(rate.kOut) + '/' + r(rate.kIn);
}, host);
