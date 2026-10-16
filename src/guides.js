// src/guides.js — the style guides Sonius shows, read from guides/<id>/guide.json.
//
// A guide is a folder: guide.json says what it is, theme.css holds its values. Every guide
// is drawn by the same sheet (views/sheet.ejs) against its own bundle, so adding a guide is
// adding a folder — nothing else changes.
import fs from 'fs';
import path from 'path';

const HEX = /^#[0-9a-f]{6}$/i;

export function readGuide(dir) {
  const id = path.basename(dir);
  const guide = JSON.parse(fs.readFileSync(path.join(dir, 'guide.json'), 'utf8'));
  const problems = [];
  if (guide.id !== id) problems.push(`its id is "${guide.id}" but its folder is "${id}"`);
  if (!guide.name) problems.push('it has no name');
  if (!guide.summary) problems.push('it has no summary');
  if (!fs.existsSync(path.join(dir, 'theme.css'))) problems.push('it has no theme.css');
  if (!Array.isArray(guide.swatches) || !guide.swatches.every((c) => HEX.test(c))) problems.push('its swatches are not all #rrggbb');
  if (!guide.palette || typeof guide.palette.ramps !== 'object' || !Array.isArray(guide.palette.tokens)) {
    problems.push('its palette needs "ramps" and "tokens"');
  }
  if (problems.length) throw new Error(`guides/${id}: ${problems.join('; ')}`);
  return { ...guide, default: guide.default === true };
}

// Every guide, the default first and the rest by name. Exactly one is the default: it is
// what Sonius opens on, so two would be a choice nobody made.
export function loadGuides(root) {
  const guides = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readGuide(path.join(root, entry.name)));
  const defaults = guides.filter((g) => g.default);
  if (defaults.length !== 1) throw new Error(`exactly one guide must be the default; found ${defaults.length}`);
  return guides.sort((a, b) => (b.default - a.default) || a.name.localeCompare(b.name));
}
