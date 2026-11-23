// The gear: one small machine that is both the button in the corner and the
// page change. Three parts turn against each other: a toothed outer ring, a
// spoked wheel inside it and a solid cog at the hub, with open space between
// them where the page shows through. Each part is a slab with real thickness,
// stacked at different heights (ring lowest, cog highest), seen from above at
// an angle so side walls show to the lower left.
//
// At rest it sits in the button. Clicking it hides the button and draws the
// same mechanism, at the same size and turn, on a sheet over the window, then
// zooms it until the window lies inside the cog's top face, whose white then
// covers everything: the white second page is underneath. Going home plays it
// backwards, and the mechanism shrinks back into the button it came from.
//
// Parts are outlines around (0, 0) on a radius of 50. Each pose turns them,
// draws the side walls that face the viewer, shaded by which way they face,
// and lays the top face over them.

const MS = 1100
const REST_R = 30 // px: the mechanism's radius in the button
const END_AT = 5.4 // units from the cog's centre the farthest corner reaches at the end: inside its top face, seen at an angle
// The camera: the kit's isometric view from azimuth 45 at elevation 58, with
// the picture turned 55 degrees. The elevation is the gear's tilt: 90 looks
// straight at its front face, 0 is edge on, and below 0 the back face shows,
// down to -90, straight at the back. A point p across the gear's plane at
// height z lands at (p·W, p·U sin(tilt) - z cos(tilt)), U being the plane's
// direction toward the viewer and W across the picture; then the picture
// turns. LIGHT is the kit's light.
const VIEW = { azimuth: 45, elevation: 58, turn: 55 }
export const REST_TILT = VIEW.elevation
const rad = (d) => (d * Math.PI) / 180
const [sA, cA] = [Math.sin(rad(VIEW.azimuth)), Math.cos(rad(VIEW.azimuth))]
const U = [cA, sA]
const W = [sA, -cA]
// The plane-to-screen matrix (m) for a picture turned `turn` degrees at a
// tilt, and the screen step for one unit of height (up). The light and the
// walls live in the gear's plane, so only the picture turns. Exactly edge on
// the faces would have no area, and their strokes, which keep their width
// whatever the scale, no scale to undo, so the tilt stays 0.6 degrees off it.
function cameraFor(turn, tilt = VIEW.elevation) {
  const t = rad(Math.abs(tilt) < 0.6 ? (tilt < 0 ? -0.6 : 0.6) : tilt)
  const [sE, cE] = [Math.sin(t), Math.cos(t)]
  const [sT, cT] = [Math.sin(rad(turn)), Math.cos(rad(turn))]
  const flat = [W, [sE * U[0], sE * U[1]]]
  return {
    m: [
      cT * flat[0][0] - sT * flat[1][0], sT * flat[0][0] + cT * flat[1][0],
      cT * flat[0][1] - sT * flat[1][1], sT * flat[0][1] + cT * flat[1][1],
    ],
    up: [sT * cE, -cT * cE],
    above: sE > 0, // seeing the front (top) faces, not the back
    walls: cE > 1e-4, // straight on, no wall shows
  }
}
const LIGHT = [-sA, cA]
const SHADES = 4

const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)]
const area = (loop) => loop.reduce((s, [x, y], i) => { const [u, v] = loop[(i + 1) % loop.length]; return s + x * v - u * y }, 0) / 2
// Outer outlines run one way and holes the other, so (dy, -dx) on any edge
// points out of the material.
const outer = (loop) => (area(loop) > 0 ? loop : loop.reverse())
const hole = (loop) => (area(loop) < 0 ? loop : loop.reverse())
const ringPts = (r, steps = 48, cx = 0, cy = 0) => Array.from({ length: steps }, (_, i) => { const [x, y] = polar(r, (i / steps) * Math.PI * 2); return [cx + x, cy + y] })

// A ring of teeth: square-shouldered trapezoids between the root and the tip.
function teeth(count, root, tip) {
  const pts = []
  const pitch = (Math.PI * 2) / count
  for (let t = 0; t < count; t++) {
    for (const [f, r] of [[-0.5, root], [-0.24, root], [-0.15, tip], [0.15, tip], [0.24, root]]) pts.push(polar(r, (t + f) * pitch))
  }
  return pts
}

// The spoked wheel's windows between `n` spokes, from the rim's inside at
// `inner` to the hub at `hub`. gap is half a spoke's width, in radians at the hub.
function windows(n = 6, inner = 29.5, hub = 15.5, gap = 0.17) {
  const out = []
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + gap
    const a1 = ((i + 1) / n) * Math.PI * 2 - gap
    const pts = []
    for (let k = 0; k <= 8; k++) pts.push(polar(inner, a0 - 0.06 + ((a1 - a0 + 0.12) * k) / 8))
    for (let k = 8; k >= 0; k--) pts.push(polar(hub, a0 + ((a1 - a0) * k) / 8))
    out.push(pts)
  }
  return out
}

// A rib: a narrow bar along the radius at angle a, from r0 to r1.
function rib(a, r0, r1, half) {
  const [ux, uy] = [Math.cos(a), Math.sin(a)]
  const [vx, vy] = [-uy * half, ux * half]
  return [[ux * r0 - vx, uy * r0 - vy], [ux * r1 - vx, uy * r1 - vy], [ux * r1 + vx, uy * r1 + vy], [ux * r0 + vx, uy * r0 + vy]]
}
// Short radial strokes, as one path: tick marks and engraved spokes.
const radials = (count, r0, r1, phase = 0) => Array.from({ length: count }, (_, i) => {
  const a = phase + (i / count) * Math.PI * 2
  const [x0, y0] = polar(r0, a)
  const [x1, y1] = polar(r1, a)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}`
}).join("")
// A regular polygon outline, engraved: the hex of a nut on the cog's face.
const polygonD = (n, r, phase = 0) => loopD(Array.from({ length: n }, (_, i) => polar(r, phase + (i / n) * Math.PI * 2)))

const circleD = (r, cx = 0, cy = 0) => `M${cx + r} ${cy}a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0Z`
const loopD = (loop) => "M" + loop.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") + "Z"

// base and top: heights in units. turn: degrees over the whole change. Parts
// are painted in this order, lowest first.
//
// A model is a set of choices for the same machine: how many teeth the ring
// has and how deep, whether it has lightening holes, a spoked wheel (spokes)
// or a solid disc with round ports (ports), and how many teeth the hub cog
// has. "classic" is the button and the page change; the rest are variations
// for the large gears on the second page.
export const MODELS = {
  classic: { name: "Classic", teeth: 36, root: 44, holes: 12, spokes: 6, cog: 12 },
  fine: { name: "Fine", teeth: 54, root: 46.4, holes: 0, spokes: 4, cog: 16 },
  chunky: { name: "Chunky", teeth: 24, root: 43.5, holes: 8, spokes: 5, cog: 8 },
  disc: { name: "Disc", teeth: 42, root: 45, holes: 0, ports: 8, cog: 10 },
  star: { name: "Star", teeth: 30, root: 44, holes: 15, spokes: 3, cog: 12 },
}

const around = (n, fn, phase = 0) => Array.from({ length: n }, (_, i) => fn(phase + (i / n) * Math.PI * 2, i))

function partsOf(m) {
  const ring = {
    name: "ring", base: 0, top: 3, turn: 110,
    loops: [outer(teeth(m.teeth, m.root, 50)), hole(ringPts(36.5, 64)), ...around(m.holes, (a) => hole(ringPts(1.6, 10, ...polar(40.2, a))))],
    lines: circleD(m.root - 1.4) + (m.holes ? "" : around(m.teeth, (a) => circleD(0.35, ...polar(m.root - 2.6, a))).join("")),
  }
  // A lip round the ring's bore, standing a step above it.
  const lip = {
    name: "lip", base: 3, top: 4.2, turn: 110,
    loops: [outer(ringPts(38.6, 64)), hole(ringPts(36.5, 64))],
    lines: around(24, (a) => circleD(0.35, ...polar(37.55, a))).join(""),
  }
  let wheel, detail
  if (m.ports) {
    // A solid disc with round ports, each with a raised collar, and a bolt
    // circle between them.
    const portAt = (a) => polar(23, a) // ports of radius 5 with collars to 6.3: clear of the hub collar and the rim's bead
    wheel = {
      name: "wheel", base: 1.5, top: 5, turn: -80,
      loops: [outer(ringPts(34, 64)), ...around(m.ports, (a) => hole(ringPts(5, 28, ...portAt(a)))), hole(ringPts(11.5, 32))],
      lines: circleD(33) + radials(60, 32, 33) + circleD(16.2) + around(m.ports, (a) => circleD(0.7, ...polar(32.4, a)), Math.PI / m.ports).join(""),
    }
    detail = {
      name: "wheel-detail", base: 5, top: 5.9, turn: -80,
      loops: [
        outer(ringPts(31, 64)), hole(ringPts(29.6, 64)),
        ...around(m.ports, (a) => [outer(ringPts(6.3, 28, ...portAt(a))), hole(ringPts(5, 28, ...portAt(a)))]).flat(),
      ],
      lines: around(m.ports, (a) => circleD(0.4, ...polar(16.6, a)), Math.PI / m.ports).join(""),
    }
  } else {
    // Raised work on the wheel: a rib down each spoke, a bead inside the rim
    // and a boss where each spoke meets it.
    const gap = Math.min(0.17 * (6 / m.spokes), 0.3)
    wheel = {
      name: "wheel", base: 1.5, top: 5, turn: -80,
      loops: [outer(ringPts(34, 64)), ...windows(m.spokes, 29.5, 15.5, gap).map(hole), hole(ringPts(11.5, 32))],
      lines: circleD(33) + radials(60, 32, 33) + around(m.spokes, (a) => circleD(0.9, ...polar(32.4, a)), Math.PI / m.spokes).join(""),
    }
    detail = {
      name: "wheel-detail", base: 5, top: 5.9, turn: -80,
      loops: [
        outer(ringPts(31, 64)), hole(ringPts(29.6, 64)),
        ...around(m.spokes, (a) => outer(rib(a, 16.2, 29.4, 0.8))),
        ...around(m.spokes, (a) => outer(ringPts(1.3, 14, ...polar(32.3, a)))),
      ],
      lines: around(m.spokes, (a) => circleD(0.45, ...polar(32.3, a))).join(""),
    }
  }
  // A collar on the wheel's hub, round the cog.
  const collar = {
    name: "collar", base: 5, top: 6.2, turn: -80,
    loops: [outer(ringPts(15, 40)), hole(ringPts(11.5, 32))],
    lines: around(6, (a) => circleD(0.6, ...polar(13.25, a))).join("") + radials(24, 14.2, 15, Math.PI / 24) + circleD(12.3),
  }
  // The cog's face is where the page change's zoom ends, so its detail is all
  // engraved: a hex nut, a washer ring, a pitch circle with a dot per tooth.
  const cog = {
    name: "cog", base: 3, top: 7, turn: 320,
    loops: [outer(teeth(m.cog, 7.4, 10))],
    lines: polygonD(6, 3.6, Math.PI / 6) + circleD(2) + circleD(0.6) + circleD(4.6) + radials(m.cog, 4.6, 6.2, Math.PI / m.cog) + circleD(6.6) + around(m.cog, (a) => circleD(0.28, ...polar(7.0, a))).join(""),
  }
  const parts = [ring, lip, wheel, detail, collar, cog]
  parts.forEach(boundsOf)
  return parts
}

// How far a part reaches across the plane, for the painter's order: from its
// bore (the centre, for a solid part) out to its farthest point.
function boundsOf(part) {
  let rmax = 0, outerMin = Infinity, bore = Infinity
  for (const loop of part.loops) {
    const d = loop.map(([x, y]) => Math.hypot(x, y))
    rmax = Math.max(rmax, ...d)
    if (area(loop) > 0) outerMin = Math.min(outerMin, ...d)
    else {
      const [cx, cy] = loop.reduce(([sx, sy], [x, y]) => [sx + x / loop.length, sy + y / loop.length], [0, 0])
      if (Math.hypot(cx, cy) < 1) bore = Math.min(bore, ...d)
    }
  }
  part.rmin = bore === Infinity ? 0 : Math.min(bore, outerMin)
  part.rmax = rmax
}

// The order to paint the parts in, for one half of the gear (the far half,
// beyond the axis, or the near half) seen from the front or the back. Parts
// that don't overlap across the plane go by radius: on the far half the
// outer one is farther away, on the near half the inner one. Parts stacked on
// one another go by height: from the front the lower one is farther away.
function orderOf(parts, near, above) {
  const before = (a, b) => {
    if (a.rmin >= b.rmax - 0.01) return !near
    if (b.rmin >= a.rmax - 0.01) return near
    const za = a.base + a.top, zb = b.base + b.top
    return above ? za < zb : za > zb
  }
  const left = [...parts], out = []
  while (left.length) {
    const i = left.findIndex((a) => !left.some((b) => b !== a && before(b, a)))
    out.push(...left.splice(Math.max(0, i), 1))
  }
  return out
}
const built = {}
const partsFor = (model) => (built[model] ??= partsOf(MODELS[model] || MODELS.classic))
const COG_TOP = 7

// The side walls of one part turned by `deg`, in screen units: every edge whose
// outward side faces the viewer gets a wall from its top edge to its bottom
// edge, sorted into one of four tones by how it faces the light, and into the
// far or near half of the gear by where it is. The foot line runs along the
// wall's far end: the bottom seen from the front, the top seen from the back.
function walls(part, deg, depth, cam) {
  const halves = [0, 1].map(() => ({ sides: Array.from({ length: SHADES }, () => []), foot: [] }))
  if (!cam.walls) return halves
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  const [m0, m1, m2, m3] = cam.m
  const zt = part.top * depth
  const zb = part.base * depth
  const zf = cam.above ? zb : zt
  const f = (v) => v.toFixed(2)
  const at = (x, y, z) => `${f(m0 * x + m2 * y + cam.up[0] * z)} ${f(m1 * x + m3 * y + cam.up[1] * z)}`
  for (const loop of part.loops) {
    const pts = loop.map(([x, y]) => [x * c - y * s, x * s + y * c])
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[(i + 1) % pts.length]
      const len = Math.hypot(x1 - x0, y1 - y0) || 1
      const nx = (y1 - y0) / len
      const ny = -(x1 - x0) / len
      if (nx * U[0] + ny * U[1] <= 0) continue
      const lit = (nx * LIGHT[0] + ny * LIGHT[1] + 1) / 2
      const shade = Math.min(SHADES - 1, Math.floor(lit * SHADES))
      const half = halves[(x0 + x1) * U[0] + (y0 + y1) * U[1] > 0 ? 1 : 0]
      half.sides[shade].push(`M${at(x0, y0, zt)}L${at(x1, y1, zt)}L${at(x1, y1, zb)}L${at(x0, y0, zb)}Z`)
      half.foot.push(`M${at(x0, y0, zf)}L${at(x1, y1, zf)}`)
    }
  }
  return halves
}

// Each part is drawn twice, once per half of the gear, its face clipped to
// that half (in the gear's plane, before the part turns). The near half's clip
// reaches a hair past the axis so the two halves of a face meet without a seam.
const BIG = 400
const halfD = (from, to) => loopD([
  [W[0] * BIG + U[0] * from, W[1] * BIG + U[1] * from], [W[0] * BIG + U[0] * to, W[1] * BIG + U[1] * to],
  [-W[0] * BIG + U[0] * to, -W[1] * BIG + U[1] * to], [-W[0] * BIG + U[0] * from, -W[1] * BIG + U[1] * from],
])
const HALVES = [["far", halfD(-BIG, 0)], ["near", halfD(-0.3, BIG)]]

// Each drawing gets its own gradient and clip ids: the button and the sheet
// can be on the page together in different finishes, and a shared id would
// make one borrow the other's. The colours come from index.css (.gw, .gw-dark).
let drawings = 0
const markup = (parts, sheet, id) => `
  <defs>
    <radialGradient id="${id}" cx="0" cy="0" r="50" gradientUnits="userSpaceOnUse">
      <stop class="gw-stop-0" offset="0"/>
      <stop class="gw-stop-1" offset="0.7"/>
      <stop class="gw-stop-2" offset="1"/>
    </radialGradient>
    ${HALVES.map(([h, d]) => `<clipPath id="${id}-${h}" clipPathUnits="userSpaceOnUse"><path d="${d}"/></clipPath>`).join("")}
  </defs>
  ${sheet ? `<rect class="gw-fill" width="100%" height="100%"/>` : ""}
  <g class="gw-at">${HALVES.map(([h]) => `
    <g class="gw-half" data-half="${h}">${parts.map((p) => `
      <g data-part="${p.name}">
        ${Array.from({ length: SHADES }, (_, i) => `<path class="gw-side" data-shade="${i}"/>`).join("")}
        <path class="gw-foot"/>
        <g class="gw-lift">
          <g clip-path="url(#${id}-${h})">
            <g class="gw-turn">
              <path class="gw-body" fill="url(#${id})" fill-rule="evenodd" d="${p.loops.map(loopD).join("")}"/>
              <path class="gw-line" d="${p.lines}"/>
              <path class="gw-rim" d="${p.loops.map(loopD).join("")}"/>
            </g>
          </g>
        </g>
      </g>`).join("")}
    </g>`).join("")}
  </g>`

// Draws the mechanism into an <svg> or a <g> inside one. view turns the
// picture (degrees); the button and the first wave use VIEW.turn. pose() places it: centre in the svg's own
// pixels, scale in pixels per unit, and turn, where 1 is how far the parts
// turn over one page change (the ring 110 degrees, the wheel back 80, the cog
// 320). The cog's top face stays on the centre, so lower parts slide out from
// under it to the lower left as the scale grows. tilt is the camera's
// elevation in degrees (see cameraFor): 58 unless given.
export function mechanism(svg, { sheet = false, view = VIEW.turn, model = "classic" } = {}) {
  const PARTS = partsFor(model)
  svg.innerHTML = markup(PARTS, sheet, "gw-metal-" + ++drawings)
  const at = svg.querySelector(".gw-at")
  const halves = HALVES.map(([h]) => svg.querySelector(`[data-half="${h}"]`))
  const parts = PARTS.map((p) => ({
    p,
    halves: halves.map((half) => {
      const g = half.querySelector(`[data-part="${p.name}"]`)
      return { g, sides: [...g.querySelectorAll(".gw-side")], foot: g.querySelector(".gw-foot"), lift: g.querySelector(".gw-lift"), turn: g.querySelector(".gw-turn") }
    }),
  }))
  let tiltNow = null
  let aboveNow = null
  let cam = null
  // depth stretches every height: the transition deepens the parts as they
  // grow so their walls read at full size; the button keeps depth 1.
  return function pose(cx, cy, scale, turn, depth = 1, tilt = VIEW.elevation) {
    if (tilt !== tiltNow) {
      tiltNow = tilt
      cam = cameraFor(view, tilt)
      if (cam.above !== aboveNow) {
        aboveNow = cam.above
        halves.forEach((half, k) => orderOf(PARTS, k === 1, cam.above).forEach((p) => half.appendChild(parts[PARTS.indexOf(p)].halves[k].g)))
      }
    }
    const [ux, uy] = cam.up
    at.setAttribute("transform", `translate(${cx} ${cy}) scale(${scale}) translate(${-ux * COG_TOP * depth} ${-uy * COG_TOP * depth})`)
    const m = cam.m.join(" ")
    for (const { p: part, halves: hs } of parts) {
      const deg = part.turn * turn
      const w = walls(part, deg, depth, cam)
      const z = (cam.above ? part.top : part.base) * depth
      hs.forEach((h, k) => {
        h.sides.forEach((el, i) => el.setAttribute("d", w[k].sides[i].join("")))
        h.foot.setAttribute("d", w[k].foot.join(""))
        h.lift.setAttribute("transform", `translate(${ux * z} ${uy * z}) matrix(${m} 0 0)`)
        h.turn.setAttribute("transform", `rotate(${deg})`)
      })
    }
  }
}

export const REST_SCALE = REST_R / 50
// Line weight in the button, as a share of full weight: matches .gear-art in
// index.css.
const REST_WEIGHT = 0.4

// How far the gear has turned, kept here so the button on either page and the
// page change all start where the last one stopped.
let turned = 0
const watchers = new Set()
export const turnedNow = () => turned
export function setTurned(t) {
  turned = t
  watchers.forEach((fn) => fn(t))
}
export function watchTurned(fn) {
  watchers.add(fn)
  return () => watchers.delete(fn)
}

let busy = false
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x) }

// The second wave: a white gear with grey outlines that blooms out of a point
// lower left once the first wave has nearly covered the window, at another
// angle (its picture turned 90 degrees from the first) and spinning further,
// so it spirals out. It exists only here.
const WAVE2 = {
  startAt: 0.72, // share of the first wave done when the second starts
  ms: 1050,
  at: [0.3, 0.66], // its centre, as shares of the window
  view: VIEW.turn - 90,
  phase: 0.43, // its parts' turn when it starts: out of step with the first
  spin: 1.5, // how far its parts turn over the wave
  fromR: 12, // px: its radius when it appears
  weight: 0.8,
}
const TOTAL = MS * WAVE2.startAt + WAVE2.ms
// The first wave deepens its parts as it leaves the button, and its lines
// stay light, so the walls carry the shape as they do in the second wave.
const DEPTH = 1.9
const WAVE1_WEIGHT = 0.65

// Runs the change from progress `from` to `to` over both waves (0 = in the
// button, 1 = the second wave past the window's edges). midway() runs once
// the sheet covers the button; end() once the motion is over.
function run(button, from, to, midway, end) {
  busy = true
  const r = button.getBoundingClientRect()
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("class", "gw gear-wipe")
  svg.setAttribute("aria-hidden", "true")
  const layers = ["gw-wave", "gw-wave gw-ghost"].map((c) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    g.setAttribute("class", c)
    svg.appendChild(g)
    return g
  })
  document.body.appendChild(svg)
  const farFrom = (cx, cy) => Math.max(...[[0, 0], [innerWidth, 0], [0, innerHeight], [innerWidth, innerHeight]].map(([x, y]) => Math.hypot(x - cx, y - cy)))

  // The first wave: out of the button.
  const c1 = [r.left + r.width / 2, r.top + r.height / 2]
  const pose1 = mechanism(layers[0], { sheet: true })
  const fill = layers[0].querySelector(".gw-fill")
  const s1 = farFrom(...c1) / END_AT
  // Going out, the turn runs from where the button stopped to one more; coming
  // home, from there back by one.
  const t0 = turnedNow() - from

  // The second wave.
  const c2 = [innerWidth * WAVE2.at[0], innerHeight * WAVE2.at[1]]
  const pose2 = mechanism(layers[1], { view: WAVE2.view })
  const a2 = WAVE2.fromR / 50
  const s2 = farFrom(...c2) / END_AT

  function wave(layer, p, weightFrom, weight) {
    // Lines fade as the cog's plain white takes over.
    layer.style.setProperty("--ink", 1 - smooth(0.82, 0.98, p))
    layer.style.setProperty("--weight", weightFrom + (weight - weightFrom) * smooth(0, 0.25, p))
  }
  function frame(P) {
    const ms = P * TOTAL
    const p1 = Math.min(1, ms / MS)
    const e1 = easeInOut(p1)
    pose1(...c1, REST_SCALE * (s1 / REST_SCALE) ** e1, t0 + e1, 1 + (DEPTH - 1) * smooth(0, 0.45, p1)) // zoom at an even pace on a log scale
    wave(layers[0], p1, REST_WEIGHT, WAVE1_WEIGHT)
    fill.style.opacity = smooth(0.97, 1, p1) // the white sheet only guards the end

    const p2 = Math.min(1, Math.max(0, (ms - MS * WAVE2.startAt) / WAVE2.ms))
    layers[1].style.display = p2 > 0 ? "" : "none"
    if (p2 > 0) {
      const e2 = 1 - (1 - p2) ** 2.4 // opens at once, settles as it covers
      pose2(...c2, a2 * (s2 / a2) ** e2, WAVE2.phase + WAVE2.spin * e2)
      wave(layers[1], p2, 0.5, WAVE2.weight)
      layers[1].style.opacity = smooth(0, 0.1, p2) // it grows out of nothing
    }
  }
  frame(from)
  document.documentElement.classList.add("gear-moving")
  midway?.()
  const start = performance.now()
  function tick(now) {
    const t = Math.min(1, (now - start) / TOTAL)
    frame(from + (to - from) * t)
    if (t < 1) return requestAnimationFrame(tick)
    setTurned(t0 + to)
    end?.()
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.classList.remove("gear-moving")
      svg.remove()
      busy = false
    }))
  }
  requestAnimationFrame(tick)
}

// Zooms the mechanism out of the button over the window, then calls covered()
// to swap the page underneath.
export function wipeOut(button, covered) {
  if (busy) return
  if (reduced()) return covered()
  run(button, 0, 1, null, covered)
}

// Covers the window at once, calls covered() to swap the page underneath,
// then shrinks the mechanism back into the button.
export function wipeIn(button, covered) {
  if (busy) return
  if (reduced()) return covered()
  run(button, 1, 0, covered, null)
}
