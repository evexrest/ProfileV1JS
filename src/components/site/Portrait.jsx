const HEXAGON = "50,4 89.8,27 89.8,73 50,96 10.2,73 10.2,27"
const ORBITS = [0, 60, 120] // degrees each orbit is turned, like the rings of an atom

function Hexagon({ className }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <polygon points={HEXAGON} />
    </svg>
  )
}

// An atom drawn with hexagons: a still outer shell, three orbits turning
// inside it, and a core. Each part fades in and out of sight on its own
// beat. The motion is in index.css, under "the photo".
function HexAtom() {
  return (
    <div className="hexatom" aria-hidden="true">
      <Hexagon className="hexatom-shell" />
      {ORBITS.map((turn, i) => (
        <div key={turn} className="hexatom-orbit" style={{ "--turn": turn + "deg", "--i": i }}>
          <Hexagon className="hexatom-ring" />
        </div>
      ))}
      <span className="hexatom-core" />
    </div>
  )
}

// The photo, hung a little crooked with no frame, and the atom beside it.
export function Portrait({ src, alt, tilt = 3 }) {
  return (
    <div className="portrait flex max-w-full items-center gap-6">
      <HexAtom />
      <div className="portrait-photo aspect-[4/5] w-48 overflow-hidden" style={{ "--tilt": tilt + "deg" }}>
        <img src={src} alt={alt} className="size-full object-cover" />
      </div>
    </div>
  )
}
