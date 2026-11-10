#!/usr/bin/env node
/* Bygger index.html (spelet som en vanlig webbsida, för GitHub Pages) från prototyp.html.
 *
 *   node tools/build.js
 *
 * prototyp.html saknar eget <!doctype>/<head> (claude.ai lägger till det när sidan publiceras). Här får den samma skal,
 * så att index.html fungerar direkt i webbläsaren och på GitHub Pages. Kör efter varje ändring i prototyp.html.
 */
'use strict';
var fs = require('fs');
var path = require('path');

var SHELL_HEAD = '<!doctype html><html lang="sv"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
  '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' +
  'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
var SHELL_END = '</body></html>';

function wrap(html) { return /^\s*<!doctype/i.test(html) ? html : SHELL_HEAD + html + SHELL_END; }

if (require.main === module) {
  var root = path.join(__dirname, '..');
  var src = fs.readFileSync(path.join(root, 'prototyp.html'), 'utf8');
  fs.writeFileSync(path.join(root, 'index.html'), wrap(src));
  console.log('index.html byggd (' + Math.round(fs.statSync(path.join(root, 'index.html')).size / 1024) + ' kB)');
}
module.exports = { wrap: wrap };
