import { suite, test, assertEqual } from './harness.js';
import { getDaysBetween, getDaysInWindow } from '../calendarUtils.js';

suite('calendarUtils placeholder', () => {
    test('getDaysBetween same day = 1', () => {
        assertEqual(getDaysBetween(new Date(2026, 0, 1), new Date(2026, 0, 1)), 1);
    });
    test('getDaysInWindow with no ranges = 0', () => {
        assertEqual(getDaysInWindow(new Date(2026, 0, 1), []), 0);
    });
});
