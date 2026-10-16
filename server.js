// server.js — Sonius: a showcase of style guides to use as reference.
//
//   /              the showcase: every guide, the default first
//   /guides/:id    one guide's design sheet
//
// Guides are read once at start (src/guides.js); their stylesheets are built beforehand
// (npm run build) into public/guides/<id>.css.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGuides } from './src/guides.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const guides = loadGuides(path.join(root, 'guides'));

const app = express();
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(root, 'views'));

app.use(express.static(path.join(root, 'public'), { maxAge: '1h' }));

app.get('/', (req, res) => {
  res.render('showcase', { guides });
});

app.get('/guides/:id', (req, res, next) => {
  const guide = guides.find((g) => g.id === req.params.id);
  if (!guide) return next();
  res.render('sheet', { guide });
});

app.use((req, res) => {
  res.status(404).render('not-found');
});

const port = Number(process.env.PORT) || 4100;
app.listen(port, () => {
  console.log(`Sonius on http://localhost:${port} — ${guides.length} guide${guides.length === 1 ? '' : 's'}`);
});
