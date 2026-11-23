import { useState } from "react"

import { GearAvatar } from "@/components/site/GearAvatar"
import { GearButton } from "@/components/site/GearButton"
import { GearField } from "@/components/site/GearField"

// The page the gear opens: ryo.lu's light background (white), whatever the
// visitor's system setting, with large gears turning on it that the editor
// can move about, and the gear avatar standing in the middle. The gear in
// the corner, in black here, takes you back home. While the gear editor is
// open, the avatar can be dragged round to look at it from another side.
export function SecondPage({ onGear }) {
  const [editing, setEditing] = useState(false)
  return (
    <>
      <main className="second-page" aria-label="Second page">
        <GearField onEditing={setEditing} />
        <GearAvatar editable={editing} />
      </main>
      <GearButton onClick={onGear} dark />
    </>
  )
}
