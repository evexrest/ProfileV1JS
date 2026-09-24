import { useRef } from "react"

const LIFT = 1.3 // how far the middle letter of the name rises, in em
const HOLD = 950 // ms a letter stays up after the pointer passes it

// The name, one span per letter, with each letter's place on the mountain
// baked in: a half-sine across the word, so the middle letters climb highest.
//
// Sweeping the pointer across the name lifts each letter as it is passed, and
// each falls back on its own a moment later, so the word peaks and settles.
// Pointer-driven, so touch screens leave the name flat. Letters are lifted by
// toggling a class directly rather than through React state, so a sweep never
// re-renders anything.
export function Name({ text }) {
  const letters = useRef([])
  const last = useRef(-1)
  const chars = String(text ?? "").split("")

  function lift(el) {
    el.classList.add("up")
    window.clearTimeout(el._drop)
    el._drop = window.setTimeout(() => el.classList.remove("up"), HOLD)
  }

  function onPointerMove(e) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const els = letters.current.filter(Boolean)
    if (!els.length) return

    // Which letter is under the pointer, or the nearest one if it is between two.
    let at = -1
    let best = Infinity
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect()
      const d = e.clientX < r.left ? r.left - e.clientX : e.clientX > r.right ? e.clientX - r.right : 0
      if (d < best) { best = d; at = i }
      if (d === 0) break
    }
    if (at < 0) return

    if (at === last.current) {
      // Still on the same letter: only worth lifting again once it has settled.
      if (!els[at].classList.contains("up")) lift(els[at])
      return
    }
    // A fast sweep skips letters; lift the ones it jumped over too, in order,
    // so the rise always travels the way the pointer did.
    const from = last.current < 0 ? at : last.current + (at > last.current ? 1 : -1)
    const step = at >= from ? 1 : -1
    let n = 0
    for (let j = from; step > 0 ? j <= at : j >= at; j += step) {
      const el = els[j]
      const delay = n * 30
      if (delay) window.setTimeout(() => lift(el), delay)
      else lift(el)
      n++
    }
    last.current = at
  }

  return (
    <h1
      className="m-0 -ml-[0.03em] font-display text-[length:var(--name-size)] leading-[0.95] font-light tracking-[0.005em]"
      onPointerMove={onPointerMove}
      onPointerLeave={() => { last.current = -1 }}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          ref={(el) => { letters.current[i] = el }}
          className="ltr"
          style={{ "--lift": (LIFT * Math.sin((Math.PI * (i + 0.5)) / chars.length)).toFixed(3) + "em" }}
        >
          {ch}
        </span>
      ))}
    </h1>
  )
}
