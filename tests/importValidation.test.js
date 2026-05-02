import { suite, test, assertEqual, assertThrows } from './harness.js';
import { parseImportPayload } from '../dateStorage.js';

suite('parseImportPayload', () => {
    test('accepts an empty array', () => {
        assertEqual(parseImportPayload([]).length, 0);
    });
    test('accepts well-formed YYYY-MM-DD ranges', () => {
        const out = parseImportPayload([
            { start: '2026-01-01', end: '2026-01-10' },
            { start: '2026-03-15', end: '2026-03-20' }
        ]);
        assertEqual(out.length, 2);
        assertEqual(out[0].start.getFullYear(), 2026);
        assertEqual(out[0].start.getMonth(), 0);
        assertEqual(out[0].start.getDate(), 1);
        assertEqual(out[1].end.getDate(), 20);
    });
    test('accepts legacy ISO timestamps (back-compat)', () => {
        const out = parseImportPayload([
            { start: '2026-01-01T00:00:00.000Z', end: '2026-01-10T00:00:00.000Z' }
        ]);
        assertEqual(out[0].start.getDate(), 1);
        assertEqual(out[0].end.getDate(), 10);
    });
    // Regression: a malformed item must throw BEFORE we touch IndexedDB,
    // otherwise we'd clear the user's data and replace it with garbage.
    test('throws on non-array input', () => {
        assertThrows(() => parseImportPayload({ foo: 'bar' }));
        assertThrows(() => parseImportPayload(null));
        assertThrows(() => parseImportPayload('a string'));
    });
    test('throws on missing fields', () => {
        assertThrows(() => parseImportPayload([{ start: '2026-01-01' }]));
        assertThrows(() => parseImportPayload([{ end: '2026-01-01' }]));
    });
    test('throws on garbage date strings', () => {
        assertThrows(() => parseImportPayload([{ start: 'yesterday', end: 'today' }]));
        assertThrows(() => parseImportPayload([{ start: '2026-13-99', end: '2026-01-10' }]));
    });
    test('throws on null items', () => {
        assertThrows(() => parseImportPayload([null]));
    });
    test('throws when start is after end', () => {
        assertThrows(() => parseImportPayload([{ start: '2026-02-01', end: '2026-01-01' }]));
    });
    test('error message identifies the offending index', () => {
        let caught = '';
        try { parseImportPayload([{ start: '2026-01-01', end: '2026-01-10' }, { start: 'nope', end: '2026-01-15' }]); }
        catch (e) { caught = e.message; }
        // The error should mention item 1 (the second one), not item 0.
        if (!caught.includes('Item 1')) {
            throw new Error('Expected error to mention Item 1, got: ' + caught);
        }
    });
});
