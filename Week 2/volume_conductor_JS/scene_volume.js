// Section 01 · Three.js scene of the volume conductor, cut through the plane
// that contains the source. A fragment shader evaluates the model on every
// pixel: colour bands are isopotentials, drawn on the section and on the body
// surface, and the ink lines on the section are current streamlines, drawn
// as contours of the Stokes stream function. The near half of the upper
// surface is culled so the section is visible from any direction above it.
// Physics comes from VC (model.js). Electrodes A and B are dragged over the
// body surface.
//
// The head body is drawn on anatomical models: a head scan cut at the section
// plane, with a cortical surface inside it. The field is still the solution
// for concentric spheres; it is carried onto the anatomy by a radial map that
// sends the sphere's brain surface to the brain envelope and its skin to the
// scalp, along each direction from the source. The result is illustrative.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { guardWheel } from '../../components/orbit_wheel_guard.js';

const VC = window.VC, p = VC.p, R = VC.SURFACE_RADIUS;
const css = window.CMP.cssVar;
const host = document.getElementById('scene-volume');
const NS = 6;            // shell slots in the shader
const INK = window.T.hex('ink');

// ── Renderer, camera, controls ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.localClippingEnabled = true;   // used by the scalp cap of the head
host.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
host.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(window.T.sceneBg);

const camera = new THREE.PerspectiveCamera(40, 1, 1, 400);
const VIEW = new THREE.Vector3(Math.sin(0.78) * Math.cos(0.66), Math.sin(0.66), Math.cos(0.78) * Math.cos(0.66));
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.enablePan = false;
orbit.minDistance = 30;
orbit.maxDistance = 140;
orbit.minPolarAngle = 0.15;      // the camera stays above the section plane
orbit.maxPolarAngle = 1.1;       // and high enough that the side labels stay apart
guardWheel(orbit, renderer.domElement, document.getElementById('scene-hint'));

// ── Field shader ──
// In shell k, Phi = sum_l [A r^l + B r^-(l+1)] P_l(c), with the source
// weights folded into A and B. The stream function is
// psi = -sigma_k sum_l [l A r^(l+1) - (l+1) B r^-l] (P_(l-1) - P_(l+1)) / (2l+1),
// which is constant along a current streamline and zero on the body surface.
const VERT = `
varying vec3 vPos;
varying vec3 vNrm;
#ifdef USE_RS
attribute float aRs;
varying float vRs;
#endif
void main() {
#ifdef USE_RS
    vRs = aRs;
#endif
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPos = w.xyz;
    vNrm = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FRAG = `
precision highp float;
#define NS ${NS}
uniform vec3 uDir;
uniform float uStrength;
uniform int uN;
uniform float uRad[NS];
uniform float uSig[NS];
uniform float uA[4 * NS];
uniform float uB[4 * NS];
uniform float uLines;
uniform float uSurface;
uniform float uFixR;
uniform float uClip;
uniform float uShade;
uniform float uShells;
uniform float uPhi0;
uniform float uPsiMax;
uniform float uSrcR;
uniform vec3 uPos;
uniform vec3 uNeg;
uniform vec3 uInk;
varying vec3 vPos;
varying vec3 vNrm;
#ifdef USE_RS
varying float vRs;
#endif

float asinhf(float x) { return log(x + sqrt(x * x + 1.0)); }

void main() {
    if (uClip * vPos.y < 0.0) discard;
    // Model radius: the radius in the sphere model that this point stands
    // for. The polar angle always comes from the true direction.
    float len = max(length(vPos), 1e-3);
    float c = clamp(dot(vPos, uDir) / len, -1.0, 1.0);
#ifdef USE_RS
    float r = max(vRs, 1e-3);
#else
    float r = uFixR > 0.0 ? uFixR : len;
#endif
    int k = 0;
    for (int i = 0; i < NS - 1; i++) { if (i < uN - 1 && r > uRad[i]) k = i + 1; }

    float P[6];
    float c2 = c * c;
    P[0] = 1.0;
    P[1] = c;
    P[2] = 0.5 * (3.0 * c2 - 1.0);
    P[3] = 0.5 * (5.0 * c2 - 3.0) * c;
    P[4] = 0.125 * (35.0 * c2 * c2 - 30.0 * c2 + 3.0);
    P[5] = 0.125 * (63.0 * c2 * c2 - 70.0 * c2 + 15.0) * c;

    float phi = 0.0, psi = 0.0, rl = r;
    for (int l = 1; l <= 4; l++) {
        float A = uA[(l - 1) * NS + k], B = uB[(l - 1) * NS + k];
        float fl = float(l), rm = 1.0 / (rl * r);
        phi += (A * rl + B * rm) * P[l];
        psi += (fl * A * rl * r - (fl + 1.0) * B * rm * r) * (P[l - 1] - P[l + 1]) / (2.0 * fl + 1.0);
        rl *= r;
    }
    psi *= uSig[k];

    // Isopotential bands on a compressed (asinh) scale, white at zero.
    float u = clamp(asinhf(abs(uStrength * phi) / uPhi0) / asinhf(400.0), 0.0, 1.0);
    float t = u * 7.0 + 0.5;
    float lev = floor(t) - 1.0 + smoothstep(0.0, min(fwidth(t), 1.0), fract(t));
    vec3 col = mix(vec3(1.0), phi > 0.0 ? uPos : uNeg, clamp(lev / 7.0, 0.0, 1.0) * 0.88);

    if (uSurface < 0.5) {
        // Current streamlines: contours of the stream function.
        float g = sqrt(min(abs(psi) / uPsiMax, 4.0)) * uLines;
        float gw = max(fwidth(g), 1e-6);
        float n = floor(g + 0.5);
        float a = (n >= 1.0 && n <= uLines) ? 1.0 - smoothstep(0.3, 1.2, abs(g - n) / gw) : 0.0;
        a *= 1.0 - smoothstep(0.25, 0.5, gw);
        col = mix(col, uInk, 0.62 * a);
        // Tissue boundaries.
        if (uShells > 0.5) {
            float rw = max(fwidth(r), 1e-6);
            for (int i = 0; i < NS - 1; i++) {
                if (i < uN - 1) col = mix(col, uInk, 0.8 * (1.0 - smoothstep(0.2, 1.1, abs(r - uRad[i]) / rw)));
            }
        }
        // Source region: the multipole expansion holds only outside it.
        float rs = max(fwidth(r), 1e-6);
        col = mix(col, vec3(0.93), 1.0 - smoothstep(-0.5, 0.5, (r - uSrcR) / rs));
        col = mix(col, uInk, 0.8 * (1.0 - smoothstep(0.2, 1.1, abs(r - uSrcR) / rs)));
    } else {
        // Shading so the surface reads as a surface.
        col *= 1.0 - uShade + uShade * abs(dot(normalize(vNrm), normalize(cameraPosition - vPos)));
    }
    gl_FragColor = vec4(col, 1.0);
}`;

// Colours enter the shader as display (sRGB) values, without conversion.
function rgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255);
}
const shared = {
    uDir: { value: new THREE.Vector3(1, 0, 0) },
    uStrength: { value: 1 },
    uN: { value: 1 },
    uRad: { value: new Array(NS).fill(R) },
    uSig: { value: new Array(NS).fill(1) },
    uA: { value: new Array(4 * NS).fill(0) },
    uB: { value: new Array(4 * NS).fill(0) },
    uLines: { value: p.density },
    uShells: { value: 1 },
    uPhi0: { value: 0.5 / (R * R) },
    uPsiMax: { value: 0.5 },
    uSrcR: { value: 1 },
    uPos: { value: rgb(css('--c-pos')) },
    uNeg: { value: rgb(css('--c-neg')) },
    uInk: { value: rgb(window.T.c('ink')) }
};
// o: fixR (model radius of the whole surface), clip (+1 keeps y >= 0, -1
// keeps y <= 0), shade (shading depth), rs (per-vertex model radius aRs).
function fieldMaterial(surface, side, o) {
    o = o || {};
    return new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, side: side, defines: o.rs ? { USE_RS: '' } : {},
        uniforms: Object.assign({}, shared, {
            uSurface: { value: surface }, uFixR: { value: o.fixR || 0 },
            uClip: { value: o.clip || 0 }, uShade: { value: o.shade || 0.18 }
        })
    });
}

// ── Body: section disc, lower surface, and the far half of the upper surface ──
const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 160), fieldMaterial(0, THREE.DoubleSide));
disc.rotation.x = -Math.PI / 2;
const sphereBody = new THREE.Group();   // the spherical body; hidden while the anatomy is shown
scene.add(sphereBody);
sphereBody.add(disc);
const lower = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 48, 0, 2 * Math.PI, Math.PI / 2, Math.PI / 2),
    fieldMaterial(1, THREE.FrontSide));
const upper = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 48, 0, 2 * Math.PI, 0, Math.PI / 2),
    fieldMaterial(1, THREE.BackSide));
sphereBody.add(lower); sphereBody.add(upper);

function circlePts(radius, y, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
        const a = i / n * 2 * Math.PI;
        pts.push(new THREE.Vector3(radius * Math.cos(a), y, radius * Math.sin(a)));
    }
    return pts;
}
const inkLine = new THREE.LineBasicMaterial({ color: INK });
const rim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePts(R * 1.001, 0.02, 160)), inkLine);
sphereBody.add(rim);

// Faint outline of the culled near surface, so electrodes placed on it have
// a visible support. It lies just outside the surface, so the far wall hides
// the far half.
const ghostPts = [];
function ghostArc(fn, n) {
    for (let i = 0; i < n; i++) { ghostPts.push(fn(i / n), fn((i + 1) / n)); }
}
[Math.PI / 6, Math.PI / 3].forEach(function (lat) {
    ghostArc(function (t) {
        return new THREE.Vector3(Math.cos(lat) * Math.cos(2 * Math.PI * t), Math.sin(lat), Math.cos(lat) * Math.sin(2 * Math.PI * t)).multiplyScalar(R * 1.004);
    }, 96);
});
for (let m = 0; m < 8; m++) {
    const lon = m * Math.PI / 4;
    ghostArc(function (t) {
        const lat = t * Math.PI / 2;
        return new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).multiplyScalar(R * 1.004);
    }, 32);
}
const ghost = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ghostPts),
    new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.16 }));
sphereBody.add(ghost);

// ── Anatomical head (head body, layered view) ──
// sec holds the scalp radius and the brain-envelope radius in the section
// plane, one value per degree. toHead maps a model radius rs at in-plane
// angle a to the true radius; it is the identity while the sphere is shown.
const anatomy = new THREE.Group();
anatomy.visible = false;
scene.add(anatomy);
let sec = null, headPick = null, brainMesh = null, anat = false;
function secAt(arr, a) {
    const d = ((a * 180 / Math.PI) % 360 + 360) % 360, i = Math.floor(d), f = d - i;
    return arr[i % 360] * (1 - f) + arr[(i + 1) % 360] * f;
}
function scalpAt(a) { return anat ? secAt(sec.scalp, a) : R; }
function toHead(rs, a) {
    if (!anat) return rs;
    const rb = table.radii[0], B = secAt(sec.brain, a), S = secAt(sec.scalp, a);
    return rs <= rb ? B * rs / rb : B + (S - B) * (rs - rb) / (R - rb);
}
function buildAnatomy(headGeo, brainGeo) {
    const rb = VC.layers.find(function (l) { return l.key === 'brain'; }).radius;
    [headGeo, brainGeo].forEach(function (g) { g.computeVertexNormals(); });
    // Section: a fan to the brain envelope, then a strip to the scalp. The
    // model radius is linear along each ray within both, so it interpolates exactly.
    const pos = [0, 0, 0], rs = [0], idx = [], rimPts = [];
    for (let i = 0; i < 360; i++) {
        const a = i * Math.PI / 180, cx = Math.cos(a), cz = Math.sin(a);
        pos.push(sec.brain[i] * cx, 0, sec.brain[i] * cz, sec.scalp[i] * cx, 0, sec.scalp[i] * cz);
        rs.push(rb, R);
        rimPts.push(new THREE.Vector3(sec.scalp[i] * cx, 0.02, sec.scalp[i] * cz));
        const b0 = 1 + 2 * i, s0 = b0 + 1, b1 = 1 + 2 * ((i + 1) % 360), s1 = b1 + 1;
        idx.push(0, b1, b0, b0, b1, s1, b0, s1, s0);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    sg.setAttribute('aRs', new THREE.Float32BufferAttribute(rs, 1));
    sg.setIndex(idx);
    anatomy.add(new THREE.Mesh(sg, fieldMaterial(0, THREE.DoubleSide, { rs: true })));
    anatomy.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(rimPts), inkLine));
    // Scalp: the part below the section, and the far wall of the part above it.
    anatomy.add(new THREE.Mesh(headGeo, fieldMaterial(1, THREE.FrontSide, { fixR: R, clip: -1, shade: 0.45 })));
    anatomy.add(new THREE.Mesh(headGeo, fieldMaterial(1, THREE.BackSide, { fixR: R, clip: 1, shade: 0.3 })));
    // Cortex above the section, carrying the potential of the model brain surface.
    brainMesh = new THREE.Mesh(brainGeo, fieldMaterial(1, THREE.FrontSide, { fixR: rb, clip: 1, shade: 0.6 }));
    anatomy.add(brainMesh);
    // Faint cap over the near half of the upper scalp, which is otherwise not
    // drawn, so an electrode placed there has a visible support.
    anatomy.add(new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({
        color: INK, transparent: true, opacity: 0.07, depthWrite: false,
        clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)]
    })));
    headPick = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
    anatomy.add(headPick);
}
const loader = new GLTFLoader(), MODELS = new URL('./models/', import.meta.url);
function loadGeo(name) {
    return loader.loadAsync(new URL(name, MODELS).href).then(function (g) {
        let geo = null;
        g.scene.traverse(function (o) { if (o.isMesh && !geo) geo = o.geometry; });
        return geo;
    });
}
Promise.all([loadGeo('head.glb'), loadGeo('brain.glb'),
    fetch(new URL('head_section.json', MODELS)).then(function (r) { return r.json(); })
]).then(function (res) {
    sec = res[2];
    buildAnatomy(res[0], res[1]);
    rebuild();
    placeElectrodes();
});   // if the models fail to load, the head body stays on the sphere

// ── Labels ──
function label(text, cls) {
    const div = document.createElement('div');
    div.className = 's3-label' + (cls ? ' ' + cls : '');
    div.textContent = text;
    return new CSS2DObject(div);
}

// ── Source: dipole moment arrow in the section plane, with its poles ──
// frame rotates with the source; its +x axis is the dipole axis.
const frame = new THREE.Group();
scene.add(frame);
const src = new THREE.Group();
src.position.y = 0.3;
frame.add(src);
const inkFill = new THREE.MeshBasicMaterial({ color: INK });
// Drawn over everything, so the source stays visible under the cortex.
const srcFill = new THREE.MeshBasicMaterial({ color: INK, depthTest: false });
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.5, 16), srcFill);
shaft.rotation.z = -Math.PI / 2;
shaft.position.x = -0.45;
const head = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 20), srcFill);
shaft.renderOrder = head.renderOrder = 10;
head.rotation.z = -Math.PI / 2;
head.position.x = 1.25;
const plusLabel = label('+', 'pole'), minusLabel = label('−', 'pole');
plusLabel.position.set(2.9, 0, 0);
minusLabel.position.set(-2.9, 0, 0);
[shaft, head, plusLabel, minusLabel].forEach(function (o) { src.add(o); });

// ── Direction arrowheads on the streamlines, where they cross the equator ──
// They are found in the source frame of the sphere model and carried to the
// displayed body every frame, since the anatomy does not turn with the source.
const headMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.DoubleSide });
const HEAD_MAX = 64;
const headsGeo = new THREE.BufferGeometry();
headsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(HEAD_MAX * 9), 3));
const heads = new THREE.Mesh(headsGeo, headMat);
heads.frustumCulled = false;
scene.add(heads);
let headList = [];   // triangles as [x, z] vertex triples in the source frame

// Stream function per unit source strength at radius r, polar cosine c.
let table = VC.shellTable(true);
function psiAt(r, c) {
    let k = 0;
    while (k < table.radii.length - 1 && r > table.radii[k]) k++;
    const P = [1, c, 0.5 * (3 * c * c - 1), 0.5 * (5 * c * c - 3) * c,
        0.125 * (35 * c * c * c * c - 30 * c * c + 3), 0.125 * (63 * c * c * c * c - 70 * c * c + 15) * c];
    let psi = 0;
    for (let l = 1; l <= 4; l++) {
        const w = VC.multipoleWeight(l), A = w * table.AB[l - 1][k][0], B = w * table.AB[l - 1][k][1];
        psi += (l * A * Math.pow(r, l + 1) - (l + 1) * B * Math.pow(r, -l)) * (P[l - 1] - P[l + 1]) / (2 * l + 1);
    }
    return psi * table.sigma[k];
}

// Push the model into the shader and rebuild the arrowheads. Called when the
// layers, the body, the source weights, the view or the line count change.
function rebuild() {
    const layered = p.fields === 'rec';
    table = VC.shellTable(layered);
    const n = table.radii.length;
    shared.uN.value = n;
    for (let k = 0; k < NS; k++) {
        shared.uRad.value[k] = table.radii[Math.min(k, n - 1)];
        shared.uSig.value[k] = table.sigma[Math.min(k, n - 1)];
        for (let l = 1; l <= 4; l++) {
            const w = VC.multipoleWeight(l), ab = table.AB[l - 1][Math.min(k, n - 1)];
            shared.uA.value[(l - 1) * NS + k] = w * ab[0];
            shared.uB.value[(l - 1) * NS + k] = w * ab[1];
        }
    }
    // Source region radius d, and the innermost streamline: a dipole line
    // with psi = 1 / r0 crosses the equator at r0, set just outside d.
    const srcR = Math.max(p.complexity * R, 1);
    const psiMax = 1 / (srcR + 0.5);
    shared.uSrcR.value = srcR;
    shared.uPsiMax.value = psiMax;
    shared.uLines.value = p.density;
    shared.uShells.value = layered ? 1 : 0;
    lower.visible = upper.visible = layered;
    rim.material = layered ? inkLine : dashLine;
    // Anatomy replaces the sphere for the layered head, once its models are in.
    const was = anat;
    anat = !!sec && layered && p.body === 'head';
    anatomy.visible = anat;
    sphereBody.visible = !anat;
    if (brainMesh) brainMesh.visible = p.brain === 'on';
    if (anat !== was) {
        // The head hangs below the section plane: look lower and from
        // further back, along the present viewing direction.
        const dir = camera.position.clone().sub(orbit.target).normalize();
        orbit.target.set(0, anat ? -6.5 : 0, 0);
        camera.position.copy(orbit.target).addScaledVector(dir, baseDist * (anat ? 1.5 : 1));
        placeElectrodes();
    }

    // Arrowheads: one per streamline on each side of the source, skipping
    // lines closer than 0.9 units to the previous head.
    const G = function (r) { return Math.sqrt(Math.abs(psiAt(r, 0)) / psiMax) * p.density; };
    const field = layered ? VC.recField : VC.trueField;
    headList = [];
    let prev = G(srcR + 0.1), lastR = -10;
    for (let r = srcR + 0.12; r < R - 0.3 && headList.length < HEAD_MAX - 1; r += 0.02) {
        const g = G(r), lev = Math.round(g);
        if (lev >= 1 && lev <= p.density && (prev - lev) * (g - lev) <= 0 && prev !== g && r - lastR > 0.9) {
            lastR = r;
            [1, -1].forEach(function (side) {
                const f = field([0, 0, 0], [1, 0, 0], [0, 0, side * r], 1), m = Math.hypot(f[0], f[2]);
                if (m < 1e-12) return;
                const dx = f[0] / m, dz = f[2] / m, z = side * r;
                headList.push([[0.55 * dx, z + 0.55 * dz],
                    [-0.35 * dx - 0.3 * dz, z - 0.35 * dz + 0.3 * dx],
                    [-0.35 * dx + 0.3 * dz, z - 0.35 * dz - 0.3 * dx]]);
            });
        }
        prev = g;
    }
    syncTissueLabels();
}
// Without a boundary the rim only marks the electrode radius: dashed.
const dashLine = new THREE.LineDashedMaterial({ color: INK, dashSize: 0.7, gapSize: 0.5 });
rim.computeLineDistances();

// ── Tissue labels: a fan of radial leaders on the side of the section,
// turned with the camera so the labels never pass behind the body ──
const leaderMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.7 });
const dotGeo = new THREE.CircleGeometry(0.2, 16);
const tissue = [];
for (let i = 0; i < NS; i++) {
    const lab = label('', 'tag');
    lab.center.set(1, 0.5);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), leaderMat);
    const dot = new THREE.Mesh(dotGeo, inkFill);
    dot.rotation.x = -Math.PI / 2;
    [lab, line, dot].forEach(function (o) { scene.add(o); });
    tissue.push({ lab: lab, line: line, dot: dot, mid: 0, on: false });
}
const outside = label('', 'tag');
outside.center.set(0, 0.5);
scene.add(outside);

function syncTissueLabels() {
    const layered = p.fields === 'rec', act = VC.bodyLayers();
    let r0 = 0;
    tissue.forEach(function (t, i) {
        const a = act[i];
        t.on = layered && !!a && a.layer.enabled;
        if (a) {
            t.mid = (r0 + a.radius) / 2; r0 = a.radius;
            t.lab.element.textContent = a.layer.name;
        }
        t.lab.visible = t.line.visible = t.dot.visible = t.on;
    });
    outside.element.textContent = layered ? 'Air, σ = 0' : 'No boundary';
}
function placeTissueLabels() {
    const az = Math.atan2(camera.position.z, camera.position.x);
    const on = tissue.filter(function (t) { return t.on; });
    on.forEach(function (t, i) {
        const a = az + Math.PI / 2 + (i - (on.length - 1) / 2) * 0.27, cx = Math.cos(a), cz = Math.sin(a);
        const mid = toHead(t.mid, a), edge = scalpAt(a);
        t.dot.position.set(mid * cx, 0.06, mid * cz);
        const pos = t.line.geometry.attributes.position;
        pos.setXYZ(0, mid * cx, 0.06, mid * cz);
        pos.setXYZ(1, (edge + 3.0) * cx, 0.06, (edge + 3.0) * cz);
        pos.needsUpdate = true;
        t.lab.position.set((edge + 3.3) * cx, 0, (edge + 3.3) * cz);
    });
    const ao = az - Math.PI / 2, ro = scalpAt(ao) + 1.6;
    outside.position.set(ro * Math.cos(ao), 0, ro * Math.sin(ao));
}

// ── Electrodes: discs tangent to the body surface, dragged over it ──
const discGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.35, 32);
const els = VC.electrodes.map(function (e) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(discGeo, inkFill);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1.7, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    const lab = label(e.label, 'tag electrode');
    lab.center.set(0.5, 1.5);   // above the disc on screen, whatever the view
    [body, hit, lab].forEach(function (o) { g.add(o); });
    scene.add(g);
    return { e: e, group: g, hit: hit };
});
const UP = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(), ORIGIN = new THREE.Vector3();
const probe = new THREE.Raycaster();
// An electrode is stored as a point of the model sphere. On the anatomy it
// is drawn where the same direction from the source meets the scalp.
function placeElectrodes() {
    els.forEach(function (o) {
        tmp.set(o.e.pos[0], o.e.pos[1], o.e.pos[2]).normalize();
        let dist = R, nrm = tmp;
        if (anat) {
            probe.set(ORIGIN, tmp);
            const hits = probe.intersectObject(headPick, false);
            if (hits.length) {
                const h = hits[hits.length - 1];
                dist = h.distance;
                nrm = h.face.normal.clone();
                if (nrm.dot(tmp) < 0) nrm.negate();
            }
        }
        o.group.quaternion.setFromUnitVectors(UP, nrm);
        o.group.position.copy(tmp).multiplyScalar(dist + 0.15);
    });
}

// Point of the body surface under a ray, as a point of the model sphere: the
// nearest surface point, including the near half of the upper surface that
// is not drawn, so an electrode can be moved over the whole body.
function surfacePoint(ray) {
    if (anat) {
        probe.set(ray.origin, ray.direction);
        const hits = probe.intersectObject(headPick, false);
        return hits.length ? hits[0].point.clone().setLength(R) : null;
    }
    const o = ray.origin, d = ray.direction, b = o.dot(d), disc2 = b * b - (o.lengthSq() - R * R);
    if (disc2 < 0) return o.clone().addScaledVector(d, -b).setLength(R);
    return o.clone().addScaledVector(d, -b - Math.sqrt(disc2));
}

const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
let dragging = null;
function aim(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
}
function electrodeUnder(ev) {
    aim(ev);
    const hits = raycaster.intersectObjects(els.map(function (o) { return o.hit; }), false);
    return hits.length ? els.find(function (o) { return o.hit === hits[0].object; }) : null;
}
// Capture phase, so the orbit controls do not also start a rotation.
renderer.domElement.addEventListener('pointerdown', function (ev) {
    dragging = electrodeUnder(ev);
    if (dragging) { orbit.enabled = false; renderer.domElement.style.cursor = 'grabbing'; }
}, true);
renderer.domElement.addEventListener('pointermove', function (ev) {
    if (!dragging) { renderer.domElement.style.cursor = electrodeUnder(ev) ? 'grab' : ''; return; }
    aim(ev);
    const pt = surfacePoint(raycaster.ray);
    if (!pt) return;
    dragging.e.pos = [pt.x, pt.y, pt.z];   // the lead trace continues from the new position
    placeElectrodes();
});
window.addEventListener('pointerup', function () {
    if (!dragging) return;
    dragging = null; orbit.enabled = true; renderer.domElement.style.cursor = '';
});

// ── Per-frame update ──
const outs = {};
['va', 'vb', 'vab'].forEach(function (k) { outs[k] = document.querySelector('[data-out="' + k + '"]'); });
function fmt(v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(3); }

function draw(S) {
    orbit.update();
    const a = Math.atan2(S.dir[2], S.dir[0]);
    frame.rotation.y = -a;
    shared.uDir.value.set(S.dir[0], S.dir[1], S.dir[2]);
    shared.uStrength.value = S.strength;
    // Arrow length follows the instantaneous dipole moment (ECG, EEG).
    const k = Math.sqrt(Math.min(1, S.strength / Math.max(p.strength, 1e-6)));
    src.visible = k > 0.05;
    src.scale.setScalar(Math.max(k, 0.05));
    plusLabel.visible = minusLabel.visible = k > 0.4;   // the poles would collide on a short arrow
    placeTissueLabels();
    const hp = headsGeo.attributes.position, ca = Math.cos(a), sa = Math.sin(a);
    headList.forEach(function (tri, i) {
        tri.forEach(function (q, j) {
            const x = q[0] * ca - q[1] * sa, z = q[0] * sa + q[1] * ca, r = Math.hypot(x, z);
            const k2 = toHead(r, Math.atan2(z, x)) / r;
            hp.setXYZ(i * 3 + j, x * k2, 0.05, z * k2);
        });
    });
    hp.needsUpdate = true;
    headsGeo.setDrawRange(0, headList.length * 3);

    const v = VC.potentials(S), j = p.fields === 'rec' ? 1 : 0;
    const text = { va: fmt(v[0][j]), vb: fmt(v[1][j]), vab: fmt(v[0][j] - v[1][j]) };
    Object.keys(text).forEach(function (key) {
        if (outs[key] && outs[key].textContent !== text[key]) outs[key].textContent = text[key];
    });
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

let framed = false, baseDist = 60;
function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    labelRenderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    // The picture is shifted down so the body clears the lead plot inset in
    // the top right corner.
    camera.setViewOffset(r.width, r.height, 0, -Math.round(r.height * 0.1), r.width, r.height);
    if (!framed) {
        // Far enough that the body and its side labels (about 150 px of
        // text) fit the box width.
        framed = true;
        const ppu = Math.max((r.width / 2 - 150) / (R + 3.3), 1);
        baseDist = Math.min(85, Math.max(50, r.height / 2 / (Math.tan(Math.PI / 9) * ppu)));
        camera.position.copy(orbit.target).addScaledVector(VIEW, baseDist * (anat ? 1.5 : 1));
    }
    draw(VC.state());
}

placeElectrodes();
rebuild();
new ResizeObserver(resize).observe(host);
VC.addView(host, draw);

window.addEventListener('vcchange', function (ev) {
    const k = ev.detail && ev.detail.key;
    if (k === 'electrodes') placeElectrodes();
    if (k === 'layers' || k === 'fields' || k === 'density' || k === 'complexity' || k === 'brain') rebuild();
    draw(VC.state());
});
