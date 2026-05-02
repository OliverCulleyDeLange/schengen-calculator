import { suite, test, assertEqual, assertTrue, assertThrows } from './harness.js';
import { dateToYmd, ymdToDate, isValidYmd } from '../dateStorage.js';

suite('dateToYmd', () => {
    test('formats with leading zeros', () => {
        assertEqual(dateToYmd(new Date(2026, 0, 5)), '2026-01-05');
    });
    test('handles December', () => {
        assertEqual(dateToYmd(new Date(2026, 11, 31)), '2026-12-31');
    });
    // Regression: persistence must NOT silently shift the date because of
    // the user's UTC offset. A negative-offset user clicking Jan 5 used to
    // serialise as "2026-01-04T..." via toISOString().
    test('preserves the local calendar day across a save/load round-trip', () => {
        const original = new Date(2026, 0, 5); // local midnight
        const stored = dateToYmd(original);
        const restored = ymdToDate(stored);
        assertEqual(restored.getFullYear(), 2026);
        assertEqual(restored.getMonth(), 0);
        assertEqual(restored.getDate(), 5);
    });
});

suite('ymdToDate', () => {
    test('parses YYYY-MM-DD as local midnight', () => {
        const d = ymdToDate('2026-03-15');
        assertEqual(d.getFullYear(), 2026);
        assertEqual(d.getMonth(), 2);
        assertEqual(d.getDate(), 15);
        assertEqual(d.getHours(), 0);
    });
    // Backwards compatibility: existing users have ISO timestamps in their
    // IndexedDB. Loading them must recover the original calendar day.
    test('parses legacy ISO timestamps by their UTC date components', () => {
        const d = ymdToDate('2026-03-15T00:00:00.000Z');
        assertEqual(d.getFullYear(), 2026);
        assertEqual(d.getMonth(), 2);
        assertEqual(d.getDate(), 15);
    });
    test('accepts a Date instance and rebuilds at local midnight', () => {
        const original = new Date(2026, 5, 1, 23, 30);
        const d = ymdToDate(original);
        assertEqual(d.getDate(), 1);
        assertEqual(d.getHours(), 0);
    });
    test('throws on garbage input', () => {
        assertThrows(() => ymdToDate('not-a-date'));
        assertThrows(() => ymdToDate(null));
    });
});

suite('isValidYmd', () => {
    test('valid', () => {
        assertEqual(isValidYmd('2026-01-05'), true);
    });
    test('rejects impossible day', () => {
        assertEqual(isValidYmd('2026-02-30'), false);
    });
    test('rejects ISO timestamp', () => {
        assertEqual(isValidYmd('2026-01-05T00:00:00.000Z'), false);
    });
    test('rejects non-strings', () => {
        assertEqual(isValidYmd(123), false);
        assertEqual(isValidYmd(undefined), false);
    });
});
