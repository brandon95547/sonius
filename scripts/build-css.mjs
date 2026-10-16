// scripts/build-css.mjs — one stylesheet per guide, and one for Sonius's own pages.
//
//   public/guides/<id>.css   Tailwind + the shared components + guides/<id>/theme.css,
//                            with the utilities the sheet (views/sheet.ejs) uses
//   public/css/app.css       the same, with the default guide's theme and styles/app.css,
//                            for the showcase
//   public/css/sheet.css     the sheet's own layout, copied from styles/sheet.css
//
// Each entry is written to .build/ and compiled with the Tailwind CLI. --watch rebuilds
// on every change (npm run dev).
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGuides } from '../src/guides.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');
const guides = loadGuides(path.join(root, 'guides'));
const fallback = guides.find((g) => g.default);

fs.mkdirSync(path.join(root, '.build'), { recursive: true });
fs.mkdirSync(path.join(root, 'public/guides'), { recursive: true });
fs.mkdirSync(path.join(root, 'public/css'), { recursive: true });

const entries = [
  ...guides.map((g) => ({
    name: g.id,
    out: `public/guides/${g.id}.css`,
    css: `@import "tailwindcss" source(none);
@source "../views/sheet.ejs";
@import "../styles/components.css";
@import "../guides/${g.id}/theme.css";
`,
  })),
  {
    name: 'app',
    out: 'public/css/app.css',
    css: `@import "tailwindcss" source(none);
@source "../views/showcase.ejs";
@source "../views/not-found.ejs";
@source "../views/partials/**/*.ejs";
@import "../styles/components.css";
@import "../guides/${fallback.id}/theme.css";
@import "../styles/app.css";
`,
  },
];

// The sheet's own chrome (styles/sheet.css) is plain CSS over the guide's tokens: no
// Tailwind to run, so it is copied as it is — and again whenever it changes, under --watch.
const copySheet = () => fs.copyFileSync(path.join(root, 'styles/sheet.css'), path.join(root, 'public/css/sheet.css'));
copySheet();
if (watch) fs.watch(path.join(root, 'styles/sheet.css'), copySheet);

const cli = path.join(root, 'node_modules/.bin/tailwindcss');
const runs = entries.map((entry) => {
  const input = path.join(root, '.build', `${entry.name}.css`);
  fs.writeFileSync(input, entry.css);
  const args = ['-i', input, '-o', path.join(root, entry.out), ...(watch ? ['--watch'] : ['--minify'])];
  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, { cwd: root, stdio: ['ignore', 'inherit', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d; if (watch) process.stderr.write(d); });
    child.on('close', (code) => (code === 0 ? resolve(entry.out) : reject(new Error(`${entry.out}: ${err.trim()}`))));
  });
});

if (!watch) {
  try {
    const built = await Promise.all(runs);
    console.log(`built ${built.join(', ')}, public/css/sheet.css`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
