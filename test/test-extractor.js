"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../src/config");
const dlstreams_1 = require("../src/extractors/dlstreams");
const node_fetch_1 = __importDefault(require("node-fetch"));
config_1.CONFIG.DEBUG = true;
async function runTest() {
    console.log('Testing DaddyLive mirrors direct accessibility...');
    for (const m of config_1.CONFIG.MIRRORS) {
        const testUrl = `${m.baseUrl}/stream/stream-51.php`;
        try {
            const resp = await (0, node_fetch_1.default)(testUrl, {
                headers: {
                    'User-Agent': config_1.CONFIG.USER_AGENT,
                    'Referer': `${m.baseUrl}/`
                },
                timeout: 5000
            });
            console.log(`Mirror ${m.id} (${testUrl}): Status ${resp.status}`);
            if (resp.ok) {
                const text = await resp.text();
                console.log(`  HTML length: ${text.length}, sample: ${text.substring(0, 300)}`);
            }
        }
        catch (e) {
            console.log(`Mirror ${m.id} (${testUrl}) FAILED: ${e.message}`);
        }
    }
    console.log('\nRunning DLStreamsExtractor.extractAll(51)...');
    const results = await dlstreams_1.DLStreamsExtractor.extractAll('51');
    console.log('Extracted streams count:', results.length);
}
runTest().catch(console.error);
