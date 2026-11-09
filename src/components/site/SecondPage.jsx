import { GearButton } from "@/components/site/GearButton"

// The page the gear opens. Empty for now: only its background, which takes
// ryo.lu's colours (white, or #111 when the visitor's system is in dark mode).
// The gear takes you back home.
export function SecondPage({ onGear }) {
  return (
    <>
      <main className="second-page" aria-label="Second page" />
      <GearButton onClick={onGear} />
    </>
  )
}
