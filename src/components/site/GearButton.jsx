import { useEffect, useRef } from "react"

import { PERIOD, VIEWBOX, drawGear } from "@/components/site/gear"

// How fast the gear turns while the pointer is on it, in turns a second, and
// how quickly it spins up and runs down.
const SPIN = 0.35
const EASE = 6
// Frames are cached by angle, in steps this fine, over one period.
const STEPS = 48

export function GearButton({ onClick }) {
  const art = useRef(null)

  useEffect(() => {
    const g = art.current
    const button = g.closest("button")
    const still = matchMedia("(prefers-reduced-motion: reduce)")
    const frames = new Map()
    const show = (angle) => {
      const step = Math.round(((angle % PERIOD) / PERIOD) * STEPS) % STEPS
      if (!frames.has(step)) frames.set(step, drawGear((step / STEPS) * PERIOD))
      g.innerHTML = frames.get(step)
    }
    show(0)

    let angle = 0
    let speed = 0
    let target = 0
    let raf = 0
    let last = 0
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      speed += (target - speed) * (1 - Math.exp(-EASE * dt))
      angle += speed * Math.PI * 2 * dt
      show(angle)
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
      button.removeEventListener("pointerenter", on)
      button.removeEventListener("pointerleave", off)
      button.removeEventListener("focus", on)
      button.removeEventListener("blur", off)
    }
  }, [])

  return (
    <button type="button" className="gear-button" aria-label="Settings" onClick={onClick}>
      <svg viewBox={VIEWBOX} className="gear-art" aria-hidden="true">
        <g ref={art} />
      </svg>
    </button>
  )
}
