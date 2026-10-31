// Section 01 · 3D cochlea (Three.js). Bony shell with 2.75 turns and tapering
// radius, basilar membrane ribbon, receiver-stimulator housing and the
// electrode array, with contacts placed by the Greenwood map. Geometry is
// ported from the original page. Contact glow and pulse rings follow
// CI.play.amps during playback. Up to six contacts carry CSS2D labels.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const CI = window.CI;
const css = (n) => window.CMP.cssVar(n);
const box = document.getElementById('cochlea-box');
const host = document.getElementById('cochlea-3d');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(2.25, 4.05, 6.75);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
host.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'css2d';
box.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 1.2, 0);

// ── Lights ──
const ambient = new THREE.AmbientLight(css('--c-light-amb'), 1.8);
const key = new THREE.DirectionalLight(css('--c-light-key'), 1.4);
key.position.set(5, 8, 5);
const rim = new THREE.DirectionalLight(css('--c-light-cool'), 0.3);
rim.position.set(-3, 2, -5);
const fill = new THREE.DirectionalLight(css('--c-light-key'), 0.3);
fill.position.set(0, -3, 3);
scene.add(ambient, key, rim, fill);

// ── Cochlear spiral: t = 0 at the base, 1 at the apex ──
const COCHLEA_TURNS = 2.75;
const COCHLEA_POINTS = 300;
function cochleaSpiral(t) {
    const angle = t * COCHLEA_TURNS * Math.PI * 2;
    const radius = 2.8 * Math.pow(1 - t * 0.78, 1.15);
    const y = t * 2.8 * Math.pow(t, 0.35);
    return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
}
const cochleaCurve = new THREE.CatmullRomCurve3(
    Array.from({ length: COCHLEA_POINTS + 1 }, (_, i) => cochleaSpiral(i / COCHLEA_POINTS)));

// ── Bony shell: tube with radius tapering from base to apex ──
const segments = 200, radialSegs = 20;
const frames = cochleaCurve.computeFrenetFrames(segments, false);
const shellPos = [], shellNrm = [], shellUv = [], shellIdx = [];
for (let i = 0; i <= segments; i++) {
    const t = i / segments, P = cochleaCurve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i];
    const r = 0.48 * Math.pow(1 - t * 0.55, 1.1);
    for (let j = 0; j <= radialSegs; j++) {
        const v = j / radialSegs * Math.PI * 2, s = Math.sin(v), c = Math.cos(v);
        const nx = c * N.x + s * B.x, ny = c * N.y + s * B.y, nz = c * N.z + s * B.z;
        shellPos.push(P.x + r * nx, P.y + r * ny, P.z + r * nz);
        shellNrm.push(nx, ny, nz);
        shellUv.push(t, j / radialSegs);
    }
}
for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegs; j++) {
        const a = i * (radialSegs + 1) + j, b = a + radialSegs + 1;
        shellIdx.push(a, b, a + 1, b, b + 1, a + 1);
    }
}
const shellGeom = new THREE.BufferGeometry();
shellGeom.setAttribute('position', new THREE.Float32BufferAttribute(shellPos, 3));
shellGeom.setAttribute('normal', new THREE.Float32BufferAttribute(shellNrm, 3));
shellGeom.setAttribute('uv', new THREE.Float32BufferAttribute(shellUv, 2));
shellGeom.setIndex(shellIdx);
const boneMat = new THREE.MeshPhysicalMaterial({
    transparent: true, opacity: 0.22, roughness: 0.7, metalness: 0.02,
    side: THREE.DoubleSide, depthWrite: false, clearcoat: 0.1
});
scene.add(new THREE.Mesh(shellGeom, boneMat));

// ── Basilar membrane: ribbon across the tube ──
const memPos = [], memNrm = [], memIdx = [];
for (let i = 0; i <= segments; i++) {
    const t = i / segments, c = cochleaSpiral(t), angle = t * COCHLEA_TURNS * Math.PI * 2;
    const r = 0.32 * Math.pow(1 - t * 0.55, 1.1), nx = -Math.sin(angle), nz = Math.cos(angle);
    memPos.push(c.x + nx * r * 0.7, c.y, c.z + nz * r * 0.7, c.x - nx * r * 0.7, c.y, c.z - nz * r * 0.7);
    memNrm.push(0, 1, 0, 0, 1, 0);
}
for (let i = 0; i < segments; i++) {
    const a = i * 2;
    memIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
}
const memGeom = new THREE.BufferGeometry();
memGeom.setAttribute('position', new THREE.Float32BufferAttribute(memPos, 3));
memGeom.setAttribute('normal', new THREE.Float32BufferAttribute(memNrm, 3));
memGeom.setIndex(memIdx);
const membraneMat = new THREE.MeshPhysicalMaterial({
    transparent: true, opacity: 0.3, roughness: 0.8, side: THREE.DoubleSide, depthWrite: false
});
scene.add(new THREE.Mesh(memGeom, membraneMat));

// ── Receiver-stimulator housing, behind and below the base ──
const basePoint = cochleaSpiral(0);
const rxPos = new THREE.Vector3(basePoint.x - 2.5, basePoint.y - 1.5, basePoint.z - 2);
const implantMat = new THREE.MeshPhysicalMaterial({
    metalness: 0, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.15, sheen: 1.0
});
const receiver = new THREE.Group();
const rxBody = new THREE.SphereGeometry(1.0, 32, 32); rxBody.scale(1.0, 0.18, 0.85);
receiver.add(new THREE.Mesh(rxBody, implantMat));
const bumpGeom = new THREE.SphereGeometry(0.38, 24, 24); bumpGeom.scale(1.0, 0.4, 1.0);
const bump = new THREE.Mesh(bumpGeom, implantMat); bump.position.y = 0.08;
receiver.add(bump);
const edge = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 8, 48), implantMat);
edge.rotation.x = Math.PI / 2;
receiver.add(edge);
receiver.position.copy(rxPos);
receiver.rotation.y = 0.3;
scene.add(receiver);

// ── Electrode array ──
const array = new THREE.Group();
scene.add(array);
let contacts = [];   // { mesh, ring, label }

function clearArray() {
    array.children.slice().forEach((o) => {
        o.traverse((m) => {
            if (m.geometry) m.geometry.dispose();
            if (m.material && m.material !== implantMat) m.material.dispose();
            if (m.isCSS2DObject) m.element.remove();
        });
        array.remove(o);
    });
    contacts = [];
}

function buildElectrodes() {
    clearArray();
    const cfg = CI.config(), n = cfg.freqs.length;
    const ts = cfg.freqs.map(CI.freqToT);
    const sorted = [...ts].sort((a, b) => a - b);
    const tMin = Math.max(0.02, sorted[0] - 0.02), tMax = Math.min(0.98, sorted[n - 1] + 0.02);

    // Lead from the receiver, curving into the spiral tangent, then along it.
    const entry = cochleaSpiral(tMin);
    const dir = new THREE.Vector3().subVectors(cochleaSpiral(tMin + 0.02), entry).normalize();
    const mid = new THREE.Vector3().lerpVectors(rxPos, entry, 0.5); mid.y += 0.3;
    const pts = [rxPos.clone(), mid, entry.clone().sub(dir.multiplyScalar(0.4))];
    for (let i = 0; i <= 80; i++) pts.push(cochleaSpiral(tMin + (tMax - tMin) * i / 80));
    array.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.055, 8, false), implantMat));

    const labelled = n <= 6 ? d3.range(n) : d3.range(6).map((k) => Math.round(k * (n - 1) / 5));
    const contactGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12);
    const ringGeom = new THREE.TorusGeometry(0.14, 0.03, 8, 24);
    ts.forEach((t, i) => {
        const pos = cochleaSpiral(t);
        const tangent = new THREE.Vector3().subVectors(cochleaSpiral(Math.min(1, t + 0.005)),
            cochleaSpiral(Math.max(0, t - 0.005))).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        const mat = new THREE.MeshStandardMaterial({ emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.15 });
        const mesh = new THREE.Mesh(contactGeom.clone(), mat);
        mesh.position.copy(pos); mesh.quaternion.copy(quat);
        const ring = new THREE.Mesh(ringGeom.clone(), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
        ring.position.copy(pos); ring.quaternion.copy(quat);
        array.add(mesh, ring);
        let label = null;
        if (labelled.indexOf(i) >= 0) {
            const el = document.createElement('div');
            el.className = 'cochlea-label';
            el.textContent = 'E' + (n - i) + ' · ' + cfg.labels[i];
            label = new CSS2DObject(el);
            label.position.copy(pos).add(new THREE.Vector3(0, 0.4, 0));
            array.add(label);
        }
        contacts.push({ mesh, ring, label });
    });
    contactGeom.dispose(); ringGeom.dispose();
    recolor();
}

// Theme-dependent colours: background, materials, contact and label colours.
function recolor() {
    scene.background = new THREE.Color(css('--bg-2'));
    boneMat.color.set(css('--c-bone'));
    membraneMat.color.set(css('--c-membrane'));
    implantMat.color.set(css('--c-implant'));
    implantMat.sheenColor.set(css('--c-implant'));
    ambient.color.set(css('--c-light-amb'));
    key.color.set(css('--c-light-key'));
    rim.color.set(css('--c-light-cool'));
    fill.color.set(css('--c-light-key'));
    const cfg = CI.config();
    contacts.forEach((c, i) => {
        const col = new THREE.Color(cfg.colors[i]);
        c.mesh.material.color.set(css('--c-contact'));
        c.mesh.material.emissive.copy(col);
        c.ring.material.color.copy(col);
        if (c.label) c.label.element.style.color = cfg.colors[i];
    });
    drawOnce();
}

// ── Size, visibility, loop ──
function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    labelRenderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    drawOnce();
}

// Single frame, so the scene is drawn even before the loop first starts.
function drawOnce() {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    cullLabels();
}
new ResizeObserver(resize).observe(host);

let raf = 0;
function frame() {
    controls.update();
    const amps = CI.play.amps;
    contacts.forEach((c, i) => {
        const a = amps[i] || 0;
        c.mesh.material.emissiveIntensity = 0.3 + a * 3.0;
        const s = 1 + a * 0.5;
        c.mesh.scale.set(s, 1, s);
        c.ring.material.opacity = a * 0.8;
        c.ring.scale.setScalar(1 + a * 2.5);
    });
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    cullLabels();
    raf = requestAnimationFrame(frame);
}

// Screen-space label collision test, run every frame so it holds at any
// camera angle. The basal and apical end labels are placed first, then the
// rest; a label is hidden if its box meets an already placed box, the
// plot-box title strip, the hint in the lower right, or the box edge.
const v3 = new THREE.Vector3();
function cullLabels() {
    const r = host.getBoundingClientRect(), w = r.width, h = r.height;
    const placed = [[0, 0, w, 30], [w - 250, h - 28, w, h]];
    const ls = contacts.filter((c) => c.label);
    const order = ls.length > 2 ? [ls[0], ls[ls.length - 1]].concat(ls.slice(1, -1)) : ls;
    order.forEach((c) => {
        const el = c.label.element;
        c.label.getWorldPosition(v3).project(camera);
        const x = (v3.x + 1) / 2 * w, y = (1 - v3.y) / 2 * h;
        const bw = el.offsetWidth + 6, bh = el.offsetHeight + 4;
        const b = [x - bw / 2, y - bh / 2, x + bw / 2, y + bh / 2];
        const hit = b[0] < 0 || b[1] < 0 || b[2] > w || b[3] > h || v3.z > 1 ||
            placed.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
        el.style.visibility = hit ? 'hidden' : 'visible';
        if (!hit) placed.push(b);
    });
}
new IntersectionObserver((es) => {
    if (es[0].isIntersecting) { if (!raf) raf = requestAnimationFrame(frame); }
    else { cancelAnimationFrame(raf); raf = 0; }
}).observe(box);

window.addEventListener('themechange', recolor);
window.addEventListener('cichange', (e) => {
    if (['nch', 'fmin', 'fmax', 'preset'].indexOf(e.detail.key) >= 0) buildElectrodes();
});

resize();
buildElectrodes();
