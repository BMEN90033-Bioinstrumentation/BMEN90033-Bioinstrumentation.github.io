// Section 01 · Three.js scene: a row of six atoms, each with a nucleus,
// inner-shell electrons, a valence shell and a conduction shell. Shell radius
// stands for energy. The conduction-shell radius and the number of electrons
// promoted from the valence shell come from BANDS.state (E_g(T) and n_i(T),
// see model.js); promoted electrons
// hop between atoms along arcs at the conduction-shell radius.
// Colours come from the page CSS variables and are re-read on rebuild.
// Shells are identified by the HTML legend; the only in-scene text is the
// + on each nucleus.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { guardWheel } from '../../components/orbit_wheel_guard.js';

const B = window.BANDS;
const box = document.getElementById('scene-atoms');
const host = box.querySelector('.three-host');
const css = (n) => window.CMP.cssVar(n);
const col = (n) => new THREE.Color(css(n));

// ─── Renderer, camera, controls ───
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 500);
camera.position.set(0, 8, 36);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
host.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
host.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
guardWheel(controls, renderer.domElement, box.querySelector('.hint'));

const white = new THREE.Color(1, 1, 1);
scene.add(new THREE.AmbientLight(white, 0.5));
const dirLight = new THREE.DirectionalLight(white, 0.7);
dirLight.position.set(15, 20, 20);
scene.add(dirLight);
scene.add(new THREE.DirectionalLight(white, 0.15).translateX(-10).translateY(8));

let grid = null;
function applyTheme() {
    const T = window.T;
    scene.background = new THREE.Color(T.sceneBg);
    scene.fog = new THREE.FogExp2(T.sceneBg, 0.004);
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    grid = new THREE.GridHelper(80, 40, col('--c-grid3d'), col('--c-grid3d-2'));
    grid.position.y = -7;
    scene.add(grid);
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

// ─── Scene objects ───
const { NUM_ATOMS, ATOM_SPACING, INNER_RADIUS } = B;
const sceneGroup = new THREE.Group();
scene.add(sceneGroup);

let innerElectrons = [], valenceElectrons = [], conductionShells = [];
let cValence, cFree, cValEm, cFreeEm;

function clearScene() {
    while (sceneGroup.children.length > 0) {
        const child = sceneGroup.children[0];
        sceneGroup.remove(child);
        if (child.element) child.element.remove();
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        child.traverse((c) => { if (c.element) c.element.remove(); });
    }
    innerElectrons = []; valenceElectrons = []; conductionShells = [];
}

function label(text, colour, cls) {
    const el = document.createElement('div');
    el.className = 'three-label' + (cls ? ' ' + cls : '');
    el.textContent = text;
    el.style.color = colour;
    return new CSS2DObject(el);
}

function ring(radius, colour, opacity) {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity }));
}

function buildScene() {
    clearScene();
    const cfg = B.MATERIALS[B.p.mode];
    const startX = -(NUM_ATOMS - 1) * ATOM_SPACING / 2;
    const cNuc = col(cfg.nucleusVar), cInner = col('--c-inner'), cCond = col('--c-conduction');
    cValence = col('--c-valence'); cFree = col('--c-free');
    cValEm = cValence.clone().multiplyScalar(0.25); cFreeEm = cFree.clone().multiplyScalar(0.35);

    const nucleusGeo = new THREE.SphereGeometry(0.9, 24, 24);
    const innerElecGeo = new THREE.SphereGeometry(0.2, 10, 10);
    const valElecGeo = new THREE.SphereGeometry(0.28, 12, 12);
    const shellGeo = new THREE.SphereGeometry(1, 32, 32);

    for (let i = 0; i < NUM_ATOMS; i++) {
        const ax = startX + i * ATOM_SPACING;

        const nucleus = new THREE.Mesh(nucleusGeo, new THREE.MeshPhongMaterial({
            color: cNuc, emissive: cNuc, emissiveIntensity: 0.3, transparent: true, opacity: 0.85 }));
        nucleus.position.set(ax, 0, 0);
        sceneGroup.add(nucleus);
        const glow = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16),
            new THREE.MeshBasicMaterial({ color: cNuc, transparent: true, opacity: 0.05, depthWrite: false }));
        glow.position.set(ax, 0, 0);
        sceneGroup.add(glow);
        const plus = label('+', window.T.text, 'plus');
        plus.position.set(ax, 0, 0);
        sceneGroup.add(plus);

        [0, Math.PI / 2].forEach((ry) => {
            const r = ring(INNER_RADIUS, cInner, 0.12);
            r.position.set(ax, 0, 0); r.rotation.y = ry;
            sceneGroup.add(r);
        });
        for (let e = 0; e < cfg.innerShellElectrons; e++) {
            const mesh = new THREE.Mesh(innerElecGeo, new THREE.MeshPhongMaterial({
                color: cInner, emissive: cInner.clone().multiplyScalar(0.3), emissiveIntensity: 0.4,
                transparent: true, opacity: 0.8 }));
            sceneGroup.add(mesh);
            innerElectrons.push({
                mesh, atomX: ax, radius: INNER_RADIUS,
                speed: 2.0 + Math.random() * 0.8,
                phase: (e / cfg.innerShellElectrons) * Math.PI * 2,
                planeAngle: e < cfg.innerShellElectrons / 2 ? 0 : Math.PI / 2,
                tilt: (Math.random() - 0.5) * 0.4
            });
        }

        // Valence shell (fixed radius).
        const vShell = new THREE.Mesh(shellGeo, new THREE.MeshPhongMaterial({
            color: cValence, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }));
        vShell.position.set(ax, 0, 0);
        vShell.scale.setScalar(cfg.valenceRadius);
        sceneGroup.add(vShell);
        [[0, 0, 0.18], [0, Math.PI / 2, 0.12], [Math.PI / 2, 0, 0.12]].forEach(([rx, ry, op]) => {
            const r = ring(cfg.valenceRadius, cValence, op);
            r.position.set(ax, 0, 0); r.rotation.set(rx, ry, 0);
            sceneGroup.add(r);
        });

        // Conduction shell (radius set every frame).
        const cShell = new THREE.Mesh(shellGeo, new THREE.MeshPhongMaterial({
            color: cCond, transparent: true, opacity: 0.04, depthWrite: false, side: THREE.DoubleSide }));
        cShell.position.set(ax, 0, 0);
        sceneGroup.add(cShell);
        const rings = [[0, 0, 0.12], [0, Math.PI / 2, 0.08], [Math.PI / 2, 0, 0.08]].map(([rx, ry, op]) => {
            const r = ring(1, cCond, op);
            r.position.set(ax, 0, 0); r.rotation.set(rx, ry, 0);
            sceneGroup.add(r);
            return r;
        });
        conductionShells.push({ shell: cShell, rings });

        // Valence electrons orbit on the valence shell surface.
        for (let e = 0; e < cfg.valenceElectrons; e++) {
            const mesh = new THREE.Mesh(valElecGeo, new THREE.MeshPhongMaterial({
                color: cValence, emissive: cValEm, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 }));
            sceneGroup.add(mesh);
            const TRAIL_LEN = 22;
            const trailPos = new Float32Array(TRAIL_LEN * 3);
            for (let ti = 0; ti < TRAIL_LEN * 3; ti += 3) trailPos[ti] = ax;
            const trailGeo = new THREE.BufferGeometry();
            trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
            const trail = new THREE.Line(trailGeo,
                new THREE.LineBasicMaterial({ color: cFree, transparent: true, opacity: 0 }));
            sceneGroup.add(trail);
            valenceElectrons.push({
                mesh, homeAtomIdx: i, homeX: ax,
                theta: (e / cfg.valenceElectrons) * Math.PI * 2 + Math.random() * 0.5,
                phi: Math.PI / 2 + (Math.random() - 0.5) * 1.5,
                speedTheta: 0.8 + Math.random() * 0.6,
                speedPhi: 0.3 + Math.random() * 0.4,
                phaseTheta: Math.random() * Math.PI * 2,
                phasePhi: Math.random() * Math.PI * 2,
                isFree: false, freeProgress: 0,
                fromAtomIdx: i, toAtomIdx: Math.min(i + 1, NUM_ATOMS - 1),
                hopProgress: Math.random(), hopSpeed: 0.3 + Math.random() * 0.4,
                zWander: (Math.random() - 0.5) * 2,
                trail, trailPos, trailTimer: 0
            });
        }

        if (i < NUM_ATOMS - 1) {
            const bond = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(ax + 1.2, 0, 0), new THREE.Vector3(ax + ATOM_SPACING - 1.2, 0, 0)]),
                new THREE.LineDashedMaterial({ color: col('--c-bond'), transparent: true, opacity: 0.35, dashSize: 0.4, gapSize: 0.2 }));
            bond.computeLineDistances();
            sceneGroup.add(bond);
        }
    }

    startX0 = startX;
}
let startX0 = 0;

// ─── Animation ───
const clock = new THREE.Clock();
let simTime = 0;

function step(dt) {
    const s = B.state(), cfg = s.cfg, cRadius = s.cRadius, gap = s.gap;
    const numFree = s.numFree;

    for (const cs of conductionShells) {
        cs.shell.scale.setScalar(cRadius);
        cs.rings.forEach((r) => r.scale.setScalar(cRadius));
        const gapFrac = Math.max(0, gap) / (cfg.conductionRadiusBase - cfg.valenceRadius + 0.01);
        cs.shell.material.opacity = 0.03 + (1 - gapFrac) * 0.06;
    }

    if (B.p.run === 'pause') return;
    simTime += dt;
    const t = simTime;

    for (const e of innerElectrons) {
        const angle = t * e.speed + e.phase;
        const ox = Math.cos(angle) * e.radius, oy = Math.sin(angle) * e.radius;
        e.mesh.position.set(e.atomX + ox * Math.cos(e.planeAngle), oy + Math.sin(angle * 0.5) * e.tilt, ox * Math.sin(e.planeAngle));
    }

    let freedSoFar = 0;
    for (const ve of valenceElectrons) {
        const shouldBeFree = freedSoFar < numFree;
        if (shouldBeFree && !ve.isFree) {
            ve.isFree = true;
            ve.fromAtomIdx = ve.homeAtomIdx;
            ve.toAtomIdx = Math.min(ve.homeAtomIdx + 1, NUM_ATOMS - 1);
            if (ve.toAtomIdx === ve.fromAtomIdx) ve.toAtomIdx = Math.max(0, ve.fromAtomIdx - 1);
            ve.hopProgress = 0;
        } else if (!shouldBeFree && ve.isFree) {
            ve.isFree = false;
        }
        if (shouldBeFree) freedSoFar++;
    }

    for (const ve of valenceElectrons) {
        ve.freeProgress = ve.isFree ? Math.min(ve.freeProgress + dt * 2.0, 1) : Math.max(ve.freeProgress - dt * 2.0, 0);
        const fp = ve.freeProgress, easeF = fp * fp * (3 - 2 * fp);

        const thetaB = t * ve.speedTheta + ve.phaseTheta;
        const phiB = ve.phi + Math.sin(t * ve.speedPhi + ve.phasePhi) * 0.8;
        const bx = ve.homeX + Math.sin(phiB) * Math.cos(thetaB) * cfg.valenceRadius;
        const by = Math.cos(phiB) * cfg.valenceRadius;
        const bz = Math.sin(phiB) * Math.sin(thetaB) * cfg.valenceRadius;

        if (easeF < 0.01) {
            ve.mesh.position.set(bx, by, bz);
            ve.mesh.material.color.copy(cValence);
            ve.mesh.material.emissive.copy(cValEm);
            ve.mesh.material.opacity = 0.9;
            ve.trail.material.opacity = 0;
            continue;
        }

        ve.hopProgress += dt * ve.hopSpeed;
        if (ve.hopProgress >= 1) {
            ve.hopProgress -= 1;
            const prevFrom = ve.fromAtomIdx;
            ve.fromAtomIdx = ve.toAtomIdx;
            let next;
            if (ve.fromAtomIdx <= 0) next = 1;
            else if (ve.fromAtomIdx >= NUM_ATOMS - 1) next = NUM_ATOMS - 2;
            else {
                const wasRight = ve.fromAtomIdx > prevFrom;
                next = ve.fromAtomIdx + ((Math.random() < 0.7 ? wasRight : !wasRight) ? 1 : -1);
            }
            ve.toAtomIdx = Math.max(0, Math.min(NUM_ATOMS - 1, next));
            ve.hopSpeed = 0.25 + Math.random() * 0.4;
            ve.zWander = (Math.random() - 0.5) * 2.5;
        }
        const fromX = startX0 + ve.fromAtomIdx * ATOM_SPACING;
        const toX = startX0 + ve.toAtomIdx * ATOM_SPACING;
        const hp = ve.hopProgress, easeP = hp * hp * (3 - 2 * hp);
        const fx = fromX + (toX - fromX) * easeP;
        const fy = Math.sin(hp * Math.PI) * cRadius;
        const fz = ve.zWander * Math.sin(hp * Math.PI);
        if (easeF > 0.99) ve.mesh.position.set(fx, fy, fz);
        else ve.mesh.position.set(bx + (fx - bx) * easeF, by + (fy - by) * easeF, bz + (fz - bz) * easeF);

        ve.mesh.material.color.copy(cValence).lerp(cFree, easeF);
        ve.mesh.material.emissive.copy(cValEm).lerp(cFreeEm, easeF);
        ve.mesh.material.opacity = 0.8 + Math.sin(t * 4 + ve.phaseTheta) * 0.2;

        ve.trailTimer += dt;
        if (ve.trailTimer > 0.04) {
            ve.trailTimer = 0;
            const tp = ve.trailPos;
            for (let ti = tp.length - 3; ti >= 3; ti -= 3) {
                tp[ti] = tp[ti - 3]; tp[ti + 1] = tp[ti - 2]; tp[ti + 2] = tp[ti - 1];
            }
            tp[0] = ve.mesh.position.x; tp[1] = ve.mesh.position.y; tp[2] = ve.mesh.position.z;
            ve.trail.geometry.attributes.position.needsUpdate = true;
        }
        ve.trail.material.opacity = easeF * 0.3;
    }
}

let raf = 0;
function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    controls.update();
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
renderer.render(scene, camera);

window.addEventListener('bandschange', (e) => { if (e.detail && e.detail.key === 'mode') buildScene(); });
window.addEventListener('themechange', () => { applyTheme(); buildScene(); });
