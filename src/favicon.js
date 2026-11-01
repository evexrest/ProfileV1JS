// Spins the two orbs in the tab icon. Browsers draw an SVG favicon as a still
// image, so the icon is redrawn a few times a second instead. public/favicon.svg
// is the same drawing at rest, used before this runs and when motion is reduced.
const ORBIT = 27
const PERIOD = 4000
const FPS = 15

function draw(turn) {
  const orbs = [0, 0.5].map((offset) => {
    const angle = (turn + offset) * 2 * Math.PI - Math.PI / 4
    const x = (32 + ORBIT * Math.cos(angle)).toFixed(1)
    const y = (32 + ORBIT * Math.sin(angle)).toFixed(1)
    return `<circle cx="${x}" cy="${y}" r="4" fill="#5ff4f6" filter="url(#g)"/>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><polygon points="32,15 46.7,23.5 46.7,40.5 32,49 17.3,40.5 17.3,23.5" fill="#1f9fb0" fill-opacity="0.7" stroke="#5ff4f6" stroke-width="5" stroke-linejoin="round" filter="url(#g)"/>${orbs.join('')}</svg>`
}

export function spinFavicon() {
  const link = document.querySelector('link[rel="icon"]')
  if (!link || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const start = performance.now()
  // Background tabs throttle timers to once a second, which would make the orbs
  // jump, so the icon rests while the tab is hidden.
  setInterval(() => {
    if (document.hidden) return
    const turn = ((performance.now() - start) % PERIOD) / PERIOD
    link.href = 'data:image/svg+xml,' + encodeURIComponent(draw(turn))
  }, 1000 / FPS)
}
