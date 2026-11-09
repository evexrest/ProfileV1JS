// The page change: a white mechanism zooms out of the gear button. Three parts
// turn against each other: a toothed outer ring, a spoked wheel inside it and a
// solid cog at the hub, with open space between them where the page shows
// through. The zoom ends inside the cog, whose white body then covers the whole
// window, and the white second page is underneath. Going home plays it backwards, the
// mechanism shrinking back into the button.
//
// The parts are drawn once, flat, around (0, 0) on a radius of 50; each frame
// sets one transform per part, so the shapes stay sharp at any size.
const R = 50
const MS = 1100
const START_R = 30 // px: about the drawn gear in the button
const END_AT = 6.5 // units from the centre the farthest corner reaches at the end: inside the cog's body
const TURNS = { ring: 110, wheel: -80, cog: 320 } // degrees over the whole change

const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)]
const pt = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`
const circle = (r, cx = 0, cy = 0) => `M${cx + r} ${cy}a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0Z`

// A ring of teeth: square-shouldered trapezoids between the root and the tip.
function teeth(count, root, tip, turn = 0) {
  const ring = []
  const pitch = (Math.PI * 2) / count
  for (let t = 0; t < count; t++) {
    const a = turn + t * pitch
    for (const [f, r] of [[-0.5, root], [-0.24, root], [-0.15, tip], [0.15, tip], [0.24, root]]) ring.push(polar(r, a + f * pitch))
  }
  return "M" + ring.map(pt).join("L") + "Z"
}

// The outer ring: 36 teeth, a plain bore, and 12 lightening holes round it.
const ringD = teeth(36, 44, 50) + circle(36.5) + Array.from({ length: 12 }, (_, i) => circle(1.6, ...polar(40.2, (i / 12) * Math.PI * 2))).join("")

// The spoked wheel: a rim, six spokes and a hub, as one outline with the five
// windows between the spokes cut out of a solid disc.
function wheelD() {
  const rim = 34
  const inner = 29.5
  const hubOut = 15.5
  const half = 0.17 // radians either side of a spoke centre, at the hub
  let d = circle(rim)
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2 + half
    const a1 = ((i + 1) / 6) * Math.PI * 2 - half
    const b0 = a0 - 0.06 // spokes taper outward: a touch narrower at the rim
    const b1 = a1 + 0.06
    d += `M${pt(polar(hubOut, a0))}L${pt(polar(inner, b0))}A${inner} ${inner} 0 0 1 ${pt(polar(inner, b1))}L${pt(polar(hubOut, a1))}A${hubOut} ${hubOut} 0 0 0 ${pt(polar(hubOut, a0))}Z`
  }
  return d + circle(11.5)
}

// The cog that turns in the hub: 12 teeth on a solid body. Its bore is only
// engraved, so at the end the body covers the window with no hole.
const cogD = teeth(12, 7.4, 10)

// Engraved lines and rivets: the texture on each part.
const cogLines = circle(3.4) + circle(5.4) + circle(0.8)
const ringLines = [circle(41.8 + 1.6 + 0.6), circle(38.4)].join("")
const wheelLines = circle(31.8) + Array.from({ length: 6 }, (_, i) => circle(0.9, ...polar(31.8, (i / 6) * Math.PI * 2 + Math.PI / 6))).join("")

const SVG = `
<svg class="gear-wipe" aria-hidden="true">
  <defs>
    <radialGradient id="gw-metal" cx="0" cy="0" r="${R}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.7" stop-color="#f4f7f7"/>
      <stop offset="1" stop-color="#e2e9e9"/>
    </radialGradient>
  </defs>
  <rect class="gw-fill" width="100%" height="100%"/>
  <g class="gw-at">
    <g class="gw-part" data-part="ring">
      <path class="gw-body" fill-rule="evenodd" d="${ringD}"/>
      <path class="gw-line" d="${ringLines}"/>
      <path class="gw-rim" fill-rule="evenodd" d="${ringD}"/>
    </g>
    <g class="gw-part" data-part="wheel">
      <path class="gw-body" fill-rule="evenodd" d="${wheelD()}"/>
      <path class="gw-line" d="${wheelLines}"/>
      <path class="gw-rim" fill-rule="evenodd" d="${wheelD()}"/>
    </g>
    <g class="gw-part" data-part="cog">
      <path class="gw-body" fill-rule="evenodd" d="${cogD}"/>
      <path class="gw-line" d="${cogLines}"/>
      <path class="gw-rim" fill-rule="evenodd" d="${cogD}"/>
    </g>
  </g>
</svg>`

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
  const parts = [...svg.querySelectorAll(".gw-part")].map((g) => [g, TURNS[g.dataset.part]])
  const s0 = START_R / R
  const s1 = far / END_AT
  // One frame at progress p (0 = in the button, 1 = past the window's edges).
  function frame(p) {
    const e = easeInOut(p)
    const scale = s0 * (s1 / s0) ** e // zoom at an even pace on a log scale
    at.setAttribute("transform", `translate(${cx} ${cy}) scale(${scale})`)
    for (const [g, turn] of parts) g.setAttribute("transform", `rotate(${turn * e})`)
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
