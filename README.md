# ProfileV1JS

Everest's personal site, rebuilt in React (JavaScript) with [shadcn/ui](https://ui.shadcn.com).
It started as a duplicate of [ProfileV1](https://github.com/evexrest/ProfileV1), the plain-HTML
version, which is kept here unchanged in `original/index.html` for comparison.

## Where things are

- `src/content.json` — every word on the page, and where each block sits. Edit this to change the copy.
- `src/components/site/` — the page's blocks: `Name` (the mountain), `Intro`, `Section`, `Footer`.
- `src/components/ui/` — the shadcn components they are built from: `Badge`, `Separator`, `Button`.
- `src/hooks/` — the scale-to-fit layout and the cursor light.
- `src/index.css` — colours, fonts, and the animations.

## Running it

Needs Node.js. From this folder:

```bash
npm install
npm run dev
```

`npm run build` writes the finished site to `dist/`.
