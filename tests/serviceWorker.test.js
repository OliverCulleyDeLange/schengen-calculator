import { suite, test, assertTrue } from './harness.js';
import { readFile } from './fsShim.js';

const sw = readFile('service-worker.js');

suite('service-worker regressions', () => {
    test('cache name is versioned (and not v1)', () => {
        assertTrue(/CACHE_VERSION\s*=\s*'v[2-9]'/.test(sw),
            'CACHE_VERSION must be bumped past v1 so existing clients invalidate');
    });
    test('precaches the privacy page so it works offline', () => {
        assertTrue(sw.includes("'/privacy/index.html'"),
            'privacy/index.html must appear in the precache list');
    });
    test('precaches dateStorage.js and rangeUtils.js (modules added during fix sweep)', () => {
        assertTrue(sw.includes("'/dateStorage.js'"));
        assertTrue(sw.includes("'/rangeUtils.js'"));
    });
    test('handles navigation with /index.html fallback', () => {
        assertTrue(/request\.mode\s*===\s*['"]navigate['"]/.test(sw),
            'navigation requests must be detected explicitly');
        assertTrue(sw.includes("'/index.html'"),
            'must fall back to /index.html for offline navigations');
    });
    test('install calls skipWaiting() so updates take effect on next load', () => {
        assertTrue(sw.includes('self.skipWaiting()'));
    });
    test('activate calls clients.claim() so the new SW takes over open tabs', () => {
        assertTrue(sw.includes('self.clients.claim()'));
    });
});
