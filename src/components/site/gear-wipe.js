// The page change: a white mechanism zooms out of the gear button. Three parts
// turn against each other: a toothed outer ring, a spoked wheel inside it and a
// solid cog at the hub, with open space between them where the page shows
// through, and a smaller gear off to the side meshes with the ring's teeth.
// Each part is a slab with real thickness, stacked at different heights (ring
// lowest, cog highest), and the whole plane is tilted a little, seen from the
// same side as the button: side walls show to the lower left. The zoom ends inside the cog's top face,
// whose white then covers the whole window, and the white second page is
// underneath. Going home plays it backwards, shrinking back into the button.
//
// Parts are outlines around (0, 0) on a radius of 50. Each frame turns them,
// draws the side walls that face the viewer, shaded by which way they face,
// and lays the top face over them.
const MS = 1100
const START_R = 30 // px: about the drawn gear in the button
const END_AT = 5.4 // units from the cog's centre the farthest corner reaches at the end: inside its tilted top face
// The tilt: the plane is turned and squashed so circles read as ellipses.
const TILT = "rotate(-14) scale(1 0.8)"
const DOWN = [-0.55, 0.83] // screen direction one unit of height drops: down and to the left
const LIGHT = [-0.6, -0.8] // light from the upper left
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

const circleD = (r, cx = 0, cy = 0) => `M${cx + r} ${cy}a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0Z`
const loopD = (loop) => "M" + loop.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") + "Z"

// The side gear meshes with the outer ring: 15 teeth on the same tooth size,
// its centre at the sum of the two pitch radii, set where a ring gap points.
const MESH_AT = (145 * Math.PI) / 180
const SIDE = polar(47 + 19.6, MESH_AT)
const RATIO = 36 / 15
const shift = ([cx, cy], loop) => loop.map(([x, y]) => [x + cx, y + cy])
const spin = (deg, loop) => { const a = (deg * Math.PI) / 180; return loop.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]) }

// base and top: heights in units. turn: degrees over the whole change, about
// the part's centre. Parts are painted in this order, lowest first.
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
    name: "side", base: 0.4, top: 3.4, turn: -110 * RATIO, center: SIDE,
    loops: [
      outer(shift(SIDE, spin(13, teeth(15, 16.6, 22.6)))),
      hole(shift(SIDE, ring(3.6, 24))),
      ...Array.from({ length: 5 }, (_, i) => hole(shift(SIDE, ring(2.8, 16, ...polar(10.6, (i / 5) * Math.PI * 2))))),
    ],
    lines: circleD(15, ...SIDE) + circleD(6, ...SIDE),
  },
  {
    name: "wheel", base: 1.5, top: 5, turn: -80,
    loops: [outer(ring(34, 64)), ...windows().map(hole), hole(ring(11.5, 32))],
    lines: circleD(31.8) + Array.from({ length: 6 }, (_, i) => circleD(0.9, ...polar(31.8, (i / 6) * Math.PI * 2 + Math.PI / 6))).join(""),
  },
  {
    // A collar on the wheel's hub, round the cog.
    name: "collar", base: 5, top: 6.2, turn: -80,
    loops: [outer(ring(15, 40)), hole(ring(11.5, 32))],
    lines: Array.from({ length: 6 }, (_, i) => circleD(0.6, ...polar(13.25, (i / 6) * Math.PI * 2))).join(""),
  },
  {
    name: "cog", base: 3, top: 7, turn: 320,
    loops: [outer(teeth(12, 7.4, 10))],
    lines: circleD(3.4) + circleD(5.4) + circleD(0.8),
  },
]
const COG_TOP = PARTS.find((p) => p.name === "cog").top

const SVG = `
<svg class="gear-wipe" aria-hidden="true">
  <defs>
    <radialGradient id="gw-metal" cx="0" cy="0" r="50" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.7" stop-color="#f4f7f7"/>
      <stop offset="1" stop-color="#e2e9e9"/>
    </radialGradient>
  </defs>
  <rect class="gw-fill" width="100%" height="100%"/>
  <g class="gw-at">${PARTS.map((p) => `
    <g data-part="${p.name}">
      ${Array.from({ length: SHADES }, (_, i) => `<path class="gw-side" data-shade="${i}"/>`).join("")}
      <path class="gw-foot"/>
      <g class="gw-top" transform="translate(${-DOWN[0] * p.top} ${-DOWN[1] * p.top})">
        <g class="gw-turn" data-center="${(p.center ?? [0, 0]).join(" ")}">
          <path class="gw-body" fill-rule="evenodd" d="${p.loops.map(loopD).join("")}"/>
          <path class="gw-line" d="${p.lines}"/>
          <path class="gw-rim" d="${p.loops.map(loopD).join("")}"/>
        </g>
      </g>
    </g>`).join("")}
  </g>
</svg>`

// The side walls of one part turned by `deg`: every edge whose outward side
// faces down the screen gets a wall from its top edge to its bottom edge,
// sorted into one of four tones by how it faces the light.
function walls(part, deg) {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  const [ox, oy] = part.center ?? [0, 0]
  const [tx, ty] = [-DOWN[0] * part.top, -DOWN[1] * part.top]
  const [bx, by] = [-DOWN[0] * part.base, -DOWN[1] * part.base]
  const buckets = Array.from({ length: SHADES }, () => [])
  const foot = []
  for (const loop of part.loops) {
    const pts = loop.map(([x, y]) => [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c])
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

let busy = false
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x) }

function mount(button) {
  const r = button.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const far = Math.max(...[[0, 0], [innerWidth, 0], [0, innerHeight], [innerWidth, innerHeight]].map(([x, y]) => Math.hypot(x - cx, y - cy)))
  const host = document.createElement("div")
  host.innerHTML = SVG
  const svg = host.firstElementChild
  document.body.appendChild(svg)
  const at = svg.querySelector(".gw-at")
  const fill = svg.querySelector(".gw-fill")
  const parts = PARTS.map((p) => {
    const g = svg.querySelector(`[data-part="${p.name}"]`)
    return { p, sides: [...g.querySelectorAll(".gw-side")], foot: g.querySelector(".gw-foot"), turn: g.querySelector(".gw-turn") }
  })
  const s0 = START_R / 50
  const s1 = far / END_AT
  // One frame at progress p (0 = in the button, 1 = past the window's edges).
  // The cog's top face stays centred on the button, so the lower parts slide
  // out from under it to the lower left as the mechanism grows.
  function frame(p) {
    const e = easeInOut(p)
    const scale = s0 * (s1 / s0) ** e // zoom at an even pace on a log scale
    at.setAttribute("transform", `translate(${cx} ${cy}) scale(${scale}) ${TILT} translate(${DOWN[0] * COG_TOP} ${DOWN[1] * COG_TOP})`)
    for (const { p: part, sides, foot, turn } of parts) {
      const deg = part.turn * e
      const w = walls(part, deg)
      sides.forEach((el, i) => el.setAttribute("d", w.sides[i]))
      foot.setAttribute("d", w.foot)
      turn.setAttribute("transform", `rotate(${deg} ${turn.dataset.center})`)
    }
    at.style.opacity = smooth(0, 0.08, p)
    // The lines fade as the cog's plain white takes over; the white sheet only
    // guards the last frame.
    svg.style.setProperty("--ink", 1 - smooth(0.82, 0.98, p))
    fill.style.opacity = smooth(0.97, 1, p)
  }
  return { svg, frame }
}

function run(button, from, to, midway, end) {
  busy = true
  const { svg, frame } = mount(button)
  frame(from)
  midway?.()
  const start = performance.now()
  function tick(now) {
    const t = Math.min(1, (now - start) / MS)
    frame(from + (to - from) * t)
    if (t < 1) return requestAnimationFrame(tick)
    end?.()
    requestAnimationFrame(() => requestAnimationFrame(() => { svg.remove(); busy = false }))
  }
  requestAnimationFrame(tick)
}

// Zooms the mechanism out over the window, then calls covered() to swap the
// page underneath.
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
