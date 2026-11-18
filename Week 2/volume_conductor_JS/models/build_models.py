# Builds the head-mode assets of the volume conductor page from the two
# source meshes: head.glb, brain.glb and head_section.json, all in scene
# units (section plane y = 0, source at the origin, face towards +z).
import sys, json, numpy as np, trimesh
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
head_src, lh_src, rh_src, out = sys.argv[1:5]
R_SCALP, Y_CUT, Y_NECK = 14.0, 2.45, -0.75      # head-scan units for the two y levels

def far_hits(mesh, dirs):
    """Distance from the origin to the farthest surface hit along each direction (nan if none)."""
    loc, ray, _ = mesh.ray.intersects_location(np.zeros_like(dirs), dirs, multiple_hits=True)
    d = np.full(len(dirs), np.nan)
    dist = np.linalg.norm(loc, axis=1)
    for i, x in zip(ray, dist):
        if np.isnan(d[i]) or x > d[i]: d[i] = x
    return d

def cluster(v, f, voxel):
    key = np.floor(v / voxel).astype(np.int64)
    _, inv, cnt = np.unique(key, axis=0, return_inverse=True, return_counts=True)
    nv = np.zeros((len(cnt), 3)); np.add.at(nv, inv, v); nv /= cnt[:, None]
    nf = inv[f]
    nf = nf[(nf[:, 0] != nf[:, 1]) & (nf[:, 1] != nf[:, 2]) & (nf[:, 0] != nf[:, 2])]
    _, keep = np.unique(np.sort(nf, axis=1), axis=0, return_index=True)
    return nv, nf[np.sort(keep)]

def crop(v, f, mask_v):
    f = f[mask_v[f].any(axis=1)]
    used = np.unique(f); remap = -np.ones(len(v), int); remap[used] = np.arange(len(used))
    return v[used], remap[f]

# ── Head: centre the section contour on the origin and scale its mean radius to R_SCALP ──
head = trimesh.load(head_src, force='mesh', process=False)
hv, hf = np.array(head.vertices), np.array(head.faces)
sec = trimesh.Trimesh(hv, hf, process=False).section(plane_origin=[0, Y_CUT, 0], plane_normal=[0, 1, 0])
pts = np.vstack([np.array(e) for e in sec.discrete])
cx, cz = (pts[:, 0].max() + pts[:, 0].min()) / 2, (pts[:, 2].max() + pts[:, 2].min()) / 2
hv = hv - [cx, Y_CUT, cz]
ang = np.radians(np.arange(360)); dirs = np.c_[np.cos(ang), np.zeros(360), np.sin(ang)]
k = R_SCALP / np.nanmean(far_hits(trimesh.Trimesh(hv, hf, process=False), dirs))
hv = hv * k
hv, hf = crop(hv, hf, hv[:, 1] > (Y_NECK - Y_CUT) * k)
head = trimesh.Trimesh(hv, hf, process=False)
S = far_hits(head, dirs)
top = hv[:, 1].max()
print('head scale', round(k, 3), 'top y', round(top, 2), 'S range', np.nanmin(S).round(2), np.nanmax(S).round(2), 'nan', np.isnan(S).sum())

# ── Brain: FreeSurfer RAS (mm) to scene axes, then fit inside the cranium ──
bv, bf, off = [], [], 0
for p in (lh_src, rh_src):
    m = trimesh.load(p, force='mesh', process=False)
    bv.append(np.array(m.vertices)); bf.append(np.array(m.faces) + off); off += len(m.vertices)
bv, bf = np.vstack(bv), np.vstack(bf)
bv = np.c_[-bv[:, 0], bv[:, 2], bv[:, 1]]            # (right, anterior, superior) -> (x, y up, z front)
bv, bf = cluster(bv, bf, 2.4)
ext = bv.max(0) - bv.min(0)
W, L = S[[0, 180]].sum(), S[[90, 270]].sum()         # scalp width and length in the section plane
sx = 0.84 * W / ext[0]
sz = min(0.84 * L / ext[2], 1.12 * sx)
bv = (bv - (bv.max(0) + bv.min(0)) / 2) * [sx, sx, sz]
bv[:, 1] += (top - 0.115 * R_SCALP) - bv[:, 1].max()       # brain top below the scalp vertex
bv[:, 2] += -0.03 * L                                 # the forehead is thicker than the occiput
print('brain scale', round(sx, 4), round(sz, 4), 'verts', len(bv), 'faces', len(bf), 'y range', bv[:, 1].min().round(2), bv[:, 1].max().round(2))
brain_full = trimesh.Trimesh(bv, bf, process=False)

# Brain envelope in the section plane: farthest hit, widened over +-4 degrees so
# the fissure and sulci do not notch it, then lightly smoothed.
B = far_hits(brain_full, dirs)
B = np.where(np.isnan(B), np.nanmedian(B), B)
B = np.max([np.roll(B, s) for s in range(-4, 5)], axis=0)
B = np.convolve(np.r_[B[-6:], B, B[:6]], np.ones(7) / 7, mode='same')[6:-6]
Ssm = np.where(np.isnan(S), np.nanmedian(S), S)
print('gap/S in plane: min', ((Ssm - B) / Ssm).min().round(3), 'mean', ((Ssm - B) / Ssm).mean().round(3))
B = np.minimum(B, 0.93 * Ssm)

# Clearance of the whole upper brain from the scalp.
u = np.random.default_rng(0).normal(size=(1500, 3)); u[:, 1] = np.abs(u[:, 1]); u /= np.linalg.norm(u, axis=1)[:, None]
gs, gb = far_hits(head, u), far_hits(brain_full, u)
ok = ~np.isnan(gs) & ~np.isnan(gb)
print('upper clearance (scene units): min', (gs - gb)[ok].min().round(2), 'mean', (gs - gb)[ok].mean().round(2), 'rays', ok.sum())

bv2, bf2 = crop(bv, bf, bv[:, 1] > -0.8)             # only the part above the section is ever seen
brain = trimesh.Trimesh(bv2, bf2, process=False)
head.export(out + '/head.glb'); brain.export(out + '/brain.glb')
json.dump({'scalp': [round(float(x), 3) for x in Ssm], 'brain': [round(float(x), 3) for x in B]}, open(out + '/head_section.json', 'w'))
print('export head', len(hv), len(hf), 'brain', len(bv2), len(bf2))

fig, ax = plt.subplots(1, 3, figsize=(16, 5.5))
ax[0].plot(Ssm * np.cos(ang), Ssm * np.sin(ang), 'k'); ax[0].plot(B * np.cos(ang), B * np.sin(ang), 'r')
bs = brain_full.section(plane_origin=[0, 0, 0], plane_normal=[0, 1, 0])
for e in bs.discrete: e = np.array(e); ax[0].plot(e[:, 0], e[:, 2], 'b', lw=0.4)
ax[0].set_title('section y=0: scalp (k), brain envelope (r), brain cut (b); +z front up'); ax[0].set_aspect('equal')
for a, (i, j, t) in zip(ax[1:], [(2, 1, 'side z-y'), (0, 1, 'front x-y')]):
    a.scatter(hv[:, i], hv[:, j], s=0.4, c='k'); a.scatter(bv[::7, i], bv[::7, j], s=0.2, c='r'); a.axhline(0, c='b'); a.set_aspect('equal'); a.set_title(t)
fig.savefig(out + '/preview.png', dpi=60)
