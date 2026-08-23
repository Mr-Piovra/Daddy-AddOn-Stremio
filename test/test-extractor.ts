import { CONFIG } from '../src/config';
import { DLStreamsExtractor } from '../src/extractors/dlstreams';
import fetch from 'node-fetch';

CONFIG.DEBUG = true;

async function runTest() {
  console.log('Testing DaddyLive mirrors direct accessibility...');
  for (const m of CONFIG.MIRRORS) {
    const testUrl = `${m.baseUrl}/stream/stream-51.php`;
    try {
      const resp = await fetch(testUrl, {
        headers: {
          'User-Agent': CONFIG.USER_AGENT,
          'Referer': `${m.baseUrl}/`
        },
        timeout: 5000
      });
      console.log(`Mirror ${m.id} (${testUrl}): Status ${resp.status}`);
      if (resp.ok) {
        const text = await resp.text();
        console.log(`  HTML length: ${text.length}, sample: ${text.substring(0, 300)}`);
      }
    } catch (e: any) {
      console.log(`Mirror ${m.id} (${testUrl}) FAILED: ${e.message}`);
    }
  }

  console.log('\nRunning DLStreamsExtractor.extractAll(51)...');
  const results = await DLStreamsExtractor.extractAll('51');
  console.log('Extracted streams count:', results.length);
}

runTest().catch(console.error);
