import { useEffect, useRef } from "react"

import { REST_SCALE, mechanism, setTurned, turnedNow, watchTurned } from "@/components/site/gear-mechanism"

// The button is the mechanism at rest, the same one the page change zooms out.
// dark draws it in black metal, for the white second page.
// SIZE is the button's box in pixels; the mechanism sits at its centre.
const SIZE = 78
// While the pointer is on it the gear turns this fast, in page changes' worth
// of turn a second, spinning up and running down at EASE.
const SPIN = 1
const EASE = 6

export function GearButton({ onClick, dark = false }) {
  const art = useRef(null)

  useEffect(() => {
    const svg = art.current
    const button = svg.closest("button")
    const still = matchMedia("(prefers-reduced-motion: reduce)")
    const pose = mechanism(svg)
    const show = (t) => pose(SIZE / 2, SIZE / 2, REST_SCALE, t)
    show(turnedNow())
    const unwatch = watchTurned(show)

    let speed = 0
    let target = 0
    let raf = 0
    let last = 0
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      speed += (target - speed) * (1 - Math.exp(-EASE * dt))
      setTurned(turnedNow() + speed * dt)
      if (target === 0 && speed < 0.004) { raf = 0; return }
      raf = requestAnimationFrame(tick)
    }
    function spin(on) {
      target = on && !still.matches ? SPIN : 0
      if (target && !raf) { last = performance.now(); raf = requestAnimationFrame(tick) }
    }
    const on = () => spin(true)
    const off = () => spin(false)
    button.addEventListener("pointerenter", on)
    button.addEventListener("pointerleave", off)
    button.addEventListener("focus", on)
    button.addEventListener("blur", off)
    return () => {
      cancelAnimationFrame(raf)
      unwatch()
      button.removeEventListener("pointerenter", on)
      button.removeEventListener("pointerleave", off)
      button.removeEventListener("focus", on)
      button.removeEventListener("blur", off)
    }
  }, [])

  return (
    <button type="button" className="gear-button" aria-label="Settings" onClick={onClick}>
      <svg ref={art} className={dark ? "gw gw-dark gear-art" : "gw gear-art"} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" />
    </button>
  )
}
