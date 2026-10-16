# Sonius

A showcase of style guides to use as reference. Each guide is drawn as the same design sheet —
colors, surfaces, type, buttons, forms, navigation, cards and data, status, dialogs and menus —
from its own theme. The Phansora dashboard's guide is the default.

## Run it

```bash
npm install
npm run dev        # builds the stylesheets, rebuilds on change, restarts the server
```

Then open http://localhost:4100. `npm start` builds once and serves; `PORT` changes the port.
`npm test` builds and checks every guide.

## How it is put together

| Path | What it is |
| --- | --- |
| `guides/<id>/guide.json` | A guide: its name, summary, swatches for the showcase card, and the colors its palette table lists |
| `guides/<id>/theme.css` | The guide's values: every token the components read |
| `styles/components.css` | The shared component system every guide is drawn with (Phansora's `base.css`) |
| `views/sheet.ejs` | The design sheet, one template for every guide (from Phansora's `styleguide/dashboard.html`) |
| `public/js/sheet.js` | Reads each swatch's value back from the guide's stylesheet, so the page writes no colors |
| `views/showcase.ejs` | The home page: choose a guide |
| `scripts/build-css.mjs` | Builds `public/guides/<id>.css` for each guide and `public/css/app.css` for Sonius's own pages |

Sonius's own pages wear the default guide.

## Adding a guide

Make a folder under `guides/` named for the guide, with:

- **`theme.css`** — the values. The components read a fixed set of names: the `surface`,
  `primary` and `accent` ramps, the elevation ladder (`--elev-0` to `--elev-4`), the `--ui-*`
  layers, edges and status colors, the dialog colors, and the faces (`--font-sans`,
  `--font-serif`). `guides/phansora-dashboard/theme.css` defines every one of them; start from it.
- **`guide.json`** — `id` (the folder's name), `name`, `summary`, `swatches` (hex values for
  the showcase card), and `palette` (the ramps and tokens the sheet's color table lists).
  One guide has `"default": true`.

Run `npm test`: it fails if the guide is incomplete or the sheet names a class its stylesheet
does not define.

## Where the default guide came from

`styles/components.css`, `styles/sheet.css`, `views/sheet.ejs` and
`guides/phansora-dashboard/theme.css` are copies of Phansora's `assets/css/base.css`,
`styleguide/dashboard-page.css`, `styleguide/dashboard.html` and `assets/css/dashboard-theme.css`
(plus the two parts of `dashboard.css` the sheet shows), taken on 2026-10-15. They do not
update themselves: when Phansora's dashboard changes, copy them again.
