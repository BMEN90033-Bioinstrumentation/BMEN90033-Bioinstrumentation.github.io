// Section 01 · Three.js scene of the volume conductor: concentric tissue
// shells, the multipole source at the origin, the homogeneous ("true") and
// volume-conductor ("recorded") field on a 3D grid, and the electrodes.
// Physics comes from VC (model.js). Electrodes are selected by clicking and
// moved with a translate gizmo; "+ electrode" then a click places a new one
// on the outermost enabled shell.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const VC = window.VC, p = VC.p;
const css = window.CMP.cssVar;
const host = document.getElementById('scene-volume');

// ── Viridis colour map (field magnitude) ──
const VIRIDIS_STOPS = [
    [0.267004, 0.004874, 0.329415], [0.282327, 0.094955, 0.417331], [0.278826, 0.176998, 0.483397],
    [0.258965, 0.251537, 0.524736], [0.229739, 0.322361, 0.545706], [0.199430, 0.387607, 0.554642],
    [0.172719, 0.448791, 0.557885], [0.149039, 0.508051, 0.557250], [0.127568, 0.566949, 0.550556],
    [0.120638, 0.625828, 0.533488], [0.157851, 0.683765, 0.501686], [0.246070, 0.738910, 0.452024],
    [0.369214, 0.788888, 0.382914], [0.516398, 0.831158, 0.295952], [0.678490, 0.863742, 0.189503],
    [0.993248, 0.906157, 0.143936]
];
function viridis(t) {
    t = Math.max(0, Math.min(1, t));
    const idx = t * (VIRIDIS_STOPS.length - 1), lo = Math.floor(idx);
    const hi = Math.min(lo + 1, VIRIDIS_STOPS.length - 1), f = idx - lo;
    const a = VIRIDIS_STOPS[lo], b = VIRIDIS_STOPS[hi];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// ── Renderer, camera, controls ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
host.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
host.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(window.T.sceneBg);
scene.fog = new THREE.FogExp2(window.T.sceneBg, 0.006);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
camera.position.set(25, 18, 30);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(20, 30, 20);
scene.add(dirLight);
const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
backLight.position.set(-10, 10, -10);
scene.add(backLight);

let grid = null;
function buildGrid() {
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    grid = new THREE.GridHelper(60, 30, new THREE.Color(css('--c-grid-a')), new THREE.Color(css('--c-grid-b')));
    grid.position.y = -15;
    scene.add(grid);
}

function label(text, colour) {
    const div = document.createElement('div');
    div.className = 's3-label';
    div.textContent = text;
    div.style.color = colour;
    return new CSS2DObject(div);
}

// ── Tissue shells ──
const shells = VC.layers.map(function (layer) {
    const geo = new THREE.SphereGeometry(layer.radius, 32, 24);
    const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ transparent: true, opacity: 0.12 }));
    scene.add(mesh); scene.add(wire);
    return { layer: layer, mesh: mesh, wire: wire };
});
function syncShells() {
    shells.forEach(function (s) { s.mesh.visible = s.wire.visible = s.layer.enabled; });
}

// ── Dipole source ──
const dipoleGroup = new THREE.Group();
scene.add(dipoleGroup);
const coreMat = new THREE.MeshPhongMaterial({ emissiveIntensity: 0.5, transparent: true, opacity: 0.9 });
dipoleGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 24), coreMat));
const glowMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1, depthWrite: false });
const dipoleGlow = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 24), glowMat);
dipoleGroup.add(dipoleGlow);
const dipoleLight = new THREE.PointLight(0xffffff, 1.5, 15, 2);
dipoleGroup.add(dipoleLight);
const dipoleArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 3, 0xffffff, 0.6, 0.4);
[dipoleArrow.line.material, dipoleArrow.cone.material].forEach(function (m) { m.transparent = true; m.opacity = 0.6; });
dipoleGroup.add(dipoleArrow);
const plusLabel = label('+', '');
const minusLabel = label('−', '');
scene.add(plusLabel); scene.add(minusLabel);

// ── Field arrows on a 3D grid (4 < r < 22) ──
let trueArrows = [], recArrows = [];
function disposeArrow(a) { scene.remove(a); a.line.material.dispose(); a.cone.material.dispose(); }
function buildArrows() {
    trueArrows.forEach(disposeArrow); recArrows.forEach(disposeArrow);
    trueArrows = []; recArrows = [];
    const step = 5 / p.density, range = 20;
    for (let x = -range; x <= range; x += step) {
        for (let y = -range; y <= range; y += step) {
            for (let z = -range; z <= range; z += step) {
                const r = Math.sqrt(x * x + y * y + z * z);
                if (r < 4 || r > 22) continue;
                [trueArrows, recArrows].forEach(function (list) {
                    const a = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(x, y, z), 1, 0xffffff, 0.25, 0.15);
                    a.userData.basePos = [x, y, z];
                    scene.add(a);
                    list.push(a);
                });
            }
        }
    }
}

// ── Electrodes ──
const transform = new TransformControls(camera, renderer.domElement);
transform.setMode('translate');
transform.setSize(0.8);
scene.add(transform);
transform.addEventListener('dragging-changed', function (e) { orbit.enabled = !e.value; });

let objs = new Map();      // electrode id -> three objects
let selected = null;       // electrode id
let placing = false;

function outward(pos) {
    const d = new THREE.Vector3(pos[0], pos[1], pos[2]).normalize();
    if (d.length() < 0.01) d.set(0, 1, 0);
    return d;
}
function orient(o, pos) {
    const dir = outward(pos), up = new THREE.Vector3(0, 1, 0);
    o.disc.quaternion.setFromUnitVectors(up, dir);
    o.ring.quaternion.setFromUnitVectors(up, dir);
    o.label.position.copy(dir.clone().multiplyScalar(2));
    const w = o.wire.geometry.attributes.position, end = dir.clone().multiplyScalar(4);
    w.setXYZ(0, 0, 0, 0); w.setXYZ(1, end.x, end.y, end.z); w.needsUpdate = true;
}
function makeElectrode(e) {
    const col = new THREE.Color(css(e.cvar));
    const group = new THREE.Group();
    group.position.set(e.pos[0], e.pos[1], e.pos[2]);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16),
        new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: e.id === selected ? 0.8 : 0.3 }));
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    const ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.9, 24), ringMat);
    const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.3 }));
    const lab = label(e.label, css(e.cvar));
    [disc, hit, ring, wire, lab].forEach(function (o) { group.add(o); });
    scene.add(group);
    const o = { group: group, disc: disc, hit: hit, ring: ring, ringMat: ringMat, wire: wire, label: lab, e: e };
    orient(o, e.pos);
    return o;
}
function dropElectrode(o) {
    o.group.remove(o.label);   // fires 'removed', which detaches the label element
    scene.remove(o.group);
    o.group.traverse(function (c) { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
}
function syncElectrodes() {
    if (selected !== null && !VC.electrodes.some(function (e) { return e.id === selected; })) select(null);
    objs.forEach(dropElectrode);
    objs = new Map();
    VC.electrodes.forEach(function (e) { objs.set(e.id, makeElectrode(e)); });
    if (selected !== null) transform.attach(objs.get(selected).group);
    renderList();
}
function select(id) {
    selected = id;
    transform.detach();
    objs.forEach(function (o) { o.disc.material.emissiveIntensity = o.e.id === id ? 0.8 : 0.3; });
    if (id !== null && objs.has(id)) transform.attach(objs.get(id).group);
    renderList();
}
transform.addEventListener('objectChange', function () {
    if (selected === null) return;
    const o = objs.get(selected), g = o.group.position;
    o.e.pos = [g.x, g.y, g.z];
    orient(o, o.e.pos);
    VC.clearHistory();
    renderList();
});

function renderList() {
    const list = document.getElementById('el-list');
    if (!list) return;
    list.innerHTML = '';
    VC.electrodes.forEach(function (e) {
        const div = document.createElement('div');
        div.className = 'item' + (e.id === selected ? ' sel' : '');
        div.innerHTML = '<span class="dot" style="background:var(' + e.cvar + ')"></span>' +
            '<span class="v">' + e.label + ' (' + e.pos.map(function (v) { return v.toFixed(1); }).join(', ') + ')</span>' +
            '<button class="rm" title="remove">✕</button>';
        div.querySelector('button').addEventListener('click', function () {
            VC.removeElectrode(e.id);
            syncElectrodes();
        });
        list.appendChild(div);
    });
}

// ── Picking: select an electrode, or place a new one ──
const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
let down = { x: 0, y: 0 };
renderer.domElement.addEventListener('pointerdown', function (ev) { down = { x: ev.clientX, y: ev.clientY }; });
renderer.domElement.addEventListener('click', function (ev) {
    const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
    if (dx * dx + dy * dy > 9) return;   // a drag, not a click
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
    raycaster.setFromCamera(mouse, camera);

    if (placing) {
        const active = shells.filter(function (s) { return s.layer.enabled; })
            .sort(function (a, b) { return b.layer.radius - a.layer.radius; });
        let pt = null;
        if (!active.length) {
            pt = new THREE.Vector3();
            raycaster.ray.at(30, pt);
            pt.normalize().multiplyScalar(14);
        } else {
            for (const s of active) {
                const hits = raycaster.intersectObject(s.mesh);
                if (hits.length) { pt = hits[0].point; break; }
            }
            if (!pt) { pt = new THREE.Vector3(); raycaster.ray.at(25, pt); }
        }
        VC.addElectrode([pt.x, pt.y, pt.z]);
        setPlacing(false);
        syncElectrodes();
        return;
    }
    const targets = [];
    objs.forEach(function (o) { targets.push(o.disc, o.hit); });
    const hits = raycaster.intersectObjects(targets, false);
    if (hits.length) {
        for (const [id, o] of objs) {
            if (o.disc === hits[0].object || o.hit === hits[0].object) { select(id); return; }
        }
    }
    select(null);
});
function setPlacing(on) {
    placing = on;
    renderer.domElement.style.cursor = on ? 'crosshair' : '';
    const hint = document.getElementById('scene-hint');
    if (hint) hint.textContent = on ? 'click a shell to place the electrode · esc to cancel'
        : 'drag to rotate · click an electrode to move it';
}
window.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { setPlacing(false); select(null); }
});

// ── Theme ──
function applyTheme() {
    scene.background = new THREE.Color(window.T.sceneBg);
    scene.fog.color.set(window.T.sceneBg);
    shells.forEach(function (s) {
        const c = css('--c-t-' + s.layer.key);
        s.mesh.material.color.set(c); s.wire.material.color.set(c);
    });
    const dc = css('--c-dipole');
    coreMat.color.set(dc); coreMat.emissive.set(dc); glowMat.color.set(dc); dipoleLight.color.set(dc);
    dipoleArrow.setColor(new THREE.Color(css('--c-arrow')));
    plusLabel.element.style.color = css('--c-plus');
    minusLabel.element.style.color = css('--c-minus');
    buildGrid();
    syncElectrodes();
}

// ── Per-frame update ──
const tmpDir = new THREE.Vector3();
function updateArrows(list, fieldFn, show, tint, S) {
    const maxFieldMag = 0.004 * Math.max(p.strength, 0.1);
    const O = [0, 0, 0];
    for (const a of list) {
        if (!show) { a.visible = false; continue; }
        const f = fieldFn(O, S.dir, a.userData.basePos, S.strength);
        const mag = Math.sqrt(f[0] * f[0] + f[1] * f[1] + f[2] * f[2]);
        if (mag < 1e-8) { a.visible = false; continue; }
        a.visible = true;
        a.setDirection(tmpDir.set(f[0] / mag, f[1] / mag, f[2] / mag));
        const len = Math.min(mag / maxFieldMag * 2.5, 3.5);
        a.setLength(Math.max(len, 0.4), len * 0.25, len * 0.15);
        const c = viridis(Math.min(mag / maxFieldMag, 1));
        a.setColor(new THREE.Color(c[0] * tint[0], c[1] * tint[1], c[2] * tint[2]));
    }
}

function draw(S) {
    orbit.update();
    // Dipole glyph: glow follows the heartbeat (ECG), the oscillation (EEG)
    // or a slow pulse (rotating or manual source).
    const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.1;
    const glow = p.mode === 'ecg' ? 1 + S.strength * 0.5 : p.mode === 'eeg' ? 1 + S.strength * 2 : pulse;
    dipoleGlow.scale.setScalar(Math.max(0.5, glow));
    dipoleLight.intensity = 0.5 + S.strength * 2;
    const d = new THREE.Vector3(S.dir[0], S.dir[1], S.dir[2]);
    if (d.length() > 0.01) { dipoleArrow.setDirection(d.clone().normalize()); dipoleArrow.visible = true; }
    else dipoleArrow.visible = false;
    plusLabel.position.copy(d.clone().multiplyScalar(2.5)).add(new THREE.Vector3(0, 1.5, 0));
    minusLabel.position.copy(d.clone().multiplyScalar(-2.5)).add(new THREE.Vector3(0, 1.5, 0));

    if (!p.paused) {
        updateArrows(trueArrows, VC.trueField, p.fields !== 'rec', [0.5, 0.7, 1.0], S);   // tinted blue
        updateArrows(recArrows, VC.recField, p.fields !== 'true', [1.0, 0.5, 0.7], S);    // tinted pink
        const last = VC.hist.length ? VC.hist[VC.hist.length - 1][1] : 0;
        const sig = VC.electrodes.length >= 2 ? Math.abs(last) : 0;
        objs.forEach(function (o) { o.ringMat.opacity = 0.1 + Math.min(sig * 0.8, 0.4); });
    }
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    labelRenderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    draw(VC.state());
}

applyTheme();
syncShells();
buildArrows();
setPlacing(false);
new ResizeObserver(resize).observe(host);
VC.addView(host, draw);

window.addEventListener('themechange', applyTheme);
window.addEventListener('vcchange', function (ev) {
    const k = ev.detail && ev.detail.key;
    if (k === 'density') buildArrows();
    if (k === 'layers' || k === 'mode') syncShells();
    if (k === 'electrodes') { select(null); syncElectrodes(); }
    if (k === 'place') setPlacing(true);
    if (k === 'fields' || k === 'paused') draw(VC.state());
});
