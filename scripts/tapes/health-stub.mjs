// Minimal AutoMem /health stub so the installer's endpoint check passes during
// screenshot capture. Returns a representative healthy response — no real data.
// Run:  node scripts/tapes/health-stub.mjs   (then run the .tape files)
import http from 'node:http';
const body = JSON.stringify({
  status: 'healthy',
  falkordb: 'connected',
  qdrant: 'connected',
  memory_count: 0,
  enrichment: { status: 'running', queue_depth: 0 },
  graph: 'memories',
});
http
  .createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(body);
  })
  .listen(8001, '127.0.0.1', () => console.log('health stub on http://127.0.0.1:8001'));
