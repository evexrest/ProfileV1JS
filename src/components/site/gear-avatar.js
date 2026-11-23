// The gear avatar: a Gaussian splat figure built entirely from gears, greyscale,
// levitating. Every gear is a disc of flat splats (faces, tooth walls, spokes),
// lit per splat, sorted back to front each frame and drawn with WebGL2.
// The head is a glowing core inside two gimbal gears that spin, flip and
// revolve in opposite directions. Ported from ~/Code/gear-splat (final, 9c35ed7).
//
// mountGearAvatar(canvas, opts) starts drawing into the canvas and returns a
// function that stops it. The canvas is transparent, so the page shows through.
// Each splat is drawn as one point, cut to its ellipse in the fragment shader,
// and splats facing away from the camera are skipped: the GPU keeps every
// vertex of a frame until it is drawn, so four corners a splat cost about
// 60 MB more (2026-11-23).
//
// opts: spacing (splat spacing in metres; larger = fewer splats), glow (soft
// halo round the core, only worth it on dark pages), yaw, pitch, zoom, turn
// (radians a second the camera circles; 0 holds it still), maxDpr, still
// (draw one frame only), dark and light (hex colours the shading runs between;
// black to white by default), view ({ yaw, pitch } read every frame, so the
// page can turn the camera; it overrides yaw and pitch), probe ({ on, x, y,
// hit, onChange }: while on, says whether the figure is drawn near x, y, in CSS
// px from the canvas's top left). The returned function has .redraw() for when
// still is set and the view changes.

export function mountGearAvatar(canvas, opts = {}) {
  /* ---------- math ---------- */
  const TAU = Math.PI * 2;
  let seed = 90210;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const rr = (a, b) => a + (b - a) * rnd();
  const add = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
  const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  const mul = (a, s) => [a[0]*s, a[1]*s, a[2]*s];
  const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
  const lerp = (a, b, t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
  const lerp1 = (a, b, t) => a + (b - a) * t;
  const orth = (v, axis) => norm(sub(v, mul(axis, dot(v, axis))));
  // 3x3 matrices, column-major
  const I3 = [1,0,0, 0,1,0, 0,0,1];
  const m3cols = (a, b, c) => [a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2]];
  function m3mul(A, B) { const C = new Array(9);
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) C[c*3+r] = A[r]*B[c*3] + A[3+r]*B[c*3+1] + A[6+r]*B[c*3+2];
    return C; }
  const m3v = (A, p) => [A[0]*p[0]+A[3]*p[1]+A[6]*p[2], A[1]*p[0]+A[4]*p[1]+A[7]*p[2], A[2]*p[0]+A[5]*p[1]+A[8]*p[2]];
  function axisAngle(ax, a) { const [x, y, z] = norm(ax), c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [t*x*x+c, t*x*y+s*z, t*x*z-s*y,  t*x*y-s*z, t*y*y+c, t*y*z+s*x,  t*x*z+s*y, t*y*z-s*x, t*z*z+c]; }
  function frameFromAxis(axis) { const a = norm(axis); const ref = Math.abs(a[1]) < 0.9 ? [0,1,0] : [1,0,0];
    const t1 = norm(cross(ref, a)); return m3cols(t1, cross(a, t1), a); }

  /* ---------- skeleton + gear list ---------- */
  const bones = [];
  function bone(parent, pivot, axis = [1,0,0], amp = 0, freq = 0.6, ph = 0) {
    bones.push({ parent, pivot, axis: norm(axis), amp, freq, ph, R: I3, T: pivot }); return bones.length - 1; }

  const gears = [];
  const SURF = 0.012; // surface speed of meshing gears (m/s) -> angular speed = SURF / R
  function gear(o) {
    const R = o.R, kind = o.kind || 'gear';
    const pitch = 0.012 + R * 0.08;
    const N = o.N ?? Math.max(6, Math.round(TAU * R / pitch));
    const d = kind === 'cyl' ? 0 : (o.d ?? Math.min(pitch * 0.45, R * 0.3));
    const T = o.T ?? Math.max(0.006, R * 0.22);
    const rh = o.rh ?? (kind === 'ring' ? R - d - Math.max(0.007, R * 0.09) : R * 0.2);
    const spokes = o.spokes ?? (kind === 'gear' && R >= 0.045 ? 3 + Math.floor(rnd() * 3) : 0);
    const w = o.w ?? ((o.dir ?? (rnd() < 0.5 ? 1 : -1)) * SURF / R);
    gears.push({ bone: o.bone ?? -1, C: o.c, Rm: frameFromAxis(o.axis), R, T, d, N, rh, spokes, kind,
      alb: o.alb ?? rr(0.4, 0.6), ao: o.ao ?? 1, w, ph: o.ph ?? rnd() * TAU, group: o.group || 'body', orbit: o.orbit || null, anim: o.anim || null });
    return gears.length - 1;
  }

  // a column of gears threaded on an axle, from a to c
  function stack(b, a, c, r0, r1, o = {}) {
    const dir = norm(sub(c, a)), L = len(sub(c, a));
    const T = o.T ?? Math.max(0.0065, (r0 + r1) * 0.5 * 0.27);
    const n = Math.max(1, Math.round(L / (T * (o.gapK ?? 1.5))));
    const off = o.off ?? 0;
    for (let i = 0; i < n; i++) {
      const t = Math.min(1, (i + 0.5 + off) / n);
      const bulge = o.bulge ? 1 + o.bulge * Math.exp(-(((t - (o.peak ?? 0.4)) / 0.28) ** 2)) : 1;
      const R = lerp1(r0, r1, t) * bulge * (i % 2 ? (o.alt ?? 0.84) : 1);
      gear({ bone: b, c: lerp(a, c, t), axis: dir, R, T, dir: i % 2 ? 1 : -1, spokes: o.spokes ?? 0,
        alb: o.alb ? o.alb(i) : rr(0.3, 0.52), ao: 0.88, group: o.group });
    }
    if (o.axle !== false) gear({ bone: b, c: lerp(a, c, 0.5), axis: dir, R: Math.min(r0, r1) * 0.32, T: L, kind: 'cyl',
      alb: 0.2, w: 0, ao: 0.6, group: o.group });
  }

  function hinge(upper, mid, lower) { // the axis a joint bends around
    const h = cross(norm(sub(upper, mid)), norm(sub(lower, mid)));
    return len(h) < 1e-3 ? [1,0,0] : norm(h);
  }

  // a big gear standing on edge along a limb, centred on the limb's surface so half of it juts out like a crest
  function fin(b, P, Q, t, hint, rLimb, R) {
    const d = norm(sub(Q, P)), out = orth(hint, d);
    gear({ bone: b, c: add(lerp(P, Q, t), mul(out, rLimb)), axis: cross(d, out), R, T: Math.max(0.012, R * 0.18), spokes: 4, alb: 0.8 });
  }

  function hand(b, W, E, palmHint, curl, splay) {
    const fw = norm(sub(W, E));
    const pn = orth(palmHint, fw);
    let side = norm(cross(fw, pn));
    stack(b, W, add(W, mul(fw, 0.022)), 0.024, 0.024, { T: 0.007, axle: false, alb: () => rr(0.35, 0.5) });
    const pc = add(W, mul(fw, 0.046));
    gear({ bone: b, c: pc, axis: pn, R: 0.036, T: 0.012, spokes: 0, alb: 0.72 });
    gear({ bone: b, c: add(add(pc, mul(pn, -0.009)), mul(fw, 0.012)), axis: pn, R: 0.03, T: 0.01, spokes: 0, alb: 0.42 });
    const lens = [0.052, 0.062, 0.06, 0.048];
    for (let f = 0; f < 4; f++) {
      const a = lerp1(-splay, splay * 0.8, f / 3);
      const d0 = m3v(axisAngle(pn, a), fw);
      let p = add(add(pc, mul(fw, 0.03)), mul(side, (f - 1.5) * 0.017));
      const segs = [0.42, 0.33, 0.25];
      for (let k = 0; k < 3; k++) {
        const c = curl * (k + 1);
        const d = norm(add(mul(d0, Math.cos(c)), mul(pn, Math.sin(c))));
        const q = add(p, mul(d, lens[f] * segs[k]));
        const r = 0.0085 - k * 0.0012;
        stack(b, p, q, r, r * 0.92, { T: 0.0052, gapK: 1.35, axle: false, alt: 0.8, alb: () => rr(0.45, 0.7) });
        gear({ bone: b, c: p, axis: side, R: r * 0.75, T: 0.006, spokes: 0, alb: 0.8 }); // knuckle
        p = q;
      }
    }
    // thumb
    let p = add(add(pc, mul(side, -0.032)), mul(fw, -0.006));
    const td = norm(add(add(mul(fw, 0.65), mul(side, -0.7)), mul(pn, 0.3)));
    for (let k = 0; k < 2; k++) {
      const d = norm(add(td, mul(pn, curl * k)));
      const q = add(p, mul(d, 0.026));
      stack(b, p, q, 0.0095, 0.0085, { T: 0.0055, gapK: 1.35, axle: false, alt: 0.8, alb: () => rr(0.45, 0.7) });
      p = q;
    }
  }

  function buildFigure() {
    // posed rest skeleton (y up, figure faces +z)
    const P0 = [0, 1.0, 0], WST = [0, 1.13, 0.005], NB = [0, 1.47, -0.005], NT = [0.01, 1.548, 0.0];
    const HUP = norm([0.13, 1, 0.05]), HC = [0.022, 1.66, 0.012];
    const SA = [0.2, 1.43, 0], SB = [-0.2, 1.43, 0];
    const EA = [0.41, 1.335, 0.07], WA = [0.625, 1.39, 0.15];
    const EB = [-0.29, 1.17, -0.01], WB = [-0.33, 0.935, 0.05];
    const HA = [0.092, 0.965, 0], HB = [-0.092, 0.965, 0];
    const KA = [0.085, 0.565, 0.03], AA = [0.072, 0.175, -0.012], TA = [0.066, 0.03, 0.062];
    const KB = [-0.075, 0.588, 0.12], AB = [-0.042, 0.218, 0.032], TB = [-0.03, 0.082, 0.1];

    const root = bone(-1, P0, [0,0,1], 0.022, 0.45, 0);
    const spine = bone(root, WST, [1,0,0], 0.02, 0.7, 0.5);
    const head = bone(spine, NB, [0,0,1], 0.045, 0.38, 1.2);
    const uaA = bone(spine, SA, [0,0.3,1], 0.07, 0.55, 0.3), laA = bone(uaA, EA, [0,0.2,1], 0.06, 0.55, 1.0), hdA = bone(laA, WA, [1,0,0], 0.12, 0.6, 1.6);
    const uaB = bone(spine, SB, [1,0,0.2], 0.05, 0.5, 2.0), laB = bone(uaB, EB, [1,0,0], 0.07, 0.5, 2.6), hdB = bone(laB, WB, [1,0,0], 0.12, 0.55, 3.1);
    const thA = bone(root, HA, [1,0,0], 0.035, 0.42, 0), shA = bone(thA, KA, [1,0,0], 0.05, 0.42, 0.8), ftA = bone(shA, AA, [1,0,0], 0.09, 0.42, 1.6);
    const thB = bone(root, HB, [1,0,0], 0.035, 0.42, Math.PI), shB = bone(thB, KB, [1,0,0], 0.05, 0.42, Math.PI + 0.8), ftB = bone(shB, AB, [1,0,0], 0.09, 0.42, Math.PI + 1.6);

    /* torso: interleaved gear columns */
    for (const s of [1, -1]) stack(root, [s*0.07, 0.9, 0], [s*0.05, 1.06, 0], 0.084, 0.066, { off: s > 0 ? 0 : 0.5 });
    stack(spine, [0, 1.05, 0.0], [0, 1.2, 0.005], 0.07, 0.09, { alt: 0.88 });
    for (const s of [1, -1]) stack(spine, [s*0.058, 1.19, 0.0], [s*0.09, 1.42, -0.012], 0.08, 0.114, { off: s > 0 ? 0 : 0.5 });
    gear({ bone: spine, c: [0, 1.452, -0.006], axis: [0,1,0], R: 0.088, T: 0.014, alb: 0.62, spokes: 0 });
    gear({ bone: spine, c: [0, 1.472, -0.006], axis: [0,1,0], R: 0.062, T: 0.012, alb: 0.45, spokes: 0 });
    // chest face
    gear({ bone: spine, c: [0, 1.29, 0.112], axis: [0, 0.08, 1], R: 0.022, T: 0.01, alb: 0.92, spokes: 0 });
    for (const s of [1, -1]) {
      gear({ bone: spine, c: [s*0.118, 1.4, 0.07], axis: [s*0.6, 0.3, 1], R: 0.036, T: 0.013, alb: 0.62 });
      gear({ bone: spine, c: [s*0.105, 1.135, 0.05], axis: [s, 0, 0.6], R: 0.034, T: 0.012, alb: 0.55 });
      for (const y of [1.075, 1.13, 1.185]) gear({ bone: y > 1.1 ? spine : root, c: [s*0.036, y, 0.084], axis: [s*0.12, 0, 1], R: 0.024, T: 0.011, alb: rr(0.55, 0.72), spokes: 0 });
      // hips, glutes, shoulder blades
      gear({ bone: root, c: [s*0.152, 0.975, 0.0], axis: [s, 0, 0.1], R: 0.058, T: 0.016, alb: 0.72 });
      gear({ bone: root, c: [s*0.07, 0.95, -0.072], axis: [s*0.3, -0.2, -1], R: 0.046, T: 0.014, alb: 0.5 });
      gear({ bone: spine, c: [s*0.088, 1.33, -0.096], axis: [s*0.3, 0.1, -1], R: 0.05, T: 0.014, alb: 0.56 });
    }
    for (let y = 1.0; y <= 1.45; y += 0.046) gear({ bone: y < 1.1 ? root : spine, c: [0, y, -0.093], axis: [0, 0.15, -1], R: 0.02, T: 0.011, alb: 0.68, spokes: 0 });

    /* no neck: an abstract head floating above the shoulders, a glowing core inside two gimbal gears */
    const CORE = [0.012, 1.635, 0.008];
    gear({ bone: head, c: CORE, axis: [0, 0, 1], R: 0.026, kind: 'core', w: 0.4, alb: 1 });
    // iris: a thin ring gear around the core, always facing forward
    gear({ bone: head, c: CORE, axis: [0, 0, 1], R: 0.042, rh: 0.035, T: 0.006, kind: 'ring', w: -0.5, alb: 0.32 });
    const Ry = a => axisAngle([0, 1, 0], a), Rx = a => axisAngle([1, 0, 0], a), Rz = a => axisAngle([0, 0, 1], a);
    const F0 = frameFromAxis([0, 0, 1]);
    // outer and inner gimbal gears: each spins, flips and revolves, the two in opposite directions
    gear({ bone: head, c: CORE, axis: [0, 0, 1], R: 0.13, rh: 0.108, T: 0.011, kind: 'ring', w: 0.3, alb: 0.82,
      anim: t => m3mul(Ry(0.55 * t), m3mul(Rx(0.85 * t), F0)) });
    gear({ bone: head, c: CORE, axis: [0, 0, 1], R: 0.072, rh: 0.054, T: 0.01, kind: 'ring', w: -0.5, alb: 0.66,
      anim: t => m3mul(Ry(-0.7 * t + 1.2), m3mul(Rz(-1.05 * t), m3mul(Rx(Math.PI / 2), F0))) });

    /* shoulders, with gears jutting out */
    for (const [S, s] of [[SA, 1], [SB, -1]]) gear({ bone: spine, c: S, axis: [s, 0, 0], R: 0.06, T: 0.046, alb: 0.42, spokes: 0 });
    gear({ bone: spine, c: add(SA, [0.035, 0.05, 0]), axis: [0.9, 1, 0], R: 0.09, T: 0.018, alb: 0.82, spokes: 5 });
    gear({ bone: spine, c: add(SA, [0.065, 0.112, -0.035]), axis: [0.8, 1.5, -0.5], R: 0.052, T: 0.014, alb: 0.66 });
    gear({ bone: spine, c: add(SA, [0.008, 0.145, -0.065]), axis: [0.3, 1, -1.2], R: 0.031, T: 0.011, alb: 0.88, spokes: 0 });
    gear({ bone: spine, c: add(SB, [-0.03, 0.046, 0]), axis: [-0.9, 1, 0], R: 0.072, T: 0.016, alb: 0.76, spokes: 4 });
    gear({ bone: spine, c: add(SB, [-0.048, 0.098, -0.03]), axis: [-0.7, 1.4, -0.4], R: 0.036, T: 0.012, alb: 0.6 });

    /* arms */
    const limb = (bU, bL, S, E, W, r) => {
      stack(bU, lerp(S, E, 0.13), E, r[0], r[1], { bulge: 0.16, peak: 0.45 });
      stack(bL, E, W, r[1] * 0.97, r[2], { bulge: 0.12, peak: 0.22 });
      const h = hinge(S, E, W);
      gear({ bone: bL, c: E, axis: h, R: r[1] * 1.05, T: r[1] * 1.7, alb: 0.42, spokes: 0 });
      for (const s of [1, -1]) gear({ bone: bL, c: add(E, mul(h, s * r[1] * 0.95)), axis: mul(h, s), R: r[1] * 0.85, T: 0.01, alb: 0.82, spokes: 0 });
      // triceps crest: on the side the elbow points to, leaning toward the back
      const bendOut = mul(add(norm(sub(S, E)), norm(sub(W, E))), -1);
      fin(bU, S, E, 0.52, add(bendOut, [0, 0, -0.5]), r[0] * 1.05, 0.066);
    };
    limb(uaA, laA, SA, EA, WA, [0.048, 0.039, 0.029]);
    limb(uaB, laB, SB, EB, WB, [0.048, 0.039, 0.029]);
    { // a fin gear jutting off the reaching forearm
      const d = norm(sub(WA, EA)), out = orth([0, -0.35, -1], d);
      gear({ bone: laA, c: add(lerp(EA, WA, 0.42), mul(out, 0.03)), axis: cross(d, out), R: 0.05, T: 0.012, alb: 0.78, spokes: 4 });
    }
    hand(hdA, WA, EA, [0, 1, 0], 0.16, 0.34);
    hand(hdB, WB, EB, [1, 0, 0.35], 0.24, 0.18);

    /* legs */
    const leg = (bT, bS, bF, H, K, A, Tt) => {
      stack(bT, lerp(H, K, 0.05), K, 0.08, 0.053, { bulge: 0.08, peak: 0.3 });
      stack(bS, K, A, 0.052, 0.033, { bulge: 0.14, peak: 0.28 });
      stack(bF, A, Tt, 0.032, 0.014, { T: 0.009 });
      const h = hinge(H, K, A), sd = Math.sign(H[0]);
      fin(bT, H, K, 0.42, [sd * 0.12, 0, 1], 0.07, 0.092); // thigh crest, sticking out the front
      fin(bS, K, A, 0.3, [0, 0, -1], 0.05, 0.072);       // calf crest, back
      gear({ bone: bS, c: K, axis: [1, 0, 0], R: 0.046, T: 0.07, alb: 0.42, spokes: 0 });
      let kf = add(mul(add(norm(sub(H, K)), norm(sub(A, K))), -1), [0, 0, 0.3]);
      kf = norm(kf);
      gear({ bone: bS, c: add(K, mul(kf, 0.042)), axis: kf, R: 0.031, T: 0.011, alb: 0.86, spokes: 0 });
      for (const s of [1, -1]) gear({ bone: bS, c: add(K, [s * 0.047, 0, 0]), axis: [s, 0, 0], R: 0.034, T: 0.011, alb: 0.74, spokes: 0 });
      gear({ bone: bF, c: A, axis: [1, 0, 0], R: 0.03, T: 0.05, alb: 0.45, spokes: 0 });
      for (const s of [1, -1]) gear({ bone: bF, c: add(A, [s * 0.03, 0, 0]), axis: [s, 0, 0], R: 0.021, T: 0.008, alb: 0.8, spokes: 0 });
      return h;
    };
    leg(thA, shA, ftA, HA, KA, AA, TA);
    leg(thB, shB, ftB, HB, KB, AB, TB);

  }

  /* ---------- splats ---------- */
  // Four RGBA float rows per splat, written straight into typed arrays (plain
  // arrays of numbers took several times the memory while the figure was
  // built). Room grows in whole texture rows, so the arrays upload as they are.
  const TW = 2048;
  let NSB = 0, cap = TW * 32;
  let A0 = new Float32Array(cap * 4), A1 = new Float32Array(cap * 4), A2 = new Float32Array(cap * 4), A3 = new Float32Array(cap * 4);
  function grow() {
    cap = Math.ceil(cap * 1.5 / TW) * TW;
    const more = (a) => { const b = new Float32Array(cap * 4); b.set(a); return b; };
    A0 = more(A0); A1 = more(A1); A2 = more(A2); A3 = more(A3);
  }
  function emit(gi, x, y, z, t1, t2, n, s1, s2, s3, alb, ao, op, unlit) {
    if (NSB === cap) grow();
    const k = 4 * NSB++, a = s1*s1, b = s2*s2, c = s3*s3;
    A0[k] = x; A0[k+1] = y; A0[k+2] = z; A0[k+3] = gi;
    A1[k] = a*t1[0]*t1[0] + b*t2[0]*t2[0] + c*n[0]*n[0]; A1[k+1] = a*t1[0]*t1[1] + b*t2[0]*t2[1] + c*n[0]*n[1];
    A1[k+2] = a*t1[0]*t1[2] + b*t2[0]*t2[2] + c*n[0]*n[2]; A1[k+3] = a*t1[1]*t1[1] + b*t2[1]*t2[1] + c*n[1]*n[1];
    A2[k] = a*t1[1]*t1[2] + b*t2[1]*t2[2] + c*n[1]*n[2]; A2[k+1] = a*t1[2]*t1[2] + b*t2[2]*t2[2] + c*n[2]*n[2]; A2[k+2] = op; A2[k+3] = ao;
    if (unlit) { A3[k] = A3[k+1] = A3[k+2] = 0; A3[k+3] = alb; } else { A3[k] = n[0]; A3[k+1] = n[1]; A3[k+2] = n[2]; A3[k+3] = Math.min(1, alb); }
  }

  const X = [1,0,0], Y = [0,1,0], ZP = [0,0,1], ZN = [0,0,-1];
  const J = () => 1 + rr(-0.06, 0.06);
  function genGear(gi, g, sBase) {
    const s = Math.max(0.0017, Math.min(sBase, g.R * 0.24));
    const st = s * 0.62, sn = s * 0.1, sp = s * 0.85;
    const R = g.R, root = R - g.d, T = g.T, hz = T / 2, w = TAU / g.N, cyl = g.kind === 'cyl';
    const prof = th => { if (cyl) return R; let p = th / w; p -= Math.floor(p);
      const f = p < 0.12 ? p / 0.12 : p < 0.38 ? 1 : p < 0.5 ? (0.5 - p) / 0.12 : 0; return root + g.d * f; };
    const S = g.spokes, spA = TAU / (S || 1), ri = root - R * 0.15, hubR = g.rh + R * 0.17, spW = R * 0.075;
    const cut = (r, th) => { if (!S || r <= hubR || r >= ri) return false; const a = th - Math.round(th / spA) * spA; return Math.abs(r * Math.sin(a)) > spW; };
    const wall = (x, y, nx, ny, tx, ty, z0, z1, alb, ao) => {
      const L = z1 - z0, k = Math.max(1, Math.round(L / sp)), sz = Math.min(st, L / k * 0.75);
      for (let i = 0; i < k; i++) emit(gi, x, y, z0 + (i + 0.5) * L / k, [tx, ty, 0], ZP, [nx, ny, 0], st, sz, sn, alb * J(), ao, 0.96);
    };
    const boss = g.kind === 'gear' && R >= 0.03, rb = g.rh + R * 0.11, bh = T * 0.35;

    if (!cyl) { // both faces
      for (let r = g.rh + sp * 0.5; r < R; r += sp) {
        const n = Math.max(6, Math.round(TAU * r / sp)), off = rnd();
        const aoR = 0.72 + 0.28 * Math.min(1, (r - g.rh) / Math.max(1e-6, root - g.rh));
        for (let j = 0; j < n; j++) {
          const th = (j + off + rr(-0.25, 0.25)) * TAU / n;
          if (r > prof(th) || cut(r, th)) continue;
          if (boss && r < rb) continue;
          const rj = r + rr(-0.25, 0.25) * sp, x = rj * Math.cos(th), y = rj * Math.sin(th);
          const tip = rj > root + g.d * 0.4 ? 1.12 : 1;
          emit(gi, x, y, hz, X, Y, ZP, st, st, sn, g.alb * tip * J(), g.ao * aoR, 0.96);
          emit(gi, x, y, -hz, X, Y, ZN, st, st, sn, g.alb * tip * J(), g.ao * aoR, 0.96);
        }
      }
    }
    { // outer edge, tracing the tooth profile
      const M = cyl ? Math.max(24, Math.ceil(TAU * R / sp * 2)) : g.N * 40;
      let px = prof(0), py = 0, acc = rnd() * sp;
      for (let k = 1; k <= M; k++) {
        const th = k / M * TAU, r = prof(th), qx = r * Math.cos(th), qy = r * Math.sin(th);
        const dx = qx - px, dy = qy - py, L = Math.hypot(dx, dy);
        if (L > 1e-9) {
          const tx = dx / L, ty = dy / L; let u = acc;
          while (u < L) {
            const x = px + tx * u, y = py + ty * u, tip = Math.hypot(x, y) > root + g.d * 0.5 ? 1.18 : 1;
            wall(x, y, ty, -tx, tx, ty, -hz, hz, g.alb * tip, g.ao * (cyl ? 1 : 0.92 + 0.08 * tip));
            u += sp;
          }
          acc = u - L;
        }
        px = qx; py = qy;
      }
    }
    if (!cyl && g.rh > 0.0015) { // bore
      const zH = boss ? hz + bh : hz, n = Math.max(6, Math.round(TAU * g.rh / sp));
      for (let j = 0; j < n; j++) { const th = j / n * TAU, c = Math.cos(th), sn_ = Math.sin(th);
        wall(g.rh * c, g.rh * sn_, -c, -sn_, -sn_, c, -zH, zH, g.alb * 0.7, 0.45); }
    }
    if (S) { // window walls between the spokes
      const n1 = Math.round(TAU * ri / sp), n2 = Math.max(6, Math.round(TAU * hubR / sp));
      for (let j = 0; j < n1; j++) { const th = j / n1 * TAU, c = Math.cos(th), sn_ = Math.sin(th);
        if (cut(ri - 1e-5, th)) wall(ri * c, ri * sn_, -c, -sn_, -sn_, c, -hz, hz, g.alb * 0.8, 0.55); }
      for (let j = 0; j < n2; j++) { const th = j / n2 * TAU, c = Math.cos(th), sn_ = Math.sin(th);
        if (cut(hubR + 1e-5, th)) wall(hubR * c, hubR * sn_, c, sn_, -sn_, c, -hz, hz, g.alb * 0.85, 0.6); }
      const t0 = Math.sqrt(Math.max(0, hubR * hubR - spW * spW)), t1 = Math.sqrt(Math.max(0, ri * ri - spW * spW));
      for (let k = 0; k < S; k++) {
        const a = k * spA, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
        for (const side of [1, -1]) for (let t = t0 + sp * 0.5; t < t1; t += sp)
          wall(t * ux + side * spW * vx, t * uy + side * spW * vy, side * vx, side * vy, ux, uy, -hz, hz, g.alb * 0.85, 0.6);
      }
    }
    if (boss) { // raised hub around the bore
      for (const zs of [1, -1]) {
        for (let r = g.rh + sp * 0.5; r < rb; r += sp) {
          const n = Math.max(6, Math.round(TAU * r / sp));
          for (let j = 0; j < n; j++) { const th = (j + rnd() * 0.5) * TAU / n;
            emit(gi, r * Math.cos(th), r * Math.sin(th), zs * (hz + bh), X, Y, zs > 0 ? ZP : ZN, st, st, sn, Math.min(1, g.alb * 1.15) * J(), 1, 0.96); }
        }
        const n = Math.max(6, Math.round(TAU * rb / sp));
        for (let j = 0; j < n; j++) { const th = j / n * TAU, c = Math.cos(th), sn_ = Math.sin(th);
          wall(rb * c, rb * sn_, c, sn_, -sn_, c, zs > 0 ? hz : -hz - bh, zs > 0 ? hz + bh : -hz, g.alb * 1.05, 0.85); }
      }
    }
  }

  function genCore(gi, g) {
    const rc = g.R, n = 900, ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) { // shell: bright, polished
      const y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - y * y), th = i * ga;
      const nrm = [r * Math.cos(th), y, r * Math.sin(th)], t1 = orth([0, 1, 0.3], nrm), t2 = cross(nrm, t1);
      emit(gi, nrm[0] * rc, nrm[1] * rc, nrm[2] * rc, t1, t2, nrm, 0.0028, 0.0028, 0.0005, 1, 1, 0.35);
    }
    for (let i = 0; i < 500; i++) { // glowing inside: brightest at the centre
      const d = norm([rr(-1, 1), rr(-1, 1), rr(-1, 1)]), f = Math.cbrt(rnd()), r = rc * 0.92 * f;
      emit(gi, d[0] * r, d[1] * r, d[2] * r, X, Y, ZP, 0.004, 0.004, 0.004, 1 - 0.25 * f, 1, 0.85, true);
    }
    if (opts.glow !== false) for (let i = 0; i < 260; i++) { // soft glow around it
      const d = norm([rr(-1, 1), rr(-1, 1), rr(-1, 1)]), r = rc * rr(0.9, 2.4), sz = rr(0.008, 0.016);
      emit(gi, d[0] * r, d[1] * r, d[2] * r, X, Y, ZP, sz, sz, sz, rr(0.75, 0.95), 1, rr(0.025, 0.06), true);
    }
  }

  /* ---------- build ---------- */
  const SPACING = opts.spacing ?? 0.0052;
  buildFigure();
  gears.forEach((g, i) => g.kind === 'core' ? genCore(i, g) : genGear(i, g, SPACING));
  const NS = NSB, NG = gears.length;

  /* ---------- WebGL ---------- */
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) { const none = () => {}; none.redraw = () => {}; return none; }

  const VS = `#version 300 es
  precision highp float; precision highp int; precision highp sampler2D;
  uniform sampler2D uS0, uS1, uS2, uS3, uG;
  uniform mat3 uW; uniform vec3 uEye; uniform vec2 uFocal, uView; uniform int uTW; uniform float uMaxPt;
  in uint aIdx;
  out vec3 vQ; out float vR; out mediump float vA; out mediump float vL;
  void main() {
    int i = int(aIdx); ivec2 st = ivec2(i % uTW, i / uTW);
    vec4 s0 = texelFetch(uS0, st, 0);
    int g = int(s0.w + 0.5);
    vec4 g0 = texelFetch(uG, ivec2(0, g), 0);
    if (g0.w < 0.5) { gl_Position = vec4(0., 0., 2., 1.); return; }
    mat3 R = mat3(texelFetch(uG, ivec2(1, g), 0).xyz, texelFetch(uG, ivec2(2, g), 0).xyz, texelFetch(uG, ivec2(3, g), 0).xyz);
    vec3 wp = g0.xyz + R * s0.xyz;
    vec3 vp = uW * (wp - uEye);
    if (vp.z < 0.05) { gl_Position = vec4(0., 0., 2., 1.); return; }
    vec2 ndc = uFocal * vp.xy / vp.z / (uView * 0.5);
    if (abs(ndc.x) > 1.3 || abs(ndc.y) > 1.3) { gl_Position = vec4(0., 0., 2., 1.); return; }
    vec4 s3 = texelFetch(uS3, st, 0);
    // Facing away: the gear's near side covers it, so don't draw it.
    if (dot(s3.xyz, s3.xyz) > 0.25 && dot(R * s3.xyz, uEye - wp) < -0.15 * length(uEye - wp)) { gl_Position = vec4(0., 0., 2., 1.); return; }
    vec4 s1 = texelFetch(uS1, st, 0), s2 = texelFetch(uS2, st, 0);
    mat3 S = mat3(s1.x, s1.y, s1.z, s1.y, s1.w, s2.x, s1.z, s2.x, s2.y);
    mat3 M = uW * R;
    mat3 Sv = M * S * transpose(M);
    float iz = 1. / vp.z;
    vec3 j0 = vec3(uFocal.x * iz, 0., -uFocal.x * vp.x * iz * iz);
    vec3 j1 = vec3(0., uFocal.y * iz, -uFocal.y * vp.y * iz * iz);
    float a = dot(j0, Sv * j0) + 0.3, b = dot(j0, Sv * j1), c = dot(j1, Sv * j1) + 0.3;
    float mid = 0.5 * (a + c), rad = length(vec2(0.5 * (a - c), b));
    float l1 = mid + rad;

    // shading: brushed-steel greys, light rig fixed to the camera
    float alb = s3.w, ao = s2.w, lum;
    if (dot(s3.xyz, s3.xyz) < 0.25) {
      lum = alb;
    } else {
      vec3 n = normalize(M * s3.xyz), V = normalize(-vp);
      if (dot(n, V) < 0.) n = -n;
      vec3 Lk = normalize(vec3(-0.55, 0.78, -0.6)), Lr = normalize(vec3(0.75, 0.3, 0.85)), Lf = normalize(vec3(0.65, -0.35, -0.55));
      float dk = max(dot(n, Lk), 0.), dr = max(dot(n, Lr), 0.), df = max(dot(n, Lf), 0.);
      float sk = pow(max(dot(n, normalize(Lk + V)), 0.), 56.);
      float sf = pow(max(dot(n, normalize(Lf + V)), 0.), 24.);
      float fres = pow(1. - max(dot(n, V), 0.), 3.);
      vec3 Rf = reflect(-V, n);
      float env = smoothstep(-0.2, 0.9, Rf.y) * 0.18 + 0.01;
      float height = mix(0.62, 1.0, smoothstep(0.0, 1.5, wp.y));
      lum = alb * (0.07 * height + 0.95 * dk + 0.2 * df + env) * ao
          + (1.5 * sk + 0.3 * sf) * ao * (0.35 + alb)
          + 0.5 * dr * (0.35 + alb) + 0.14 * fres * ao;
      lum = 1. - exp(-1.45 * lum);
    }
    // One point per splat: a square round its 3-sigma ellipse, which the
    // fragment shader cuts to shape with the inverse covariance (vQ).
    vR = min(min(3. * sqrt(l1), 600.), uMaxPt * 0.5);
    vQ = vec3(c, -b, a) / max(a * c - b * b, 1e-6);
    vL = lum; vA = s2.z;
    gl_PointSize = 2. * vR;
    gl_Position = vec4(ndc, 0., 1.);
  }`;
  const FS = `#version 300 es
  precision highp float;
  uniform vec3 uDark, uLight;
  in vec3 vQ; in float vR; in mediump float vA; in mediump float vL; out vec4 o;
  void main() {
    vec2 d = (gl_PointCoord - 0.5) * (2. * vR); d.y = -d.y;
    float r2 = vQ.x * d.x * d.x + 2. * vQ.y * d.x * d.y + vQ.z * d.y * d.y; if (r2 > 9.) discard;
    float a = vA * exp(-0.5 * r2); if (a < 0.004) discard;
    o = vec4(mix(uDark, uLight, vL) * a, a);
  }`;
  function program(vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  const prog = program(VS, FS);
  const U = n => gl.getUniformLocation(prog, n);

  const TH = Math.ceil(NS / TW);
  function dataTex(data, unit) {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TW, TH, 0, gl.RGBA, gl.FLOAT, data);
    return t;
  }
  gl.useProgram(prog);
  [A0, A1, A2, A3].forEach((a, i) => { dataTex(a, i); gl.uniform1i(U('uS' + i), i); });
  // keep only what the sorter needs
  const LP = new Float32Array(NS * 3), LG = new Uint16Array(NS);
  for (let i = 0; i < NS; i++) { LP[i*3] = A0[i*4]; LP[i*3+1] = A0[i*4+1]; LP[i*3+2] = A0[i*4+2]; LG[i] = A0[i*4+3]; }
  A0 = A1 = A2 = A3 = null;

  const gearData = new Float32Array(NG * 16);
  const gearTex = gl.createTexture(); gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, gearTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, NG, 0, gl.RGBA, gl.FLOAT, gearData);
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  gl.uniform3fv(U('uDark'), hex(opts.dark ?? '#000000')); gl.uniform3fv(U('uLight'), hex(opts.light ?? '#ffffff'));
  gl.uniform1i(U('uG'), 4); gl.uniform1i(U('uTW'), TW); gl.uniform1f(U('uMaxPt'), gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]);

  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const order = new Uint32Array(NS);
  const idxBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, idxBuf); gl.bufferData(gl.ARRAY_BUFFER, order.byteLength, gl.DYNAMIC_DRAW);
  const aIdx = gl.getAttribLocation(prog, 'aIdx'); gl.enableVertexAttribArray(aIdx);
  gl.vertexAttribIPointer(aIdx, 1, gl.UNSIGNED_INT, 0, 0);
  gl.bindVertexArray(null);

  /* ---------- animation ---------- */
  const show = { wings: true, halo: true, orbit: true, spin: true, auto: true, dust: true, body: true };
  const dz0 = new Float32Array(NG), vx = new Float32Array(NG), vy = new Float32Array(NG), vz = new Float32Array(NG);
  function poseGears(t, ts, eye, f) {
    for (const b of bones) {
      const Ra = b.amp ? axisAngle(b.axis, b.amp * Math.sin(b.freq * t + b.ph)) : I3;
      if (b.parent < 0) { b.R = Ra; b.T = add(b.pivot, [0, 0.032 * Math.sin(0.85 * t), 0]); }
      else { const p = bones[b.parent]; b.R = m3mul(p.R, Ra); b.T = add(m3v(p.R, sub(b.pivot, p.pivot)), p.T); }
    }
    const bob = 0.032 * Math.sin(0.85 * t);
    for (let i = 0; i < NG; i++) {
      const g = gears[i], a = g.ph + g.w * ts, c = Math.cos(a), s = Math.sin(a);
      const Rz = [c, s, 0, -s, c, 0, 0, 0, 1];
      let C, R;
      if (g.orbit) {
        const o = g.orbit, oa = o.ph + o.w * t;
        C = [o.r * Math.cos(oa), o.y + bob + o.tilt * o.r * Math.sin(oa) + 0.04 * Math.sin(oa * 2 + o.ph), o.r * Math.sin(oa)];
        R = m3mul(axisAngle([0, 1, 0], -oa), m3mul(g.Rm, Rz));
      } else if (g.bone >= 0) {
        const b = bones[g.bone]; C = add(m3v(b.R, sub(g.C, b.pivot)), b.T); R = m3mul(b.R, m3mul(g.anim ? g.anim(ts) : g.Rm, Rz));
      } else { C = g.C; R = m3mul(g.Rm, Rz); }
      const o = i * 16;
      gearData[o] = C[0]; gearData[o+1] = C[1]; gearData[o+2] = C[2]; gearData[o+3] = show[g.group] ? 1 : 0;
      gearData[o+4] = R[0]; gearData[o+5] = R[1]; gearData[o+6] = R[2];
      gearData[o+8] = R[3]; gearData[o+9] = R[4]; gearData[o+10] = R[5];
      gearData[o+12] = R[6]; gearData[o+13] = R[7]; gearData[o+14] = R[8];
      dz0[i] = dot(f, sub(C, eye));
      vx[i] = R[0] * f[0] + R[1] * f[1] + R[2] * f[2];
      vy[i] = R[3] * f[0] + R[4] * f[1] + R[5] * f[2];
      vz[i] = R[6] * f[0] + R[7] * f[1] + R[8] * f[2];
    }
  }

  // back-to-front counting sort on view depth
  const depth = new Float32Array(NS), keys = new Uint16Array(NS), counts = new Uint32Array(65536);
  function sortSplats() {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < NS; i++) {
      const g = LG[i], j = i * 3;
      const d = dz0[g] + vx[g] * LP[j] + vy[g] * LP[j+1] + vz[g] * LP[j+2];
      depth[i] = d; if (d < lo) lo = d; if (d > hi) hi = d;
    }
    const k = 65535 / Math.max(1e-6, hi - lo);
    counts.fill(0);
    for (let i = 0; i < NS; i++) { const q = ((hi - depth[i]) * k) | 0; keys[i] = q; counts[q]++; }
    for (let i = 1; i < 65536; i++) counts[i] += counts[i - 1];
    for (let i = NS - 1; i >= 0; i--) order[--counts[keys[i]]] = i;
  }

  /* ---------- camera ---------- */
  const view = opts.view ?? { yaw: opts.yaw ?? 0.42, pitch: opts.pitch ?? 0.04 };
  const zoom = opts.zoom ?? 1, turn = opts.turn ?? 0.16;
  const probe = opts.probe, px = new Uint8Array(4 * 9 * 9);

  /* ---------- loop ---------- */
  let tPrev = performance.now(), tAnim = 0, tSpin = 0, raf = 0;
  const still = opts.still ?? false;
  function frame(now) {
    const dt = Math.min(0.05, (now - tPrev) / 1000); tPrev = now;
    tAnim += dt; if (show.spin) tSpin += dt;
    view.yaw += dt * turn;
    const { yaw, pitch } = view;

    const dpr = Math.min(opts.maxDpr ?? 2, window.devicePixelRatio || 1);
    const W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
    if (!W || !H) { raf = requestAnimationFrame(frame); return; }
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const fovY = 34 * Math.PI / 180, tanH = Math.tan(fovY / 2), aspect = W / H;
    const dist = Math.max(1.06 / tanH, 0.86 / (tanH * aspect)) * zoom;
    const target = [0, 0.97, 0];
    const eye = add(target, mul([Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)], dist));
    const f = norm(sub(target, eye)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
    const focal = (H / 2) / tanH;

    poseGears(tAnim, tSpin, eye, f);
    sortSplats();

    gl.viewport(0, 0, W, H);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, gearTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, NG, gl.RGBA, gl.FLOAT, gearData);
    gl.uniformMatrix3fv(U('uW'), false, [r[0], u[0], f[0], r[1], u[1], f[1], r[2], u[2], f[2]]);
    gl.uniform3fv(U('uEye'), eye); gl.uniform2f(U('uFocal'), focal, focal); gl.uniform2f(U('uView'), W, H);
    gl.bindBuffer(gl.ARRAY_BUFFER, idxBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, order);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(vao); gl.drawArrays(gl.POINTS, 0, NS);
    gl.bindVertexArray(null);

    // Is the figure under the pointer? Read a small square of the frame just
    // drawn and look for any coverage.
    if (probe) {
      let hit = false;
      if (probe.on && probe.x >= 0 && probe.y >= 0) {
        const x = Math.round(probe.x * dpr) - 4, y = H - Math.round(probe.y * dpr) - 5;
        if (x >= 0 && y >= 0 && x + 9 <= W && y + 9 <= H) {
          gl.readPixels(x, y, 9, 9, gl.RGBA, gl.UNSIGNED_BYTE, px);
          for (let i = 3; i < px.length; i += 4) if (px[i] > 60) { hit = true; break; }
        }
      }
      if (hit !== probe.hit) { probe.hit = hit; probe.onChange?.(hit); }
    }

    if (!still) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  const stop = () => {
    cancelAnimationFrame(raf);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  stop.redraw = () => { if (still) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } };
  return stop;
}
