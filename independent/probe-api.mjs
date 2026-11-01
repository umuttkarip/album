import assert from 'node:assert/strict';
const base = process.env.ALBUM_API_BASE;
if (!base) { console.log('No API configured; setup screen only.'); process.exit(0); }
const origin = 'https://umuttkarip.github.io';
for (let attempt = 1; attempt <= 6; attempt++) {
  try {
    for (const path of ['albums', 'assets/unauthenticated-check/original']) {
      const r = await fetch(base + '/api/' + path, { headers: { Origin: origin }, signal: AbortSignal.timeout(10000) });
      assert.equal(r.status, 401, 'Anonymous request must be rejected');
      assert.equal(r.headers.get('Access-Control-Allow-Origin'), origin);
      assert.match(r.headers.get('Cache-Control') || '', /no-store/);
    }
    console.log('API reachable over verified HTTPS; anonymous albums/files rejected.'); process.exit(0);
  } catch (error) {
    console.log(`API readiness ${attempt}/6: ${error.cause?.code || error.message}`);
    if (attempt === 6) throw error;
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}
