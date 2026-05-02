// Date-only storage helpers.
//
// Dates entered in the calendar are date-only (no time-of-day). Earlier
// versions persisted them via Date.prototype.toISOString(), which serialises
// in UTC. For users west of UTC, a local-midnight Date round-trips through
// UTC as the previous calendar day. We therefore store dates as
// 'YYYY-MM-DD' strings and reconstruct them at local midnight on load.
//
// The legacy ISO format is still parsed on load for backwards compatibility
// with existing IndexedDB rows and exported JSON files.

export function dateToYmd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function ymdToDate(value) {
    if (value instanceof Date) {
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    if (typeof value !== 'string') {
        throw new Error('Expected YYYY-MM-DD string, got ' + typeof value);
    }
    // Plain YYYY-MM-DD (preferred).
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (ymd) {
        return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    }
    // Legacy ISO timestamp ('2024-05-01T00:00:00.000Z').
    // Re-extract the calendar day from the UTC components so we land on the
    // same Y/M/D the user originally clicked, regardless of their offset.
    const iso = /^(\d{4})-(\d{2})-(\d{2})T/.exec(value);
    if (iso) {
        return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    }
    throw new Error('Unrecognised date string: ' + value);
}

export function isValidYmd(value) {
    if (typeof value !== 'string') return false;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return false;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    // Verify the parsed date round-trips (rejects e.g. 2026-02-30).
    const probe = new Date(y, mo - 1, d);
    return probe.getFullYear() === y && probe.getMonth() === mo - 1 && probe.getDate() === d;
}
