import { Button } from "@/components/ui/button"

// Brand marks drawn by hand rather than taken from an icon set, so all three
// sit in one teal instead of each brand's own colour.
const ICONS = {
  mail: "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4.24-8 4.76-8-4.76V6l8 4.76L20 6z",
  linkedin: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.65h.05A4.17 4.17 0 0 1 16.6 8.7c4 0 4.4 2.5 4.4 5.9V21h-4v-5.5c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21H9z",
  instagram: "M12 2.2c3.2 0 3.6 0 4.9.07 3.25.15 4.77 1.7 4.92 4.92.06 1.28.07 1.67.07 4.9s-.01 3.6-.07 4.9c-.15 3.2-1.66 4.77-4.92 4.92-1.3.06-1.68.07-4.9.07s-3.6-.01-4.9-.07c-3.26-.15-4.77-1.73-4.92-4.92C2.11 15.6 2.1 15.2 2.1 12s.01-3.6.08-4.9C2.33 3.96 3.84 2.42 7.1 2.27 8.4 2.21 8.8 2.2 12 2.2zm0 3.1a6.7 6.7 0 1 0 0 13.4 6.7 6.7 0 0 0 0-13.4zm0 11.05a4.35 4.35 0 1 1 0-8.7 4.35 4.35 0 0 1 0 8.7zm6.96-11.32a1.56 1.56 0 1 0 0 3.13 1.56 1.56 0 0 0 0-3.13z",
}

// shadcn's link button, stripped back to plain type: no underline, no height,
// no padding, no press nudge. It answers the pointer by turning teal.
const LINK =
  "group/foot h-auto gap-[0.45rem] rounded-none border-0 p-0 font-mono text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground hover:text-primary hover:no-underline focus-visible:ring-0 focus-visible:text-primary active:not-aria-[haspopup]:translate-y-0"

function external(href) {
  return /^https?:/.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {}
}

export function Footer({ footer, links }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-[0.4rem] font-mono text-[0.6875rem] font-medium tracking-[0.08em] text-faint">
      <Button asChild variant="link" className={LINK}>
        <a href={"mailto:" + footer.email}>{footer.email}</a>
      </Button>
      <span>{footer.location}</span>
      {links.map((l) => (
        <Button key={l.label} asChild variant="link" className={LINK}>
          <a href={l.href} {...external(l.href)}>
            <span className="grid size-[18px] flex-none place-items-center rounded-[5px] bg-primary/12 transition-colors duration-250 group-hover/foot:bg-primary/24 group-focus-visible/foot:bg-primary/24">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="block size-[11px] fill-primary">
                <path d={ICONS[l.icon] || ICONS.mail} />
              </svg>
            </span>
            {l.label}
          </a>
        </Button>
      ))}
    </div>
  )
}
