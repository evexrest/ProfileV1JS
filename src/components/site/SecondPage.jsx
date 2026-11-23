import { useEffect, useState } from "react"

import { GearAvatar } from "@/components/site/GearAvatar"
import { GearButton } from "@/components/site/GearButton"
import { GearField } from "@/components/site/GearField"

// The page the gear opens: ryo.lu's light background (white), whatever the
// visitor's system setting, with large gears turning on it that the editor
// can move about, and the gear avatar standing in the middle. The gear in
// the corner, in black here, takes you back home. While the gear editor is
// open, the avatar can be dragged round to look at it from another side.
//
// The entrance: once the avatar's first frame is drawn and the page change's
// sheet has lifted, the avatar floats up from the bottom of the window as it
// fades in, and the gears follow the same way a little after, nearest him
// first (the timings are in index.css, "the second page's entrance").
// arrive runs wait (all hidden), go (animating), done (animations off, so a
// gear added later just appears).
const DONE_MS = 3000 // the last gear's start (500 + 8 × 90) and its rise (1600), and a little over
const GIVE_UP_MS = 2500 // if the avatar can't draw, bring the gears in anyway
export function SecondPage({ onGear }) {
  const [editing, setEditing] = useState(false)
  const [drawn, setDrawn] = useState(false)
  const [arrive, setArrive] = useState("wait")

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), GIVE_UP_MS)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!drawn) return
    let raf = requestAnimationFrame(function wait() {
      if (document.documentElement.classList.contains("gear-moving")) raf = requestAnimationFrame(wait)
      else setArrive((a) => (a === "wait" ? "go" : a))
    })
    return () => cancelAnimationFrame(raf)
  }, [drawn])
  useEffect(() => {
    if (arrive !== "go") return
    const t = setTimeout(() => setArrive("done"), DONE_MS)
    return () => clearTimeout(t)
  }, [arrive])

  return (
    <>
      <main className="second-page" aria-label="Second page" data-arrive={arrive}>
        <GearField onEditing={setEditing} />
        <GearAvatar editable={editing} onReady={() => setDrawn(true)} />
      </main>
      <GearButton onClick={onGear} dark />
    </>
  )
}
