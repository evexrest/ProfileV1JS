import { useEffect } from "react"

// A soft light follows the cursor, and the background glow drifts a little the
// other way. Written straight to CSS variables, once per frame, so moving the
// mouse never re-renders React.
export function useCursorLight(spotRef, fieldRef) {
  useEffect(() => {
    const spot = spotRef.current
    const field = fieldRef.current
    if (!spot || !field) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const last = { x: 0, y: 0 }
    let frame = null

    function apply() {
      frame = null
      spot.style.setProperty("--cx", last.x + "px")
      spot.style.setProperty("--cy", last.y + "px")
      if (reduced) return
      const dx = (last.x / window.innerWidth - 0.5) * -20
      const dy = (last.y / window.innerHeight - 0.5) * -20
      field.style.setProperty("--px", dx.toFixed(2) + "px")
      field.style.setProperty("--py", dy.toFixed(2) + "px")
    }
    function onMove(e) {
      last.x = e.clientX
      last.y = e.clientY
      spot.classList.add("on")
      if (frame === null) frame = window.requestAnimationFrame(apply)
    }
    function onLeave() { spot.classList.remove("on") }

    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    return () => {
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [spotRef, fieldRef])
}
