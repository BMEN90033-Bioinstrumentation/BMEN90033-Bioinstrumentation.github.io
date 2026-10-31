// Section 01 · Three.js view of the occupied orbitals as Monte Carlo point
// clouds drawn from r^2 |psi|^2, with optional marching-cubes isosurfaces, a
// z clipping plane and psi-sign colouring. A small fraction of points is
// resampled every frame so the cloud shimmers. Physics comes from EO.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const EO = window.EO, p = EO.p;
const css = window.CMP.cssVar;
const host = document.getElementById('scene-orbitals');
const loading = document.getElementById('orb-loading');
const RESAMPLE_FRACTION = 0.02;   // fraction of points resampled per frame

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.localClippingEnabled = true;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(0, 0, 15);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.addEventListener('start', function () { controls.autoRotate = false; });

const nucleusMat = new THREE.MeshBasicMaterial();
scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), nucleusMat));
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// Clipping plane z = constant; the slider maps 0..100 to -15..15.
const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
function planes() { return p.clip ? [clipPlane] : []; }

const clouds = {};      // key -> THREE.Points
const isos = {};        // key -> THREE.Mesh
const isoGeoCache = {}; // key_Zeff -> BufferGeometry

// ── Theme-dependent colours. The light theme darkens the orbital colour and
// uses normal blending, since additive blending vanishes on a light ground. ──
const dark = function () { return window.T.isDark; };
function baseColour(key) {
    const c = new THREE.Color(css('--c-o-' + key));
    if (!dark()) c.offsetHSL(0, 0.1, -0.22);
    return c;
}
let posC = new THREE.Color(), negC = new THREE.Color();
function readSignColours() { posC = new THREE.Color(css('--c-pos')); negC = new THREE.Color(css('--c-neg')); }

function paint(cloud) {
    const key = cloud.userData.key, sign = cloud.geometry.getAttribute('sign');
    const col = cloud.geometry.getAttribute('color'), base = baseColour(key);
    for (let i = 0; i < sign.count; i++) {
        const c = p.sign ? (sign.array[i] > 0 ? posC : negC) : base;
        col.array[i * 3] = c.r; col.array[i * 3 + 1] = c.g; col.array[i * 3 + 2] = c.b;
    }
    col.needsUpdate = true;
    cloud.material.blending = dark() ? THREE.AdditiveBlending : THREE.NormalBlending;
    cloud.material.needsUpdate = true;
}

function makeCloud(key, Zeff, numPoints) {
    const d = EO.ORBITAL_DEFS[key];
    const s = EO.sampleOrbital(d.n, d.l, d.m, Zeff, numPoints);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(s.positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(s.densities, 1));
    geo.setAttribute('sign', new THREE.BufferAttribute(s.signs, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(numPoints * 3), 3));
    const mat = new THREE.PointsMaterial({
        vertexColors: true, size: 0.08, transparent: true, opacity: p.opacity / 100,
        sizeAttenuation: true, depthWrite: false, clippingPlanes: planes()
    });
    const pts = new THREE.Points(geo, mat);
    pts.userData = { key: key, n: d.n, l: d.l, m: d.m, Zeff: Zeff, rMax: s.rMax, maxDensity: s.maxDensity };
    paint(pts);
    return pts;
}

function makeIso(key, Zeff) {
    const ck = key + '_' + Zeff;
    if (!isoGeoCache[ck]) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(EO.isosurfaceVertices(key, Zeff), 3));
        geo.computeVertexNormals();
        isoGeoCache[ck] = geo;
    }
    const mesh = new THREE.Mesh(isoGeoCache[ck], new THREE.MeshPhysicalMaterial({
        color: baseColour(key), transparent: true, opacity: 0.15, side: THREE.DoubleSide,
        wireframe: p.wire, depthWrite: false, clippingPlanes: planes()
    }));
    mesh.userData.key = key;
    return mesh;
}

function clearAll() {
    Object.keys(clouds).forEach(function (k) {
        scene.remove(clouds[k]); clouds[k].geometry.dispose(); clouds[k].material.dispose(); delete clouds[k];
    });
    Object.keys(isos).forEach(function (k) { scene.remove(isos[k]); isos[k].material.dispose(); delete isos[k]; });
}

function ensureIsos() {
    if (!p.iso) return;
    p.config.forEach(function (o) {
        if (isos[o.key]) return;
        isos[o.key] = makeIso(o.key, o.Zeff);
        scene.add(isos[o.key]);
    });
}

// Opacity per orbital. With log brightness, concentrated inner orbitals
// (small n^2 / Zeff) are dimmed and diffuse outer ones brightened, on a log
// scale from 0.15 to 0.9, so that additive blending does not saturate.
function updateVisibility() {
    const base = p.opacity / 100, map = {};
    if (p.logb && p.config.length) {
        const spreads = p.config.map(function (o) {
            const d = EO.ORBITAL_DEFS[o.key];
            return { key: o.key, spread: d.n * d.n / o.Zeff };
        });
        const lo = Math.log(Math.min.apply(null, spreads.map(function (s) { return s.spread; })) + 1e-10);
        const hi = Math.log(Math.max.apply(null, spreads.map(function (s) { return s.spread; })) + 1e-10);
        spreads.forEach(function (s) {
            const t = hi > lo ? (Math.log(s.spread + 1e-10) - lo) / (hi - lo) : 1;
            map[s.key] = 0.15 + t * 0.75;
        });
    }
    Object.keys(clouds).forEach(function (k) {
        clouds[k].visible = p.points && p.visible.has(k);
        clouds[k].material.opacity = p.logb && map[k] !== undefined ? map[k] * (base / 0.7) : base;
    });
    Object.keys(isos).forEach(function (k) { isos[k].visible = p.iso && p.visible.has(k); });
}

// ── Regeneration with a 300 ms cross-fade. A newer request supersedes an
// older one still sampling. ──
let token = 0;
function fade(from, to) {
    const keys = Object.keys(clouds), t0 = performance.now(), base = p.opacity / 100;
    return new Promise(function (resolve) {
        if (!keys.length) { resolve(); return; }
        (function step() {
            const t = Math.min((performance.now() - t0) / 300, 1), k = from + (to - from) * t;
            keys.forEach(function (key) { if (clouds[key]) clouds[key].material.opacity = base * k; });
            Object.keys(isos).forEach(function (key) { isos[key].material.opacity = 0.15 * k; });
            renderer.render(scene, camera);
            if (t < 1) requestAnimationFrame(step); else resolve();
        })();
    });
}
async function regenerate(withFade) {
    const my = ++token;
    if (withFade) await fade(1, 0);
    if (my !== token) return;
    clearAll();
    loading.classList.add('on');
    for (let i = 0; i < p.config.length; i++) {
        const o = p.config[i];
        loading.textContent = 'sampling ' + o.key + ' (' + (i + 1) + '/' + p.config.length + ')';
        await new Promise(function (r) { setTimeout(r, 10); });
        if (my !== token) return;
        // Points scale with occupancy: 2 electrons full, 1 electron half.
        const c = makeCloud(o.key, o.Zeff, Math.round(p.density * (o.electrons / 2)));
        clouds[o.key] = c;
        scene.add(c);
    }
    ensureIsos();
    loading.classList.remove('on');
    updateVisibility();
    if (withFade) { await fade(0, 1); updateVisibility(); }
}

// ── Per-frame shimmer: resample 2 % of each visible cloud ──
function animateCloud() {
    Object.keys(clouds).forEach(function (key) {
        const cloud = clouds[key];
        if (!cloud.visible) return;
        const u = cloud.userData, pos = cloud.geometry.getAttribute('position'), sign = cloud.geometry.getAttribute('sign');
        const col = cloud.geometry.getAttribute('color'), count = pos.count;
        const k = Math.max(1, Math.floor(count * RESAMPLE_FRACTION));
        for (let j = 0; j < k; j++) {
            const idx = Math.floor(Math.random() * count), s = EO.samplePoint(u.n, u.l, u.m, u.Zeff, u.rMax, u.maxDensity);
            pos.array[idx * 3] = s[0]; pos.array[idx * 3 + 1] = s[1]; pos.array[idx * 3 + 2] = s[2];
            sign.array[idx] = s[4];
            if (p.sign) {
                const c = s[4] > 0 ? posC : negC;
                col.array[idx * 3] = c.r; col.array[idx * 3 + 1] = c.g; col.array[idx * 3 + 2] = c.b;
            }
        }
        pos.needsUpdate = true;
        sign.needsUpdate = true;
        if (p.sign) col.needsUpdate = true;
    });
}

function applyTheme() {
    scene.background = new THREE.Color(window.T.sceneBg);
    nucleusMat.color.set(css('--c-nucleus'));
    readSignColours();
    Object.keys(clouds).forEach(function (k) { paint(clouds[k]); });
    Object.keys(isos).forEach(function (k) { isos[k].material.color.copy(baseColour(k)); });
}

let raf = 0;
function frame() {
    raf = requestAnimationFrame(frame);
    animateCloud();
    controls.update();
    renderer.render(scene, camera);
}
function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
}

applyTheme();
new ResizeObserver(resize).observe(host);
new IntersectionObserver(function (es) {
    es.forEach(function (e) {
        if (e.isIntersecting && !raf) raf = requestAnimationFrame(frame);
        else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    });
}, { threshold: 0.05 }).observe(host);
regenerate(false);

window.addEventListener('themechange', applyTheme);
window.addEventListener('eochange', function (e) {
    const k = e.detail && e.detail.key;
    if (k === 'element') {
        camera.position.set(0, 0, EO.CAMERA_DIST[p.element] || 10);
        regenerate(true);
    } else if (k === 'config') {
        regenerate(true);
    } else if (k === 'density') {
        regenerate(false);
    } else if (k === 'sign') {
        Object.keys(clouds).forEach(function (key) { paint(clouds[key]); });
    } else if (k === 'iso') {
        ensureIsos(); updateVisibility();
    } else if (k === 'wire') {
        Object.keys(isos).forEach(function (key) { isos[key].material.wireframe = p.wire; });
    } else if (k === 'clip') {
        Object.keys(clouds).forEach(function (key) { clouds[key].material.clippingPlanes = planes(); });
        Object.keys(isos).forEach(function (key) { isos[key].material.clippingPlanes = planes(); });
    } else if (k === 'clipPos') {
        clipPlane.constant = p.clipPos / 100 * 30 - 15;
    } else {
        updateVisibility();
    }
});
