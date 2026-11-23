import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { writeFile } from "node:fs/promises"
import { defineConfig } from "vite"

// The gear editor's "Save to site" button (localhost only): writes the layout
// it sends into src/gears.json, and the avatar's angle into src/avatar.json.
// The built site has no such route; there, the files are only read.
function saveLayout() {
  const src = path.resolve(import.meta.dirname, "./src")
  const num = (v) => typeof v === "number" && Number.isFinite(v)
  return {
    name: "save-layout",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__save-layout", (req, res) => {
        if (req.method !== "POST") { res.statusCode = 405; return res.end() }
        let body = ""
        req.on("data", (c) => { body += c })
        req.on("end", async () => {
          try {
            const { gears, view } = JSON.parse(body)
            const ok = Array.isArray(gears) && gears.length <= 200 &&
              gears.every((g) => g && typeof g.id === "string" && num(g.x) && num(g.y) && num(g.scale)) &&
              view && num(view.yaw) && num(view.pitch)
            if (!ok) throw new Error("not a layout")
            const lines = gears.map((g) => "  " + JSON.stringify(g).replace(/,"/g, ', "').replace(/":/g, '": '))
            await writeFile(path.join(src, "gears.json"), "[\n" + lines.join(",\n") + "\n]\n")
            await writeFile(path.join(src, "avatar.json"), JSON.stringify({ yaw: view.yaw, pitch: view.pitch }) + "\n")
            res.end("saved")
          } catch (err) {
            res.statusCode = 400
            res.end(String(err.message || err))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), saveLayout()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
