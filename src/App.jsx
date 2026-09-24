import { useRef } from "react"

import content from "@/content.json"
import { Footer } from "@/components/site/Footer"
import { Intro, Lede } from "@/components/site/Intro"
import { Name } from "@/components/site/Name"
import { Section } from "@/components/site/Section"
import { useCursorLight } from "@/hooks/use-cursor-light"
import { readingOrder, useFit } from "@/hooks/use-fit"

// Every block on the page, and what goes in it. All the words live in
// content.json; positions live there too, under "layout".
function blockKeys() {
  return ["name", "intro", "lede", ...content.sections.map((_, i) => "section-" + i), "footer"]
}

function Block({ id }) {
  if (id === "name") return <Name text={content.name} />
  if (id === "intro") return <Intro eyebrow={content.eyebrow} status={content.status} />
  if (id === "lede") return <Lede text={content.intro} />
  if (id === "footer") return <Footer footer={content.footer} links={content.links} />
  const s = content.sections[+id.split("-")[1]]
  return <Section title={s.title} rows={s.rows} />
}

const TAGS = { name: "header", footer: "footer" }

export default function App() {
  const page = useRef(null)
  const spot = useRef(null)
  const field = useRef(null)
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
                  <Block id={k} />
                </Tag>
              )
            })}
          </div>
        </div>
      </main>
    </>
  )
}
