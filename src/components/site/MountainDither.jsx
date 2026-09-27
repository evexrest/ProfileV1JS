import { useEffect, useRef } from "react"

// A faint, dithered mountain drawn behind the name. Its ridge is traced through
// the points each letter reaches when it jumps, so a sweep across the name
// lands every letter on the outline.
//
// Drawn on a canvas at one canvas pixel per dither cell, then stretched with
// `image-rendering: pixelated`, so the cells stay crisp squares at any scale.

const CELL = 0.028 // em per dither cell
const PAD_X = 1.1 // em of foothills either side of the word
const HEAD = 0.45 // em of air above the summit
const FOOT = 0.22 // em below the baseline, where the mountain fades out

// The sheen that passes over the mountain now and then.
const SHEEN_PERIOD = 11000 // ms from the start of one sweep to the next
const SHEEN_SWEEP = 4200 // ms a sweep takes to cross
const SHEEN_W = 0.45 // em, half-width of the band of light
const SHEEN_GAIN = 0.7 // how much denser the dither gets at the band's centre
const SHEEN_LEAN = 0.35 // em the band leans right per em of height
const SHEEN_FPS = 30 // dither moves in whole cells, so more frames buy nothing

// 8x8 ordered-dither thresholds, 0..1.
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64)

// Deterministic value noise, so the jagged ridge is the same on every load.
function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}
function noise(x) {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  return hash(i) * (1 - u) + hash(i + 1) * u
}

function gauss(x, w) { return Math.exp(-(x * x) / (2 * w * w)) }

// How dense the dither is at a point, 0..1, for each style. `d` is how far
// below the ridge the point is, in em (negative is above it); `u` is the same
// as a share of the mountain's height there, 0 at the ridge and 1 at the foot,
// so every slope fades out evenly however tall it is.
const STYLES = {
  // Soft fill, brightest along the ridge, fading down the slopes.
  ridge: ({ d, u, lit }) => (d < 0 ? 0 : (lit ? 0.95 : 0.5) * (1 - u) ** 1.5),

  // Hard light: sunlit faces and shadowed faces, snow on the high points.
  summit: ({ d, u, lit, high }) => {
    if (d < 0) return 0
    const snow = d < 0.14 && high ? 0.35 : 0
    return Math.min(1, (lit ? 1 : 0.28) * (1 - u) ** 1.2 + snow)
  },

  // Outline only, with two faint contour lines beneath, like a topo map.
  contour: ({ d, u }) => {
    if (Math.abs(d) < 0.035) return 0.95
    if (Math.abs(u - 0.3) < 0.025) return 0.5
    if (Math.abs(u - 0.6) < 0.025) return 0.3
    return 0
  },

  // The main peak in front of a fainter range behind it.
  range: ({ d, u, lit, back, ub }) => {
    if (d >= 0) return (lit ? 0.95 : 0.5) * (1 - u) ** 1.5
    return back >= 0 ? 0.5 * (1 - ub) ** 1.4 : 0
  },
}

// Straight runs between points: sharp peaks and notches, not curves.
function linear(pts, x) {
  if (x <= pts[0][0]) return pts[0][1]
  const last = pts.length - 1
  if (x >= pts[last][0]) return pts[last][1]
  let i = 0
  while (x > pts[i + 1][0]) i++
  const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0])
  return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t
}

export function MountainDither({ letters, baseline, style = "ridge" }) {
  const canvas = useRef(null)

  useEffect(() => {
    const el = canvas.current
    const wrap = el?.parentElement
    if (!el || !wrap) return

    function draw() {
      const spans = letters.current.filter(Boolean)
      const base = baseline.current
      if (!spans.length || !base) return
      const h1 = base.parentElement
      const cs = getComputedStyle(h1)
      const em = parseFloat(cs.fontSize)
      const liftK = parseFloat(cs.getPropertyValue("--lift-k")) || 1

      // Everything below is in em, measured from the left of the first letter
      // and the baseline, with y pointing up.
      const x0 = spans[0].offsetLeft
      const baseY = base.offsetTop
      // Letters land their baseline on the ridge.
      const rideY = 0
      const tops = spans.map((s) => [
        (s.offsetLeft + s.offsetWidth / 2 - x0) / em,
        parseFloat(s.style.getPropertyValue("--lift")) * liftK + rideY,
      ])
      const wordW = (spans.at(-1).offsetLeft + spans.at(-1).offsetWidth - x0) / em
      // A sharp, uneven outline. Each letter's landing spot is a point on
      // it; between letters there is a notch, or now and then a crag, and the
      // shoulders either side are lopsided. Seeded, so it is the same every load.
      const pts = [[-PAD_X, rideY - FOOT - 0.1], [-0.74, rideY - 0.19], [-0.52, rideY - 0.02], [-0.3, rideY - 0.13]]
      tops.forEach((t, i) => {
        pts.push(t)
        const n = tops[i + 1]
        if (!n) return
        const h = hash(i + 3.7)
        const f = 0.35 + 0.3 * hash(i + 9.1)
        const mx = t[0] + (n[0] - t[0]) * f
        const my = t[1] + (n[1] - t[1]) * f
        pts.push([mx, my + (h < 0.3 ? 0.06 + 0.1 * h : -(0.06 + 0.14 * h))])
      })
      pts.push(
        [wordW + 0.22, rideY - 0.06], [wordW + 0.42, rideY - 0.25], [wordW + 0.6, rideY - 0.12],
        [wordW + 0.86, rideY - 0.31], [wordW + PAD_X, rideY - FOOT - 0.1],
      )
      let peak = tops[0]
      tops.forEach((t) => { if (t[1] > peak[1]) peak = t })

      function ridgeAt(x) {
        // Fine crags on top, pinned flat at each letter so it lands cleanly.
        const near = Math.min(...tops.map((t) => Math.abs(x - t[0])))
        return linear(pts, x) + (noise(x * 23) - 0.5) * 0.04 * Math.min(1, near * 6)
      }
      // Faces: from each point on the ridge a spur runs down and outward, and
      // a face is lit when the ridge above it climbs toward the summit, as if
      // the light comes from the upper left.
      function litAt(x, d) {
        const xs = x < peak[0] ? x + 0.55 * d : x - 0.55 * d
        return linear(pts, xs + 0.01) - linear(pts, xs - 0.01) > 0
      }
      function backAt(x) {
        const top = peak[1]
        const crags = -Math.abs(noise(x * 5) - 0.5) * 0.3
        return rideY - 0.2 + crags + top * 0.86 * gauss(x - peak[0] + wordW * 0.52, wordW * 0.15) +
          top * 0.74 * gauss(x - peak[0] - wordW * 0.5, wordW * 0.14)
      }

      const left = -PAD_X, right = wordW + PAD_X
      const topY = peak[1] + HEAD, bottomY = -FOOT
      const cols = Math.ceil((right - left) / CELL)
      const rows = Math.ceil((topY - bottomY) / CELL)
      el.width = cols
      el.height = rows
      el.style.left = x0 + left * em + "px"
      el.style.top = baseY - topY * em + "px"
      el.style.width = cols * CELL * em + "px"
      el.style.height = rows * CELL * em + "px"

      // Each cell's density, worked out once per layout. Frames only re-threshold it.
      const density = new Float32Array(cols * rows)
      const shade = STYLES[style] || STYLES.ridge
      for (let c = 0; c < cols; c++) {
        const x = left + (c + 0.5) * CELL
        const r = ridgeAt(x)
        const b = backAt(x)
        for (let rw = 0; rw < rows; rw++) {
          const y = topY - (rw + 0.5) * CELL
          const u = Math.min(1, Math.max(0, (r - y) / Math.max(0.05, r - bottomY)))
          const ub = Math.min(1, Math.max(0, (b - y) / Math.max(0.05, b - bottomY)))
          const d = r - y
          let t = shade({ d, u, lit: d >= 0 && litAt(x, d), high: r > peak[1] * 0.72, back: b - y, ub })
          // Fade out toward the bottom edge so there is no hard floor.
          t *= Math.min(1, (y - bottomY) / 0.2)
          density[rw * cols + c] = t
        }
      }
      const ctx = el.getContext("2d")
      field = { ctx, img: ctx.createImageData(cols, rows), density, cols, rows, left, right, topY }
      paint(null)
    }

    // The sheen: a soft diagonal band of light that glides across the mountain
    // left to right, then rests. It only thickens cells the mountain already
    // has, so the outline never moves and no new cells appear.
    let field = null
    function paint(band) {
      if (!field) return
      const { ctx, img, density, cols, rows, left, topY } = field
      const px = img.data
      for (let rw = 0; rw < rows; rw++) {
        const y = topY - (rw + 0.5) * CELL
        for (let c = 0; c < cols; c++) {
          const i = rw * cols + c
          let t = density[i]
          if (t > 0 && band !== null) {
            // Leans with the slope: higher up, the band is further along.
            const off = left + (c + 0.5) * CELL - band - y * SHEEN_LEAN
            t *= 1 + SHEEN_GAIN * Math.exp(-(off * off) / (2 * SHEEN_W * SHEEN_W))
          }
          const on = t > BAYER[(rw % 8) * 8 + (c % 8)]
          const j = i * 4
          px[j] = 241
          px[j + 1] = 243
          px[j + 2] = 245
          px[j + 3] = on ? 255 : 0
        }
      }
      ctx.putImageData(img, 0, 0)
    }

    let frame = null
    let lastPaint = 0
    let resting = true
    const still = window.matchMedia("(prefers-reduced-motion: reduce)")
    function tick(now) {
      frame = window.requestAnimationFrame(tick)
      if (!field) return
      const p = (now % SHEEN_PERIOD) / SHEEN_SWEEP
      if (p >= 1) {
        // Between sweeps: put the plain mountain back once, then do nothing.
        if (!resting) { resting = true; paint(null) }
        return
      }
      if (now - lastPaint < 1000 / SHEEN_FPS) return
      lastPaint = now
      resting = false
      // Eases in and out, and starts and ends fully off the mountain.
      const e = p * p * (3 - 2 * p)
      const from = field.left - 3 * SHEEN_W
      const to = field.right + 3 * SHEEN_W + (field.topY * SHEEN_LEAN)
      paint(from + (to - from) * e)
    }
    function setMotion() {
      if (frame !== null) window.cancelAnimationFrame(frame)
      frame = null
      if (still.matches) { resting = true; paint(null) }
      else frame = window.requestAnimationFrame(tick)
    }

    draw()
    setMotion()
    still.addEventListener("change", setMotion)
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    window.addEventListener("resize", draw)
    document.fonts?.ready.then(draw)
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      still.removeEventListener("change", setMotion)
      ro.disconnect()
      window.removeEventListener("resize", draw)
    }
  }, [letters, baseline, style])

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="pointer-events-none absolute -z-10 opacity-[0.16] [image-rendering:pixelated]"
    />
  )
}
