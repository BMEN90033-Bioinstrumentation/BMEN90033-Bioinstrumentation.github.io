// Section 01 · Three.js scene: tissue slab, depolarised region, the two
// dipole fronts, intracellular current arrows, extracellular field arrows
// (viridis by magnitude) and the two surface electrodes. Geometry and
// physics follow the original simulator; colours come from the page CSS.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { guardWheel } from '../../components/orbit_wheel_guard.js';

const A = window.APD;
const host = document.getElementById('apd-three');
const css = (n) => window.CMP.cssVar(n);
const col = (n) => new THREE.Color(css(n));
const { TISSUE_LEN, TISSUE_W, TISSUE_H, HALF_LEN } = A;

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

// ── Scene, camera, renderer ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(window.T.sceneBg);
scene.fog = new THREE.FogExp2(window.T.sceneBg, 0.008);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
camera.position.set(30, 25, 40);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
host.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.minDistance = 15;
controls.maxDistance = 120;
guardWheel(controls, renderer.domElement, host.parentElement.querySelector('.hint'));

function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);
resize();

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(20, 30, 20);
scene.add(dirLight);
const backLight = new THREE.DirectionalLight(0xffffff, 0.2);
backLight.position.set(-10, 10, -10);
scene.add(backLight);

// ── Tissue slab ──
const tissueGeo = new THREE.BoxGeometry(TISSUE_LEN, TISSUE_H, TISSUE_W);
const tissueMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
scene.add(new THREE.Mesh(tissueGeo, tissueMat));
const wireMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.15 });
scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(tissueGeo), wireMat));

// ── Depolarised region (between repolarisation and depolarisation fronts) ──
const depolarMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.25, depthWrite: false });
const depolarMesh = new THREE.Mesh(new THREE.BoxGeometry(1, TISSUE_H * 1.01, TISSUE_W * 1.01), depolarMat);
scene.add(depolarMesh);

// ── Dipole blobs ──
function makeBlob(rCore, rGlow, rGlow2, coreOpacity, lightI, lightD) {
    const group = new THREE.Group();
    const core = new THREE.MeshPhongMaterial({ transparent: true, opacity: coreOpacity, emissiveIntensity: 0.3 });
    const glow = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.08, depthWrite: false });
    const glow2 = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.03, depthWrite: false });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(rCore, 32, 32), core));
    const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(rGlow, 32, 32), glow);
    group.add(glowMesh);
    group.add(new THREE.Mesh(new THREE.SphereGeometry(rGlow2, 24, 24), glow2));
    const light = new THREE.PointLight(0xffffff, lightI, lightD, 2);
    group.add(light);
    scene.add(group);
    return { group, core, glow, glow2, glowMesh, light };
}
const depBlob = makeBlob(1.8, 3.0, 4.5, 0.9, 1.5, 20);
const repBlob = makeBlob(1.5, 2.5, 3.8, 0.85, 1.0, 15);

// Text sprite on a canvas texture; redrawn on theme change.
function makeSprite(text, cssVar, scale) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const tex = new THREE.CanvasTexture(canvas);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    s.scale.set(scale, scale, 1);
    s.userData.paint = () => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = css(cssVar);
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 32, 32);
        tex.needsUpdate = true;
    };
    s.userData.paint();
    scene.add(s);
    return s;
}
const sprites = [];
function sprite(text, cssVar, scale) { const s = makeSprite(text, cssVar, scale || 2); sprites.push(s); return s; }

// Depolarisation dipole (+x): + ahead, - behind. Repolarisation (-x): reversed.
const plusSprite = sprite('+', '--c-plus');
const minusSprite = sprite('−', '--c-minus');
const repolPlusSprite = sprite('+', '--c-plus');
const repolMinusSprite = sprite('−', '--c-minus');

function makeArrow(dir, len, head, headW) {
    const a = new THREE.ArrowHelper(dir, new THREE.Vector3(), len, 0xffffff, head, headW);
    a.line.material.transparent = true; a.line.material.opacity = 0.5;
    a.cone.material.transparent = true; a.cone.material.opacity = 0.5;
    scene.add(a);
    return a;
}
const dipoleArrow = makeArrow(new THREE.Vector3(1, 0, 0), 5, 1.0, 0.6);
const repolDipoleArrow = makeArrow(new THREE.Vector3(-1, 0, 0), 4, 0.8, 0.5);

// ── Intracellular current arrows along the slab axis ──
const XPOS = new THREE.Vector3(1, 0, 0), XNEG = new THREE.Vector3(-1, 0, 0);
const intraArrows = [];
for (let x = -HALF_LEN + 1; x <= HALF_LEN - 1; x += 3) {
    const arrow = new THREE.ArrowHelper(XPOS, new THREE.Vector3(x, 0, 0), 2.0, 0xffffff, 0.5, 0.3);
    arrow.line.material.transparent = true; arrow.line.material.opacity = 0.8;
    arrow.cone.material.transparent = true; arrow.cone.material.opacity = 0.8;
    arrow.userData = { baseX: x };
    scene.add(arrow);
    intraArrows.push(arrow);
}

// ── Electrodes ──
function createElectrode(pos, wireEnd) {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16), mat);
    mesh.position.copy(pos);
    group.add(mesh);
    const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5 });
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        pos.clone(), new THREE.Vector3(pos.x, pos.y + 5, pos.z), wireEnd.clone()
    ]), lineMat));
    const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.0, 24), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).add(new THREE.Vector3(0, 0.05, 0));
    group.add(ring);
    scene.add(group);
    return { mat, lineMat, ringMat };
}
const posA = new THREE.Vector3(...A.EA), posB = new THREE.Vector3(...A.EB);
const elecA = createElectrode(posA, new THREE.Vector3(10, TISSUE_H / 2 + 5, -TISSUE_W / 2 - 4));
const elecB = createElectrode(posB, new THREE.Vector3(-10, TISSUE_H / 2 + 5, -TISSUE_W / 2 - 4));
const labelA = sprite('A', '--c-ea', 1.5);
labelA.position.copy(posA).add(new THREE.Vector3(0, 2, 0));
const labelB = sprite('B', '--c-eb', 1.5);
labelB.position.copy(posB).add(new THREE.Vector3(0, 2, 0));

// ── Extracellular field arrows ──
// Drawn as one LineSegments (shafts, per-vertex colour) and one InstancedMesh
// (heads), with the same geometry as THREE.ArrowHelper, so the densest grid
// (about 27 000 arrows) costs two draw calls.
const HEAD_GEO = new THREE.CylinderGeometry(0, 0.5, 1, 5, 1);
HEAD_GEO.translate(0, -0.5, 0);   // apex at the origin side as in ArrowHelper
const field = { q: null, n: 0, shafts: null, heads: null };
let builtDensity = 0;
function buildFieldArrows(density) {
    if (field.shafts) {
        scene.remove(field.shafts, field.heads);
        field.shafts.geometry.dispose(); field.shafts.material.dispose();
        field.heads.dispose(); field.heads.material.dispose();
    }
    const q = [];
    const step = 6 / density, range = 22, yLevels = [-3, 0, 3, 6, 9];
    for (let x = -range; x <= range; x += step) {
        for (let z = -range; z <= range; z += step) {
            for (const y of yLevels) {
                // Exclude only a thin central strip (intracellular space, |y| < 1)
                // inside the tissue box; the rest of the volume is extracellular.
                const inTissueBox = Math.abs(x) < TISSUE_LEN / 2 + 1 &&
                    Math.abs(z) < TISSUE_W / 2 + 1 && Math.abs(y) < TISSUE_H / 2 + 0.5;
                if (inTissueBox && Math.abs(y) < 1) continue;
                q.push([x, y, z]);
            }
        }
    }
    const n = q.length;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 6), 3).setUsage(THREE.DynamicDrawUsage));
    field.shafts = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false }));
    field.heads = new THREE.InstancedMesh(HEAD_GEO, new THREE.MeshBasicMaterial({ toneMapped: false }), n);
    field.heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    field.heads.setColorAt(0, new THREE.Color());
    field.heads.instanceColor.setUsage(THREE.DynamicDrawUsage);
    field.shafts.frustumCulled = field.heads.frustumCulled = false;
    scene.add(field.shafts, field.heads);
    field.q = q; field.n = n;
    builtDensity = density;
}

// ── Grid ──
let grid = null;
function buildGrid() {
    if (grid) { scene.remove(grid); grid.dispose(); }
    grid = new THREE.GridHelper(80, 40, col('--c-grid3d'), col('--c-grid3d-2'));
    grid.position.y = -TISSUE_H / 2 - 0.1;
    scene.add(grid);
}

// ── Theme colours ──
function recolour() {
    scene.background = new THREE.Color(window.T.sceneBg);
    scene.fog.color.set(window.T.sceneBg);
    tissueMat.color = col('--c-tissue');
    wireMat.color = col('--c-tissue');
    depolarMat.color = col('--c-depol');
    [[depBlob, '--c-dipole'], [repBlob, '--c-repol']].forEach(([b, v]) => {
        const c = col(v);
        b.core.color.copy(c); b.core.emissive.copy(c);
        b.glow.color.copy(c); b.glow2.color.copy(c); b.light.color.copy(c);
    });
    dipoleArrow.setColor(col('--c-dipole'));
    repolDipoleArrow.setColor(col('--c-repol'));
    intraArrows.forEach((a) => a.setColor(col('--c-intra')));
    [[elecA, '--c-ea'], [elecB, '--c-eb']].forEach(([e, v]) => {
        const c = col(v);
        e.mat.color.copy(c); e.mat.emissive.copy(c).multiplyScalar(0.3);
        e.lineMat.color.copy(c); e.ringMat.color.copy(c);
    });
    sprites.forEach((s) => s.userData.paint());
    buildGrid();
}
recolour();
window.addEventListener('themechange', recolour);
window.addEventListener('apdchange', () => { if (A.p.density !== builtDensity) buildFieldArrows(A.p.density); });
buildFieldArrows(A.p.density);

// ── Per-frame update ──
const MAX_FIELD = 0.003;
const Y_AXIS = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3(), _p = new THREE.Vector3();
const _quat = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
function frame() {
    controls.update();
    const st = A.state(A.s.wf);
    const depolPos = new THREE.Vector3(st.depolX, 0, 0);
    const repolPos = new THREE.Vector3(st.repolX, 0, 0);
    const t = performance.now();

    if (st.depLen > 0.1) {
        depolarMesh.visible = true;
        depolarMesh.scale.x = st.depLen;
        depolarMesh.position.x = st.depLeft + st.depLen / 2;
    } else depolarMesh.visible = false;

    depBlob.group.visible = st.depolIn;
    depBlob.group.position.copy(depolPos);
    depBlob.glowMesh.scale.setScalar(1 + Math.sin(t * 0.005) * 0.08);
    depBlob.light.intensity = 1.2 + Math.sin(t * 0.005) * 0.3;
    dipoleArrow.visible = st.depolIn;
    dipoleArrow.position.copy(depolPos).add(new THREE.Vector3(-2.5, 0, 0));
    plusSprite.visible = minusSprite.visible = st.depolIn;
    plusSprite.position.copy(depolPos).add(new THREE.Vector3(4, 2.5, 0));
    minusSprite.position.copy(depolPos).add(new THREE.Vector3(-4, 2.5, 0));

    repBlob.group.visible = st.repolIn;
    repBlob.group.position.copy(repolPos);
    repBlob.glowMesh.scale.setScalar(1 + Math.sin(t * 0.005 + 1) * 0.06);
    repBlob.light.intensity = 0.8 + Math.sin(t * 0.005 + 1) * 0.2;
    repolDipoleArrow.visible = st.repolIn;
    repolDipoleArrow.position.copy(repolPos).add(new THREE.Vector3(2.0, 0, 0));
    repolPlusSprite.visible = repolMinusSprite.visible = st.repolIn;
    repolMinusSprite.position.copy(repolPos).add(new THREE.Vector3(4, 2.5, 0));
    repolPlusSprite.position.copy(repolPos).add(new THREE.Vector3(-4, 2.5, 0));

    // Axial current only near the fronts: +x behind the depolarisation front,
    // -x ahead of the repolarisation front; none on the uniform plateau.
    for (const arrow of intraArrows) {
        const ax = arrow.userData.baseX;
        const inDep = ax > st.depLeft + 0.5 && ax < st.depRight - 0.5;
        const nearDepol = st.depolIn && ax > st.depolX - 4.5;
        const nearRepol = st.repolIn && ax < st.repolX + 4.5;
        if (st.depLen > 0.1 && inDep && (nearDepol || nearRepol)) {
            arrow.visible = true;
            arrow.setDirection(nearDepol ? XPOS : XNEG);
        } else arrow.visible = false;
    }

    // Extracellular field: superposition of the active dipoles.
    const any = st.depolIn || st.repolIn;
    const dc = [st.depolX, 0, 0], rc = [st.repolX, 0, 0];
    const pos = field.shafts.geometry.attributes.position.array;
    const colr = field.shafts.geometry.attributes.color.array;
    for (let i = 0; i < field.n; i++) {
        const q = field.q[i], o = i * 6;
        let fx = 0, fy = 0, fz = 0;
        if (st.depolIn) { const f = A.field(dc, 1, q); fx += f[0]; fy += f[1]; fz += f[2]; }
        if (st.repolIn) { const f = A.field(rc, -1, q); fx += f[0]; fy += f[1]; fz += f[2]; }
        const mag = Math.sqrt(fx * fx + fy * fy + fz * fz);
        if (mag < 1e-7 || !any) {
            // Hidden: zero-length shaft and zero-scale head.
            pos[o] = pos[o + 3] = q[0]; pos[o + 1] = pos[o + 4] = q[1]; pos[o + 2] = pos[o + 5] = q[2];
            _m.makeScale(0, 0, 0);
            field.heads.setMatrixAt(i, _m);
            continue;
        }
        _dir.set(fx / mag, fy / mag, fz / mag);
        // ArrowHelper.setLength(max(len, 0.5), 0.25 len, 0.15 len)
        const len = Math.min(mag / MAX_FIELD * 3, 4);
        const total = Math.max(len, 0.5), headL = len * 0.25, headW = len * 0.15;
        const shaft = Math.max(0.0001, total - headL);
        pos[o] = q[0]; pos[o + 1] = q[1]; pos[o + 2] = q[2];
        pos[o + 3] = q[0] + _dir.x * shaft; pos[o + 4] = q[1] + _dir.y * shaft; pos[o + 5] = q[2] + _dir.z * shaft;
        _p.set(q[0] + _dir.x * total, q[1] + _dir.y * total, q[2] + _dir.z * total);
        _quat.setFromUnitVectors(Y_AXIS, _dir);
        _s.set(headW, headL, headW);
        field.heads.setMatrixAt(i, _m.compose(_p, _quat, _s));
        const c = viridis(Math.min(mag / MAX_FIELD, 1));
        colr[o] = colr[o + 3] = c.r; colr[o + 1] = colr[o + 4] = c.g; colr[o + 2] = colr[o + 5] = c.b;
        field.heads.setColorAt(i, c);
    }
    field.shafts.geometry.attributes.position.needsUpdate = true;
    field.shafts.geometry.attributes.color.needsUpdate = true;
    field.heads.instanceMatrix.needsUpdate = true;
    field.heads.instanceColor.needsUpdate = true;

    const sig = Math.abs(st.diff);
    elecA.ringMat.opacity = elecB.ringMat.opacity = 0.1 + Math.min(sig * 1.5, 0.4);

    renderer.render(scene, camera);
}
A.onTick(frame, host);
