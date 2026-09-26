import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export const MOUNTAINS = [
  ["ridge", "Ridge"],
  ["summit", "Summit"],
  ["contour", "Contour"],
  ["range", "Range"],
]

// Lets a visitor pick which mountain sits behind the name. Styled like the
// site's own micro-labels: mono, uppercase, hairline pills that warm to teal.
export function MountainPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[0.625rem] font-medium tracking-[0.18em] text-faint uppercase in-[.arranged]:justify-end">
      <span id="mountain-label">Mountain</span>
      <ToggleGroup
        type="single"
        spacing={1}
        value={value}
        // Radix sends "" when the active item is clicked again; keep the choice.
        onValueChange={(v) => v && onChange(v)}
        aria-labelledby="mountain-label"
      >
        {MOUNTAINS.map(([key, label]) => (
          <ToggleGroupItem
            key={key}
            value={key}
            className="h-auto min-w-0 rounded-full border border-border px-2 py-[0.15rem] font-mono text-[0.5625rem] leading-[1.55] font-medium tracking-[0.14em] text-muted-foreground uppercase hover:bg-transparent hover:text-primary data-[state=on]:border-primary/50 data-[state=on]:bg-primary/12 data-[state=on]:text-primary focus-visible:ring-0"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
