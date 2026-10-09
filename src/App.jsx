import { useRef, useState } from "react"

import content from "@/content.json"
import { Footer } from "@/components/site/Footer"
import { Intro, Lede } from "@/components/site/Intro"
import { MOUNTAINS, MountainPicker } from "@/components/site/MountainPicker"
import { Name } from "@/components/site/Name"
import { Portrait } from "@/components/site/Portrait"
import { Section } from "@/components/site/Section"
import { useCursorLight } from "@/hooks/use-cursor-light"
import { readingOrder, useFit } from "@/hooks/use-fit"

// Every block on the page, and what goes in it. All the words live in
// content.json; positions live there too, under "layout".
function blockKeys() {
  return ["name", "intro", "lede", ...content.sections.map((_, i) => "section-" + i), "footer", "mountain", "photo"]
}

function Block({ id, mountain, setMountain }) {
  if (id === "name") return <Name text={content.name} mountain={mountain} />
  if (id === "mountain") return <MountainPicker value={mountain} onChange={setMountain} />
  if (id === "intro") return <Intro eyebrow={content.eyebrow} status={content.status} />
  if (id === "lede") return <Lede text={content.intro} />
  if (id === "photo") return <Portrait {...content.photo} />
  if (id === "footer") return <Footer footer={content.footer} links={content.links} />
  const s = content.sections[+id.split("-")[1]]
  return <Section title={s.title} rows={s.rows} />
}

const TAGS = { name: "header", footer: "footer" }

// A visitor's mountain choice is remembered in their own browser. Storage can
// be missing or blocked (private windows); the page works the same without it.
const KEY = "mountain"
function savedMountain() {
  try {
    const v = window.localStorage.getItem(KEY)
    if (MOUNTAINS.some(([k]) => k === v)) return v
  } catch { /* no storage: use the default */ }
  return MOUNTAINS[0][0]
}

export default function App() {
  const page = useRef(null)
  const spot = useRef(null)
  const field = useRef(null)
  const [mountain, setMountainState] = useState(savedMountain)
  function setMountain(v) {
    setMountainState(v)
    try { window.localStorage.setItem(KEY, v) } catch { /* not remembered, still shown */ }
  }
  useFit(page)
  useCursorLight(spot, field)

  const layout = content.layout

  return (
    <>
      <div ref={field} className="field" aria-hidden="true" />
      <div ref={spot} className="spot" aria-hidden="true" />
      <main ref={page} className="page">
        <div className="canvas-wrap">
          <div className="canvas">
            {readingOrder(blockKeys(), layout).map((k, i) => {
              const p = layout[k]
              const Tag = TAGS[k] || "div"
              return (
                <Tag
                  key={k}
                  className="blk"
                  style={{ "--x": p.x, "--y": p.y, "--w": p.w, "--s": p.s ?? 1, animationDelay: i * 60 + "ms" }}
                >
                  <Block id={k} mountain={mountain} setMountain={setMountain} />
                </Tag>
              )
            })}
          </div>
        </div>
      </main>
    </>
  )
}
