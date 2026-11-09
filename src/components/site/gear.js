import * as k from "@/lib/iso-kit.js"

// The settings gear, drawn as a small machined part lying flat and seen from
// above at an angle: a ten-tooth spur gear with a groove round its rim, five
// lightening holes in its web, a raised hub held by five screws, and a keyed
// bore. Units are world units; the picture is fitted to a 96 x 96 box.
const TEETH = 10
const TIP = 40
const ROOT = 33
const THICK = 7
const HUB_R = 12
const HUB_H = 4
const BORE_R = 4.6
const HOLES = 5
const HOLE_AT = 22
const HOLE_R = 5
// Teeth, holes and screws all repeat every fifth of a turn, so the drawing
// does too: angles are taken modulo this.
export const PERIOD = (Math.PI * 2) / HOLES

const SIZE = 96
const P = k.fitProjection(
  [...k.boxCorners({ x: -TIP, y: -TIP, w: TIP * 2, d: TIP * 2 }, 0, THICK + HUB_H)],
  SIZE,
  SIZE,
  { pad: 6, azimuth: 45, elevation: 48 },
)

const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)]

// One tooth is a trapezoid on the root circle: wide at the root, narrow at the tip.
function gearRing(turn) {
  const ring = []
  const pitch = (Math.PI * 2) / TEETH
  for (let t = 0; t < TEETH; t++) {
    const a = turn + t * pitch
    const arc = [-0.5, -0.36, -0.22, -0.13, 0.13, 0.22, 0.36]
    const radius = [ROOT, ROOT, ROOT, TIP, TIP, ROOT, ROOT]
    arc.forEach((f, i) => ring.push(polar(radius[i], a + f * pitch)))
  }
  return ring
}

const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const flatOn = (cx, cy, r, z, steps = 28) => k.onTop(k.circleRing(cx, cy, r, steps), z, P, true)

// A hole seen from above: the dark opening, the far wall's bottom edge showing
// inside it, then its rim. The wall is clipped to the opening.
function hole(id, cx, cy, r, z, depth) {
  const near = flatOn(cx, cy, r, z)
  const sunk = flatOn(cx, cy, r, z - depth)
  return (
    `<clipPath id="${id}"><path d="${near}"/></clipPath>` +
    `<path class="gear-hole" d="${near}"/>` +
    `<path class="gear-wall" clip-path="url(#${id})" d="${near}"/>` +
    `<path class="gear-hole" clip-path="url(#${id})" d="${sunk}"/>` +
    L(near, { tone: "mid" })
  )
}

// Points on the top face given along the turn (u) and across it (v).
const turned = (turn, pairs) => pairs.map(([u, v]) => [u * Math.cos(turn) - v * Math.sin(turn), u * Math.sin(turn) + v * Math.cos(turn)])

// The kit draws a solid's edges last, which suits convex parts. The gear is
// not convex: the flanks of the far teeth sit behind its top face, so their
// edges go down first and the top face is laid over them, then its rim.
function gearBody(ring) {
  const b = k.extrude(ring, 0, THICK, P, { convex: false })
  const shades = b.shades.map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" d="${d}"/>` : "")).join("")
  return (
    `<g class="iso-solid" data-lit="">` +
    `<path class="iso-fill" d="${b.fill}"/>${shades}` +
    `<path class="iso-line" data-tone="lit" d="${b.outline}"/>` +
    `<path class="iso-top" d="${b.top}"/>` +
    `<path class="iso-line" data-tone="lit" d="${b.top}"/>` +
    `</g>`
  )
}

export function drawGear(turn) {
  const top = THICK
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -TIP + 6, y: -TIP + 6, w: TIP * 2 - 12, d: TIP * 2 - 12, r: TIP - 6 }, 0, THICK, P)}"/>`]
  out.push(gearBody(gearRing(turn)))
  // A groove turned into the face just inside the tooth roots, and one round the web.
  out.push(L(flatOn(0, 0, ROOT - 3.5, top, 64), { tone: "lo" }))
  out.push(L(flatOn(0, 0, HUB_R + 3.5, top, 48), { tone: "faint" }))
  for (let i = 0; i < HOLES; i++) {
    const [x, y] = polar(HOLE_AT, turn + i * PERIOD + PERIOD / 2)
    out.push(hole("gear-h" + i, x, y, HOLE_R, top, THICK))
  }
  out.push(S(k.cylinder(0, 0, HUB_R, top, HUB_H, P, 40, 0.8), { tone: "lit", crease: "mid", lit: true }))
  const hubTop = top + HUB_H
  out.push(L(flatOn(0, 0, HUB_R - 2.2, hubTop, 40), { tone: "lo" }))
  const screws = Array.from({ length: HOLES }, (_, i) => polar(8.4, turn + i * PERIOD))
  out.push(L(screws.map(([x, y]) => flatOn(x, y, 1.3, hubTop, 12)).join(""), { tone: "lo" }))
  out.push(k.dotsSvg(screws.map(([x, y]) => k.iso([x, y, hubTop], P)), { size: 0.55, tone: "hi" }))
  // The keyed bore: a round hole with a square notch on one side.
  out.push(hole("gear-bore", 0, 0, BORE_R, hubTop, THICK + HUB_H))
  const key = turned(turn, [[BORE_R - 0.5, -1.3], [BORE_R + 1.8, -1.3], [BORE_R + 1.8, 1.3], [BORE_R - 0.5, 1.3]])
  out.push(`<path class="gear-hole" d="${k.onTop(key, hubTop, P, true)}"/>`)
  out.push(L(k.onTop(key.slice(0, 4), hubTop, P), { tone: "mid" }))
  return out.join("")
}

export const VIEWBOX = `0 0 ${SIZE} ${SIZE}`
