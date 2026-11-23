import { useEffect, useRef, useState } from "react"

import { mountGearAvatar } from "@/components/site/gear-avatar"

// The gear avatar, standing in the middle of the second page, facing the
// visitor. It is decoration: clicks pass through it to the gears and their
// editor underneath.
//
// Building the splats takes a moment, so it starts just after the page has
// changed and fades in once drawn. The canvas is made here rather than in JSX
// so each mount gets a fresh WebGL context (React runs effects twice in
// development, and a context that has been let go can't be used again).
export function GearAvatar() {
  const box = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    let stop = () => {}
    let canvas = null
    const start = setTimeout(() => {
      canvas = document.createElement("canvas")
      canvas.className = "gear-avatar-canvas"
      box.current.appendChild(canvas)
      stop = mountGearAvatar(canvas, {
        spacing: 0.006, glow: false, maxDpr: 1.5, still,
        // Facing the visitor, not turning. Shaded between the page gears'
        // darkest wall grey and their lightest face grey, so it sits with them.
        yaw: 0, turn: 0, dark: "#5d6566", light: "#f2f4f4",
      })
      requestAnimationFrame(() => setReady(true))
    }, 120)
    return () => {
      clearTimeout(start)
      stop()
      canvas?.remove()
      setReady(false)
    }
  }, [])

  return <div ref={box} className={"gear-avatar" + (ready ? " is-ready" : "")} aria-hidden="true" />
}
