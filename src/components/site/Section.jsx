import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// A section is bare type on black: a label running into a hairline, then rows.
// Each row carries its own hairline so the line slides with the row on hover,
// with a pixel of padding under it standing in for the border it replaces.
export function Section({ title, rows }) {
  return (
    <section className="flex flex-col gap-[0.7rem]">
      <h2 className="m-0 flex items-center gap-3 font-mono text-[0.625rem] font-medium tracking-[0.18em] text-faint uppercase">
        {title}
        <Separator className="flex-1" />
      </h2>
      <ul className="m-0 list-none p-0">
        {rows.map((row, i) => (
          <li
            key={i}
            className="row relative grid grid-cols-[7rem_1fr_auto] items-baseline gap-x-4 pt-[0.55rem] pb-[calc(0.55rem+1px)] first:pt-[calc(0.55rem+1px)] max-[30rem]:grid-cols-[1fr_auto]"
          >
            {i === 0 && <Separator className="absolute top-0 left-0" />}
            <code className="font-mono text-[0.6875rem] font-medium tracking-[0.06em] text-accent-dim uppercase max-[30rem]:col-span-full">
              {row.label}
            </code>
            <span className="text-foreground">
              <strong className="font-medium text-foreground">{row.bold}</strong>
              {row.text ? " " + row.text : null}
            </span>
            {row.tag ? (
              <Badge
                variant="outline"
                className="h-auto rounded-full px-2 py-[0.15rem] font-mono text-[0.5625rem] leading-[1.55] tracking-[0.14em] text-muted-foreground uppercase"
              >
                {row.tag}
              </Badge>
            ) : null}
            <Separator className="absolute bottom-0 left-0" />
          </li>
        ))}
      </ul>
    </section>
  )
}
