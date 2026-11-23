import { useEffect, useRef, useState } from "react"

import home from "@/avatar.json"
import { mountGearAvatar } from "@/components/site/gear-avatar"
import { LAYOUT_STAMP } from "@/lib/layout-stamp"

// The gear avatar, standing in the middle of the second page. It is
// decoration: clicks pass through it to the gears and their editor underneath.
//
// While the gear editor is open (editable), the figure itself can be grabbed:
// dragging turns the camera round it (sideways) and over it (up and down), and
// a double-click faces it front again. Only the drawn figure catches the
// pointer, so the gears behind its empty space can still be picked. The angle
// is remembered in this browser, like the gear layout, until a new layout is
// published; otherwise it is the site's default, src/avatar.json.
//
// Building the splats takes a moment, so it starts just after the page has
// changed; the page brings it in once drawn. The canvas is made here rather than in JSX
// so each mount gets a fresh WebGL context (React runs effects twice in
// development, and a context that has been let go can't be used again).

const KEY = "second-page-avatar-view"
const FRONT = { yaw: 0, pitch: 0.04 }
const PITCH = [-1.1, 1.2] // radians: from well below to well above
const SPEED = 0.008 // radians of turn per px dragged

export function savedView() {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY))
    if (v && v.base === LAYOUT_STAMP && Number.isFinite(v.yaw) && Number.isFinite(v.pitch)) return { yaw: v.yaw, pitch: v.pitch }
  } catch { /* nothing saved, or unreadable */ }
  return { yaw: home.yaw, pitch: home.pitch }
}
function saveView(v) {
  const round = (n) => Math.round(n * 1000) / 1000
  try { window.localStorage.setItem(KEY, JSON.stringify({ base: LAYOUT_STAMP, yaw: round(v.yaw), pitch: round(v.pitch) })) } catch { /* not remembered */ }
}

// onReady is called once the first frame is drawn, so the page can start its
// entrance (SecondPage.jsx).
export function GearAvatar({ editable = false, onReady }) {
  const box = useRef(null)
  const view = useRef(null)
  if (!view.current) view.current = savedView()
  const probe = useRef({ on: false, x: -1, y: -1, hit: false })
  const engine = useRef(null)
  const drag = useRef(null)
  const [ready, setReady] = useState(false)
  const told = useRef(onReady)
  useEffect(() => { told.current = onReady })
  const [over, setOver] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    let canvas = null
    probe.current.onChange = setOver
    const start = setTimeout(() => {
      canvas = document.createElement("canvas")
      canvas.className = "gear-avatar-canvas"
      box.current.appendChild(canvas)
      engine.current = mountGearAvatar(canvas, {
        spacing: 0.006, glow: false, maxDpr: 1.5, still,
        // Holding still (no turn); the angle comes from view. Shaded between
        // the page gears' darkest wall grey and their lightest face grey.
        turn: 0, view: view.current, probe: probe.current, dark: "#5d6566", light: "#f2f4f4",
      })
      requestAnimationFrame(() => { setReady(true); told.current?.() })
    }, 120)
    return () => {
      clearTimeout(start)
      engine.current?.()
      engine.current = null
      canvas?.remove()
      setReady(false)
    }
  }, [])

  // While editing, follow the pointer so each frame can say whether the
  // figure is under it.
  useEffect(() => {
    const p = probe.current
    p.on = editable
    if (!editable) { p.hit = false; setOver(false); return }
    const move = (e) => {
      const b = box.current.getBoundingClientRect()
      p.x = e.clientX - b.left
      p.y = e.clientY - b.top
      engine.current?.redraw()
    }
    const leave = () => { p.x = p.y = -1 }
    window.addEventListener("pointermove", move)
    document.documentElement.addEventListener("pointerleave", leave)
    return () => {
      window.removeEventListener("pointermove", move)
      document.documentElement.removeEventListener("pointerleave", leave)
    }
  }, [editable])

  function down(e) {
    if (!editable || e.button !== 0) return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
    drag.current = { x: e.clientX, y: e.clientY, yaw: view.current.yaw, pitch: view.current.pitch }
    setDragging(true)
  }
  function move(e) {
    const d = drag.current
    if (!d) return
    // Like turning the figure by hand: drag right and its front turns right;
    // drag down and its top tips towards you.
    view.current.yaw = d.yaw - (e.clientX - d.x) * SPEED
    view.current.pitch = Math.min(PITCH[1], Math.max(PITCH[0], d.pitch + (e.clientY - d.y) * SPEED))
    engine.current?.redraw()
  }
  function up() {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    saveView(view.current)
  }
  function front() {
    if (!editable) return
    Object.assign(view.current, FRONT)
    saveView(view.current)
    engine.current?.redraw()
  }

  const cls = ["gear-avatar", ready && "is-ready", editable && (over || dragging) && "is-grabbable", dragging && "is-dragging"]
  return (
    <div
      ref={box}
      className={cls.filter(Boolean).join(" ")}
      aria-hidden="true"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={front}
    />
  )
}
