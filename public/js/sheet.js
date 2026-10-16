// public/js/sheet.js — fills in a design sheet's values from the guide's own stylesheet.
//
// The sheet writes no colors. Every swatch names a token (data-sg-token) and this script
// reads the token back as the browser computes it, from the bundle the guide was built
// into (public/guides/<id>.css). So the page cannot disagree with the guide it shows.
(function () {
  'use strict';

  // Every color the theme defines: the ramps you reach with a class, and the colors that
  // only exist as a token. Anything resolving to the same color is merged below, so each
  // color is listed once. This feeds the folded "All color tokens" table; the swatches
  // above it name their own tokens in data-sg-token.
  // The guide names its own colors (guides/<id>/guide.json, "palette"): the ramps you
  // reach with a class, and the colors that only exist as a token. The page writes them
  // into window.SONIUS_GUIDE before this file loads.
  var GUIDE = window.SONIUS_GUIDE || {};
  var RAMPS = (GUIDE.palette && GUIDE.palette.ramps) || {};
  var TOKENS = (GUIDE.palette && GUIDE.palette.tokens) || [];

  // ── Color resolution ──────────────────────────────────────────────────────────
  // Nothing is parsed out of the stylesheet. Each value is handed to the browser and read
  // back as it computes, which resolves var(), color-mix() and every color syntax alike.
  var probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);

  // Only two syntaxes reach here, because resolve() pins everything to sRGB first:
  //   rgb(r, g, b) / rgba(r, g, b, a)   components 0-255
  //   color(srgb r g b / a)             components 0-1
  function parse(str) {
    if (!str) return null;
    var isSrgb = str.indexOf('color(') === 0;
    if (!isSrgb && str.indexOf('rgb') !== 0) return null;
    var nums = str.match(/-?[\d.]+(e-?\d+)?/g);
    if (!nums || nums.length < 3) return null;
    var scale = isSrgb ? 255 : 1;
    // Out-of-gamut channels come back below 0 or above 255. A display clamps them, so clamp
    // here too, or the hex drifts from what anyone actually sees.
    function ch(n) { return Math.min(255, Math.max(0, parseFloat(n) * scale)); }
    return [ch(nums[0]), ch(nums[1]), ch(nums[2]), nums.length > 3 ? parseFloat(nums[3]) : 1];
  }

  // Mixing into srgb at 100% leaves the color alone and pins the result to channels
  // parse() can read, whatever syntax the token was written in.
  function resolve(value) {
    if (!value) return null;
    probe.style.color = '';
    probe.style.color = 'color-mix(in srgb, ' + value + ' 100%, transparent)';
    var out = parse(getComputedStyle(probe).color);
    if (out) return out;
    probe.style.color = '';
    probe.style.color = value;
    return parse(getComputedStyle(probe).color);
  }

  // A custom property as computed in `scope` (tokens are rebound inside overlays, so where
  // you read one matters), or null when the bundle never defines it.
  function token(name, scope) {
    var value = getComputedStyle(scope || document.documentElement).getPropertyValue(name).trim();
    return value ? resolve(value) : null;
  }

  function hex(c) {
    return '#' + [0, 1, 2].map(function (i) {
      return Math.round(c[i]).toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }

  // An alpha token reads as the color and its strength, e.g. "#FFFFFF @ 11.5%". Rounded to
  // the half percent, because the browser stores alpha in 255ths: 0.115 comes back as
  // 0.1137 and 0.075 as 0.0745, and the nearest half percent is the value the stylesheet wrote.
  function describe(c) {
    return c[3] < 1 ? hex(c) + ' @ ' + Math.round(c[3] * 200) / 2 + '%' : hex(c);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // ── Palette ───────────────────────────────────────────────────────────────────
  // Greys — and white, black and their alphas — have no chroma. Everything else is colored.
  function isMonochrome(c) { return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) <= 2; }

  function lightness(c) { return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }

  // 0-360, red at 0. Only used to keep one hue's shades together.
  function hue(c) {
    var max = Math.max(c[0], c[1], c[2]);
    var min = Math.min(c[0], c[1], c[2]);
    if (max === min) return 0;
    var d = max - min;
    var h = max === c[0] ? (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0)
      : max === c[1] ? (c[2] - c[0]) / d + 2
      : (c[0] - c[1]) / d + 4;
    return h * 60;
  }

  function renderPalette() {
    var table = document.getElementById('sg-tokens');
    var colors = [];
    var byValue = {};

    // One row per color. A ramp shade is listed by its class name; a color with no ramp
    // is listed by its token, which is the only way to reach it.
    function add(name, className, rank) {
      var c = token(name);
      if (!c) return;
      var key = describe(c);
      var row = byValue[key];
      if (!row) {
        row = byValue[key] = { color: c, value: key, source: name, names: [], rank: rank };
        colors.push(row);
      }
      row.rank = Math.min(row.rank, rank);
      var label = className || 'var(' + name + ')';
      if (row.names.indexOf(label) < 0) row.names.push(label);
    }

    Object.keys(RAMPS).forEach(function (ramp, index) {
      RAMPS[ramp].forEach(function (shade) {
        add('--color-' + ramp + '-' + shade, ramp + '-' + shade, index);
      });
    });
    add('--color-white', 'white', 0);
    // No ramp of their own, so they sort after every ramp, by hue.
    TOKENS.forEach(function (name) { add(name, null, 99); });

    colors.sort(function (a, b) {
      var aMono = isMonochrome(a.color), bMono = isMonochrome(b.color);
      if (aMono !== bMono) return aMono ? -1 : 1;
      var aOpaque = a.color[3] >= 1, bOpaque = b.color[3] >= 1;
      if (aOpaque !== bOpaque) return aOpaque ? -1 : 1;
      // Greys run dark to light; a hue's shades run light to dark, the way a ramp reads.
      if (aMono) return (lightness(a.color) - lightness(b.color)) || (a.color[3] - b.color[3]);
      // By ramp, not by hue: amber-700 is several degrees off amber-200 and any hue
      // threshold sorts it away from the ramp it belongs to.
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.rank === 99) return (hue(a.color) - hue(b.color)) || (a.color[3] - b.color[3]);
      return aOpaque ? lightness(b.color) - lightness(a.color) : a.color[3] - b.color[3];
    });

    var head = el('thead');
    var headRow = el('tr');
    ['Color', 'Value', 'Class'].forEach(function (label) {
      var th = el('th', null, label);
      th.scope = 'col';
      headRow.appendChild(th);
    });
    head.appendChild(headRow);

    var body = el('tbody');
    var group = '';
    colors.forEach(function (row) {
      var heading = isMonochrome(row.color) ? 'Monochrome' : 'Colored';
      if (heading !== group) {
        group = heading;
        var groupRow = el('tr');
        var groupCell = el('th', 'sg-tokens__group', heading);
        groupCell.scope = 'colgroup';
        groupCell.colSpan = 3;
        groupRow.appendChild(groupCell);
        body.appendChild(groupRow);
      }

      var tr = el('tr');
      var swatch = el('span', 'sg-tokens__swatch');
      swatch.style.backgroundColor = 'var(' + row.source + ')';
      tr.appendChild(el('td')).appendChild(swatch);
      tr.appendChild(el('td', 'sg-tokens__value', row.value));
      var names = el('td').appendChild(el('span', 'sg-tokens__classes'));
      row.names.forEach(function (name) {
        names.appendChild(el('code', 'sg-code sg-tokens__token', name));
      });
      tr.appendChild(names.parentNode);
      body.appendChild(tr);
    });

    table.appendChild(head);
    table.appendChild(body);
  }

  // ── Swatches: [data-sg-token], read in their own scope ────────────────────────
  function renderSwatches() {
    document.querySelectorAll('[data-sg-token]').forEach(function (fig) {
      var out = fig.querySelector('[data-sg-value]');
      var c = token(fig.getAttribute('data-sg-token'), fig);
      out.textContent = c ? describe(c) : 'not defined in this bundle';
    });
  }

  if (window.lucide) window.lucide.createIcons();

  function renderIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  [renderPalette, renderSwatches, renderIcons].forEach(function (step) {
    try { step(); } catch (err) { console.error('styleguide: ' + step.name + ' failed', err); }
  });
})();
