// Section 01 · Three.js membrane patch: lipid bilayer cross-section, a
// voltage-gated Na+ channel (subunits follow m, inactivation ball follows h),
// a K+ channel (subunits follow n), an illustrative Na+/K+ pump, and Na+ and
// K+ particles. Particles cross at the rate set by the model (BIO.pending):
// passive flux (channel and leak) at the channel of each ion, and pump flux
// (3 Na+ out, 2 K+ in per cycle) through the pump. Ported from the original
// simulator; colours come from the page CSS.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { guardWheel } from '../../components/orbit_wheel_guard.js';

const B = window.BIO, HH = B.HH;
const host = document.getElementById('bio-three');
const css = (n) => window.CMP.cssVar(n);
const col = (n) => new THREE.Color(css(n));

const VIS = {
    scene: null, camera: null, renderer: null, controls: null,
    time: 0,
    lastMoved: { naIn: 0, naOut: 0, kIn: 0, kOut: 0 },   // transports started this rendered frame
    ions: { na: null, k: null },     // InstancedMeshes
    ionData: { na: [], k: [] },
    channels: { na: null, k: null, pump: null },
    mats: {},

    bounds: { x: 25, yTop: 15, yBot: -15, z: 5 },

    // Ion transport / diffusion tuning (visual, not biophysical units)
    fluxCfg: {
        mouthY: 2.2,
        captureRadius: 9.0,
        attractRadius: 12.0,
        maxPerFrame: 28,
        poreSpeed: 0.10,
        poreSpeedJitter: 0.06,
        lateralWiggle: 0.9,
        exitSpread: 4.0,
        exitSpeed: 0.30,
        brownian: 0.008,
        damping: 0.995,
        maxSpeed: 0.35
    },

    channelX: { na: -10, k: 10, pump: 0 },

    init: function () {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(window.T.sceneBg);
        this.scene.fog = new THREE.FogExp2(window.T.sceneBg, 0.02);

        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        this.camera.position.set(0, 5, 45);   // side view
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        host.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 0, 0);
        this.controls.minDistance = 15;
        this.controls.maxDistance = 90;
        guardWheel(this.controls, this.renderer.domElement, host.parentElement.querySelector('.hint'));

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.1));
        const topLight = new THREE.DirectionalLight(0xffffff, 1);
        topLight.position.set(5, 20, 10);
        this.scene.add(topLight);
        const botLight = new THREE.DirectionalLight(0x3b82f6, 0.5);   // blue tint from inside
        botLight.position.set(-5, -20, 10);
        this.scene.add(botLight);
        const rimLight = new THREE.SpotLight(0x00ccff, 2);
        rimLight.position.set(30, 0, 0);
        rimLight.lookAt(0, 0, 0);
        this.scene.add(rimLight);

        this.buildMembrane();
        this.buildChannels();
        this.buildIons();

        new ResizeObserver(() => this.resize()).observe(host);
        this.resize();
    },

    resize: function () {
        const r = host.getBoundingClientRect();
        if (!r.width || !r.height) return;
        this.camera.aspect = r.width / r.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(r.width, r.height);
    },

    buildMembrane: function () {
        // Bilayer cross-section: head groups at y = +1.8 and -1.8, gaps left
        // for the Na channel (x = -10), pump (x = 0) and K channel (x = 10).
        const headGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1 });
        this.mats.lipid = headMat;
        const dummy = new THREE.Object3D();
        const isGap = (x) => Math.abs(x + 10) < 3 || Math.abs(x) < 4 || Math.abs(x - 10) < 3;
        const mesh = new THREE.InstancedMesh(headGeo, headMat, 5000);
        let idx = 0;
        for (let x = -28; x <= 28; x += 1.0) {
            for (let z = -6; z <= 6; z += 1.0) {
                if (isGap(x)) continue;
                const jx = (Math.random() - 0.5) * 0.3;
                const jz = (Math.random() - 0.5) * 0.3;
                const jy = (Math.random() - 0.5) * 0.1;
                dummy.position.set(x + jx, 1.8 + jy, z + jz);
                dummy.updateMatrix();
                mesh.setMatrixAt(idx++, dummy.matrix);
                dummy.position.set(x + jx, -1.8 + jy, z + jz);
                dummy.updateMatrix();
                mesh.setMatrixAt(idx++, dummy.matrix);
            }
        }
        mesh.count = idx;
        this.scene.add(mesh);

        const tailMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3 });
        this.mats.tail = tailMat;
        this.scene.add(new THREE.Mesh(new THREE.BoxGeometry(60, 3.0, 12), tailMat));
    },

    buildChannels: function () {
        const geo = new THREE.CapsuleGeometry(0.8, 4, 4, 16);

        // Na channel (x = -10): four subunits and a ball-and-chain inactivation gate.
        {
            const group = new THREE.Group();
            group.position.set(-10, 0, 0);
            const mat = new THREE.MeshStandardMaterial({ roughness: 0.2 });
            this.mats.nachan = mat;
            const subunits = [];
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
                const pivot = new THREE.Group();
                pivot.position.set(Math.cos(angle) * 1.2, 0, Math.sin(angle) * 1.2);
                pivot.lookAt(0, 0, 0);
                pivot.add(new THREE.Mesh(geo, mat));
                group.add(pivot);
                subunits.push(pivot);
            }
            const gateMat = new THREE.MeshStandardMaterial();
            this.mats.gate = gateMat;
            const gate = new THREE.Mesh(new THREE.SphereGeometry(1.2), gateMat);
            gate.position.set(0, -3.5, 0);   // intracellular side
            group.add(gate);
            this.scene.add(group);
            this.channels.na = { subunits, gate };
        }

        // K channel (x = 10): four subunits.
        {
            const group = new THREE.Group();
            group.position.set(10, 0, 0);
            const mat = new THREE.MeshStandardMaterial({ roughness: 0.2 });
            this.mats.kchan = mat;
            const subunits = [];
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const pivot = new THREE.Group();
                pivot.position.set(Math.cos(angle) * 1.2, 0, Math.sin(angle) * 1.2);
                pivot.lookAt(0, 0, 0);
                pivot.add(new THREE.Mesh(geo, mat));
                group.add(pivot);
                subunits.push(pivot);
            }
            this.scene.add(group);
            this.channels.k = { subunits };
        }

        // Na/K pump (x = 0): body and two moving gates.
        {
            const group = new THREE.Group();
            const mat = new THREE.MeshStandardMaterial({ roughness: 0.4 });
            this.mats.pump = mat;
            group.add(new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 5, 8), mat));
            const top = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 4), mat);
            top.position.y = 2.5;
            const bot = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 4), mat);
            bot.position.y = -2.5;
            group.add(top, bot);
            this.scene.add(group);
            this.channels.pump = { top, bot };
        }
    },

    buildIons: function () {
        const naCount = 2000, kCount = 2000;
        this.mats.na = new THREE.MeshBasicMaterial();
        this.mats.k = new THREE.MeshBasicMaterial();
        this.ions.na = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 8), this.mats.na, naCount);
        this.ions.k = new THREE.InstancedMesh(new THREE.SphereGeometry(0.25, 8, 8), this.mats.k, kCount);
        this.scene.add(this.ions.na, this.ions.k);

        const dummy = new THREE.Object3D();
        const getPos = (isTop) => new THREE.Vector3(
            (Math.random() - 0.5) * 50,
            isTop ? 3.5 + Math.random() * 12 : -3.5 - Math.random() * 12,   // keep clear of the membrane
            (Math.random() - 0.5) * 10
        );
        const seed = (type, count, pOut) => {
            for (let i = 0; i < count; i++) {
                const isOut = i < Math.round(count * pOut);   // exact compartment split
                const pos = getPos(isOut);
                dummy.position.copy(pos);
                dummy.updateMatrix();
                this.ions[type].setMatrixAt(i, dummy.matrix);
                this.ionData[type].push({
                    pos: pos.clone(),
                    vel: new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1),
                    region: isOut ? 'out' : 'in', mode: 'free', pore: null
                });
            }
        };
        // Split in proportion to the concentrations (equal compartment volumes).
        seed('na', naCount, B.frac.na);
        seed('k', kCount, B.frac.k);
    },

    recolour: function () {
        this.scene.background = new THREE.Color(window.T.sceneBg);
        this.scene.fog.color.set(window.T.sceneBg);
        [['lipid', '--c-lipid'], ['tail', '--c-tail'], ['nachan', '--c-nachan'], ['gate', '--c-gate'],
         ['kchan', '--c-kchan'], ['pump', '--c-pump'], ['na', '--c-na'], ['k', '--c-k']]
            .forEach(([m, v]) => this.mats[m].color.copy(col(v)));
    },

    update: function () {
        this.time += 0.05;
        this.controls.update();
        this.animateChannels();
        this.animatePump();
        this.animateIons();
        this.renderer.render(this.scene, this.camera);
    },

    animateChannels: function () {
        const m = HH.m, h = HH.h, n = HH.n;
        this.channels.na.subunits.forEach((grp) => { grp.children[0].rotation.x = 0.5 * (1 - m); });
        // Inactivation ball swings into the blocked position as h falls.
        const ballTarget = new THREE.Vector3(0, -2.0, 0).lerp(new THREE.Vector3(3, -5, 1), h);
        this.channels.na.gate.position.lerp(ballTarget, 0.1);
        this.channels.k.subunits.forEach((grp) => { grp.children[0].rotation.x = -0.8 * n; });
    },

    animatePump: function () {
        // Visual only: the pump moves no ions, so the only transmembrane flux
        // is the flux implied by the HH currents.
        const phase = Math.sin(this.time * 2);
        this.channels.pump.top.position.y = 2.5 + (phase > 0 ? 0.8 * phase : 0);
        this.channels.pump.bot.position.y = -2.5 - (phase < 0 ? 0.8 * -phase : 0);
    },

    animateIons: function () {
        const dummy = new THREE.Object3D();
        const gNa_val = HH.g_Na * Math.pow(HH.m, 3) * HH.h;
        const gK_val = HH.g_K * Math.pow(HH.n, 4);
        const naOpen = THREE.MathUtils.clamp(gNa_val / HH.g_Na, 0, 1);
        const kOpen = THREE.MathUtils.clamp(gK_val / HH.g_K, 0, 1);

        // HH convention: INa < 0 is an inward Na current.
        const naFrom = HH.INa < 0 ? 'out' : 'in';
        const kFrom = HH.IK > 0 ? 'in' : 'out';
        const L = this.lastMoved;
        L.naIn = L.naOut = L.kIn = L.kOut = 0;
        const tally = (type, n) => {
            if (type === 'na') { if (n > 0) L.naIn += n; else L.naOut -= n; }
            else { if (n > 0) L.kIn += n; else L.kOut -= n; }
        };
        tally('na', this.fulfillPending('na', this.channelX.na, 'passive'));
        tally('k', this.fulfillPending('k', this.channelX.k, 'passive'));
        tally('na', this.fulfillPending('na', this.channelX.pump, 'pump'));
        tally('k', this.fulfillPending('k', this.channelX.pump, 'pump'));

        const run = (type, xCh, from, open) => {
            const list = this.ionData[type];
            for (let i = 0; i < list.length; i++) {
                const p = list[i];
                if (p.mode === 'pore') {
                    this.updatePoreMotion(p);
                } else {
                    this.applyBrownian(p);
                    this.applyChannelAttraction(p, xCh, from, open);
                    p.pos.add(p.vel);
                    if (p.pos.y > this.bounds.yTop) p.vel.y *= -1;
                    if (p.pos.y < this.bounds.yBot) p.vel.y *= -1;
                    if (Math.abs(p.pos.x) > this.bounds.x) p.vel.x *= -1;
                    if (Math.abs(p.pos.z) > this.bounds.z) p.vel.z *= -1;
                    // Membrane collision, except at this ion's channel and the pump.
                    if (p.region === 'out' && p.pos.y < 2 && Math.abs(p.pos.x - xCh) > 2.5 && Math.abs(p.pos.x) > 2.5) {
                        p.pos.y = 2; p.vel.y = Math.abs(p.vel.y);
                    }
                    if (p.region === 'in' && p.pos.y > -2 && Math.abs(p.pos.x - xCh) > 2.5 && Math.abs(p.pos.x) > 2.5) {
                        p.pos.y = -2; p.vel.y = -Math.abs(p.vel.y);
                    }
                }
                dummy.position.copy(p.pos);
                dummy.updateMatrix();
                this.ions[type].setMatrixAt(i, dummy.matrix);
            }
            this.ions[type].instanceMatrix.needsUpdate = true;
        };
        run('na', this.channelX.na, naFrom, naOpen);
        run('k', this.channelX.k, kFrom, kOpen);
    },

    easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),

    limitSpeed: function (v, maxSpeed) {
        if (v.lengthSq() > maxSpeed * maxSpeed) v.setLength(maxSpeed);
    },

    applyBrownian: function (p) {
        const cfg = this.fluxCfg;
        p.vel.x += (Math.random() - 0.5) * cfg.brownian;
        p.vel.y += (Math.random() - 0.5) * cfg.brownian;
        p.vel.z += (Math.random() - 0.5) * cfg.brownian;
        p.vel.multiplyScalar(cfg.damping);
        this.limitSpeed(p.vel, cfg.maxSpeed);
    },

    applyChannelAttraction: function (p, xLoc, fromReg, openFactor) {
        if (p.mode !== 'free' || p.region !== fromReg || openFactor < 0.02) return;
        const cfg = this.fluxCfg;
        if (fromReg === 'out' && p.pos.y < cfg.mouthY + 1.0) return;
        if (fromReg === 'in' && p.pos.y > -cfg.mouthY - 1.0) return;
        const dx = xLoc - p.pos.x, dz = -p.pos.z;
        const d2 = dx * dx + dz * dz, r = cfg.attractRadius;
        if (d2 > r * r) return;
        const d = Math.sqrt(d2) + 1e-6;
        const s = openFactor * (1 - d / r);
        p.vel.x += (dx / d) * 0.020 * s;
        p.vel.z += (dz / d) * 0.020 * s;
        const entryY = fromReg === 'out' ? cfg.mouthY : -cfg.mouthY;
        p.vel.y += (entryY - p.pos.y) * 0.010 * s;
        this.limitSpeed(p.vel, cfg.maxSpeed);
    },

    startPoreTransport: function (p, fromReg, toReg, xLoc) {
        const cfg = this.fluxCfg;
        p.mode = 'pore';
        p.pore = {
            toReg, t: 0,
            speed: cfg.poreSpeed + Math.random() * cfg.poreSpeedJitter,
            centerX: xLoc + (Math.random() - 0.5) * 0.8,
            centerZ: (Math.random() - 0.5) * 0.8,
            entryY: fromReg === 'out' ? cfg.mouthY : -cfg.mouthY,
            exitY: toReg === 'out' ? cfg.mouthY : -cfg.mouthY,
            swirlPhase: Math.random() * Math.PI * 2,
            swirlAmp: cfg.lateralWiggle * (0.5 + Math.random() * 0.6)
        };
        p.vel.set(0, 0, 0);
    },

    updatePoreMotion: function (p) {
        const cfg = this.fluxCfg, pr = p.pore;
        if (!pr) { p.mode = 'free'; return; }
        pr.t = Math.min(1, pr.t + pr.speed);
        const e = this.easeInOutQuad(pr.t);
        const mid = 1 - Math.abs(2 * e - 1);   // wiggle strongest mid-pore
        const ang = pr.swirlPhase + this.time * 3.0, amp = pr.swirlAmp * mid;
        p.pos.set(pr.centerX + Math.cos(ang) * amp, THREE.MathUtils.lerp(pr.entryY, pr.exitY, e), pr.centerZ + Math.sin(ang) * amp);
        if (pr.t >= 1) {
            // Exit: scatter into the target compartment.
            p.mode = 'free';
            p.region = pr.toReg;
            p.pos.x = pr.centerX + (Math.random() - 0.5) * cfg.exitSpread;
            p.pos.z = (Math.random() - 0.5) * cfg.exitSpread;
            p.pos.y = p.region === 'out' ? cfg.mouthY + 1.3 : -cfg.mouthY - 1.3;
            const vySign = p.region === 'out' ? 1 : -1;
            p.vel.set(
                (Math.random() - 0.5) * cfg.exitSpeed,
                vySign * (0.8 + Math.random() * 0.8) * cfg.exitSpeed,
                (Math.random() - 0.5) * cfg.exitSpeed
            );
            this.limitSpeed(p.vel, cfg.maxSpeed);
            p.pore = null;
        }
    },

    // Start pore transports to satisfy BIO.pending[route][type], at most
    // maxPerFrame per rendered frame. Returns the signed number started.
    fulfillPending: function (type, xLoc, route) {
        const cfg = this.fluxCfg, pend = B.pending[route][type];
        let n = 0;
        if (pend >= 1) n = Math.min(Math.floor(pend), cfg.maxPerFrame);
        else if (pend <= -1) n = -Math.min(Math.floor(-pend), cfg.maxPerFrame);
        if (n === 0) return 0;
        const fromReg = n > 0 ? 'out' : 'in', toReg = n > 0 ? 'in' : 'out', need = Math.abs(n);
        const list = this.ionData[type], capR2 = cfg.captureRadius * cfg.captureRadius;
        let moved = 0, attempts = 0;
        while (moved < need && attempts < 4000) {
            attempts++;
            const ion = list[(Math.random() * list.length) | 0];
            if (ion.mode !== 'free' || ion.region !== fromReg) continue;
            if (fromReg === 'out' && ion.pos.y < cfg.mouthY + 1.0) continue;
            if (fromReg === 'in' && ion.pos.y > -cfg.mouthY - 1.0) continue;
            const dx = ion.pos.x - xLoc, dz = ion.pos.z;
            if (dx * dx + dz * dz > capR2) continue;
            this.startPoreTransport(ion, fromReg, toReg, xLoc);
            moved++;
        }
        const signedMoved = n > 0 ? moved : -moved;
        B.pending[route][type] -= signedMoved;
        return signedMoved;
    }
};

VIS.init();
VIS.recolour();
window.addEventListener('themechange', () => VIS.recolour());

// Started transports per ms of model time (concentrations come from the model).
const elFlux = document.querySelector('[data-out3d="flux"]');
function readout() {
    const dtFrame = B.STEPS_PER_FRAME * HH.dt, L = VIS.lastMoved;
    const r = (v) => (v / dtFrame).toFixed(1);
    elFlux.textContent = 'Na ' + r(L.naIn) + '/' + r(L.naOut) + ' · K ' + r(L.kOut) + '/' + r(L.kIn);
}

B.onTick(() => { VIS.update(); readout(); }, host);
