// Section 01 · Three.js pn junction: a p-type and an n-type diamond cubic
// block joined at x = 0, an external battery and wires, mobile carriers,
// fixed ion charges, the depletion region and the built-in field lines.
// The formation sequence, carrier rules, recombination, generation,
// avalanche and wire-current logic are ported from the original simulator
// without change to the rules or rates. The bias is held at zero while the
// junction forms. Colours come from the page CSS variables; text labels are
// CSS2D objects placed above the blocks and the battery.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const PN = window.PN;
const box = document.getElementById('scene-junction');
const host = box.querySelector('.three-host');
const css = (n) => window.CMP.cssVar(n);
const col = (n) => new THREE.Color(css(n));

// ═══ Scene setup ═══
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1.3, 0.1, 800);
camera.position.set(26, 22, 46);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
host.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
host.appendChild(labelRenderer.domElement);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.08;
orbitControls.target.set(0, 3, 0);

const white = new THREE.Color(1, 1, 1);
scene.add(new THREE.AmbientLight(white, 0.5));
const dirLight = new THREE.DirectionalLight(white, 0.7);
dirLight.position.set(20, 30, 25);
scene.add(dirLight);
scene.add(new THREE.DirectionalLight(white, 0.2).translateX(-15).translateY(10).translateZ(-10));

let grid = null;
let C = {};
function applyTheme() {
    const T = window.T;
    scene.background = new THREE.Color(T.sceneBg);
    scene.fog = new THREE.FogExp2(T.sceneBg, 0.003);
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    grid = new THREE.GridHelper(100, 50, col('--c-grid3d'), col('--c-grid3d-2'));
    grid.position.y = -20;
    scene.add(grid);
    C = {
        si: col('--c-si'), p: col('--c-p'), b: col('--c-b'), bond: col('--c-bond'), free: col('--c-free'),
        hole: col('--c-hole'), depl: col('--c-depl'), deplBd: col('--c-depl-bd'), batt: col('--c-batt'),
        termPos: col('--c-term-pos'), termNeg: col('--c-term-neg'), wire: col('--c-wire'),
        flash: col('--c-flash'), junction: col('--c-junction')
    };
    C.bondEm = C.bond.clone().multiplyScalar(0.25);
}

function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    labelRenderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);

function cssLabel(text, colour, sym) {
    const el = document.createElement('div');
    el.className = 'three-label' + (sym ? ' sym' : '');
    el.textContent = text;
    el.style.color = colour;
    const o = new CSS2DObject(el);
    o.center.set(0.5, 1);
    return o;
}

// ═══ Constants ═══
const A = 8;
const NN_DIST = A * Math.sqrt(3) / 4;
const ATOM_RADIUS = 0.7;
const BOND_ELEC_RADIUS = 0.18;
const FREE_ELEC_RADIUS = 0.35;
const HOLE_RADIUS = 0.3;

const V_BREAKDOWN = PN.V_BREAKDOWN;
const V_TURN_ON = PN.V_TURN_ON;
const LATTICE_N = 2;
const W0 = A * 0.8;
const MAX_CARRIERS = 100;
const MAX_CARRIERS_AVALANCHE = 200;
const FULL_EXTENT = LATTICE_N * A;    // 16
const HOLE_GRID_SPACING = 2.5;

// ═══ State ═══
let biasVoltage = 0;                  // held at 0 during formation
let paused = false;
let formationPhase = true;
let formationTime = 0;
const FORMATION_DURATION = 10.0;
const clock = new THREE.Clock();
let elapsed = 0;

const depletionHalfWidth = (V) => PN.depletionHalfWidth(V, W0);
const carrierCap = () => (biasVoltage <= V_BREAKDOWN ? MAX_CARRIERS_AVALANCHE : MAX_CARRIERS);

function publishFormation() {
    if (formationPhase) {
        const progress = Math.min(1, formationTime / FORMATION_DURATION);
        let phase = 'diffusion';
        if (progress > 0.5) phase = 'field building';
        if (progress > 0.85) phase = 'equilibrium forming';
        PN.formation = { progress, phase, w: formationDepletionWidth() / W0 };
    } else {
        PN.formation = null;
    }
    PN.updateLive();
}

// ═══ Lattice data ═══
let atomPositions = [], atomTypes = [], bondPairs = [];

const latticeGroup = new THREE.Group(); scene.add(latticeGroup);
const carrierGroup = new THREE.Group(); scene.add(carrierGroup);

const atomGeo = new THREE.SphereGeometry(ATOM_RADIUS, 16, 16);
const bondElecGeo = new THREE.SphereGeometry(BOND_ELEC_RADIUS, 8, 8);
const freeElecGeo = new THREE.SphereGeometry(FREE_ELEC_RADIUS, 12, 12);
const holeGeo = new THREE.TorusGeometry(HOLE_RADIUS, 0.08, 8, 16);
const glowGeo = new THREE.SphereGeometry(0.6, 8, 8);
const flashGeo = new THREE.SphereGeometry(0.5, 8, 8);
const SHARED = new Set([atomGeo, bondElecGeo, freeElecGeo, holeGeo, glowGeo, flashGeo]);
const dummy = new THREE.Object3D();

const BASIS = [
    [0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5],
    [0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]
];

function findBonds(positions) {
    const tol2 = (NN_DIST * 1.05) ** 2;
    const bonds = [];
    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            if (positions[i].distanceToSquared(positions[j]) < tol2) bonds.push({ a1: i, a2: j });
        }
    }
    return bonds;
}

function generatePNLattice() {
    const N = LATTICE_N;
    const posP = [], posN = [];
    for (let nx = 0; nx < N; nx++) for (let ny = 0; ny < N; ny++) for (let nz = 0; nz < N; nz++) {
        for (const b of BASIS) {
            posP.push(new THREE.Vector3((nx + b[0]) * A - N * A, (ny + b[1]) * A - (N * A) / 2, (nz + b[2]) * A - (N * A) / 2));
            posN.push(new THREE.Vector3((nx + b[0]) * A, (ny + b[1]) * A - (N * A) / 2, (nz + b[2]) * A - (N * A) / 2));
        }
    }
    const pCount = posP.length;
    atomPositions = [...posP, ...posN];
    atomTypes = atomPositions.map(() => 'Si');

    const dopantFraction = 0.06;
    const margin = A * 0.6;
    const interior = (i) => {
        const p = atomPositions[i];
        return Math.abs(p.y) < (N * A) / 2 - margin && Math.abs(p.z) < (N * A) / 2 - margin;
    };
    const pInterior = [], nInterior = [];
    for (let i = 0; i < pCount; i++) if (interior(i)) pInterior.push(i);
    for (let i = pCount; i < atomPositions.length; i++) if (interior(i)) nInterior.push(i);
    const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    };
    shuffle(pInterior); shuffle(nInterior);
    const numDopants = Math.max(2, Math.floor(pCount * dopantFraction));
    for (let i = 0; i < Math.min(numDopants, pInterior.length); i++) atomTypes[pInterior[i]] = 'B';
    for (let i = 0; i < Math.min(numDopants, nInterior.length); i++) atomTypes[nInterior[i]] = 'P';
    bondPairs = findBonds(atomPositions);
}

// ═══ Lattice visuals ═══
let bondElecInstanced = null, depletionBox = null;
const barrierGroup = new THREE.Group(); scene.add(barrierGroup);
let minusCharges = [], plusCharges = [];

function disposeChildren(g) {
    while (g.children.length) {
        const c = g.children[0];
        g.remove(c);
        c.traverse((o) => {
            if (o.element) o.element.remove();
            if (o.geometry && !SHARED.has(o.geometry)) o.geometry.dispose();
            if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
        });
    }
}

function buildLatticeVisuals() {
    disposeChildren(latticeGroup);
    const atomInstanced = new THREE.InstancedMesh(atomGeo,
        new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.85 }), atomPositions.length);
    for (let i = 0; i < atomPositions.length; i++) {
        dummy.position.copy(atomPositions[i]); dummy.scale.setScalar(1); dummy.updateMatrix();
        atomInstanced.setMatrixAt(i, dummy.matrix);
        atomInstanced.setColorAt(i, atomTypes[i] === 'P' ? C.p : atomTypes[i] === 'B' ? C.b : C.si);
    }
    atomInstanced.instanceColor.needsUpdate = true;
    latticeGroup.add(atomInstanced);

    const bondVerts = [];
    for (const b of bondPairs) {
        const p1 = atomPositions[b.a1], p2 = atomPositions[b.a2];
        const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
        const s = p1.clone().addScaledVector(dir, ATOM_RADIUS), e = p2.clone().addScaledVector(dir, -ATOM_RADIUS);
        bondVerts.push(s.x, s.y, s.z, e.x, e.y, e.z);
    }
    const bondGeo = new THREE.BufferGeometry();
    bondGeo.setAttribute('position', new THREE.Float32BufferAttribute(bondVerts, 3));
    latticeGroup.add(new THREE.LineSegments(bondGeo, new THREE.LineBasicMaterial({ color: C.bond, transparent: true, opacity: 0.2 })));

    bondElecInstanced = new THREE.InstancedMesh(bondElecGeo, new THREE.MeshPhongMaterial({
        color: C.bond, emissive: C.bondEm, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }), bondPairs.length * 2);
    for (let bi = 0; bi < bondPairs.length; bi++) {
        const b = bondPairs[bi];
        const p1 = atomPositions[b.a1], p2 = atomPositions[b.a2];
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
        dummy.scale.setScalar(1);
        dummy.position.copy(mid).addScaledVector(dir, -0.3); dummy.updateMatrix();
        bondElecInstanced.setMatrixAt(bi * 2, dummy.matrix);
        dummy.position.copy(mid).addScaledVector(dir, 0.3); dummy.updateMatrix();
        bondElecInstanced.setMatrixAt(bi * 2 + 1, dummy.matrix);
    }
    latticeGroup.add(bondElecInstanced);

    const extent = LATTICE_N * A;
    const junctionPlane = new THREE.Mesh(new THREE.PlaneGeometry(extent, extent),
        new THREE.MeshBasicMaterial({ color: C.junction, transparent: true, opacity: 0.04, side: THREE.DoubleSide }));
    junctionPlane.rotation.y = Math.PI / 2;
    latticeGroup.add(junctionPlane);

    depletionBox = new THREE.Mesh(new THREE.BoxGeometry(1, extent, extent),
        new THREE.MeshBasicMaterial({ color: C.depl, transparent: true, opacity: 0.05, side: THREE.DoubleSide }));
    latticeGroup.add(depletionBox);

    [[-1, C.b, 'p-type', '--c-b'], [1, C.p, 'n-type', '--c-p']].forEach(([s, c, txt, v]) => {
        const bx = new THREE.Mesh(new THREE.BoxGeometry(LATTICE_N * A, extent, extent),
            new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: 0.15 }));
        bx.position.set(s * LATTICE_N * A / 2, 0, 0);
        latticeGroup.add(bx);
        const l = cssLabel(txt, css(v));
        l.position.set(s * LATTICE_N * A / 2, extent / 2 + 1, 0);
        latticeGroup.add(l);
    });
}

// ═══ Field lines ═══
const fieldLineGroup = new THREE.Group(); scene.add(fieldLineGroup);
let fieldLineMeshes = [], fieldLineArrowheads = [], fieldLineCurves = [];

function buildFieldLines(W, fieldIntensity) {
    disposeChildren(fieldLineGroup);
    fieldLineMeshes = []; fieldLineArrowheads = []; fieldLineCurves = [];
    if (W < 0.5) return;

    // + charges on the n-side (+x), - charges on the p-side (-x).
    const halfSep = W * 0.7;
    const redColor = C.p, blueColor = C.b;
    const tubeRadius = 0.06 * (1 + fieldIntensity * 0.4);
    const baseOpacity = Math.min(0.92, 0.5 + fieldIntensity * 0.3);
    const segments = 40;
    // Symmetric parametric arcs from + to -, defined by peak height and azimuth.
    const arcHeights = [0, W * 0.25, W * 0.5, W * 0.75, W * 1.05, W * 1.35, W * 1.7, W * 2.1];
    const numAzBase = Math.min(8, Math.max(6, Math.round(5 + fieldIntensity)));
    const overshoot = W * 0.15;
    const xMin = -(halfSep + overshoot), xMax = halfSep + overshoot;

    for (const h of arcHeights) {
        const nAz = h === 0 ? 1 : numAzBase;
        for (let ai = 0; ai < nAz; ai++) {
            const az = (ai / nAz) * 2 * Math.PI;
            const pts = [];
            for (let s = 0; s <= segments; s++) {
                const t = s / segments;
                const x = (halfSep + overshoot) * (1 - 2 * t);
                const perp = h * Math.pow(Math.sin(Math.PI * t), 0.7);
                pts.push(new THREE.Vector3(x, perp * Math.cos(az), perp * Math.sin(az)));
            }
            const curve = new THREE.CatmullRomCurve3(pts);
            const tubeGeo = new THREE.TubeGeometry(curve, segments, tubeRadius, 6, false);
            const posAttr = tubeGeo.attributes.position;
            const colors = new Float32Array(posAttr.count * 3);
            const tmp = new THREE.Color();
            for (let i = 0; i < posAttr.count; i++) {
                const frac = Math.max(0, Math.min(1, (posAttr.getX(i) - xMin) / (xMax - xMin)));
                tmp.lerpColors(blueColor, redColor, frac);
                colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
            }
            tubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            const tubeMesh = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({
                vertexColors: true, transparent: true, opacity: baseOpacity,
                emissive: redColor.clone().multiplyScalar(0.2), emissiveIntensity: 0.3 + fieldIntensity * 0.5,
                roughness: 0.35, metalness: 0.05 }));
            fieldLineGroup.add(tubeMesh);
            fieldLineMeshes.push(tubeMesh);
            fieldLineCurves.push(curve);

            const arrowCount = h > 0 ? 2 : 1;
            const coneSize = 0.14 * (1 + fieldIntensity * 0.25);
            for (let a2 = 0; a2 < arrowCount; a2++) {
                const t = (a2 + 1) / (arrowCount + 1);
                const pt = curve.getPointAt(t);
                const cf = Math.max(0, Math.min(1, (pt.x - xMin) / (xMax - xMin)));
                const arrowCol = new THREE.Color().lerpColors(blueColor, redColor, cf);
                const cone = new THREE.Mesh(new THREE.ConeGeometry(coneSize, coneSize * 2.8, 8), new THREE.MeshStandardMaterial({
                    color: arrowCol, emissive: arrowCol.clone().multiplyScalar(0.3), transparent: true,
                    opacity: Math.min(0.95, 0.5 + fieldIntensity * 0.4), roughness: 0.3 }));
                cone.position.copy(pt);
                cone.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangentAt(t).normalize()));
                cone.userData.curveIndex = fieldLineCurves.length - 1;
                cone.userData.baseT = t;
                fieldLineGroup.add(cone);
                fieldLineArrowheads.push(cone);
            }
        }
    }
}

let prevFieldW = -1, prevFieldIntensity = -1;

function makeChargeSprite(text, colour) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fillStyle = window.T.darkOverlay;
    ctx.fill();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "bold 40px 'Inter','Helvetica Neue',sans-serif";
    ctx.fillStyle = colour;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 30);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
}

function buildBarrierVisuals() {
    disposeChildren(barrierGroup);
    minusCharges = []; plusCharges = [];
    const spacing = A * 0.9, rows = 3;
    for (let iy = 0; iy < rows; iy++) {
        for (let iz = 0; iz < rows; iz++) {
            const y = (iy - (rows - 1) / 2) * spacing, z = (iz - (rows - 1) / 2) * spacing;
            const m = makeChargeSprite('−', css('--c-b'));
            m.position.set(-W0 * 0.5, y, z); m.scale.set(1.5, 1.5, 1);
            barrierGroup.add(m); minusCharges.push(m);
            const pl = makeChargeSprite('+', css('--c-p'));
            pl.position.set(W0 * 0.5, y, z); pl.scale.set(1.5, 1.5, 1);
            barrierGroup.add(pl); plusCharges.push(pl);
        }
    }
    prevFieldW = -1; prevFieldIntensity = -1;
}

function updateBarrierVisuals() {
    const W = formationPhase ? formationDepletionWidth() : depletionHalfWidth(biasVoltage);
    const visible = W > 0.3;
    const V = biasVoltage;
    const isBreakdown = !formationPhase && V <= V_BREAKDOWN;

    // Field intensity: 0 at equilibrium, rising with reverse bias, 2+ in breakdown.
    let fieldIntensity = 0;
    if (!formationPhase) {
        if (V < 0) {
            fieldIntensity = Math.abs(V) / Math.abs(V_BREAKDOWN);
            if (isBreakdown) fieldIntensity = 1.0 + Math.abs(V - V_BREAKDOWN) * 2;
        } else if (V < V_TURN_ON) {
            fieldIntensity = 0;
        } else {
            fieldIntensity = Math.max(0, 0.3 - (V - V_TURN_ON) * 0.5);
        }
    } else {
        const fp = formationTime / FORMATION_DURATION;
        fieldIntensity = fp < 0.25 ? 0 : Math.min(1, (fp - 0.25) / 0.75) * 0.3;
    }

    const quantW = Math.round(W * 4) / 4, quantI = Math.round(fieldIntensity * 4) / 4;
    if (quantW !== prevFieldW || quantI !== prevFieldIntensity) {
        buildFieldLines(W, fieldIntensity);
        prevFieldW = quantW; prevFieldIntensity = quantI;
    }

    const time = elapsed;
    const animSpeed = 0.3 + fieldIntensity * 1.5;
    for (const cone of fieldLineArrowheads) {
        const curve = fieldLineCurves[cone.userData.curveIndex];
        if (!curve) continue;
        const baseT = cone.userData.baseT;
        const t = Math.max(0.02, Math.min(0.98, baseT + Math.sin(time * animSpeed + baseT * 6.28) * 0.15));
        cone.position.copy(curve.getPointAt(t));
        cone.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangentAt(t).normalize()));
    }
    if (isBreakdown) {
        const pulse = 0.6 + 0.4 * Math.sin(time * 8);
        for (const m of fieldLineMeshes) { m.material.opacity = pulse; m.material.emissiveIntensity = 0.5 + pulse * 0.8; }
        for (const c of fieldLineArrowheads) { c.material.opacity = pulse; c.material.emissiveIntensity = 0.3 + pulse * 0.5; }
    }

    for (const s of minusCharges) { s.visible = visible; s.position.x = -W * 0.5; }
    for (const s of plusCharges) { s.visible = visible; s.position.x = W * 0.5; }
    fieldLineGroup.visible = visible;

    const opacity = formationPhase ? Math.min(1, formationTime / FORMATION_DURATION) : 1;
    barrierGroup.children.forEach((c) => { if (c.material) c.material.opacity = opacity; });
}

function updateDepletionBox() {
    const W = formationPhase ? formationDepletionWidth() : depletionHalfWidth(biasVoltage);
    depletionBox.scale.x = Math.max(2 * W, 0.01);
    if (biasVoltage <= V_BREAKDOWN) {
        depletionBox.material.opacity = 0.05 + 0.03 * Math.sin(elapsed * 4);
        depletionBox.material.color.copy(C.deplBd);
    } else {
        depletionBox.material.opacity = 0.05;
        depletionBox.material.color.copy(C.depl);
    }
}

// ═══ Mobile carriers ═══
let electrons = [], holes = [], recombFlashes = [];

function spawnElectron(x, y, z) {
    if (electrons.length + holes.length >= carrierCap()) return;
    const mesh = new THREE.Mesh(freeElecGeo, new THREE.MeshPhongMaterial({
        color: C.free, emissive: C.free, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }));
    mesh.position.set(x, y, z);
    carrierGroup.add(mesh);
    mesh.add(new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: C.free, transparent: true, opacity: 0.12, depthWrite: false })));
    electrons.push({ mesh, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2 });
}

const snapToGrid = (val) => Math.round(val / HOLE_GRID_SPACING) * HOLE_GRID_SPACING;

function spawnHole(x, y, z) {
    if (electrons.length + holes.length >= carrierCap()) return;
    const gx = snapToGrid(x), gy = snapToGrid(y), gz = snapToGrid(z);
    const mesh = new THREE.Mesh(holeGeo, new THREE.MeshBasicMaterial({ color: C.hole, wireframe: true, transparent: true, opacity: 0.8 }));
    mesh.position.set(gx, gy, gz);
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    carrierGroup.add(mesh);
    holes.push({ mesh, gridX: gx, gridY: gy, gridZ: gz });
}

function removeElectron(idx) {
    const e = electrons[idx];
    carrierGroup.remove(e.mesh);
    e.mesh.material.dispose();
    e.mesh.children.forEach((c) => c.material.dispose());
    electrons.splice(idx, 1);
}

function removeHole(idx) {
    const h = holes[idx];
    carrierGroup.remove(h.mesh);
    h.mesh.material.dispose();
    holes.splice(idx, 1);
}

function initCarriers() {
    const extent = LATTICE_N * A;
    const count = 30;
    const yz = () => (Math.random() - 0.5) * extent;
    if (formationPhase) {
        // Just after joining: electrons on the n-side and holes on the
        // p-side, concentrated near the junction so they visibly cross.
        for (let i = 0; i < 20; i++) spawnElectron(Math.random() * W0 * 2.5, yz(), yz());
        for (let i = 0; i < 15; i++) spawnElectron(W0 * 2 + Math.random() * (extent - W0 * 2), yz(), yz());
        for (let i = 0; i < 20; i++) spawnHole(-Math.random() * W0 * 2.5, yz(), yz());
        for (let i = 0; i < 15; i++) spawnHole(-(W0 * 2 + Math.random() * (extent - W0 * 2)), yz(), yz());
    } else {
        const W = depletionHalfWidth(0);
        for (let i = 0; i < count; i++) spawnElectron(W + Math.random() * (extent - W), yz(), yz());
        for (let i = 0; i < count; i++) spawnHole(-W - Math.random() * (extent - W), yz(), yz());
    }
}

function resetCarriers() {
    while (electrons.length) removeElectron(electrons.length - 1);
    while (holes.length) removeHole(holes.length - 1);
    while (conductingElecs.length) removeConductingElectron(conductingElecs.length - 1);
    pendingLeftWireSpawns = 0;
    pendingRightWireExits = 0;
    for (const m of stuckElectrons) { batteryGroup.remove(m); m.material.dispose(); }
    stuckElectrons = [];
    while (recombFlashes.length) {
        carrierGroup.remove(recombFlashes[0].mesh);
        recombFlashes[0].mesh.material.dispose();
        recombFlashes.shift();
    }
    prevDepletionW = W0;
    initCarriers();
}

// ═══ Depletion formation ═══
function formationDepletionWidth() {
    // S-curve: slow start, faster as recombination exposes ions, slowing as
    // the field opposes further diffusion.
    const t = Math.min(formationTime / FORMATION_DURATION, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    return W0 * eased;
}

function updateFormation(dt) {
    if (!formationPhase) return;
    formationTime += dt;
    const W = formationDepletionWidth();
    const progress = Math.min(formationTime / FORMATION_DURATION, 1);
    const diffusionStrength = Math.max(0, 1 - progress * 1.5);

    for (const e of electrons) {
        const ex = e.mesh.position.x;
        if (diffusionStrength > 0 && ex < W0 * 3 && ex > -W) e.vx -= diffusionStrength * 4 * dt;
        const fieldStrength = progress * 8;
        if (ex > -W && ex < W) e.vx += fieldStrength * dt;
        if (ex < -W) e.vx += fieldStrength * 0.5 * dt;
    }
    for (let i = holes.length - 1; i >= 0; i--) {
        const hx = holes[i].gridX;
        if (hx > -W && hx < W) { spawnFlash(holes[i].gridX, holes[i].gridY, holes[i].gridZ); removeHole(i); }
        else if (hx > 0) removeHole(i);
    }
    if (formationTime >= FORMATION_DURATION) formationPhase = false;
}

// ═══ Conducting electrons (hop through holes) ═══
let conductingElecs = [];
let pendingLeftWireSpawns = 0;
let pendingRightWireExits = 0;
const CONDUCT_HOP_DURATION = 0.13;
const CONDUCT_PAUSE = 0.04;

function spawnConductingElectron(startHoleIdx, hopDir, fillMode) {
    const hole = holes[startHoleIdx];
    if (!hole) return;
    const mesh = new THREE.Mesh(freeElecGeo, new THREE.MeshPhongMaterial({
        color: C.free, emissive: C.free, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 }));
    // -1 hops leftward (forward bias); +1 rightward (reverse and breakdown).
    const dir = hopDir !== undefined ? hopDir : -1;
    if (fillMode) {
        const entryX = -LATTICE_N * A + 0.5;
        mesh.position.set(entryX, hole.gridY, hole.gridZ);
        carrierGroup.add(mesh);
        conductingElecs.push({
            mesh, currentHoleIdx: -1, targetHoleIdx: startHoleIdx, progress: 0, pause: 0,
            fromPos: { x: entryX, y: hole.gridY, z: hole.gridZ }, toPos: { x: hole.gridX, y: hole.gridY, z: hole.gridZ },
            hopsRemaining: 0, hopDirection: dir, fillMode: true
        });
    } else {
        mesh.position.set(hole.gridX, hole.gridY, hole.gridZ);
        carrierGroup.add(mesh);
        conductingElecs.push({
            mesh, currentHoleIdx: startHoleIdx, targetHoleIdx: null, progress: 0, pause: CONDUCT_PAUSE,
            fromPos: { x: hole.gridX, y: hole.gridY, z: hole.gridZ }, toPos: null,
            hopsRemaining: formationPhase ? 2 + Math.floor(Math.random() * 3) : Infinity,
            hopDirection: dir, fillMode: false
        });
    }
}

function removeConductingElectron(idx) {
    const ce = conductingElecs[idx];
    carrierGroup.remove(ce.mesh);
    ce.mesh.material.dispose();
    conductingElecs.splice(idx, 1);
}

function findNextHoleInDir(currentHole, direction) {
    const maxJump = HOLE_GRID_SPACING * 3;
    let bestIdx = -1, bestScore = Infinity;
    for (let i = 0; i < holes.length; i++) {
        const h = holes[i];
        const dx = (h.gridX - currentHole.gridX) * direction;
        if (dx <= 0) continue;
        const dy = currentHole.gridY - h.gridY, dz = currentHole.gridZ - h.gridZ;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) > maxJump) continue;
        const score = dx + Math.sqrt(dy * dy + dz * dz) * 2;
        if (score < bestScore) { bestScore = score; bestIdx = i; }
    }
    return bestIdx;
}

function updateConductingElectrons(dt) {
    if (paused) return;
    const hopDur = formationPhase ? CONDUCT_HOP_DURATION * 2.5 : CONDUCT_HOP_DURATION;
    const hopPause = formationPhase ? CONDUCT_PAUSE * 2 : CONDUCT_PAUSE;

    for (let i = conductingElecs.length - 1; i >= 0; i--) {
        const ce = conductingElecs[i];
        if (ce.targetHoleIdx !== null) {
            ce.progress += dt / (ce.fillMode ? hopDur * 3 : hopDur);
            if (ce.progress >= 1) {
                const th = holes[ce.targetHoleIdx];
                if (ce.fillMode && th) {
                    spawnFlash(th.gridX, th.gridY, th.gridZ);
                    const holeIdx = ce.targetHoleIdx;
                    removeConductingElectron(i);
                    if (holeIdx >= 0 && holeIdx < holes.length) removeHole(holeIdx);
                    continue;
                }
                if (th) {
                    ce.mesh.position.set(th.gridX, th.gridY, th.gridZ);
                    ce.currentHoleIdx = ce.targetHoleIdx;
                    ce.fromPos = { x: th.gridX, y: th.gridY, z: th.gridZ };
                }
                ce.targetHoleIdx = null; ce.toPos = null; ce.progress = 0; ce.pause = hopPause;
            } else {
                const t = ce.progress;
                ce.mesh.position.set(ce.fromPos.x + (ce.toPos.x - ce.fromPos.x) * t,
                    ce.fromPos.y + (ce.toPos.y - ce.fromPos.y) * t, ce.fromPos.z + (ce.toPos.z - ce.fromPos.z) * t);
            }
        } else {
            ce.pause -= dt;
            if (ce.pause > 0) continue;
            const cur = holes[ce.currentHoleIdx];
            if (!cur) { removeConductingElectron(i); continue; }
            if (ce.hopsRemaining !== undefined && ce.hopsRemaining <= 0) {
                const holeIdx = ce.currentHoleIdx;
                spawnFlash(cur.gridX, cur.gridY, cur.gridZ);
                removeConductingElectron(i);
                if (holeIdx >= 0 && holeIdx < holes.length) removeHole(holeIdx);
                continue;
            }
            const dir = ce.hopDirection || -1;
            if (dir < 0 && cur.gridX <= -FULL_EXTENT + HOLE_GRID_SPACING * 1.5) {
                removeConductingElectron(i); pendingLeftWireSpawns++; continue;
            }
            if (dir > 0 && cur.gridX >= FULL_EXTENT - HOLE_GRID_SPACING * 1.5) {
                removeConductingElectron(i); pendingRightWireExits++; continue;
            }
            const nextIdx = findNextHoleInDir(cur, dir);
            if (nextIdx < 0) {
                removeConductingElectron(i);
                if (dir < 0) pendingLeftWireSpawns++; else pendingRightWireExits++;
                continue;
            }
            const nh = holes[nextIdx];
            ce.targetHoleIdx = nextIdx;
            ce.toPos = { x: nh.gridX, y: nh.gridY, z: nh.gridZ };
            ce.fromPos = { x: cur.gridX, y: cur.gridY, z: cur.gridZ };
            ce.progress = 0;
            if (ce.hopsRemaining !== undefined && ce.hopsRemaining !== Infinity) ce.hopsRemaining--;
        }
    }
}

// ═══ Carrier movement ═══
function updateCarriers(dt) {
    if (paused) return;
    const extent = LATTICE_N * A;
    const W = formationPhase ? formationDepletionWidth() : depletionHalfWidth(biasVoltage);
    const isBreakdown = !formationPhase && biasVoltage <= V_BREAKDOWN;
    const isForward = !formationPhase && biasVoltage >= V_TURN_ON;
    const isReverse = !formationPhase && biasVoltage < -0.01;
    const driftX = isForward ? (biasVoltage - V_TURN_ON) * 6 : 0;
    const lim = extent / 2;

    for (let i = electrons.length - 1; i >= 0; i--) {
        const e = electrons[i];
        e.vx += (Math.random() - 0.5) * 4 * dt;
        e.vy += (Math.random() - 0.5) * 4 * dt;
        e.vz += (Math.random() - 0.5) * 4 * dt;
        if (isForward) e.vx -= driftX * dt;
        // Schematic: in reverse bias the animation pulls electrons towards the
        // positive terminal. Physically only depletion-edge charge moves.
        if (isReverse || isBreakdown) e.vx += (isBreakdown ? 15 + Math.abs(biasVoltage) * 5 : 8 + Math.abs(biasVoltage) * 4) * dt;
        e.vx *= 0.98; e.vy *= 0.98; e.vz *= 0.98;
        const m = e.mesh.position;
        m.x += e.vx * dt; m.y += e.vy * dt; m.z += e.vz * dt;
        if (Math.abs(m.y) > lim) e.vy *= -1;
        if (Math.abs(m.z) > lim) e.vz *= -1;
        m.y = THREE.MathUtils.clamp(m.y, -lim, lim);
        m.z = THREE.MathUtils.clamp(m.z, -lim, lim);
        if (m.x > extent) {
            if (isReverse || isBreakdown) { removeElectron(i); pendingRightWireExits++; continue; }
            m.x = extent; e.vx *= -0.5;
        }
        if (!isForward && !isBreakdown && !isReverse && Math.abs(m.x) < W) { m.x = W + 0.1; e.vx = Math.abs(e.vx); }
    }
}

// ═══ Recombination and generation ═══
function spawnFlash(x, y, z) {
    const mesh = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: C.flash, transparent: true, opacity: 0.8, depthWrite: false }));
    mesh.position.set(x, y, z);
    carrierGroup.add(mesh);
    recombFlashes.push({ mesh, life: 0.3 });
}

function findNearestHole(pos) {
    let bestIdx = -1, bestDist = Infinity;
    for (let i = 0; i < holes.length; i++) {
        const d = pos.distanceTo(holes[i].mesh.position);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    return bestIdx;
}

function checkRecombination() {
    if (paused) return;
    const isForward = !formationPhase && biasVoltage >= V_TURN_ON;
    const threshold = 1.8;
    for (let ei = electrons.length - 1; ei >= 0; ei--) {
        const ep = electrons[ei].mesh.position;
        if (isForward && ep.x <= 0) {
            const hi = findNearestHole(ep);
            if (hi >= 0) {
                const hp = holes[hi].mesh.position;
                spawnFlash(hp.x, hp.y, hp.z);
                removeElectron(ei);
                spawnConductingElectron(hi);
            }
            continue;
        }
        if (formationPhase && ep.x <= 0) {
            const hi = findNearestHole(ep);
            if (hi >= 0 && ep.distanceTo(holes[hi].mesh.position) < threshold * 2) {
                const hp = holes[hi].mesh.position;
                spawnFlash(hp.x, hp.y, hp.z);
                removeElectron(ei);
                spawnConductingElectron(hi);
            }
        }
    }
}

function updateFlashes(dt) {
    for (let i = recombFlashes.length - 1; i >= 0; i--) {
        const f = recombFlashes[i];
        f.life -= dt;
        f.mesh.material.opacity = Math.max(0, f.life / 0.3) * 0.8;
        f.mesh.scale.setScalar(1 + (0.3 - f.life) * 3);
        if (f.life <= 0) { carrierGroup.remove(f.mesh); f.mesh.material.dispose(); recombFlashes.splice(i, 1); }
    }
}

function thermalGeneration(dt) {
    if (paused) return;
    if (!formationPhase && biasVoltage < -0.01) return;   // the reverse field sweeps carriers out
    const W = depletionHalfWidth(biasVoltage);
    const extent = LATTICE_N * A;
    if (Math.random() < 0.5 * dt && W > 0.5) {
        const x = (Math.random() - 0.5) * 2 * W;
        // The generated electron is swept to the n-side; the paired hole is not drawn.
        spawnElectron(Math.abs(x) + 0.5, (Math.random() - 0.5) * extent, (Math.random() - 0.5) * extent);
    }
}

function replenishCarriers() {
    if (paused) return;
    if (!formationPhase && biasVoltage < -0.01) return;   // schematic: none under reverse bias
    const extent = LATTICE_N * A;
    const W = depletionHalfWidth(biasVoltage);
    if (electrons.length < 30) {
        spawnElectron(W + Math.random() * (extent - W), (Math.random() - 0.5) * extent, (Math.random() - 0.5) * extent);
    }
}

// ═══ Avalanche breakdown ═══
// Impact ionisation in the depletion region frees electrons, each leaving a
// hole; freed electrons leave through the n-side wire while electrons from
// the negative terminal enter the p-side and fill holes.
let avalancheTimer = 0;

function avalancheGeneration(dt) {
    if (paused) return;
    if (biasVoltage > V_BREAKDOWN) { avalancheTimer = 0; return; }
    const W = depletionHalfWidth(biasVoltage);
    const extent = LATTICE_N * A;
    const cap = carrierCap();
    const severity = 1 + Math.abs(biasVoltage - V_BREAKDOWN) * 3;
    avalancheTimer += (1.5 + severity * 2) * dt;
    while (avalancheTimer >= 1 && electrons.length + holes.length < cap) {
        avalancheTimer -= 1;
        const rx = (Math.random() - 0.5) * 2 * W, ry = (Math.random() - 0.5) * extent, rz = (Math.random() - 0.5) * extent;
        spawnFlash(rx, ry, rz);
        spawnHole(rx, ry, rz);
        spawnElectron(rx + 0.5, ry, rz);
        const newE = electrons[electrons.length - 1];
        if (newE) { newE.vx = 5 + severity * 3; newE.mesh.material.emissiveIntensity = 1.0; }
    }
    for (const e of electrons) {
        const ex = e.mesh.position.x;
        if (ex > -W && ex < extent) { e.vx += 12 * severity * dt; e.mesh.material.emissiveIntensity = 0.9; }
    }
}

// ═══ Battery and external circuit ═══
const batteryGroup = new THREE.Group(); scene.add(batteryGroup);
const WIRE_X_LEFT = -FULL_EXTENT, WIRE_X_RIGHT = FULL_EXTENT;
const BATT_Y = 18, WIRE_FACE_Y = 0;

let battBodyMat, posTermMat, negTermMat, posTerm, negTerm, wireMat, wireElecMat;
let posLabel, negLabel, voltLabel;
const wireElecGeo = new THREE.SphereGeometry(0.3, 10, 10);
SHARED.add(wireElecGeo);

function buildBattery() {
    disposeChildren(batteryGroup);
    battBodyMat = new THREE.MeshPhongMaterial({ color: C.batt, transparent: true, opacity: 0.85 });
    const battBody = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 8, 24), battBodyMat);
    battBody.rotation.z = Math.PI / 2;
    battBody.position.set(0, BATT_Y, 0);
    batteryGroup.add(battBody);
    const termGeo = new THREE.CylinderGeometry(1.9, 1.9, 0.4, 24);
    posTermMat = new THREE.MeshPhongMaterial({ color: C.termPos });
    posTerm = new THREE.Mesh(termGeo, posTermMat);
    posTerm.rotation.z = Math.PI / 2;
    posTerm.position.set(4.2, BATT_Y, 0);
    batteryGroup.add(posTerm);
    negTermMat = new THREE.MeshPhongMaterial({ color: C.termNeg });
    negTerm = new THREE.Mesh(termGeo.clone(), negTermMat);
    negTerm.rotation.z = Math.PI / 2;
    negTerm.position.set(-4.2, BATT_Y, 0);
    batteryGroup.add(negTerm);

    posLabel = cssLabel('+', css('--c-term-pos'), true);
    negLabel = cssLabel('−', css('--c-term-neg'), true);
    voltLabel = cssLabel('', window.T.text);
    voltLabel.position.set(0, BATT_Y + 2.4, 0);
    batteryGroup.add(posLabel, negLabel, voltLabel);

    wireMat = new THREE.MeshPhongMaterial({ color: C.wire, transparent: true, opacity: 0.6 });
    // Wires run from each terminal out to the face of its block, then down.
    [[-4.2, WIRE_X_LEFT], [4.2, WIRE_X_RIGHT]].forEach(([bx, fx]) => {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(bx, BATT_Y, 0), new THREE.Vector3(fx, BATT_Y, 0), new THREE.Vector3(fx, WIRE_FACE_Y, 0)]);
        batteryGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.2, 8, false), wireMat));
    });
    wireElecMat = new THREE.MeshPhongMaterial({ color: C.free, emissive: C.free, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 });
    wireElectrons = []; stuckElectrons = [];
    prevBiasForBattery = null;
}

function updateBatteryLabels() {
    const V = biasVoltage;
    if (Math.abs(V) < 0.005) {
        voltLabel.element.textContent = '0.00 V';
        voltLabel.element.style.color = window.T.textMuted;
        battBodyMat.opacity = 0.3;
        posTermMat.color.copy(C.batt); negTermMat.color.copy(C.batt);
        posLabel.visible = negLabel.visible = false;
        return;
    }
    battBodyMat.opacity = 0.85;
    posTermMat.color.copy(C.termPos); negTermMat.color.copy(C.termNeg);
    // Forward: + on the p-side (left terminal). Reverse: + on the n-side.
    const sx = V > 0.01 ? -1 : 1;
    posTerm.position.x = sx * 4.2; negTerm.position.x = -sx * 4.2;
    posLabel.position.set(sx * 4.2, BATT_Y + 2.4, 0);
    negLabel.position.set(-sx * 4.2, BATT_Y + 2.4, 0);
    posLabel.visible = negLabel.visible = true;
    voltLabel.element.textContent = Math.abs(V).toFixed(2) + ' V';
    voltLabel.element.style.color = window.T.text;
}

let wireElectrons = [], stuckElectrons = [];
let rightWireSpawnTimer = 0, leftWireSpawnTimer = 0;

function wirePosition(path, t) {
    const ct = THREE.MathUtils.clamp(t, 0, 1);
    const battX = path === 'left' ? -4.2 : 4.2;
    const faceX = path === 'left' ? WIRE_X_LEFT : WIRE_X_RIGHT;
    const horizLen = Math.abs(faceX - battX), vertLen = BATT_Y - WIRE_FACE_Y;
    const dist = ct * (horizLen + vertLen);
    if (dist <= horizLen) return new THREE.Vector3(battX + (faceX - battX) * dist / horizLen, BATT_Y, 0);
    return new THREE.Vector3(faceX, BATT_Y - (dist - horizLen) / vertLen * vertLen, 0);
}

function spawnWireElectron(path, startT, dir) {
    const mesh = new THREE.Mesh(wireElecGeo, wireElecMat.clone());
    mesh.position.copy(wirePosition(path, startT));
    batteryGroup.add(mesh);
    wireElectrons.push({ mesh, path, t: startT, dir });
}

function updateWireElectrons(dt) {
    const V = biasVoltage;
    const forwardFlowing = !formationPhase && V >= V_TURN_ON;
    const isReverse = !formationPhase && V < -0.01;
    const isBreakdown = !formationPhase && V <= V_BREAKDOWN;
    const isFlowing = forwardFlowing || isReverse;
    let speed = 0;
    if (forwardFlowing) speed = 0.4 + (V - V_TURN_ON) * 3;
    else if (isBreakdown) speed = 1.5 + Math.abs(V - V_BREAKDOWN) * 4;
    else if (isReverse) speed = 0.8 + Math.abs(V) * 1.5;

    // Forward: battery - terminal to the n-side face (right wire).
    if (forwardFlowing) {
        rightWireSpawnTimer -= dt;
        if (rightWireSpawnTimer <= 0) {
            spawnWireElectron('right', 0, +1);
            rightWireSpawnTimer = Math.max(0.15, 0.6 / (1 + (V - V_TURN_ON) * 5));
        }
    }
    // Forward: p-side exits travel back to the battery (left wire).
    while (forwardFlowing && pendingLeftWireSpawns > 0) { spawnWireElectron('left', 1, -1); pendingLeftWireSpawns--; }

    // Reverse: battery - terminal to the p-side face; electrons fill holes,
    // then pile up at the face once no holes remain.
    const MAX_STUCK = 15;
    if (isReverse && (holes.length > 0 || stuckElectrons.length < MAX_STUCK)) {
        leftWireSpawnTimer -= dt;
        const interval = holes.length > 0
            ? (isBreakdown ? 0.06 : Math.max(0.1, 0.3 / (1 + Math.abs(V) * 2)))
            : (isBreakdown ? 0.15 : 0.6);
        if (leftWireSpawnTimer <= 0) { spawnWireElectron('left', 0, +1); leftWireSpawnTimer = interval; }
    }
    while (isReverse && pendingRightWireExits > 0) { spawnWireElectron('right', 1, -1); pendingRightWireExits--; }
    if (!forwardFlowing) rightWireSpawnTimer = 0;
    if (!isReverse) leftWireSpawnTimer = 0;

    for (let i = wireElectrons.length - 1; i >= 0; i--) {
        const we = wireElectrons[i];
        we.t += we.dir * speed * dt;
        if (we.t > 1.01 || we.t < -0.01) {
            const extent = LATTICE_N * A;
            if (we.path === 'right' && we.t > 1.01) {
                spawnElectron(extent - 0.5, (Math.random() - 0.5) * extent, (Math.random() - 0.5) * extent);
            }
            if (we.path === 'left' && we.t > 1.01) {
                if (holes.length > 0) {
                    const entryPos = new THREE.Vector3(-extent + 0.5, 0, 0);
                    let bestIdx = 0, bestDist = Infinity;
                    for (let hi = 0; hi < holes.length; hi++) {
                        const d = holes[hi].mesh.position.distanceTo(entryPos);
                        if (d < bestDist) { bestDist = d; bestIdx = hi; }
                    }
                    spawnConductingElectron(bestIdx, +1, true);
                } else {
                    const stuckMesh = new THREE.Mesh(wireElecGeo, wireElecMat.clone());
                    const endPos = wirePosition('left', 1);
                    stuckMesh.position.set(endPos.x + (Math.random() - 0.5) * 1.5, endPos.y + (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.0);
                    batteryGroup.add(stuckMesh);
                    stuckElectrons.push(stuckMesh);
                }
            }
            batteryGroup.remove(we.mesh);
            we.mesh.material.dispose();
            wireElectrons.splice(i, 1);
            continue;
        }
        we.mesh.position.copy(wirePosition(we.path, we.t));
    }
    if (!isFlowing && wireElectrons.length > 0) {
        for (const we of wireElectrons) { batteryGroup.remove(we.mesh); we.mesh.material.dispose(); }
        wireElectrons = [];
    }
    if (!isReverse && stuckElectrons.length > 0) {
        for (const m of stuckElectrons) { batteryGroup.remove(m); m.material.dispose(); }
        stuckElectrons = [];
    }
}

let prevBiasForBattery = null;
function updateBattery() {
    if (prevBiasForBattery === null || Math.abs(biasVoltage - prevBiasForBattery) > 0.005) {
        updateBatteryLabels();
        prevBiasForBattery = biasVoltage;
    }
}

// ═══ Hole replenishment near the depletion edge ═══
let prevDepletionW = W0;
function replenishHolesNearJunction() {
    if (formationPhase || paused) return;
    const W = depletionHalfWidth(biasVoltage);
    const extent = LATTICE_N * A;
    if (W < prevDepletionW - 0.3) {
        const count = Math.max(1, Math.round((prevDepletionW - W) / HOLE_GRID_SPACING * 2));
        for (let i = 0; i < count; i++) {
            spawnHole(-W - Math.random() * (prevDepletionW - W), (Math.random() - 0.5) * extent, (Math.random() - 0.5) * extent);
        }
    }
    if (W > prevDepletionW + 0.3) {
        for (let i = holes.length - 1; i >= 0; i--) if (holes[i].gridX > -W) removeHole(i);
    }
    prevDepletionW = W;
}

// ═══ Init and render loop ═══
function restartFormation() {
    formationPhase = true;
    formationTime = 0;
    camera.position.set(26, 22, 46);
    orbitControls.target.set(0, 3, 0);
    resetCarriers();
    publishFormation();
}

function rebuildAll() {
    applyTheme();
    buildLatticeVisuals();
    buildBarrierVisuals();
    buildBattery();
    // Recolour live carriers.
    for (const e of electrons) { e.mesh.material.color.copy(C.free); e.mesh.material.emissive.copy(C.free); e.mesh.children.forEach((c) => c.material.color.copy(C.free)); }
    for (const h of holes) h.mesh.material.color.copy(C.hole);
    for (const ce of conductingElecs) { ce.mesh.material.color.copy(C.free); ce.mesh.material.emissive.copy(C.free); }
}

applyTheme();
generatePNLattice();
buildLatticeVisuals();
buildBarrierVisuals();
buildBattery();
initCarriers();

let lastPublish = 0;
function step(dt) {
    paused = PN.p.run === 'pause';
    if (!paused) elapsed += dt;
    biasVoltage = formationPhase ? 0 : PN.p.bias;
    if (!paused) updateFormation(dt);
    updateDepletionBox();
    updateBarrierVisuals();
    updateCarriers(dt);
    updateConductingElectrons(dt);
    checkRecombination();
    thermalGeneration(dt);
    replenishCarriers();
    replenishHolesNearJunction();
    avalancheGeneration(dt);
    updateFlashes(dt);
    updateBattery();
    updateWireElectrons(dt);
    // Publish formation progress a few times a second, and once on completion.
    if (PN.formation !== null || formationPhase) {
        if (elapsed - lastPublish > 0.2 || !formationPhase) { lastPublish = elapsed; publishFormation(); }
    }
}

let raf = 0;
function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    orbitControls.update();
    step(dt);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
}
function start() { if (!raf) { clock.getDelta(); raf = requestAnimationFrame(frame); } }
function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.05 }).observe(box);

resize();
publishFormation();
step(0);
renderer.render(scene, camera);

window.addEventListener('pnchange', (e) => { if (e.detail && e.detail.key === 'reset') restartFormation(); });
window.addEventListener('themechange', rebuildAll);
