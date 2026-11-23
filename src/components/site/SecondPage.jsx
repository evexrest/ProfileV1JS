import { GearAvatar } from "@/components/site/GearAvatar"
import { GearButton } from "@/components/site/GearButton"
import { GearField } from "@/components/site/GearField"

// The page the gear opens: ryo.lu's light background (white), whatever the
// visitor's system setting, with large gears turning on it that the editor
// can move about, and the gear avatar standing in the middle. The gear in
// the corner, in black here, takes you back home.
export function SecondPage({ onGear }) {
  return (
    <>
      <main className="second-page" aria-label="Second page">
        <GearField />
        <GearAvatar />
      </main>
      <GearButton onClick={onGear} dark />
    </>
  )
}
