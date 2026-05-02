import { suite, test, assertEqual } from './harness.js';
import { getDaysBetween, getDaysInWindow, isSameDay, isDateInAnyRange, precomputeDaysInWindow } from '../calendarUtils.js';

suite('getDaysBetween', () => {
    test('same day inclusive = 1', () => {
        assertEqual(getDaysBetween(new Date(2026, 0, 1), new Date(2026, 0, 1)), 1);
    });
    test('two consecutive days = 2', () => {
        assertEqual(getDaysBetween(new Date(2026, 0, 1), new Date(2026, 0, 2)), 2);
    });
    test('one week = 7', () => {
        assertEqual(getDaysBetween(new Date(2026, 0, 1), new Date(2026, 0, 7)), 7);
    });
    test('crosses month boundary', () => {
        assertEqual(getDaysBetween(new Date(2026, 0, 30), new Date(2026, 1, 2)), 4);
    });
    test('crosses year boundary', () => {
        assertEqual(getDaysBetween(new Date(2025, 11, 30), new Date(2026, 0, 2)), 4);
    });
    // DST regression: previously the ms-diff/86400000 + Math.round approach
    // could be wrong when the range spans a DST transition because two
    // local-midnight Date instances can be 23 or 25 hours apart.
    test('spring-forward DST (EU): Mar 28 2026 → Mar 30 2026 = 3 days', () => {
        assertEqual(getDaysBetween(new Date(2026, 2, 28), new Date(2026, 2, 30)), 3);
    });
    test('fall-back DST (EU): Oct 24 2026 → Oct 26 2026 = 3 days', () => {
        assertEqual(getDaysBetween(new Date(2026, 9, 24), new Date(2026, 9, 26)), 3);
    });
    test('long range crossing both DST transitions in 2026 = 365 days', () => {
        assertEqual(getDaysBetween(new Date(2026, 0, 1), new Date(2026, 11, 31)), 365);
    });
});

suite('getDaysInWindow', () => {
    test('no ranges → 0', () => {
        assertEqual(getDaysInWindow(new Date(2026, 0, 1), []), 0);
    });
    test('single range fully inside window', () => {
        const ranges = [{ start: new Date(2026, 0, 1), end: new Date(2026, 0, 10) }];
        assertEqual(getDaysInWindow(new Date(2026, 0, 15), ranges), 10);
    });
    test('window slides past old range', () => {
        const ranges = [{ start: new Date(2025, 0, 1), end: new Date(2025, 0, 10) }];
        // 180-day window from 2026-01-01 ends well before any of the 2025 range.
        assertEqual(getDaysInWindow(new Date(2026, 0, 1), ranges), 0);
    });
    test('range partially clipped by window edge', () => {
        // Window: 2026-01-01 → 2025-07-06 (179 days back).
        // Range straddles the edge; only the part inside the window counts.
        const ranges = [{ start: new Date(2025, 6, 1), end: new Date(2025, 6, 10) }]; // Jul 1–10 2025
        assertEqual(getDaysInWindow(new Date(2026, 0, 1), ranges), 5); // Jul 6–10
    });
});

suite('isSameDay', () => {
    test('same calendar day, different times', () => {
        assertEqual(isSameDay(new Date(2026, 0, 1, 0, 0), new Date(2026, 0, 1, 23, 59)), true);
    });
    test('different days', () => {
        assertEqual(isSameDay(new Date(2026, 0, 1), new Date(2026, 0, 2)), false);
    });
});

// Regression: the renderer relies on precomputeDaysInWindow returning
// the same counts that getDaysInWindow would have returned per-day.
// Drift would silently mis-render the days-used number on every cell.
suite('precomputeDaysInWindow agrees with getDaysInWindow', () => {
    test('matches over a 60-day stretch with several ranges', () => {
        const ranges = [
            { start: new Date(2026, 0, 5), end: new Date(2026, 0, 15) },
            { start: new Date(2026, 1, 1), end: new Date(2026, 1, 10) },
            { start: new Date(2025, 9, 1), end: new Date(2025, 9, 30) }
        ];
        const first = new Date(2026, 0, 1);
        const days = 60;
        const counts = precomputeDaysInWindow(first, days, ranges);
        for (let i = 0; i < days; i++) {
            const d = new Date(2026, 0, 1 + i);
            assertEqual(counts.get(d), getDaysInWindow(d, ranges), `day ${i}`);
        }
    });
    test('matches with no ranges (all zero)', () => {
        const counts = precomputeDaysInWindow(new Date(2026, 0, 1), 30, []);
        for (let i = 0; i < 30; i++) {
            assertEqual(counts.get(new Date(2026, 0, 1 + i)), 0);
        }
    });
});

suite('isDateInAnyRange', () => {
    test('boundary inclusive (start)', () => {
        const ranges = [{ start: new Date(2026, 0, 5), end: new Date(2026, 0, 10) }];
        assertEqual(isDateInAnyRange(new Date(2026, 0, 5), ranges), true);
    });
    test('boundary inclusive (end)', () => {
        const ranges = [{ start: new Date(2026, 0, 5), end: new Date(2026, 0, 10) }];
        assertEqual(isDateInAnyRange(new Date(2026, 0, 10), ranges), true);
    });
    test('outside range', () => {
        const ranges = [{ start: new Date(2026, 0, 5), end: new Date(2026, 0, 10) }];
        assertEqual(isDateInAnyRange(new Date(2026, 0, 11), ranges), false);
    });
});
