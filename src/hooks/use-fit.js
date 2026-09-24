import { useLayoutEffect } from "react"

const CELL = 12       // px per grid cell
const COLS = 96       // cells across: 96 x 12 = 1152px
const ROWS = 55       // cells down: 55 x 12 = 660px, the height of one screen
const MIN_SCALE = 0.7 // below this the arrangement would be too small to read: stack instead
const MAX_SCALE = 1.6 // above this, on very large screens, text would look oversized

// Scales the whole one-screen arrangement to fit the window, or falls back to
// stacking (and scrolling) on narrow windows and phones. Works on <body> and
// <html> classes, the same hooks the stylesheet was written against.
export function useFit(pageRef) {
  useLayoutEffect(() => {
    const root = document.documentElement

    function fit() {
      const app = pageRef.current
      if (!app) return
      // Measure with the arranged padding in place, since that is what the
      // frame would have to fit inside.
      document.body.classList.add("arranged")
      const cs = getComputedStyle(app)
      const availW = app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const availH = window.innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      // Grows on big windows as well as shrinking on small ones, so full screen is filled.
      const scale = Math.min(MAX_SCALE, availW / (COLS * CELL), availH / (ROWS * CELL))
      const arranged = window.innerWidth >= 900 && scale >= MIN_SCALE
      document.body.classList.toggle("arranged", arranged)
      root.classList.toggle("locked", arranged)
      if (!arranged) return
      root.style.setProperty("--scale", scale.toFixed(4))
      root.style.setProperty("--canvas-h", ROWS * CELL + "px")
    }

    fit()
    let frame = null
    function onResize() {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => { frame = null; fit() })
    }
    window.addEventListener("resize", onResize)
    // Web fonts change text heights once they arrive; re-measure then.
    document.fonts?.ready.then(fit)

    return () => {
      window.removeEventListener("resize", onResize)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [pageRef])
}

// Reading order, which is also how narrow screens stack the blocks: the left
// side top to bottom, then the right side, with the footer always last.
export function readingOrder(keys, layout) {
  const side = (k) => (k === "footer" ? 2 : layout[k].x + layout[k].w / 2 < COLS / 2 ? 0 : 1)
  return [...keys].sort(
    (a, b) => side(a) - side(b) || layout[a].y - layout[b].y || layout[a].x - layout[b].x
  )
}
