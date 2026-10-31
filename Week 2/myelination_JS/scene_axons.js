// Section 01 · Three.js scene: a myelinated axon (upper) whose dipole jumps
// between nodes of Ranvier and an unmyelinated axon (lower) whose dipole moves
// continuously, with intracellular current arrows, the superposed
// extracellular field (viridis by magnitude), recording markers and an
// optional cross-section. Ported from the original simulator; colours come
// from the page CSS.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const M = window.MYE;
const host = document.getElementById('mye-three');
const css = (n) => window.CMP.cssVar(n);
const col = (n) => new THREE.Color(css(n));
const { AXON_LENGTH, HALF_LEN, AXON_RADIUS, MYEL_Y, UNMYEL_Y, NODE_WIDTH, DEPOL_WIDTH_UNMYEL, RECORD_X } = M;

// ── Scene, camera, renderer ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(window.T.sceneBg);
scene.fog = new THREE.FogExp2(window.T.sceneBg, 0.006);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
camera.position.set(0, 18, 45);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
host.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.minDistance = 15;
controls.maxDistance = 120;

function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);
resize();

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(20, 30, 20);
scene.add(dirLight);
const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
backLight.position.set(-10, 10, -10);
scene.add(backLight);

// Viridis colourmap, 16 stops.
const VIRIDIS_STOPS = [
    [0.267004, 0.004874, 0.329415], [0.282327, 0.094955, 0.417331],
    [0.278826, 0.176998, 0.483397], [0.258965, 0.251537, 0.524736],
    [0.229739, 0.322361, 0.545706], [0.199430, 0.387607, 0.554642],
    [0.172719, 0.448791, 0.557885], [0.149039, 0.508051, 0.557250],
    [0.127568, 0.566949, 0.550556], [0.120638, 0.625828, 0.533488],
    [0.157851, 0.683765, 0.501686], [0.246070, 0.738910, 0.452024],
    [0.369214, 0.788888, 0.382914], [0.516398, 0.831158, 0.295952],
    [0.678490, 0.863742, 0.189503], [0.993248, 0.906157, 0.143936]
];
function viridis(t) {
    t = Math.max(0, Math.min(1, t));
    const idx = t * (VIRIDIS_STOPS.length - 1);
    const lo = Math.floor(idx), hi = Math.min(lo + 1, VIRIDIS_STOPS.length - 1), f = idx - lo;
    const a = VIRIDIS_STOPS[lo], b = VIRIDIS_STOPS[hi];
    return new THREE.Color(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
}

// Dipole field (3 (p.r) r - p) / r^3, zero within r < 1.5.
function dipoleField(dipolePos, dipoleDir, point) {
    const r = new THREE.Vector3().subVectors(point, dipolePos);
    const dist = r.length();
    if (dist < 1.5) return new THREE.Vector3(0, 0, 0);
    const rNorm = r.clone().normalize();
    const pDotR = dipoleDir.dot(rNorm);
    return rNorm.clone().multiplyScalar(3 * pDotR).sub(dipoleDir).divideScalar(dist * dist * dist);
}

// ── Sprites (canvas text, repainted on theme change) ──
const sprites = [];
function textSprite(text, cssVar, fontSize, sx, sy, wide) {
    const canvas = document.createElement('canvas');
    canvas.width = wide ? 512 : 64; canvas.height = 64;
    const tex = new THREE.CanvasTexture(canvas);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    s.scale.set(sx, sy, 1);
    s.userData.paint = () => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, 64);
        ctx.fillStyle = css(cssVar);
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, 32);
        tex.needsUpdate = true;
    };
    s.userData.paint();
    sprites.push(s);
    return s;
}
const label = (text, v, fs, sx, sy) => textSprite(text, v, fs, sx, sy, true);
const charSprite = (text, v) => textSprite(text, v, 48, 1.8, 1.8, false);

// ── Fixed labels and recording markers ──
const myelLabel = label('Myelinated axon', '--c-myel-lbl', 48, 8, 1);
myelLabel.position.set(0, MYEL_Y + 5.5, 0);
const unmyelLabel = label('Unmyelinated axon', '--c-unmyel-lbl', 48, 8, 1);
unmyelLabel.position.set(0, UNMYEL_Y + 4.5, 0);
const stim1 = label('Stimulus', '--c-stim-lbl', 48, 6.4, 0.8);
stim1.position.set(-HALF_LEN - 3, MYEL_Y + 2.5, 0);
const stim2 = label('Stimulus', '--c-stim-lbl', 48, 6.4, 0.8);
stim2.position.set(-HALF_LEN - 3, UNMYEL_Y + 2.5, 0);
const recLabel = label('Recording', '--c-rec', 48, 6.4, 0.8);
recLabel.position.set(RECORD_X, MYEL_Y + 7, 0);
scene.add(myelLabel, unmyelLabel, stim1, stim2, recLabel);

const recMat = new THREE.MeshPhongMaterial();
[MYEL_Y, UNMYEL_Y].forEach((y) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 12), recMat);
    mesh.position.set(RECORD_X, y + AXON_RADIUS + M.p.myelin + 0.8, 0);
    scene.add(mesh);
});

// ── Unmyelinated axon: continuous propagation ──
const axonMats = [];
function axonCylinder(y, opacity) {
    const geo = new THREE.CylinderGeometry(AXON_RADIUS, AXON_RADIUS, AXON_LENGTH, 16);
    geo.rotateZ(Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({ transparent: true, opacity });
    axonMats.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, y, 0);
    scene.add(mesh);
}
axonCylinder(UNMYEL_Y, 0.2);
axonCylinder(MYEL_Y, 0.15);

const depolMats = [];
const unmyelDepolGeo = new THREE.CylinderGeometry(AXON_RADIUS * 1.15, AXON_RADIUS * 1.15, DEPOL_WIDTH_UNMYEL, 16);
unmyelDepolGeo.rotateZ(Math.PI / 2);
const unmyelDepolMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.45, emissiveIntensity: 0.15 });
depolMats.push(unmyelDepolMat);
const unmyelDepol = new THREE.Mesh(unmyelDepolGeo, unmyelDepolMat);
unmyelDepol.position.set(-HALF_LEN, UNMYEL_Y, 0);
scene.add(unmyelDepol);

function dipoleGroup(rCore, rGlow, glowOpacity, coreOpacity, lightI, lightD, glowVar) {
    const group = new THREE.Group();
    const core = new THREE.MeshPhongMaterial({ transparent: true, opacity: coreOpacity, emissiveIntensity: 0.25 });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(rCore, 24, 24), core));
    const glowMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: glowOpacity, depthWrite: false });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(rGlow, 16, 16), glowMat);
    group.add(glow);
    const light = new THREE.PointLight(0xffffff, lightI, lightD, 2);
    group.add(light);
    scene.add(group);
    return { group, core, glowMat, glow, light, glowVar };
}
const unmyelDip = dipoleGroup(1.2, 2.2, 0.06, 0.85, 0.8, 12, '--c-depol');
const myelDip = dipoleGroup(1.5, 2.8, 0.08, 0.9, 1.5, 18, '--c-dipole');

function dipoleArrow(len, head, headW) {
    const a = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), len, 0xffffff, head, headW);
    a.line.material.transparent = true; a.line.material.opacity = 0.6;
    a.cone.material.transparent = true; a.cone.material.opacity = 0.6;
    scene.add(a);
    return a;
}
const unmyelArrow = dipoleArrow(4, 0.8, 0.5);
const myelArrow = dipoleArrow(4.5, 0.9, 0.55);
const unmyelPlus = charSprite('+', '--c-plus'), unmyelMinus = charSprite('−', '--c-minus');
const myelPlus = charSprite('+', '--c-plus'), myelMinus = charSprite('−', '--c-minus');
scene.add(unmyelPlus, unmyelMinus, myelPlus, myelMinus);

// ── Myelinated axon: sheaths and nodes ──
let sheaths = [], nodeMeshes = [];
const sheathMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.35 });
function buildMyelinatedStructure() {
    [...sheaths, ...nodeMeshes].forEach((m) => { scene.remove(m); m.geometry.dispose(); });
    nodeMeshes.forEach((m) => m.material.dispose());
    sheaths = []; nodeMeshes = [];
    const np = M.np, sheathLen = M.p.internode - NODE_WIDTH;
    np.forEach((x) => {
        const nodeGeo = new THREE.CylinderGeometry(AXON_RADIUS * 1.3, AXON_RADIUS * 1.3, NODE_WIDTH, 16);
        nodeGeo.rotateZ(Math.PI / 2);
        const node = new THREE.Mesh(nodeGeo, new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.7, emissiveIntensity: 0.1 }));
        node.position.set(x, MYEL_Y, 0);
        scene.add(node);
        nodeMeshes.push(node);
        if (x < HALF_LEN && x + NODE_WIDTH / 2 + sheathLen / 2 < HALF_LEN) {
            const r = AXON_RADIUS + M.p.myelin;
            const g = new THREE.CylinderGeometry(r, r, sheathLen, 16);
            g.rotateZ(Math.PI / 2);
            const sheath = new THREE.Mesh(g, sheathMat);
            sheath.position.set(x + NODE_WIDTH / 2 + sheathLen / 2, MYEL_Y, 0);
            scene.add(sheath);
            sheaths.push(sheath);
        }
    });
}

const myelDepolGeo = new THREE.CylinderGeometry(AXON_RADIUS * 1.1, AXON_RADIUS * 1.1, 1, 16);
myelDepolGeo.rotateZ(Math.PI / 2);
const myelDepolMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.3, emissiveIntensity: 0.1 });
depolMats.push(myelDepolMat);
const myelDepolMesh = new THREE.Mesh(myelDepolGeo, myelDepolMat);
myelDepolMesh.position.y = MYEL_Y;
scene.add(myelDepolMesh);

// Fading dipole trail at the previous nodes.
const trailMat = [];
const trail = [0, 1, 2].map((i) => {
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    trailMat.push(mat);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.0 - i * 0.15, 12, 12), mat);
    mesh.position.y = MYEL_Y;
    scene.add(mesh);
    return mesh;
});

// ── Intracellular current arrows ──
let intraMyel = [], intraUnmyel = [];
const intraArrow = (x, y, len, head, headW) => {
    const a = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(x, y, 0), len, 0xffffff, head, headW);
    a.line.material.transparent = true; a.cone.material.transparent = true;
    a.visible = false;
    a.setColor(col('--c-intra'));
    scene.add(a);
    return a;
};
function buildCurrentArrows() {
    [...intraMyel, ...intraUnmyel].forEach((a) => { scene.remove(a); a.dispose(); });
    intraMyel = []; intraUnmyel = [];
    const np = M.np;
    for (let i = 0; i < np.length - 1; i++) {
        const a = intraArrow((np[i] + np[i + 1]) / 2 - 1.5, MYEL_Y, 3.0, 0.5, 0.3);
        a.userData = { segIdx: i };
        intraMyel.push(a);
    }
    for (let x = -HALF_LEN + 2; x < HALF_LEN - 2; x += 3.5) {
        const a = intraArrow(x, UNMYEL_Y, 2.2, 0.4, 0.25);
        a.userData = { baseX: x };
        intraUnmyel.push(a);
    }
}

// ── Cross-section view ──
const crossGroup = new THREE.Group();
crossGroup.visible = false;
scene.add(crossGroup);
function buildCrossSection() {
    crossGroup.children.slice().forEach((c) => {
        crossGroup.remove(c);
        const i = sprites.indexOf(c);
        if (i >= 0) sprites.splice(i, 1);
    });
    const csX = 25, csScale = 3, csMyY = MYEL_Y + 8, csUnY = UNMYEL_Y - 6;
    const disc = (r, y, v, o) => {
        const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color: col(v), transparent: true, opacity: o }));
        m.position.set(csX, y, 0); crossGroup.add(m);
    };
    const ring = (r0, r1, y, v, o) => {
        const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 32),
            new THREE.MeshBasicMaterial({ color: col(v), transparent: true, opacity: o, side: THREE.DoubleSide }));
        m.position.set(csX, y, 0); crossGroup.add(m);
    };
    const text = (t, v, fs, sx, sy, y) => { const s = label(t, v, fs, sx, sy); s.position.set(csX, y, 0); crossGroup.add(s); };
    disc(AXON_RADIUS * csScale, csMyY, '--c-axon', 0.3);
    ring(AXON_RADIUS * csScale, (AXON_RADIUS + M.p.myelin) * csScale, csMyY, '--c-myelin', 0.5);
    text('Cross-section (myelinated)', '--c-myel-lbl', 28, 7, 0.7, csMyY + 5);
    text('Myelin insulates: no ion flow', '--c-myel-lbl', 24, 7, 0.6, csMyY + 3.5);
    disc(AXON_RADIUS * csScale, csUnY, '--c-axon', 0.3);
    ring(AXON_RADIUS * csScale, (AXON_RADIUS + 0.1) * csScale, csUnY, '--c-axon', 0.4);
    text('Cross-section (unmyelinated)', '--c-unmyel-lbl', 28, 7, 0.7, csUnY - 4);
    text('Full membrane exposed: continuous ion exchange', '--c-unmyel-lbl', 24, 9, 0.6, csUnY - 2.8);
}

// ── Extracellular field arrows ──
let fieldArrows = [];
function buildFieldArrows(density) {
    fieldArrows.forEach((a) => { scene.remove(a); a.dispose(); });
    fieldArrows = [];
    const step = 5 / density, xRange = HALF_LEN + 6, yLevels = [];
    for (let dy = -6; dy <= 6; dy += step) { yLevels.push(MYEL_Y + dy); yLevels.push(UNMYEL_Y + dy); }
    const uniqueY = [...new Set(yLevels.map((y) => Math.round(y * 10) / 10))];
    for (let x = -xRange; x <= xRange; x += step) {
        for (const y of uniqueY) {
            // Skip positions inside the axon cores.
            const nearMyel = Math.abs(y - MYEL_Y) < AXON_RADIUS + 0.3 && Math.abs(x) < HALF_LEN;
            const nearUnmyel = Math.abs(y - UNMYEL_Y) < AXON_RADIUS + 0.3 && Math.abs(x) < HALF_LEN;
            if (nearMyel || nearUnmyel) continue;
            for (let z = -4; z <= 4; z += step * 1.5) {
                const a = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(x, y, z), 1, 0x444444, 0.3, 0.2);
                a.userData = { basePos: new THREE.Vector3(x, y, z) };
                scene.add(a);
                fieldArrows.push(a);
            }
        }
    }
}

// ── Grid ──
let grid = null;
function buildGrid() {
    if (grid) { scene.remove(grid); grid.dispose(); }
    grid = new THREE.GridHelper(100, 50, col('--c-grid3d'), col('--c-grid3d-2'));
    grid.position.y = -10;
    scene.add(grid);
}

// ── Theme colours ──
function recolour() {
    scene.background = new THREE.Color(window.T.sceneBg);
    scene.fog.color.set(window.T.sceneBg);
    axonMats.forEach((m) => m.color.copy(col('--c-axon')));
    depolMats.forEach((m) => { m.color.copy(col('--c-depol')); m.emissive.copy(col('--c-depol')); });
    sheathMat.color.copy(col('--c-myelin'));
    recMat.color.copy(col('--c-rec'));
    recMat.emissive.copy(col('--c-rec')).multiplyScalar(0.3);
    [unmyelDip, myelDip].forEach((d) => {
        const w = col('--c-dipole');
        d.core.color.copy(w); d.core.emissive.copy(w);
        d.glowMat.color.copy(col(d.glowVar));
        d.light.color.copy(col(d.glowVar));
    });
    unmyelArrow.setColor(col('--c-dipole'));
    myelArrow.setColor(col('--c-dipole'));
    trailMat.forEach((m) => m.color.copy(col('--c-node-active')));
    [...intraMyel, ...intraUnmyel].forEach((a) => a.setColor(col('--c-intra')));
    sprites.forEach((s) => s.userData.paint());
    buildCrossSection();
    buildGrid();
}

// ── Build and react to parameter changes ──
let built = { internode: null, myelin: null, density: null };
function rebuild() {
    const p = M.p;
    if (p.internode !== built.internode || p.myelin !== built.myelin) {
        buildMyelinatedStructure();
        buildCrossSection();
    }
    if (p.internode !== built.internode) buildCurrentArrows();
    if (p.density !== built.density) buildFieldArrows(p.density);
    crossGroup.visible = p.xsec === 'on';
    built = { internode: p.internode, myelin: p.myelin, density: p.density };
}
rebuild();
recolour();
window.addEventListener('myechange', rebuild);
window.addEventListener('themechange', recolour);

// ── Per-frame update ──
const MAX_FIELD = 0.004, X_DIR = new THREE.Vector3(1, 0, 0);
function frame() {
    controls.update();
    const s = M.s, np = M.np, now = Date.now();

    // Unmyelinated: continuous dipole.
    const ux = Math.max(-HALF_LEN, Math.min(HALF_LEN, s.unmyelX));
    const uIn = s.unmyelX >= -HALF_LEN && s.unmyelX <= HALF_LEN + 2;
    const depL = Math.max(-HALF_LEN, ux - DEPOL_WIDTH_UNMYEL), depLen = ux - depL;
    unmyelDepol.scale.x = Math.max(depLen, 0.01) / DEPOL_WIDTH_UNMYEL;
    unmyelDepol.position.x = depL + depLen / 2;
    unmyelDepol.visible = uIn && depLen > 0.05;
    unmyelDip.group.position.set(ux, UNMYEL_Y, 0);
    unmyelDip.group.visible = uIn;
    unmyelDip.glow.scale.setScalar(1 + Math.sin(now * 0.006) * 0.08);
    unmyelDip.light.intensity = uIn ? 0.8 + Math.sin(now * 0.006) * 0.2 : 0;
    unmyelArrow.visible = uIn;
    unmyelArrow.position.set(ux - 2, UNMYEL_Y, 0);
    unmyelPlus.visible = unmyelMinus.visible = uIn;
    unmyelPlus.position.set(ux + 3, UNMYEL_Y + 2.2, 0);
    unmyelMinus.position.set(ux - 3, UNMYEL_Y + 2.2, 0);

    // Myelinated: saltatory dipole.
    const mx = s.myelX, mIn = s.node < np.length, active = s.node;
    myelDip.group.position.set(mx, MYEL_Y, 0);
    myelDip.group.visible = mIn;
    myelDip.glow.scale.setScalar(1 + Math.sin(now * 0.007) * 0.08);
    myelDip.light.intensity = mIn ? 1.2 + Math.sin(now * 0.007) * 0.3 : 0;
    if (s.jumping) {
        const stretch = 1 + s.jumpProgress * (1 - s.jumpProgress) * 1.5;   // slight stretch during a jump
        myelDip.group.scale.set(stretch, 1 / Math.sqrt(stretch), 1 / Math.sqrt(stretch));
    } else myelDip.group.scale.set(1, 1, 1);
    myelArrow.visible = mIn;
    myelArrow.position.set(mx - 2.2, MYEL_Y, 0);
    myelPlus.visible = myelMinus.visible = mIn;
    myelPlus.position.set(mx + 3.5, MYEL_Y + 2.5, 0);
    myelMinus.position.set(mx - 3.5, MYEL_Y + 2.5, 0);

    const depolLen = mx - np[0];
    if (depolLen > 0.2 && mIn) {
        myelDepolMesh.visible = true;
        myelDepolMesh.scale.x = depolLen;
        myelDepolMesh.position.x = np[0] + depolLen / 2;
    } else myelDepolMesh.visible = false;

    // Nodes: recently depolarised, active, resting.
    const cNode = col('--c-node'), cAct = col('--c-node-active'), cPast = col('--c-node-past');
    nodeMeshes.forEach((node, i) => {
        const m = node.material;
        m.emissive.copy(cNode);
        if (i < active) {
            const fade = Math.max(0, 1 - (active - i) * 0.2);
            m.emissiveIntensity = 0.4 * fade; m.opacity = 0.5 + 0.3 * fade;
            m.color.copy(cPast);
        } else if (i === active) {
            m.emissiveIntensity = 0.6; m.opacity = 0.95;
            m.color.copy(cAct);
        } else {
            m.emissiveIntensity = 0.1; m.opacity = 0.7;
            m.color.copy(cNode);
        }
    });
    trail.forEach((mesh, t) => {
        const prev = active - t - 1;
        if (prev >= 0 && prev < np.length) {
            mesh.position.x = np[prev];
            mesh.visible = true;
            mesh.material.opacity = 0.2 * (1 - t / 3);
        } else mesh.visible = false;
    });

    // Intracellular current arrows.
    const showI = M.p.currents === 'on';
    intraMyel.forEach((a) => {
        const seg = a.userData.segIdx;
        a.visible = showI && seg >= Math.max(0, active - 1) && seg <= active;
        if (a.visible) { a.line.material.opacity = 0.7; a.cone.material.opacity = 0.7; }
    });
    intraUnmyel.forEach((a) => {
        const ax = a.userData.baseX;
        a.visible = showI && ax > s.unmyelX - DEPOL_WIDTH_UNMYEL && ax < s.unmyelX + 2;
        if (a.visible) { a.line.material.opacity = 0.6; a.cone.material.opacity = 0.6; }
    });

    // Extracellular field: both dipoles point +x.
    const myelPos = new THREE.Vector3(mx, MYEL_Y, 0), unmyelPos = new THREE.Vector3(ux, UNMYEL_Y, 0);
    const myelActive = mIn && mx >= -HALF_LEN && mx <= HALF_LEN;
    for (const a of fieldArrows) {
        const pos = a.userData.basePos, field = new THREE.Vector3();
        if (myelActive) field.add(dipoleField(myelPos, X_DIR, pos));
        if (uIn) field.add(dipoleField(unmyelPos, X_DIR, pos));
        const mag = field.length();
        if (mag < 1e-7 || (!myelActive && !uIn)) { a.visible = false; continue; }
        a.visible = true;
        a.setDirection(field.normalize());
        const len = Math.min(mag / MAX_FIELD * 3, 3.5);
        a.setLength(Math.max(len, 0.4), len * 0.25, len * 0.15);
        a.setColor(viridis(Math.min(mag / MAX_FIELD, 1)));
    }

    renderer.render(scene, camera);
}
M.onTick(frame, host);
