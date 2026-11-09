import { GearButton } from "@/components/site/GearButton"

// The page the gear opens. Empty for now: only its background, ryo.lu's light
// one (white), whatever the visitor's system setting.
// The gear takes you back home.
export function SecondPage({ onGear }) {
  return (
    <>
      <main className="second-page" aria-label="Second page" />
      <GearButton onClick={onGear} />
    </>
  )
}
