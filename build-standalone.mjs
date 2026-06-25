// Build a single self-contained uchqunapps.html with all assets inlined,
// so it can be opened directly in a browser or shared as one file.
import { readFileSync, writeFileSync } from 'node:fs';

let html = readFileSync('index.html', 'utf8');

const three = readFileSync('assets/three.bundle.js', 'utf8');
const textures = readFileSync('assets/textures.js', 'utf8');
const spacecraft = readFileSync('assets/spacecraft.json', 'utf8');

// Closing </script> inside inlined JS would terminate the host script tag.
const esc = (s) => s.replace(/<\/script>/gi, '<\\/script>');
// Use a replacer *function* everywhere: a replacement *string* would treat
// `$&`, `$1`, etc. as special patterns, and the minified bundle is full of
// `$&` sequences that would otherwise inject the matched text into the code.
const inline = (js) => () => `<script>\n${esc(js)}\n</script>`;

// 1) Inline three.bundle.js
html = html.replace(
  '<script src="assets/three.bundle.js"></script>',
  inline(three)
);

// 2) Embed spacecraft.json as inline data (read instead of fetched at runtime)
//    plus textures.js, both in place of the textures <script> tag.
const dataTag =
  `<script id="spacecraft-data" type="application/json">\n${esc(spacecraft)}\n</script>\n`;
html = html.replace(
  '<script src="assets/textures.js"></script>',
  () => dataTag + `<script>\n${esc(textures)}\n</script>`
);

html = html.replace(
  "_spacecraftGlbPromise = fetch('assets/spacecraft.json')\n    .then(r => r.ok ? r.json() : Promise.reject(new Error('spacecraft.json HTTP ' + r.status)))\n    .then(json => { window.SPACECRAFT_GLB = json; return json; })\n    .catch(err => { console.warn('Failed to load spacecraft.json:', err); _spacecraftGlbPromise = null; });",
  "_spacecraftGlbPromise = Promise.resolve()\n    .then(() => { const el = document.getElementById('spacecraft-data'); const json = JSON.parse(el.textContent); window.SPACECRAFT_GLB = json; return json; })\n    .catch(err => { console.warn('Failed to parse embedded spacecraft data:', err); _spacecraftGlbPromise = null; });"
);

writeFileSync('uchqunapps.html', html);
const mb = (Buffer.byteLength(html) / 1048576).toFixed(1);
console.log(`Wrote uchqunapps.html (${mb} MB)`);
