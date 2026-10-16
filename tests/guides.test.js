// tests/guides.test.js — every guide is complete, and its sheet renders against its bundle.
//
// A class the markup names that the bundle does not define applies as nothing: no error,
// just a demo quietly rendering unstyled on the one page whose job is to be right. So the
// bundles are built first, and every class in the templates is looked for in them.
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import { loadGuides } from '../src/guides.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const guides = loadGuides(path.join(root, 'guides'));

// The built CSS escapes selector characters (.bg-primary-500\/10), so look for the escaped form.
const escapeSelector = (cls) => cls.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const defines = (css, cls) => new RegExp(`\\.${escapeRegExp(escapeSelector(cls))}(?![a-zA-Z0-9_-])`).test(css);

// Static markup only: no scripts, no comments, and no class built inside an EJS tag.
function markupClasses(html) {
  const markup = html.replace(/<script[\s\S]*?<\/script>|<!--[\s\S]*?-->|<%[\s\S]*?%>/g, ' ');
  const found = new Set();
  for (const [, list] of markup.matchAll(/\sclass="([^"]*)"/g)) {
    for (const cls of list.split(/\s+/)) if (cls) found.add(cls);
  }
  return [...found];
}

beforeAll(() => {
  execFileSync(process.execPath, [path.join(root, 'scripts/build-css.mjs')], { cwd: root, stdio: 'pipe' });
}, 60000);

describe('the guides', () => {
  it('has exactly one default, listed first', () => {
    expect(guides.length).toBeGreaterThan(0);
    expect(guides.filter((g) => g.default)).toHaveLength(1);
    expect(guides[0].default).toBe(true);
  });

  it('starts with the Phansora dashboard as the default', () => {
    expect(guides[0].id).toBe('phansora-dashboard');
  });
});

describe('each guide’s sheet', () => {
  const sheet = read('views/sheet.ejs');
  const sheetCss = read('styles/sheet.css');

  for (const guide of guides) {
    it(`${guide.id}: names no class its bundle and the sheet’s stylesheet do not define`, () => {
      const bundle = read(`public/guides/${guide.id}.css`);
      const classes = markupClasses(sheet);
      expect(classes.length).toBeGreaterThan(100);
      expect(classes.filter((cls) => !defines(bundle, cls) && !defines(sheetCss, cls))).toEqual([]);
    });

    it(`${guide.id}: renders, with the guide’s name and colors on the page`, async () => {
      const html = await ejs.renderFile(path.join(root, 'views/sheet.ejs'), { guide });
      expect(html).toContain(`<h1 class="sg-h1">${guide.name}</h1>`);
      expect(html).toContain(`href="/guides/${guide.id}.css"`);
      expect(html).toContain('"palette":');
      expect(html).not.toContain('<%');
    });
  }
});

describe('the showcase', () => {
  it('lists every guide, linked to its sheet', async () => {
    const html = await ejs.renderFile(path.join(root, 'views/showcase.ejs'), { guides });
    for (const guide of guides) expect(html).toContain(`href="/guides/${guide.id}"`);
    expect(html.match(/class="badge">Default</g)).toHaveLength(1);
  });

  it('names no class the app bundle does not define', () => {
    const bundle = read('public/css/app.css');
    const classes = ['views/showcase.ejs', 'views/not-found.ejs', 'views/partials/bar.ejs'].flatMap((p) => markupClasses(read(p)));
    expect(classes.filter((cls) => !defines(bundle, cls))).toEqual([]);
  });
});
