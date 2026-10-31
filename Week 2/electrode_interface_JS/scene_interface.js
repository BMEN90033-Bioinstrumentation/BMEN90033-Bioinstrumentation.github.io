// Section 01 · Three.js scene of the Ag/AgCl electrode-electrolyte interface.
// Particle kinematics come from ELI.step (model.js); this file only renders.
// Structural and current labels are CSS2D objects so they stay readable and
// can carry KaTeX. Species are identified by the HTML legend.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { guardWheel } from '../../components/orbit_wheel_guard.js';

const B = window.ELI, p = B.p;
const css = window.CMP.cssVar;
const host = document.getElementById('scene-interface');

const {
    ELECTRODE_W, ELECTRODE_H, ELECTRODE_D, AGCL_THICKNESS, ELECTROLYTE_W, ELECTROLYTE_H,
    ELECTROLYTE_D, WIRE_HEIGHT, ELECTRODE_X, INTERFACE_X, ELECTROLYTE_CX
} = B;
const WIRE_TOP = ELECTRODE_H / 2 + WIRE_HEIGHT;
const AMP_X = ELECTRODE_X + 15;

// ── Renderer, camera, controls ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
host.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
host.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(window.T.sceneBg);
scene.fog = new THREE.FogExp2(window.T.sceneBg, 0.012);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
camera.position.set(4, 15, 48);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(2, 3.5, 2);
controls.minDistance = 15;
controls.maxDistance = 90;
guardWheel(controls, renderer.domElement, host.parentElement.querySelector('.hint'));

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(15, 20, 15);
scene.add(dirLight);
const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
backLight.position.set(-10, 10, -10);
scene.add(backLight);

// ── Electrode, coating, wire, amplifier ──
const agMat = new THREE.MeshPhongMaterial({ shininess: 80, specular: 0x999999 });
const agMesh = new THREE.Mesh(new THREE.BoxGeometry(ELECTRODE_D, ELECTRODE_H, ELECTRODE_W), agMat);
agMesh.position.set(ELECTRODE_X, 0, 0);
scene.add(agMesh);

const agclMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.7, emissiveIntensity: 0.3 });
const agclMesh = new THREE.Mesh(new THREE.BoxGeometry(AGCL_THICKNESS, ELECTRODE_H, ELECTRODE_W), agclMat);
agclMesh.position.set(INTERFACE_X, 0, 0);
scene.add(agclMesh);

const wireMat = new THREE.LineBasicMaterial();
scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(ELECTRODE_X, ELECTRODE_H / 2, 0),
    new THREE.Vector3(ELECTRODE_X, WIRE_TOP, 0),
    new THREE.Vector3(AMP_X, WIRE_TOP, 0)
]), wireMat));

const ampMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const ampMesh = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), ampMat);
ampMesh.position.set(AMP_X, WIRE_TOP, 0);
scene.add(ampMesh);

// ── Electrolyte volume ──
const elecGeo = new THREE.BoxGeometry(ELECTROLYTE_W, ELECTROLYTE_H, ELECTROLYTE_D);
const elecMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
const elecMesh = new THREE.Mesh(elecGeo, elecMat);
elecMesh.position.set(ELECTROLYTE_CX, 0, 0);
scene.add(elecMesh);
const edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.14 });
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(elecGeo), edgeMat);
edges.position.copy(elecMesh.position);
scene.add(edges);

// Reaction plane on the AgCl surface.
const planeMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.3, ELECTRODE_H + 2), planeMat);
plane.position.set(INTERFACE_X + AGCL_THICKNESS / 2, 0, 0);
scene.add(plane);

let grid = null;
function buildGrid() {
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    grid = new THREE.GridHelper(60, 30, new THREE.Color(css('--c-grid-a')), new THREE.Color(css('--c-grid-b')));
    grid.position.y = -ELECTRODE_H / 2 - 0.5;
    scene.add(grid);
}

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
// Ag right-aligned and AgCl left-aligned at the foot of the electrode (front face) so the
// two never meet. The electrolyte label sits at the top far corner of the
// box, and the ionic-current arrow runs along the front (z = +D/2) so it
// stays clear of the electrode labels at z = 0.
label('Ag', ELECTRODE_X - 0.6, -ELECTRODE_H / 2 - 1.4, ELECTRODE_W / 2, 1);
label('AgCl', INTERFACE_X + 0.6, -ELECTRODE_H / 2 - 1.4, ELECTRODE_W / 2, 0);
label('electrolyte', ELECTROLYTE_CX + ELECTROLYTE_W / 2, ELECTROLYTE_H / 2 + 1.2, -ELECTROLYTE_D / 2, 1);
label('amplifier', AMP_X + 1.8, WIRE_TOP, 0, 0);

// ── Current arrows (rebuilt on mode change) ──
let arrows = [];
function buildArrows() {
    arrows.forEach(function (o) { scene.remove(o); if (o.element) o.element.remove(); });
    arrows = [];
    if (p.mode === 'equil') return;
    const col = new THREE.Color(css('--c-i'));
    const yW = WIRE_TOP + 1.5, yI = -ELECTROLYTE_H / 2 - 1.5, zI = ELECTROLYTE_D / 2;
    let wire, ionic;
    if (p.mode === 'oxidize') {
        // Electrons leave towards the amplifier: conventional current in the
        // wire flows into the electrode (-x). Cl- moves to the surface (-x),
        // so the ionic current flows +x.
        wire = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(ELECTRODE_X + 12, yW, 0), 10, col, 1.5, 0.8);
        ionic = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(INTERFACE_X + 2, yI, zI), 8, col, 1.5, 0.8);
    } else {
        // Electrons enter from the wire: conventional current flows out of the
        // electrode towards the amplifier (+x). Released Cl- moves +x, so the
        // ionic current flows -x.
        wire = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(ELECTRODE_X + 2, yW, 0), 10, col, 1.5, 0.8);
        ionic = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(INTERFACE_X + 10, yI, zI), 8, col, 1.5, 0.8);
    }
    [wire, ionic].forEach(function (a) {
        [a.line.material, a.cone.material].forEach(function (m) { m.transparent = true; m.opacity = 0.75; });
        scene.add(a);
        arrows.push(a);
    });
    const c = css('--c-i');
    const lw = label('I_\\text{wire}', ELECTRODE_X + 7, WIRE_TOP + 3.2, 0, 0.5, true);
    const li = label('I_\\text{ionic}', INTERFACE_X + 6, yI - 2, zI, 0.5, true);
    [lw, li].forEach(function (o) { o.element.style.color = c; arrows.push(o); });
}

// ── Particles ──
const speciesVar = { cl: '--c-cl', na: '--c-na', k: '--c-k', electron: '--c-e' };
const speciesSize = { cl: 0.45, na: 0.35, k: 0.38, electron: 0.2 };
const mats = {};
Object.keys(speciesVar).forEach(function (k) {
    mats[k] = {
        core: new THREE.MeshPhongMaterial({ emissiveIntensity: 0.3, transparent: true, opacity: 0.9 }),
        glow: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.08, depthWrite: false }),
        geo: new THREE.SphereGeometry(speciesSize[k], 16, 16),
        glowGeo: new THREE.SphereGeometry(speciesSize[k] * 2, 12, 12)
    };
});
let parts = [];
function spawn() {
    parts.forEach(function (q) { scene.remove(q.mesh); });
    parts = B.spawn(p.ions).map(function (o) {
        const m = mats[o.type];
        const mesh = new THREE.Mesh(m.geo, m.core);
        mesh.add(new THREE.Mesh(m.glowGeo, m.glow));
        mesh.position.set(o.pos.x, o.pos.y, o.pos.z);
        scene.add(mesh);
        return { o: o, mesh: mesh };
    });
}

// Reaction sparkles on the AgCl surface.
const sparkGeo = new THREE.SphereGeometry(0.1, 8, 8);
const sparkles = [];
for (let i = 0; i < 20; i++) {
    const s = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    s.position.set(INTERFACE_X + AGCL_THICKNESS / 2, (Math.random() - 0.5) * ELECTRODE_H, (Math.random() - 0.5) * ELECTRODE_W);
    s.userData = {
        life: 0, maxLife: 0.5 + Math.random() * 1.0, elapsed: 0, delay: Math.random() * 2,
        vel: new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2)
    };
    scene.add(s);
    sparkles.push(s);
}

// ── Theme ──
function applyTheme() {
    const T = window.T;
    scene.background = new THREE.Color(T.sceneBg);
    scene.fog.color.set(T.sceneBg);
    agMat.color.set(css('--c-ag'));
    agclMat.color.set(css('--c-agcl'));
    agclMat.emissive.set(css('--c-agcl-em'));
    wireMat.color.set(css('--c-wire'));
    ampMat.color.set(css('--c-amp'));
    elecMat.color.set(css('--c-body'));
    edgeMat.color.set(css('--c-edge'));
    Object.keys(mats).forEach(function (k) {
        const c = css(speciesVar[k]);
        mats[k].core.color.set(c); mats[k].core.emissive.set(c); mats[k].glow.color.set(c);
    });
    buildGrid();
    buildArrows();
}

function modeColour() {
    return css(p.mode === 'reduce' ? '--c-reduce' : p.mode === 'oxidize' ? '--c-oxidise' : '--c-equil');
}

// ── Loop ──
const clock = new THREE.Clock();
let time = 0, raf = 0;
function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    controls.update();
    if (!p.paused) {
        time += dt * p.speed;
        parts.forEach(function (q) {
            B.step(q.o, dt, p.mode, p.speed);
            q.mesh.position.set(q.o.pos.x, q.o.pos.y, q.o.pos.z);
        });
        const mc = modeColour();
        planeMat.opacity = p.mode === 'equil' ? 0.05 : 0.1 + Math.sin(time * 4) * 0.06;
        planeMat.color.set(mc);
        agclMat.opacity = p.mode === 'equil' ? 0.7 : 0.6 + Math.sin(time * 3) * 0.15;
        sparkles.forEach(function (s) {
            const ud = s.userData;
            ud.elapsed += dt * p.speed;
            if (ud.elapsed < ud.delay) return;
            if (p.mode === 'equil') { s.material.opacity = 0; return; }
            ud.life += dt * p.speed;
            if (ud.life > ud.maxLife) {
                ud.life = 0;
                ud.maxLife = 0.3 + Math.random() * 0.8;
                ud.vel.set((Math.random() - 0.5) * 3 * (p.mode === 'reduce' ? 1 : -1),
                    (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
                s.position.set(INTERFACE_X + AGCL_THICKNESS / 2,
                    (Math.random() - 0.5) * ELECTRODE_H * 0.8, (Math.random() - 0.5) * ELECTRODE_W * 0.8);
            }
            s.material.opacity = Math.sin(ud.life / ud.maxLife * Math.PI) * 0.6;
            s.material.color.set(mc);
            s.position.addScaledVector(ud.vel, dt * p.speed);
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

applyTheme();
spawn();
new ResizeObserver(resize).observe(host);
resize();
new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
}, { threshold: 0.05 }).observe(host);

window.addEventListener('themechange', applyTheme);
window.addEventListener('elichange', function (e) {
    const k = e.detail && e.detail.key;
    if (k === 'mode') buildArrows();
    if (k === 'ions') spawn();
    if (k === 'reset') { time = 0; spawn(); buildArrows(); }
});
