import { Button } from "@/components/ui/button"

// Brand marks drawn by hand rather than taken from an icon set, so they all
// sit in one teal instead of each brand's own colour.
const ICONS = {
  mail: "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4.24-8 4.76-8-4.76V6l8 4.76L20 6z",
  linkedin: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.65h.05A4.17 4.17 0 0 1 16.6 8.7c4 0 4.4 2.5 4.4 5.9V21h-4v-5.5c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21H9z",
  instagram: "M12 2.2c3.2 0 3.6 0 4.9.07 3.25.15 4.77 1.7 4.92 4.92.06 1.28.07 1.67.07 4.9s-.01 3.6-.07 4.9c-.15 3.2-1.66 4.77-4.92 4.92-1.3.06-1.68.07-4.9.07s-3.6-.01-4.9-.07c-3.26-.15-4.77-1.73-4.92-4.92C2.11 15.6 2.1 15.2 2.1 12s.01-3.6.08-4.9C2.33 3.96 3.84 2.42 7.1 2.27 8.4 2.21 8.8 2.2 12 2.2zm0 3.1a6.7 6.7 0 1 0 0 13.4 6.7 6.7 0 0 0 0-13.4zm0 11.05a4.35 4.35 0 1 1 0-8.7 4.35 4.35 0 0 1 0 8.7zm6.96-11.32a1.56 1.56 0 1 0 0 3.13 1.56 1.56 0 0 0 0-3.13z",
  github: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
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
