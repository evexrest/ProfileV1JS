import { useEffect, useRef, useState } from "react"

import defaults from "@/gears.json"
import { LAYOUT_STAMP } from "@/lib/layout-stamp"
import { savedView } from "@/components/site/GearAvatar"
import { MODELS, REST_TILT, mechanism } from "@/components/site/gear-mechanism"

// The gears on the second page: the same mechanism as the button, drawn large,
// each turning slowly on its own. An editor lets you drag them about and set
// each one's size, angle, spin, opacity and finish, and copy them.
//
// A gear's x and y are its centre as shares of the window, so a layout fits
// any screen. scale 1 is a gear BASE px in radius. speed is in page changes'
// worth of turn a second (the cog turns 320 degrees per unit); negative runs
// it backwards. opacity runs from 0.1 to 1; layouts saved before it existed
// draw fully solid. front: true puts the gear in front of the avatar; without
// it, the gear is behind. tilt is the angle it is seen from, in degrees: 90
// straight at its front face, 0 edge on, -90 straight at its back (58, the
// button's view, when not set).

const BASE = 90
const BOX = 2.7 // the svg's side, in radii: room for the walls, which fall to the lower left
const DEPTH = 1.6 // thicker than the button, as the page change draws it
// All grey, in three shades: no teal on this page. Layouts saved before the
// shades existed (black, white, outline) draw in the middle grey.
const FINISHES = [["light", "Light"], ["grey", "Grey"], ["graphite", "Dark"]]
const CLASS = { light: "gw gw-grey gw-grey-light", grey: "gw gw-grey", graphite: "gw gw-grey gw-grey-dark" }
const finishOf = (g) => (CLASS[g.finish] ? g.finish : "grey")
const LIMITS = { scale: [0.4, 4], speed: [-0.6, 0.6], opacity: [0.1, 1] }
const opacityOf = (g) => g.opacity ?? 1
const tiltOf = (g) => g.tilt ?? REST_TILT
const VIEWS = [["Front", 90], ["Angled", REST_TILT], ["Edge", 0], ["Back", -90]]
const TILT_EASE = 9 // per second: how fast a gear swings to a new tilt
// The gears orbit the avatar: the whole layout turns slowly round the middle
// of the window, where he stands, each gear keeping its distance from him.
// orbit: false holds a gear where it was placed. While the editor is open the
// orbit glides back to the layout as placed, so dragging moves gears to where
// they were put; with reduced motion there is no orbit.
const orbitsOf = (g) => g.orbit !== false
const ORBIT_PERIOD = 90 // seconds for one turn, clockwise
const ORBIT_EASE = 4 // per second: how fast the gears glide home for editing
const TAU = Math.PI * 2

// The editor is for the site's owner: on the localhost, and on the live site
// only at /second?edit, so visitors never see it. (Temporary: once his live
// layout is saved into gears.json, the live site loses it entirely.)
const EDITABLE = import.meta.env.DEV || new URLSearchParams(window.location.search).has("edit")

// Edits are remembered in this browser only, until a new layout is published
// (layout-stamp.js); then the browser starts again from gears.json. Storage
// can be missing or blocked (private windows); the page then starts from
// gears.json each time.
const KEY = "second-page-gears"
function saved() {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY))
    if (v && v.base === LAYOUT_STAMP && Array.isArray(v.gears) && v.gears.every((g) => g && typeof g.id === "string")) return v.gears
  } catch { /* nothing saved, or unreadable */ }
  return defaults
}
function save(gears) {
  try { window.localStorage.setItem(KEY, JSON.stringify({ base: LAYOUT_STAMP, gears })) } catch { /* not remembered, still shown */ }
}

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v))
const round = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d

// The rotation sits on the drawing, not the gear's box, so the box is free to
// move straight up in the page's entrance (order: its place in that, nearest
// the middle first).
function Gear({ gear, order, orbit, editing, selected, onGrab }) {
  const art = useRef(null)
  const box = useRef(null)
  const live = useRef(gear)
  useEffect(() => { live.current = gear })

  useEffect(() => {
    const svg = art.current
    const pose = mechanism(svg, { model: live.current.model })
    const still = matchMedia("(prefers-reduced-motion: reduce)")
    // Each gear starts at its own turn, so they are never in step.
    let turn = [...live.current.id].reduce((s, c) => s + c.charCodeAt(0), 0) * 0.37
    // The tilt drawn eases toward the gear's tilt, so a new view swings round.
    let tilt = tiltOf(live.current)
    let last = performance.now()
    let drawn = ""
    let raf = 0
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const g = live.current
      // Where the orbit has carried it: its place turned round the middle.
      const a = orbitsOf(g) ? orbit.angle : 0
      const dx = (g.x - 0.5) * innerWidth
      const dy = (g.y - 0.5) * innerHeight
      const [c, s] = [Math.cos(a), Math.sin(a)]
      box.current.style.translate = `${(dx * c - dy * s - dx).toFixed(1)}px ${(dx * s + dy * c - dy).toFixed(1)}px`
      if (!still.matches) turn += g.speed * dt
      const goal = tiltOf(g)
      tilt = still.matches || Math.abs(goal - tilt) < 0.05 ? goal : tilt + (goal - tilt) * (1 - Math.exp(-dt * TILT_EASE))
      const key = still.matches ? g.scale + "/" + tilt : ""
      if (!still.matches || key !== drawn) {
        const r = BASE * g.scale
        const side = r * BOX
        svg.setAttribute("viewBox", `0 0 ${side} ${side}`)
        pose(side / 2, side / 2, r / 50, turn, DEPTH, tilt)
        drawn = key
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [gear.model])

  const r = BASE * gear.scale
  return (
    <div
      ref={box}
      className={"field-gear" + (gear.front ? " is-front" : "") + (selected ? " is-selected" : "")}
      style={{ left: gear.x * 100 + "%", top: gear.y * 100 + "%", "--r": r + "px", "--i": order }}
    >
      <svg ref={art} className={CLASS[finishOf(gear)]} style={{ width: r * BOX, height: r * BOX, opacity: opacityOf(gear), rotate: gear.angle + "deg" }} aria-hidden="true" />
      {editing && (
        <button
          type="button"
          className="field-gear-grab"
          aria-label={`Gear ${gear.id}: drag to move`}
          aria-pressed={selected}
          onPointerDown={(e) => onGrab(e, gear)}
          onKeyDown={(e) => onGrab(e, gear)}
        />
      )}
    </div>
  )
}

// A round dial for the angle: drag the knob round, or use the arrow keys.
// Shift snaps to 15 degrees.
function Rotator({ value, onChange }) {
  const dial = useRef(null)
  function from(e) {
    const b = dial.current.getBoundingClientRect()
    let a = (Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180) / Math.PI + 90
    if (a > 180) a -= 360
    if (e.shiftKey) a = Math.round(a / 15) * 15
    onChange(Math.round(a))
  }
  function down(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    from(e)
  }
  function key(e) {
    const step = e.shiftKey ? 15 : 1
    const d = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step }[e.key]
    if (d === undefined) return
    e.preventDefault()
    let a = value + d
    if (a > 180) a -= 360
    if (a <= -180) a += 360
    onChange(a)
  }
  return (
    <div
      ref={dial}
      className="rotator"
      role="slider"
      tabIndex={0}
      aria-label="Angle"
      aria-valuemin={-180}
      aria-valuemax={180}
      aria-valuenow={value}
      aria-valuetext={value + " degrees"}
      onPointerDown={down}
      onPointerMove={(e) => e.buttons && from(e)}
      onKeyDown={key}
    >
      <span className="rotator-ticks" aria-hidden="true" />
      <span className="rotator-arm" style={{ rotate: value + "deg" }} aria-hidden="true"><span className="rotator-knob" /></span>
    </div>
  )
}

// onEditing hears when the editor opens and closes (the avatar can be turned
// only while it is open).
export function GearField({ onEditing }) {
  const [gears, setGearsState] = useState(saved)
  const [editing, setEditing] = useState(false)
  const orbit = useRef({ angle: 0 }).current
  const editingNow = useRef(editing)
  useEffect(() => { editingNow.current = editing })
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)")
    let last = performance.now()
    let raf = 0
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (editingNow.current || still.matches) {
        let a = orbit.angle % TAU
        if (a > Math.PI) a -= TAU
        orbit.angle = Math.abs(a) < 1e-4 ? 0 : a * Math.exp(-dt * ORBIT_EASE)
      } else orbit.angle += (dt * TAU) / ORBIT_PERIOD
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [orbit])
  const [picked, setPicked] = useState(null)
  const [copied, setCopied] = useState(false)
  const field = useRef(null)

  function setGears(next) {
    setGearsState(next)
    save(next)
  }
  const change = (id, patch) => setGears(gears.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  const gear = gears.find((g) => g.id === picked)
  // Entrance order: the gears rise after the avatar, nearest him first. Past
  // the eighth they go together, so a crowded layout doesn't drag on.
  const near = (g) => Math.hypot(g.x - 0.5, g.y - 0.5)
  const order = new Map([...gears].sort((a, b) => near(a) - near(b)).map((g, i) => [g.id, Math.min(i, 8)]))
  useEffect(() => { onEditing?.(editing) }, [editing, onEditing])
  const newId = () => "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

  useEffect(() => {
    if (!editing) return
    const keys = (e) => {
      if (e.key === "Escape") picked ? setPicked(null) : setEditing(false)
      // Cmd+D (Ctrl+D) duplicates the selected gear, as in design tools, and
      // Cmd+] / Cmd+[ bring it in front of the figure or send it behind.
      if ((e.metaKey || e.ctrlKey) && picked) {
        if (e.key.toLowerCase() === "d") { e.preventDefault(); duplicate() }
        if (e.key === "]" || e.key === "[") { e.preventDefault(); change(picked, { front: e.key === "]" }) }
      }
    }
    window.addEventListener("keydown", keys)
    return () => window.removeEventListener("keydown", keys)
  })

  // Grabbing a gear selects it and brings it to the front; dragging moves it.
  // Holding Option (Alt) while grabbing drags off a copy and leaves the
  // original where it was. With the keyboard, the arrow keys move it (Shift
  // for bigger steps).
  function grab(e, g) {
    if (e.type === "keydown") {
      const step = e.shiftKey ? 0.05 : 0.01
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicked(g.id) }
      if (!d) return
      e.preventDefault()
      setPicked(g.id)
      change(g.id, { x: round(clamp(g.x + d[0], [0, 1])), y: round(clamp(g.y + d[1], [0, 1])) })
      return
    }
    e.preventDefault()
    const copying = e.altKey
    const rest = copying ? gears : gears.filter((o) => o.id !== g.id)
    let moved = copying ? { ...g, id: newId() } : { ...g }
    setPicked(moved.id)
    setGears([...rest, moved])
    const start = [e.clientX, e.clientY]
    const at = [g.x, g.y]
    const move = (ev) => {
      moved = {
        ...moved,
        x: round(clamp(at[0] + (ev.clientX - start[0]) / innerWidth, [0, 1])),
        y: round(clamp(at[1] + (ev.clientY - start[1]) / innerHeight, [0, 1])),
      }
      setGearsState([...rest, moved])
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      setGears([...rest, moved])
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }

  function add() {
    const id = newId()
    setGears([...gears, { id, x: 0.5, y: 0.5, scale: 1.2, angle: 0, finish: "grey", model: "classic", speed: 0.2 }])
    setPicked(id)
  }
  // A copy of the selected gear, a little down and to the right so it shows,
  // on top and selected.
  function duplicate() {
    if (!gear) return
    const copy = { ...gear, id: newId(), x: round(clamp(gear.x + 0.03, [0, 1])), y: round(clamp(gear.y + 0.03, [0, 1])) }
    setGears([...gears, copy])
    setPicked(copy.id)
  }
  function remove() {
    setGears(gears.filter((g) => g.id !== picked))
    setPicked(null)
  }
  function reset() {
    if (!window.confirm("Put the gears back to the default layout? Your changes in this browser will be lost.")) return
    setGears(defaults)
    setPicked(null)
  }
  // On the localhost only: write this layout, and the figure's angle, into
  // the site's files (src/gears.json and src/avatar.json) as what every
  // visitor sees. The dev server does the writing (vite.config.js).
  const [stored, setStored] = useState("")
  async function store() {
    try {
      const r = await fetch("/__save-layout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gears, view: savedView() }),
      })
      if (!r.ok) throw new Error(await r.text())
      setStored("Saved")
    } catch (err) {
      setStored("Not saved")
      console.error("Saving the layout failed:", err)
    }
    setTimeout(() => setStored(""), 1800)
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ gears, view: savedView() }, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { window.prompt("Copy the layout:", JSON.stringify({ gears, view: savedView() })) }
  }

  return (
    <>
      <div
        ref={field}
        className={"gear-field" + (editing ? " is-editing" : "")}
        onPointerDown={(e) => e.target === field.current && setPicked(null)}
      >
        {gears.map((g) => (
          <Gear key={g.id} gear={g} order={order.get(g.id)} orbit={orbit} editing={editing} selected={editing && g.id === picked} onGrab={grab} />
        ))}
      </div>

      {EDITABLE && !editing && (
        <button type="button" className="gear-edit-toggle" onClick={() => setEditing(true)}>Edit gears</button>
      )}

      {editing && (
        <aside className="gear-editor" aria-label="Gear editor">
          <header className="gear-editor-head">
            <span className="gear-editor-title">{gear ? `Gear ${gears.indexOf(gear) + 1} of ${gears.length}` : "Gears"}</span>
            <button type="button" className="ge-btn ge-primary" onClick={() => { setEditing(false); setPicked(null) }}>Done</button>
          </header>

          {gear ? (
            <div className="gear-editor-body">
              <label className="ge-row">
                <span className="ge-label">Scale</span>
                <input
                  type="range" aria-label="Scale" min={LIMITS.scale[0]} max={LIMITS.scale[1]} step="0.05" value={gear.scale}
                  onChange={(e) => change(gear.id, { scale: +e.target.value })}
                />
                <span className="ge-value">{gear.scale.toFixed(2)}×</span>
              </label>
              <div className="ge-row">
                <span className="ge-label">Angle</span>
                <Rotator value={gear.angle} onChange={(angle) => change(gear.id, { angle })} />
                <span className="ge-value">{gear.angle}°</span>
              </div>
              <label className="ge-row">
                <span className="ge-label">Tilt</span>
                <input
                  type="range" aria-label="Tilt: back, edge, front" min={-90} max={90} step="1" value={tiltOf(gear)}
                  onChange={(e) => change(gear.id, { tilt: +e.target.value })}
                />
                <span className="ge-value">{tiltOf(gear)}°</span>
              </label>
              <div className="ge-row" role="group" aria-label="View">
                <span className="ge-label">View</span>
                <div className="ge-finishes ge-models">
                  {VIEWS.map(([name, t]) => (
                    <button
                      key={name} type="button" aria-pressed={tiltOf(gear) === t}
                      className="ge-finish ge-model" onClick={() => change(gear.id, { tilt: t })}
                    >{name}</button>
                  ))}
                </div>
              </div>
              <label className="ge-row">
                <span className="ge-label">Spin</span>
                <input
                  type="range" aria-label="Spin" min={LIMITS.speed[0]} max={LIMITS.speed[1]} step="0.02" value={gear.speed}
                  onChange={(e) => change(gear.id, { speed: +e.target.value })}
                />
                <span className="ge-value">{gear.speed === 0 ? "still" : (gear.speed > 0 ? "↻ " : "↺ ") + Math.abs(gear.speed).toFixed(2)}</span>
              </label>
              <label className="ge-row">
                <span className="ge-label">Opacity</span>
                <input
                  type="range" aria-label="Opacity" min={LIMITS.opacity[0]} max={LIMITS.opacity[1]} step="0.05" value={opacityOf(gear)}
                  onChange={(e) => change(gear.id, { opacity: +e.target.value })}
                />
                <span className="ge-value">{Math.round(opacityOf(gear) * 100)}%</span>
              </label>
              <div className="ge-row" role="radiogroup" aria-label="Model">
                <span className="ge-label">Model</span>
                <div className="ge-finishes ge-models">
                  {Object.entries(MODELS).map(([k, m]) => (
                    <button
                      key={k} type="button" role="radio" aria-checked={(gear.model || "classic") === k}
                      className="ge-finish ge-model" onClick={() => change(gear.id, { model: k })}
                    >{m.name}</button>
                  ))}
                </div>
              </div>
              <div className="ge-row" role="radiogroup" aria-label="Orbit">
                <span className="ge-label">Orbit</span>
                <div className="ge-finishes">
                  {[[true, "Orbits him"], [false, "Stays put"]].map(([on, name]) => (
                    <button
                      key={name} type="button" role="radio" aria-checked={orbitsOf(gear) === on}
                      className="ge-finish ge-model" onClick={() => change(gear.id, { orbit: on })}
                    >{name}</button>
                  ))}
                </div>
              </div>
              <div className="ge-row" role="radiogroup" aria-label="Depth">
                <span className="ge-label">Depth</span>
                <div className="ge-finishes">
                  {[[false, "Behind figure", "⌘["], [true, "In front", "⌘]"]].map(([front, name, key]) => (
                    <button
                      key={name} type="button" role="radio" aria-checked={!!gear.front === front} title={key}
                      className="ge-finish ge-model" onClick={() => change(gear.id, { front })}
                    >{name}</button>
                  ))}
                </div>
              </div>
              <div className="ge-row" role="radiogroup" aria-label="Finish">
                <span className="ge-label">Finish</span>
                <div className="ge-finishes">
                  {FINISHES.map(([k, name]) => (
                    <button
                      key={k} type="button" role="radio" aria-checked={finishOf(gear) === k}
                      className={"ge-finish ge-finish-" + k} onClick={() => change(gear.id, { finish: k })}
                    >{name}</button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="gear-editor-hint">Click a gear to select it, then drag it to move it. Hold Option while dragging to pull off a copy. Drag the figure to turn it; double-click it to face it front again.</p>
          )}

          <footer className="gear-editor-foot">
            <button type="button" className="ge-btn" onClick={add}>Add gear</button>
            <button type="button" className="ge-btn" onClick={duplicate} disabled={!gear} title="Duplicate (⌘D)">Duplicate</button>
            <button type="button" className="ge-btn" onClick={remove} disabled={!gear}>Delete</button>
            <span className="ge-spacer" />
            {import.meta.env.DEV && (
              <button type="button" className="ge-btn ge-primary" onClick={store} title="Make this the layout every visitor sees">
                {stored || "Save to site"}
              </button>
            )}
            <button type="button" className="ge-btn" onClick={copy}>{copied ? "Copied" : "Copy layout"}</button>
            <button type="button" className="ge-btn" onClick={reset}>Reset</button>
          </footer>
        </aside>
      )}
    </>
  )
}
