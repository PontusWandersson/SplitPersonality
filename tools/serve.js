#!/usr/bin/env node
/* Lokal server för prototypen, även på wifi-nätet (för telefonen).
 *
 *   node tools/serve.js            http://localhost:5181  och  http://<datorns-ip>:5181
 *   http://localhost:5181/qr       QR-kod till telefonen
 *
 * Sidor utan egen <!doctype> (som prototyp.html) får samma skal som när de publiceras.
 */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');

var ROOT = path.join(__dirname, '..');
var PORT = parseInt(process.env.PORT || '5181', 10);
var TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };

function lanIp() {
  var nets = os.networkInterfaces();
  for (var name in nets) for (var i = 0; i < nets[name].length; i++) {
    var n = nets[name][i];
    if (n.family === 'IPv4' && !n.internal && !/^169\.254\./.test(n.address)) return n.address;
  }
  return 'localhost';
}

var wrap = require('./build.js').wrap;

function qrPage(url) {
  return '<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Prova på telefonen</title><style>body{font:16px system-ui,sans-serif;background:#12141c;color:#ece8dd;display:grid;place-items:center;min-height:100vh;margin:0}' +
    'main{display:grid;gap:16px;justify-items:center;padding:24px;text-align:center}#qr{background:#fff;padding:16px;border-radius:12px}a{color:#ffcf6e}</style></head>' +
    '<body><main><h1 style="margin:0;font-size:1.3rem">Skanna med telefonen</h1><div id="qr"></div><a href="' + url + '">' + url + '</a>' +
    '<p style="margin:0;color:#9ba0b6;max-width:30em">Telefonen måste vara på samma wifi som datorn.</p></main>' +
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>' +
    '<script>new QRCode(document.getElementById("qr"),{text:' + JSON.stringify(url) + ',width:240,height:240});</script></body></html>';
}

var server = http.createServer(function (req, res) {
  var u = decodeURIComponent((req.url || '/').split('?')[0]);
  if (u === '/') { res.writeHead(302, { Location: '/prototyp.html' }); return res.end(); }
  if (u === '/qr') {
    res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
    return res.end(qrPage('http://' + lanIp() + ':' + PORT + '/prototyp.html'));
  }
  var file = path.normalize(path.join(ROOT, u));
  if (file.indexOf(ROOT) !== 0) { res.writeHead(403); return res.end('Nej'); }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Finns inte: ' + u); }
    var ext = path.extname(file).toLowerCase();
    var body = data;
    if (ext === '.html') body = wrap(data.toString('utf8'));
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  });
});
server.listen(PORT, '0.0.0.0', function () {
  console.log('Prototypen:   http://localhost:' + PORT + '/prototyp.html');
  console.log('På telefonen: http://' + lanIp() + ':' + PORT + '/prototyp.html');
  console.log('QR-kod:       http://localhost:' + PORT + '/qr');
});
