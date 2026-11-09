import { ROOT_SHARE, SILHOUETTE } from "@/components/site/gear"

// The page change: a white gear grows out of the gear button, turning as it
// goes, until it covers the window; or the reverse, shrinking back into the
// button. Only transform and opacity animate, so it stays on the compositor.
const SIZE = 100 // px: the shape's box before scaling
const START = 0.7 // the shape's box starts about the size of the drawn gear
const TURN = 140 // degrees it turns on the way out
const MS = 800
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)"

// One page change at a time: clicks during a change are ignored.
let busy = false
const done = () => { busy = false }

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

function overlayAt(button) {
  const r = button.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  // Big enough that even the gaps between teeth reach the farthest corner.
  const far = Math.max(Math.hypot(cx, cy), Math.hypot(window.innerWidth - cx, cy), Math.hypot(cx, window.innerHeight - cy), Math.hypot(window.innerWidth - cx, window.innerHeight - cy))
  const end = (far / ((SIZE / 2) * ROOT_SHARE)) * 1.05
  const el = document.createElement("div")
  el.className = "gear-wipe"
  el.setAttribute("aria-hidden", "true")
  Object.assign(el.style, { left: cx - SIZE / 2 + "px", top: cy - SIZE / 2 + "px", width: SIZE + "px", height: SIZE + "px", clipPath: `polygon(${SILHOUETTE})` })
  document.body.appendChild(el)
  const small = { transform: `scale(${START}) rotate(0deg)`, opacity: 0 }
  const seen = { opacity: 1, offset: 0.12 }
  const big = { transform: `scale(${end}) rotate(${TURN}deg)`, opacity: 1 }
  return { el, small, seen, big }
}

// Grows the gear over the window, then calls covered() to swap the page
// underneath, then removes the gear.
export function wipeOut(button, covered) {
  if (busy) return
  if (reduced()) return covered()
  busy = true
  const { el, small, seen, big } = overlayAt(button)
  el.animate([small, seen, big], { duration: MS, easing: EASE, fill: "forwards" }).finished.then(() => {
    covered()
    requestAnimationFrame(() => requestAnimationFrame(() => { el.remove(); done() }))
  })
}

// Covers the window at once, calls covered() to swap the page underneath,
// then shrinks the gear back into the button.
export function wipeIn(button, covered) {
  if (busy) return
  if (reduced()) return covered()
  busy = true
  const { el, small, seen, big } = overlayAt(button)
  el.style.transform = big.transform
  covered()
  el.animate([big, { ...seen, offset: 0.88 }, small], { duration: MS, easing: EASE, fill: "forwards" }).finished.then(() => { el.remove(); done() })
}
