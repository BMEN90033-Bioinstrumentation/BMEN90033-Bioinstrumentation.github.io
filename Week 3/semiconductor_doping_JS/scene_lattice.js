// Section 01 · Three.js diamond cubic lattice with optional phosphorus or
// boron substitution. Lattice generation, dopant placement, carrier
// hopping, thermal generation and recombination, and the drift of carriers
// between the voltage plates are ported from the original simulator without
// change to the rules or rates. Colours come from the page CSS variables;
// the plate polarity and voltage are CSS2D labels above each plate.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { guardWheel } from '../../components/orbit_wheel_guard.js';

const D = window.DOP;
const P = D.p;
const box = document.getElementById('scene-lattice');
const host = box.querySelector('.three-host');
const css = (n) => window.CMP.cssVar(n);
const col = (n) => new THREE.Color(css(n));

// ─── Renderer, camera, controls ───
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1.3, 0.1, 800);
camera.position.set(20, 18, 35);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
host.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
host.appendChild(labelRenderer.domElement);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.08;
guardWheel(orbitControls, renderer.domElement, box.querySelector('.hint'));

const white = new THREE.Color(1, 1, 1);
scene.add(new THREE.AmbientLight(white, 0.5));
const dirLight = new THREE.DirectionalLight(white, 0.7);
dirLight.position.set(20, 30, 25);
scene.add(dirLight);
scene.add(new THREE.DirectionalLight(white, 0.2).translateX(-15).translateY(10).translateZ(-10));

let grid = null;
let C = {};   // colours, refreshed on theme change
function applyTheme() {
    const T = window.T;
    scene.background = new THREE.Color(T.sceneBg);
    scene.fog = new THREE.FogExp2(T.sceneBg, 0.003);
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    grid = new THREE.GridHelper(100, 50, col('--c-grid3d'), col('--c-grid3d-2'));
    grid.position.y = -20;
    scene.add(grid);
    C = {
        si: col('--c-si'), p: col('--c-p'), b: col('--c-b'), bond: col('--c-bond'),
        free: col('--c-free'), hole: col('--c-hole'), neg: col('--c-plate-neg'), pos: col('--c-plate-pos')
    };
    C.bondEm = C.bond.clone().multiplyScalar(0.25);
    C.negEm = C.neg.clone().multiplyScalar(0.3);
    C.posEm = C.pos.clone().multiplyScalar(0.3);
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

// ─── Constants ───
const A = 8;                               // lattice constant (visual units)
const NN_DIST = A * Math.sqrt(3) / 4;      // nearest-neighbour distance, about 3.46
const ATOM_RADIUS = 0.7;
const BOND_ELEC_RADIUS = 0.18;
const FREE_ELEC_RADIUS = 0.35;

// Old sliders were 0..100; these give the same normalised values.
const voltNorm = () => P.volt / 5;
const tempNorm = () => P.temp / 1000;
const voltSlider = () => P.volt / 5 * 100;   // value in old slider units

// ─── Data ───
let atomPositions = [], atomTypes = [], bondPairs = [], dopantIndices = [], bondsForAtomMap = [];

const latticeGroup = new THREE.Group(); scene.add(latticeGroup);
const carrierGroup = new THREE.Group(); scene.add(carrierGroup);
const plateGroup = new THREE.Group(); scene.add(plateGroup);

let atomInstanced = null, bondElecInstanced = null;
let holeMeshes = [], freeElectrons = [], permanentHoles = [], pTypeHopElectrons = [];

const atomGeo = new THREE.SphereGeometry(ATOM_RADIUS, 16, 16);
const bondElecGeo = new THREE.SphereGeometry(BOND_ELEC_RADIUS, 8, 8);
const freeElecGeo = new THREE.SphereGeometry(FREE_ELEC_RADIUS, 12, 12);
const holeGeo = new THREE.TorusGeometry(0.3, 0.08, 8, 16);
const dummy = new THREE.Object3D();

// ─── Diamond cubic lattice ───
const BASIS = [
    [0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5],
    [0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]
];

function generateLattice(N) {
    const positions = [];
    for (let nx = 0; nx < N; nx++) for (let ny = 0; ny < N; ny++) for (let nz = 0; nz < N; nz++) {
        for (const b of BASIS) positions.push(new THREE.Vector3((nx + b[0]) * A, (ny + b[1]) * A, (nz + b[2]) * A));
    }
    const cx = (N * A) / 2;
    for (const p of positions) { p.x -= cx; p.y -= cx; p.z -= cx; }
    return positions;
}

function findBonds(positions) {
    const tol2 = (NN_DIST * 1.05) ** 2;
    const bonds = [];
    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            if (positions[i].distanceToSquared(positions[j]) < tol2) bonds.push({ a1: i, a2: j, slot0: true, slot1: true });
        }
    }
    return bonds;
}

function buildBondMap(bonds, numAtoms) {
    const map = Array.from({ length: numAtoms }, () => []);
    bonds.forEach((b, bi) => { map[b.a1].push(bi); map[b.a2].push(bi); });
    return map;
}

// Farthest-point sampling for an even spatial distribution of dopants.
function chooseDopants(positions, count) {
    const candidates = positions.map((_, i) => i);
    const numDopants = Math.min(count, candidates.length);
    if (numDopants === 0) return [];
    const selected = [candidates[Math.floor(Math.random() * candidates.length)]];
    const minDist = new Float32Array(candidates.length).fill(Infinity);
    for (let n = 1; n < numDopants; n++) {
        const lastPos = positions[selected[selected.length - 1]];
        for (let i = 0; i < candidates.length; i++) {
            if (selected.includes(candidates[i])) continue;
            const d = positions[candidates[i]].distanceToSquared(lastPos);
            if (d < minDist[i]) minDist[i] = d;
        }
        let bestIdx = -1, bestDist = -1;
        for (let i = 0; i < candidates.length; i++) {
            if (selected.includes(candidates[i])) continue;
            if (minDist[i] > bestDist) { bestDist = minDist[i]; bestIdx = i; }
        }
        if (bestIdx >= 0) selected.push(candidates[bestIdx]);
    }
    return selected;
}

function disposeGroup(g) {
    while (g.children.length) {
        const c = g.children[0];
        g.remove(c);
        c.traverse((o) => {
            if (o.element) o.element.remove();
            if (o.geometry && o.geometry !== atomGeo && o.geometry !== bondElecGeo && o.geometry !== freeElecGeo && o.geometry !== holeGeo) o.geometry.dispose();
            if (o.material) o.material.dispose();
        });
    }
}

function clearAll() {
    disposeGroup(latticeGroup); disposeGroup(carrierGroup); disposeGroup(plateGroup);
    atomInstanced = null; bondElecInstanced = null;
    holeMeshes = []; freeElectrons = []; permanentHoles = []; pTypeHopElectrons = [];
}

function buildScene() {
    const mode = P.mode, N = P.size;
    clearAll();
    holeHopTimer = 0; thermalExciteTimer = 0;

    atomPositions = generateLattice(N);
    bondPairs = findBonds(atomPositions);
    bondsForAtomMap = buildBondMap(bondPairs, atomPositions.length);

    const numDopants = Math.max(1, Math.round(atomPositions.length * P.dopant / 100));
    if (mode === 'pure') {
        atomTypes = atomPositions.map(() => 'Si');
        dopantIndices = [];
    } else {
        dopantIndices = chooseDopants(atomPositions, numDopants);
        atomTypes = atomPositions.map((_, i) => dopantIndices.includes(i) ? (mode === 'ntype' ? 'P' : 'B') : 'Si');
    }

    atomInstanced = new THREE.InstancedMesh(atomGeo,
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
    latticeGroup.add(new THREE.LineSegments(bondGeo,
        new THREE.LineBasicMaterial({ color: C.bond, transparent: true, opacity: 0.25 })));

    bondElecInstanced = new THREE.InstancedMesh(bondElecGeo, new THREE.MeshPhongMaterial({
        color: C.bond, emissive: C.bondEm, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }), bondPairs.length * 2);
    bondElecInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    latticeGroup.add(bondElecInstanced);

    // p-type: remove one electron from one bond per dopant.
    if (mode === 'ptype') {
        for (const di of dopantIndices) {
            for (const bi of bondsForAtomMap[di]) {
                if (bondPairs[bi].slot0 && bondPairs[bi].slot1) { bondPairs[bi].slot1 = false; break; }
            }
        }
        permanentHoles = bondsWithHoles().map((h) => ({ bondIdx: h.bondIdx, slotIdx: h.slotIdx, pos: bondMid(h.bondIdx) }));
        permanentHoles.sort((a, b) => a.pos.x - b.pos.x);
    }

    // n-type: one free electron per dopant.
    if (mode === 'ntype') for (const di of dopantIndices) createFreeElectron(atomPositions[di].clone(), di);

    buildPlates(N);
    orbitControls.target.set(0, 0, 0);
    // Keep the whole lattice and plates in view when the size changes.
    camera.position.setLength(Math.max(30, 47 * N / 2));
}

function createFreeElectron(pos, homeAtomIdx) {
    const mesh = new THREE.Mesh(freeElecGeo, new THREE.MeshPhongMaterial({
        color: C.free, emissive: C.free, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }));
    mesh.position.copy(pos);
    carrierGroup.add(mesh);
    mesh.add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8),
        new THREE.MeshBasicMaterial({ color: C.free, transparent: true, opacity: 0.12, depthWrite: false })));
    const TLEN = 50;
    const tp = new Float32Array(TLEN * 3);
    for (let i = 0; i < TLEN * 3; i += 3) { tp[i] = pos.x; tp[i + 1] = pos.y; tp[i + 2] = pos.z; }
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(tp, 3));
    const trail = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: C.free, transparent: true, opacity: 0.3 }));
    carrierGroup.add(trail);

    const nearBonds = bondsForAtomMap[homeAtomIdx] || [];
    const startBond = nearBonds.length > 0 ? nearBonds[0] : 0;
    const b = bondPairs[startBond] || bondPairs[0];
    freeElectrons.push({
        mesh, trail, trailPos: tp, trailTimer: 0, homeAtomIdx,
        bound: P.mode === 'ntype',
        orbitPhase: Math.random() * Math.PI * 2, orbitRadius: 1.6,
        currentBondIdx: startBond, hopProgress: 0,
        hopFrom: homeAtomIdx, hopTo: b ? (b.a1 === homeAtomIdx ? b.a2 : b.a1) : 0,
        isThermal: false, lifetime: Infinity,
        platePhase: null, plateFrom: null, plateTo: null, plateProgress: 0, reentryAtom: -1
    });
}

// ─── Voltage plates ───
let leftPlate, rightPlate, leftLabel, rightLabel, voltLabel, fieldLabel, fieldArrows = [];

function cssLabel(text, colour) {
    const el = document.createElement('div');
    el.className = 'three-label';
    el.textContent = text;
    el.style.color = colour;
    const o = new CSS2DObject(el);
    o.center.set(0.5, 1);
    return o;
}

function buildPlates(N) {
    const extent = (N * A) / 2, px = extent + 4, ph = extent * 2 + 4;
    const s = N / 2;
    leftPlate = new THREE.Mesh(new THREE.BoxGeometry(0.4, ph, ph),
        new THREE.MeshPhongMaterial({ color: C.neg, emissive: C.negEm, transparent: true, opacity: 0 }));
    leftPlate.position.set(-px, 0, 0);
    plateGroup.add(leftPlate);
    rightPlate = new THREE.Mesh(new THREE.BoxGeometry(0.4, ph, ph),
        new THREE.MeshPhongMaterial({ color: C.pos, emissive: C.posEm, transparent: true, opacity: 0 }));
    rightPlate.position.set(px, 0, 0);
    plateGroup.add(rightPlate);

    leftLabel = cssLabel('−', css('--c-plate-neg'));
    leftLabel.position.set(-px, ph / 2 + 0.6, 0);
    plateGroup.add(leftLabel);
    rightLabel = cssLabel('+', css('--c-plate-pos'));
    rightLabel.position.set(px, ph / 2 + 0.6, 0);
    plateGroup.add(rightLabel);
    voltLabel = cssLabel('', css('--c-plate-pos'));
    voltLabel.position.set(px, ph / 2 + 3 * s, 0);
    plateGroup.add(voltLabel);

    // Field arrows point from the + plate towards the - plate.
    fieldArrows = [];
    const step = Math.max(A, extent * 0.6), arrowLen = Math.max(3, extent * 0.5);
    const headLen = 0.4 * s + 0.2, headW = 0.3 * s + 0.1;
    for (let y = -extent; y <= extent; y += step) {
        for (let z = -extent; z <= extent; z += step) {
            const arr = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(px - 2, y, z),
                arrowLen, C.free, headLen, headW);
            arr.visible = false;
            arr.line.material.transparent = true;
            arr.cone.material.transparent = true;
            plateGroup.add(arr);
            fieldArrows.push(arr);
        }
    }
    fieldLabel = cssLabel('← E', css('--c-free'));
    fieldLabel.position.set(px - 2 - arrowLen / 2, extent + 3 * s, 0);
    plateGroup.add(fieldLabel);
}

// ─── Helpers ───
function bondsWithHoles() {
    const res = [];
    for (let i = 0; i < bondPairs.length; i++) {
        if (!bondPairs[i].slot0) res.push({ bondIdx: i, slotIdx: 0 });
        if (!bondPairs[i].slot1) res.push({ bondIdx: i, slotIdx: 1 });
    }
    return res;
}
function bondMid(bi) {
    return atomPositions[bondPairs[bi].a1].clone().add(atomPositions[bondPairs[bi].a2]).multiplyScalar(0.5);
}

let holeHopTimer = 0, thermalExciteTimer = 0;

// ─── Simulation step ───
const clock = new THREE.Clock();
let simTime = 0;

function step(dt) {
    const tN = tempNorm(), vN = voltNorm(), voltage = voltSlider();
    const extent = (P.size * A) / 2, plateX = extent + 4;

    if (P.run !== 'pause') {
        simTime += dt;
        const t = simTime;

        // Bond electrons: two slots per bond, offset perpendicular to the bond.
        for (let bi = 0; bi < bondPairs.length; bi++) {
            const b = bondPairs[bi], p1 = atomPositions[b.a1], p2 = atomPositions[b.a2];
            const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
            const perp = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0))
                .normalize().multiplyScalar(0.2);
            for (let s = 0; s < 2; s++) {
                if (s === 0 ? b.slot0 : b.slot1) {
                    const osc = Math.sin(t * 1.5 + bi * 0.7 + s * Math.PI) * 0.15;
                    dummy.position.copy(p1).lerp(p2, 0.5 + osc).addScaledVector(perp, s === 0 ? -1 : 1);
                    dummy.scale.setScalar(1);
                } else {
                    dummy.position.set(0, -9999, 0);
                    dummy.scale.setScalar(0);
                }
                dummy.updateMatrix();
                bondElecInstanced.setMatrixAt(bi * 2 + s, dummy.matrix);
            }
        }
        bondElecInstanced.instanceMatrix.needsUpdate = true;

        // Hole meshes follow the empty bond slots.
        const holes = bondsWithHoles();
        while (holeMeshes.length > holes.length) {
            const hm = holeMeshes.pop();
            carrierGroup.remove(hm);
            hm.traverse((o) => { if (o.material) o.material.dispose(); if (o.geometry && o.geometry !== holeGeo) o.geometry.dispose(); });
        }
        while (holeMeshes.length < holes.length) {
            const hm = new THREE.Mesh(holeGeo, new THREE.MeshPhongMaterial({
                color: C.hole, emissive: C.hole, emissiveIntensity: 0.3, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
            hm.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8),
                new THREE.MeshBasicMaterial({ color: C.hole, transparent: true, opacity: 0.1, depthWrite: false })));
            carrierGroup.add(hm);
            holeMeshes.push(hm);
        }
        for (let i = 0; i < holes.length; i++) {
            holeMeshes[i].position.copy(bondMid(holes[i].bondIdx));
            holeMeshes[i].rotation.x = t * 2 + i;
            holeMeshes[i].rotation.y = t * 1.5;
            holeMeshes[i].material.opacity = 0.6 + Math.sin(t * 3 + i) * 0.15;
        }

        // p-type: electrons hop between the static holes towards the + plate.
        if (P.mode === 'ptype' && permanentHoles.length > 0) {
            const hopSpeed = 2.5 + vN * 6.0 + tN * 2.0;
            for (let i = pTypeHopElectrons.length - 1; i >= 0; i--) {
                const he = pTypeHopElectrons[i];
                he.progress += dt * hopSpeed;
                if (he.progress >= 1.0) {
                    he.currentStep++;
                    he.progress = 0;
                    if (he.currentStep < permanentHoles.length) {
                        he.fromPos = permanentHoles[he.currentStep - 1].pos.clone();
                        he.toPos = permanentHoles[he.currentStep].pos.clone();
                    } else if (he.currentStep === permanentHoles.length) {
                        he.fromPos = permanentHoles[permanentHoles.length - 1].pos.clone();
                        he.toPos = new THREE.Vector3(plateX - 1, he.fromPos.y, he.fromPos.z);
                    } else {
                        carrierGroup.remove(he.mesh);
                        he.mesh.traverse((o) => { if (o.material) o.material.dispose(); if (o.geometry && o.geometry !== freeElecGeo) o.geometry.dispose(); });
                        pTypeHopElectrons.splice(i, 1);
                        continue;
                    }
                }
                const p = Math.min(he.progress, 1.0), eased = p * p * (3 - 2 * p);
                he.mesh.position.lerpVectors(he.fromPos, he.toPos, eased);
                const side = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(he.toPos, he.fromPos), new THREE.Vector3(0, 1, 0)).normalize();
                he.mesh.position.addScaledVector(side, Math.sin(p * Math.PI) * 0.8);
                he.mesh.position.y += Math.sin(p * Math.PI) * 0.5;
                he.mesh.scale.setScalar(1 + Math.sin(p * Math.PI * 3) * 0.15);
            }

            const baseHopRate = 0.15 + tN * 0.5;
            const hopInterval = Math.max(0.15, 1.0 / (baseHopRate + vN * 5.0));
            const maxElectrons = Math.max(2, Math.floor(3 + vN * 12));
            holeHopTimer += dt;
            if (vN > 0.05 && holeHopTimer > hopInterval && pTypeHopElectrons.length < maxElectrons) {
                holeHopTimer = 0;
                const plateH = extent + 2;
                const fromPos = new THREE.Vector3(-plateX + 1, (Math.random() * 2 - 1) * plateH, (Math.random() * 2 - 1) * plateH);
                const mesh = new THREE.Mesh(freeElecGeo, new THREE.MeshPhongMaterial({
                    color: C.free, emissive: C.free, emissiveIntensity: 0.6, transparent: true, opacity: 0.95 }));
                mesh.position.copy(fromPos);
                mesh.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8),
                    new THREE.MeshBasicMaterial({ color: C.free, transparent: true, opacity: 0.15, depthWrite: false })));
                carrierGroup.add(mesh);
                pTypeHopElectrons.push({ mesh, fromPos, toPos: permanentHoles[0].pos.clone(), progress: 0, currentStep: 0 });
            }
        }

        // Free electrons (n-type donors and thermally generated).
        for (const ee of freeElectrons) {
            const homePos = atomPositions[ee.homeAtomIdx];
            if (ee.bound) {
                ee.orbitPhase += dt * 2.0;
                ee.orbitRadius = Math.min(ee.orbitRadius + dt * 1.2, 1.6);
                const r = ee.orbitRadius;
                ee.mesh.position.set(homePos.x + Math.cos(ee.orbitPhase) * r,
                    homePos.y + Math.sin(ee.orbitPhase) * r * 0.7,
                    homePos.z + Math.sin(ee.orbitPhase * 0.6) * r * 0.5);
                if (tN > 0.15 || vN > 0.05) {
                    ee.orbitRadius = Math.max(ee.orbitRadius - dt * (vN > 0.05 ? 4.0 : 0.8), 0);
                    if (ee.orbitRadius < 0.1) {
                        ee.bound = false;
                        const nb = bondsForAtomMap[ee.homeAtomIdx];
                        if (nb.length > 0) {
                            ee.currentBondIdx = nb[0];
                            ee.hopProgress = 0;
                            ee.hopFrom = ee.homeAtomIdx;
                            const b2 = bondPairs[ee.currentBondIdx];
                            ee.hopTo = b2.a1 === ee.homeAtomIdx ? b2.a2 : b2.a1;
                        }
                    }
                }
            } else if (ee.platePhase === 'exiting') {
                ee.plateProgress += dt * (0.8 + vN * 1.5);
                const p = Math.min(ee.plateProgress, 1.0);
                ee.mesh.position.lerpVectors(ee.plateFrom, ee.plateTo, p * p * (3 - 2 * p));
                if (ee.plateProgress >= 1.0) {
                    const leftAtoms = atomPositions.map((ap, ai) => ({ p: ap, i: ai })).filter((a) => a.p.x < -extent + A * 0.8);
                    if (leftAtoms.length > 0) {
                        const pick = leftAtoms[Math.floor(Math.random() * leftAtoms.length)];
                        const plateH = extent + 2;
                        ee.platePhase = 'entering';
                        ee.plateProgress = 0;
                        ee.plateFrom = new THREE.Vector3(-plateX + 1, (Math.random() * 2 - 1) * plateH, (Math.random() * 2 - 1) * plateH);
                        ee.plateTo = pick.p.clone();
                        ee.reentryAtom = pick.i;
                        ee.mesh.position.copy(ee.plateFrom);
                        for (let ti = 0; ti < ee.trailPos.length; ti += 3) {
                            ee.trailPos[ti] = ee.plateFrom.x; ee.trailPos[ti + 1] = ee.plateFrom.y; ee.trailPos[ti + 2] = ee.plateFrom.z;
                        }
                    } else {
                        ee.platePhase = null;
                    }
                }
            } else if (ee.platePhase === 'entering') {
                ee.plateProgress += dt * (0.8 + vN * 1.5);
                const p = Math.min(ee.plateProgress, 1.0);
                ee.mesh.position.lerpVectors(ee.plateFrom, ee.plateTo, p * p * (3 - 2 * p));
                if (ee.plateProgress >= 1.0) {
                    ee.platePhase = null;
                    ee.hopProgress = 0;
                    ee.hopFrom = ee.reentryAtom;
                    const rBonds = bondsForAtomMap[ee.reentryAtom];
                    if (rBonds.length > 0) {
                        ee.currentBondIdx = rBonds[0];
                        const nb2 = bondPairs[ee.currentBondIdx];
                        ee.hopTo = nb2.a1 === ee.reentryAtom ? nb2.a2 : nb2.a1;
                    }
                }
            } else {
                // Hop through the lattice bond by bond.
                ee.hopProgress += dt * (0.5 + vN * 5.0 + tN * 0.5);
                if (ee.currentBondIdx >= 0 && ee.currentBondIdx < bondPairs.length) {
                    const fromPos = atomPositions[ee.hopFrom], toPos = atomPositions[ee.hopTo];
                    const p = ee.hopProgress;
                    ee.mesh.position.lerpVectors(fromPos, toPos, p * p * (3 - 2 * p));
                    const side = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(toPos, fromPos), new THREE.Vector3(0, 1, 0)).normalize();
                    ee.mesh.position.addScaledVector(side, Math.sin(p * Math.PI) * 0.6);
                    ee.mesh.position.y += Math.sin(p * Math.PI) * 0.4;
                    if (p >= 1.0) {
                        ee.hopProgress = 0;
                        const arrived = ee.hopTo;
                        const next = bondsForAtomMap[arrived].filter((bi) => bi !== ee.currentBondIdx);
                        if (next.length > 0) {
                            if (vN > 0.05) {
                                // Bias towards +x (the positive plate).
                                next.sort((a, b2) => {
                                    const mA = atomPositions[bondPairs[a].a1].x + atomPositions[bondPairs[a].a2].x;
                                    const mB = atomPositions[bondPairs[b2].a1].x + atomPositions[bondPairs[b2].a2].x;
                                    return mB - mA;
                                });
                                ee.currentBondIdx = next[0];
                            } else {
                                ee.currentBondIdx = next[Math.floor(Math.random() * next.length)];
                            }
                        } else {
                            ee.currentBondIdx = bondsForAtomMap[arrived][0] || 0;
                        }
                        ee.hopFrom = arrived;
                        const nb = bondPairs[ee.currentBondIdx];
                        ee.hopTo = nb.a1 === arrived ? nb.a2 : nb.a1;
                        if (vN > 0.05 && atomPositions[arrived].x > extent - A * 0.3) {
                            ee.platePhase = 'exiting';
                            ee.plateProgress = 0;
                            ee.plateFrom = atomPositions[arrived].clone();
                            ee.plateTo = new THREE.Vector3(plateX - 1, atomPositions[arrived].y, atomPositions[arrived].z);
                        }
                    }
                }
            }
            ee.mesh.scale.setScalar(1 + Math.sin(t * 4 + ee.orbitPhase) * 0.12);
            ee.trailTimer += dt;
            if (ee.trailTimer > 0.03) {
                ee.trailTimer = 0;
                const tp = ee.trailPos;
                for (let i = tp.length - 3; i >= 3; i -= 3) { tp[i] = tp[i - 3]; tp[i + 1] = tp[i - 2]; tp[i + 2] = tp[i - 1]; }
                tp[0] = ee.mesh.position.x; tp[1] = ee.mesh.position.y; tp[2] = ee.mesh.position.z;
                ee.trail.geometry.attributes.position.needsUpdate = true;
            }
            ee.trail.material.opacity = ee.bound ? 0.15 : 0.2 + vN * 0.4;
        }

        // Thermal generation in pure silicon.
        if (P.mode === 'pure' && tN > 0.25) {
            thermalExciteTimer += dt;
            if (thermalExciteTimer > Math.max(0.5, 6 - tN * 5)) {
                thermalExciteTimer = 0;
                const fullBonds = bondPairs.map((b, i) => ({ b, i })).filter((x) => x.b.slot0 && x.b.slot1);
                if (fullBonds.length > 0 && bondsWithHoles().length < Math.max(3, atomPositions.length * 0.02)) {
                    const pick = fullBonds[Math.floor(Math.random() * fullBonds.length)];
                    pick.b.slot1 = false;
                    createFreeElectron(bondMid(pick.i), pick.b.a1);
                    const ee = freeElectrons[freeElectrons.length - 1];
                    ee.bound = false; ee.orbitRadius = 0; ee.isThermal = true;
                    ee.lifetime = 3 + Math.random() * 4;
                }
            }
        }

        // Recombination of thermal carriers; faster once the temperature drops.
        for (let i = freeElectrons.length - 1; i >= 0; i--) {
            const ee = freeElectrons[i];
            if (!ee.isThermal) continue;
            ee.lifetime -= dt * (tN <= 0.25 ? 4.0 : 1.0);
            if (ee.lifetime <= 0) {
                const holes2 = bondsWithHoles();
                if (holes2.length > 0) {
                    const h = holes2[Math.floor(Math.random() * holes2.length)];
                    if (h.slotIdx === 0) bondPairs[h.bondIdx].slot0 = true; else bondPairs[h.bondIdx].slot1 = true;
                }
                carrierGroup.remove(ee.mesh); carrierGroup.remove(ee.trail);
                ee.mesh.traverse((o) => { if (o.material) o.material.dispose(); if (o.geometry && o.geometry !== freeElecGeo) o.geometry.dispose(); });
                ee.trail.geometry.dispose(); ee.trail.material.dispose();
                freeElectrons.splice(i, 1);
            }
        }

        // n-type: donors recapture their electrons when cold and unbiased.
        if (P.mode === 'ntype' && tN < 0.15 && vN < 0.05) {
            for (const ee of freeElectrons) if (!ee.bound && !ee.isThermal) { ee.bound = true; ee.orbitRadius = 0.1; }
        }
    }

    // Plates, field arrows and labels.
    const pa = Math.min(voltage / 30, 1);
    leftPlate.material.opacity = pa * 0.5; leftPlate.material.emissiveIntensity = pa * 0.6;
    rightPlate.material.opacity = pa * 0.5; rightPlate.material.emissiveIntensity = pa * 0.6;
    const on = voltage > 5;
    leftLabel.visible = rightLabel.visible = voltLabel.visible = fieldLabel.visible = on;
    for (const a of fieldArrows) {
        a.visible = on;
        a.line.material.opacity = a.cone.material.opacity = Math.min(voltage / 50, 0.8);
    }
    if (on) voltLabel.element.textContent = '+' + P.volt.toFixed(1) + ' V';

    const L = D.live;
    L.atoms = atomPositions.length; L.bonds = bondPairs.length;
    L.free = freeElectrons.filter((e) => !e.bound).length;
    L.holes = bondsWithHoles().length;
    D.updateLive();
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

applyTheme();
buildScene();
resize();
step(0);
renderer.render(scene, camera);

const REBUILD = { mode: 1, size: 1, dopant: 1, reset: 1 };
window.addEventListener('dopchange', (e) => { if (e.detail && REBUILD[e.detail.key]) buildScene(); });
window.addEventListener('themechange', () => { applyTheme(); buildScene(); });
