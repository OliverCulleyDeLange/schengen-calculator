import { suite, test, assertEqual, assertTrue } from './harness.js';
import { rangesOverlap, mergeWithCandidate } from '../rangeUtils.js';
import { getDaysInWindow } from '../calendarUtils.js';

const r = (id, s, e) => ({ id, start: new Date(s[0], s[1] - 1, s[2]), end: new Date(e[0], e[1] - 1, e[2]) });

suite('rangesOverlap', () => {
    test('shared single day', () => {
        assertEqual(rangesOverlap(r(1, [2026, 1, 1], [2026, 1, 5]), r(2, [2026, 1, 5], [2026, 1, 10])), true);
    });
    test('adjacent (no shared day) does not overlap', () => {
        assertEqual(rangesOverlap(r(1, [2026, 1, 1], [2026, 1, 5]), r(2, [2026, 1, 6], [2026, 1, 10])), false);
    });
    test('disjoint', () => {
        assertEqual(rangesOverlap(r(1, [2026, 1, 1], [2026, 1, 5]), r(2, [2026, 2, 1], [2026, 2, 5])), false);
    });
    test('one contained in the other', () => {
        assertEqual(rangesOverlap(r(1, [2026, 1, 1], [2026, 1, 31]), r(2, [2026, 1, 10], [2026, 1, 15])), true);
    });
});

suite('mergeWithCandidate', () => {
    test('no existing ranges → candidate stands alone', () => {
        const out = mergeWithCandidate([], { start: new Date(2026, 0, 1), end: new Date(2026, 0, 5) });
        assertEqual(out.absorbed.length, 0);
        assertEqual(out.merged.start.getDate(), 1);
        assertEqual(out.merged.end.getDate(), 5);
    });
    test('candidate overlaps one existing range → merged into one', () => {
        const existing = [r(1, [2026, 1, 1], [2026, 1, 5])];
        const out = mergeWithCandidate(existing, { start: new Date(2026, 0, 3), end: new Date(2026, 0, 10) });
        assertEqual(out.absorbed.length, 1);
        assertEqual(out.absorbed[0].id, 1);
        assertEqual(out.merged.start.getDate(), 1);
        assertEqual(out.merged.end.getDate(), 10);
    });
    test('candidate fully contained in an existing range → merged keeps existing bounds', () => {
        const existing = [r(1, [2026, 1, 1], [2026, 1, 31])];
        const out = mergeWithCandidate(existing, { start: new Date(2026, 0, 10), end: new Date(2026, 0, 15) });
        assertEqual(out.absorbed.length, 1);
        assertEqual(out.merged.start.getDate(), 1);
        assertEqual(out.merged.end.getDate(), 31);
    });
    test('candidate fully contains an existing range → merged uses candidate bounds', () => {
        const existing = [r(1, [2026, 1, 10], [2026, 1, 15])];
        const out = mergeWithCandidate(existing, { start: new Date(2026, 0, 1), end: new Date(2026, 0, 31) });
        assertEqual(out.absorbed.length, 1);
        assertEqual(out.merged.start.getDate(), 1);
        assertEqual(out.merged.end.getDate(), 31);
    });
    test('candidate bridges two non-overlapping ranges → both absorbed', () => {
        const existing = [
            r(1, [2026, 1, 1], [2026, 1, 5]),
            r(2, [2026, 1, 20], [2026, 1, 25])
        ];
        const out = mergeWithCandidate(existing, { start: new Date(2026, 0, 4), end: new Date(2026, 0, 22) });
        assertEqual(out.absorbed.length, 2);
        assertEqual(out.merged.start.getDate(), 1);
        assertEqual(out.merged.end.getDate(), 25);
    });
    test('iteration order does not matter — second range absorbed only after first extends end', () => {
        // Candidate [10, 15] overlaps A=[12, 18]. After absorbing A, merged=[10, 18].
        // That now overlaps B=[18, 22]. Both must be absorbed regardless of iteration order.
        const existing = [
            r(2, [2026, 1, 18], [2026, 1, 22]),
            r(1, [2026, 1, 12], [2026, 1, 18])
        ];
        const out = mergeWithCandidate(existing, { start: new Date(2026, 0, 10), end: new Date(2026, 0, 15) });
        assertEqual(out.absorbed.length, 2);
        assertEqual(out.merged.start.getDate(), 10);
        assertEqual(out.merged.end.getDate(), 22);
    });
    test('non-overlapping ranges are left alone', () => {
        const existing = [
            r(1, [2026, 1, 1], [2026, 1, 5]),
            r(2, [2026, 6, 1], [2026, 6, 10])
        ];
        const out = mergeWithCandidate(existing, { start: new Date(2026, 2, 1), end: new Date(2026, 2, 5) });
        assertEqual(out.absorbed.length, 0);
    });
});

// Regression: before the fix, a candidate that partially overlapped an
// existing range was saved as a *separate* range, and getDaysInWindow
// summed each independently — double-counting the overlap.
suite('overlap → no double counting', () => {
    test('partial overlap merged before counting', () => {
        const existing = [r(1, [2026, 1, 1], [2026, 1, 10])]; // 10 days
        const candidate = { start: new Date(2026, 0, 5), end: new Date(2026, 0, 15) }; // 11 days
        // Pre-fix simulation: keeping both would yield 10 + 11 = 21 days,
        // but the actual unique day count is 15 (Jan 1 → Jan 15).
        const out = mergeWithCandidate(existing, candidate);
        const ranges = [out.merged];
        assertEqual(getDaysInWindow(new Date(2026, 0, 20), ranges), 15);
    });
});
