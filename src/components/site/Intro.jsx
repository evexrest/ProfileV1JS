// Location, then the status line with its glowing dot. The status line breaks
// after a " · " separator; its last part is kept whole.
export function Intro({ eyebrow, status }) {
  const parts = String(status || "").split(" · ")
  const tail = parts.pop()
  const head = parts.length ? parts.join(" · ") + " · " : ""

  return (
    <>
      <p className="m-0 font-mono text-[0.6875rem] font-medium tracking-[0.16em] text-primary uppercase">
        {eyebrow}
      </p>
      <p className="mt-[0.35rem] mb-0 text-[0.875rem] text-muted-foreground">
        <span aria-hidden="true" className="dot mr-2 inline-block size-[7px] rounded-full bg-primary align-[0.1em]" />
        {head}
        <span className="whitespace-nowrap">{tail}</span>
      </p>
    </>
  )
}

export function Lede({ text }) {
  return <p className="m-0 text-[1.1875rem] leading-[1.45] text-foreground">{text}</p>
}
