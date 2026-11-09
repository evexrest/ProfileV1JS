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
// The camera: the kit's isometric view from azimuth 45, elevation 58, with the
// picture turned 55 degrees, as one matrix from the gear's plane to the
// screen. A unit of height moves a point up the screen by cos(elevation),
// which in plane units is cot(elevation) toward the viewer: DOWN is that
// direction. LIGHT is the kit's light.
const VIEW = { azimuth: 45, elevation: 58, turn: 55 }
const rad = (d) => (d * Math.PI) / 180
const [sA, cA, sE, cE] = [Math.sin(rad(VIEW.azimuth)), Math.cos(rad(VIEW.azimuth)), Math.sin(rad(VIEW.elevation)), Math.cos(rad(VIEW.elevation))]
const [sT, cT] = [Math.sin(rad(VIEW.turn)), Math.cos(rad(VIEW.turn))]
const flat = [[sA, -cA], [cA * sE, sA * sE]]
const CAMERA = [
  cT * flat[0][0] - sT * flat[1][0], sT * flat[0][0] + cT * flat[1][0],
  cT * flat[0][1] - sT * flat[1][1], sT * flat[0][1] + cT * flat[1][1],
]
const DOWN = [(cE / sE) * cA, (cE / sE) * sA]
const LIGHT = [-sA, cA]
const SHADES = 4

const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)]
const area = (loop) => loop.reduce((s, [x, y], i) => { const [u, v] = loop[(i + 1) % loop.length]; return s + x * v - u * y }, 0) / 2
// Outer outlines run one way and holes the other, so (dy, -dx) on any edge
// points out of the material.
const outer = (loop) => (area(loop) > 0 ? loop : loop.reverse())
const hole = (loop) => (area(loop) < 0 ? loop : loop.reverse())
const ring = (r, steps = 48, cx = 0, cy = 0) => Array.from({ length: steps }, (_, i) => { const [x, y] = polar(r, (i / steps) * Math.PI * 2); return [cx + x, cy + y] })

// A ring of teeth: square-shouldered trapezoids between the root and the tip.
function teeth(count, root, tip) {
  const pts = []
  const pitch = (Math.PI * 2) / count
  for (let t = 0; t < count; t++) {
    for (const [f, r] of [[-0.5, root], [-0.24, root], [-0.15, tip], [0.15, tip], [0.24, root]]) pts.push(polar(r, (t + f) * pitch))
  }
  return pts
}

// The spoked wheel's five-sided windows between the spokes.
function windows() {
  const out = []
  const inner = 29.5
  const hub = 15.5
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2 + 0.17
    const a1 = ((i + 1) / 6) * Math.PI * 2 - 0.17
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
const PARTS = [
  {
    name: "ring", base: 0, top: 3, turn: 110,
    loops: [outer(teeth(36, 44, 50)), hole(ring(36.5, 64)), ...Array.from({ length: 12 }, (_, i) => hole(ring(1.6, 10, ...polar(40.2, (i / 12) * Math.PI * 2))))],
    lines: circleD(42.6),
  },
  {
    // A lip round the ring's bore, standing a step above it.
    name: "lip", base: 3, top: 4.2, turn: 110,
    loops: [outer(ring(38.6, 64)), hole(ring(36.5, 64))],
    lines: Array.from({ length: 24 }, (_, i) => circleD(0.35, ...polar(37.55, (i / 24) * Math.PI * 2))).join(""),
  },
  {
    name: "wheel", base: 1.5, top: 5, turn: -80,
    loops: [outer(ring(34, 64)), ...windows().map(hole), hole(ring(11.5, 32))],
    lines: circleD(33) + radials(60, 32, 33) + Array.from({ length: 6 }, (_, i) => circleD(0.9, ...polar(32.4, (i / 6) * Math.PI * 2 + Math.PI / 6))).join(""),
  },
  {
    // Raised work on the wheel: a rib down each spoke, a bead inside the rim
    // and a boss where each spoke meets it.
    name: "wheel-detail", base: 5, top: 5.9, turn: -80,
    loops: [
      outer(ring(31, 64)), hole(ring(29.6, 64)),
      ...Array.from({ length: 6 }, (_, i) => outer(rib((i / 6) * Math.PI * 2, 16.2, 29.4, 0.8))),
      ...Array.from({ length: 6 }, (_, i) => outer(ring(1.3, 14, ...polar(32.3, (i / 6) * Math.PI * 2)))),
    ],
    lines: Array.from({ length: 6 }, (_, i) => circleD(0.45, ...polar(32.3, (i / 6) * Math.PI * 2))).join(""),
  },
  {
    // A collar on the wheel's hub, round the cog.
    name: "collar", base: 5, top: 6.2, turn: -80,
    loops: [outer(ring(15, 40)), hole(ring(11.5, 32))],
    lines: Array.from({ length: 6 }, (_, i) => circleD(0.6, ...polar(13.25, (i / 6) * Math.PI * 2))).join("") + radials(24, 14.2, 15, Math.PI / 24) + circleD(12.3),
  },
  {
    name: "cog", base: 3, top: 7, turn: 320,
    loops: [outer(teeth(12, 7.4, 10))],
    // The cog's face is where the zoom ends, so its detail is all engraved:
    // a hex nut, a washer ring, a pitch circle with a dot per tooth.
    lines: polygonD(6, 3.6, Math.PI / 6) + circleD(2) + circleD(0.6) + circleD(4.6) + radials(12, 4.6, 6.2, Math.PI / 12) + circleD(6.6) + Array.from({ length: 12 }, (_, i) => circleD(0.28, ...polar(7.0, (i / 12) * Math.PI * 2))).join(""),
  },
]
const COG_TOP = PARTS.find((p) => p.name === "cog").top

// The side walls of one part turned by `deg`: every edge whose outward side
// faces down the screen gets a wall from its top edge to its bottom edge,
// sorted into one of four tones by how it faces the light.
function walls(part, deg) {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  const [tx, ty] = [-DOWN[0] * part.top, -DOWN[1] * part.top]
  const [bx, by] = [-DOWN[0] * part.base, -DOWN[1] * part.base]
  const buckets = Array.from({ length: SHADES }, () => [])
  const foot = []
  for (const loop of part.loops) {
    const pts = loop.map(([x, y]) => [x * c - y * s, x * s + y * c])
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[(i + 1) % pts.length]
      const len = Math.hypot(x1 - x0, y1 - y0) || 1
      const nx = (y1 - y0) / len
      const ny = -(x1 - x0) / len
      if (nx * DOWN[0] + ny * DOWN[1] <= 0) continue
      const lit = (nx * LIGHT[0] + ny * LIGHT[1] + 1) / 2
      const shade = Math.min(SHADES - 1, Math.floor(lit * SHADES))
      const f = (v) => v.toFixed(2)
      buckets[shade].push(`M${f(x0 + tx)} ${f(y0 + ty)}L${f(x1 + tx)} ${f(y1 + ty)}L${f(x1 + bx)} ${f(y1 + by)}L${f(x0 + bx)} ${f(y0 + by)}Z`)
      foot.push(`M${f(x0 + bx)} ${f(y0 + by)}L${f(x1 + bx)} ${f(y1 + by)}`)
    }
  }
  return { sides: buckets.map((b) => b.join("")), foot: foot.join("") }
}


// Each drawing gets its own gradient id: the button and the sheet can be on
// the page together in different finishes, and a shared id would make one
// borrow the other's. The colours come from index.css (.gw, .gw-dark).
let drawings = 0
const markup = (sheet, id) => `
  <defs>
    <radialGradient id="${id}" cx="0" cy="0" r="50" gradientUnits="userSpaceOnUse">
      <stop class="gw-stop-0" offset="0"/>
      <stop class="gw-stop-1" offset="0.7"/>
      <stop class="gw-stop-2" offset="1"/>
    </radialGradient>
  </defs>
  ${sheet ? `<rect class="gw-fill" width="100%" height="100%"/>` : ""}
  <g class="gw-at">${PARTS.map((p) => `
    <g data-part="${p.name}">
      ${Array.from({ length: SHADES }, (_, i) => `<path class="gw-side" data-shade="${i}"/>`).join("")}
      <path class="gw-foot"/>
      <g transform="translate(${-DOWN[0] * p.top} ${-DOWN[1] * p.top})">
        <g class="gw-turn">
          <path class="gw-body" fill="url(#${id})" fill-rule="evenodd" d="${p.loops.map(loopD).join("")}"/>
          <path class="gw-line" d="${p.lines}"/>
          <path class="gw-rim" d="${p.loops.map(loopD).join("")}"/>
        </g>
      </g>
    </g>`).join("")}
  </g>`

// Draws the mechanism into an <svg>. pose() places it: centre in the svg's own
// pixels, scale in pixels per unit, and turn, where 1 is how far the parts
// turn over one page change (the ring 110 degrees, the wheel back 80, the cog
// 320). The cog's top face stays on the centre, so lower parts slide out from
// under it to the lower left as the scale grows.
export function mechanism(svg, { sheet = false } = {}) {
  svg.innerHTML = markup(sheet, "gw-metal-" + ++drawings)
  const at = svg.querySelector(".gw-at")
  const parts = PARTS.map((p) => {
    const g = svg.querySelector(`[data-part="${p.name}"]`)
    return { p, sides: [...g.querySelectorAll(".gw-side")], foot: g.querySelector(".gw-foot"), turn: g.querySelector(".gw-turn") }
  })
  return function pose(cx, cy, scale, turn) {
    at.setAttribute("transform", `translate(${cx} ${cy}) scale(${scale}) matrix(${CAMERA.join(" ")} 0 0) translate(${DOWN[0] * COG_TOP} ${DOWN[1] * COG_TOP})`)
    for (const { p: part, sides, foot, turn: g } of parts) {
      const deg = part.turn * turn
      const w = walls(part, deg)
      sides.forEach((el, i) => el.setAttribute("d", w.sides[i]))
      foot.setAttribute("d", w.foot)
      g.setAttribute("transform", `rotate(${deg})`)
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

// Runs the change from progress `from` to `to` (0 = in the button, 1 = past
// the window's edges). midway() runs once the sheet covers the button; end()
// once the motion is over.
function run(button, from, to, midway, end) {
  busy = true
  const r = button.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const far = Math.max(...[[0, 0], [innerWidth, 0], [0, innerHeight], [innerWidth, innerHeight]].map(([x, y]) => Math.hypot(x - cx, y - cy)))
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("class", "gw gear-wipe")
  svg.setAttribute("aria-hidden", "true")
  document.body.appendChild(svg)
  const pose = mechanism(svg, { sheet: true })
  const fill = svg.querySelector(".gw-fill")
  const s1 = far / END_AT
  // Going out, the turn runs from where the button stopped to one more; coming
  // home, from there back by one.
  const t0 = turnedNow() - from
  function frame(p) {
    const e = easeInOut(p)
    pose(cx, cy, REST_SCALE * (s1 / REST_SCALE) ** e, t0 + e) // zoom at an even pace on a log scale
    // The lines fade as the cog's plain white takes over; the white sheet only
    // guards the last frame.
    svg.style.setProperty("--ink", 1 - smooth(0.82, 0.98, p))
    svg.style.setProperty("--weight", REST_WEIGHT + (1 - REST_WEIGHT) * smooth(0, 0.25, p))
    fill.style.opacity = smooth(0.97, 1, p)
  }
  frame(from)
  document.documentElement.classList.add("gear-moving")
  midway?.()
  const start = performance.now()
  function tick(now) {
    const t = Math.min(1, (now - start) / MS)
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
