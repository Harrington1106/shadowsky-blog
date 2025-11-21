const http = require('http');
const net = require('net');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const INDI_HOST = process.env.INDI_HOST || '127.0.0.1';
const INDI_PORT = process.env.INDI_PORT ? Number(process.env.INDI_PORT) : 7624;

const clients = new Set();

function sse(res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write('\n');
  clients.add(res);
  reqOnClose(res, () => clients.delete(res));
}

function sendEvent(obj) {
  const data = `data: ${JSON.stringify(obj)}\n\n`;
  for (const c of clients) {
    try { c.write(data); } catch {}
  }
}

function reqOnClose(res, fn) {
  res.on('close', fn);
  res.on('finish', fn);
}

function indiGoto(raHours, decDeg, cb) {
  const sock = new net.Socket();
  sock.connect(INDI_PORT, INDI_HOST, () => {
    const xml = `<setNumberVector device="Telescope" name="EQUATORIAL_EOD_COORD"><oneNumber name="RA">${raHours}</oneNumber><oneNumber name="DEC">${decDeg}</oneNumber></setNumberVector>`;
    sock.write(xml);
  });
  sock.on('error', e => { cb(e); sock.destroy(); });
  sock.on('data', () => { cb(null); sock.destroy(); });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/events') return sse(res);
  if (req.method === 'POST' && req.url === '/goto') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const j = JSON.parse(body);
        const ra = Number(j.raHours);
        const dec = Number(j.decDeg);
        indiGoto(ra, dec, err => {
          if (err) { res.writeHead(500); res.end('error'); }
          else { res.writeHead(200); res.end('ok'); sendEvent({ type: 'goto', raHours: ra, decDeg: dec }); }
        });
      } catch { res.writeHead(400); res.end('bad'); }
    });
    return;
  }
  res.writeHead(404); res.end('notfound');
});

server.listen(PORT);