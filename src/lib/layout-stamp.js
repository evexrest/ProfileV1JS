import avatar from "@/avatar.json"
import gears from "@/gears.json"

// A fingerprint of the published second-page layout (src/gears.json and
// src/avatar.json). Edits remembered in a browser are stored with the
// fingerprint they were made on; once a new layout is published, the
// fingerprint changes and those older edits are dropped, so every browser
// shows the new layout.
const text = JSON.stringify([gears, avatar])
let h = 0
for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0
export const LAYOUT_STAMP = (h >>> 0).toString(36)
