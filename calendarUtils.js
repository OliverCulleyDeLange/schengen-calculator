// All inputs/outputs are local-midnight Dates representing date-only
// (calendar-day) values. Ranges are { start, end } with start <= end,
// inclusive on both ends.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcDay(date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

// Inclusive day count between two date-only values. UTC math keeps DST
// transitions from producing 23- or 25-hour days that skew the round.
export function getDaysBetween(start, end) {
    return Math.round((utcDay(end) - utcDay(start)) / MS_PER_DAY) + 1;
}

export function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

export function isDateInAnyRange(date, ranges) {
    const t = utcDay(date);
    for (const r of ranges) {
        if (utcDay(r.start) <= t && t <= utcDay(r.end)) return true;
    }
    return false;
}

// Number of days within the 180-day window ending on `date` that overlap
// any saved range.
export function getDaysInWindow(date, ranges) {
    const checkUtc = utcDay(date);
    const windowStartUtc = checkUtc - 179 * MS_PER_DAY;
    let count = 0;
    for (const r of ranges) {
        const rStart = utcDay(r.start);
        const rEnd = utcDay(r.end);
        const overlapStart = Math.max(rStart, windowStartUtc);
        const overlapEnd = Math.min(rEnd, checkUtc);
        if (overlapStart <= overlapEnd) {
            count += Math.round((overlapEnd - overlapStart) / MS_PER_DAY) + 1;
        }
    }
    return count;
}

// Precompute days-in-window for a contiguous run of calendar days. The
// renderer hits this once per render instead of paying O(ranges) per cell.
//
// Returns { keyOf(date) -> count } where keyOf produces a stable
// 'YYYY-MM-DD' string.
export function precomputeDaysInWindow(firstDate, dayCount, ranges) {
    // We need 180 days of "history" before firstDate to seed the window.
    const histDays = 180;
    const totalDays = dayCount + histDays;
    const inRange = new Uint8Array(totalDays);
    const baseUtc = utcDay(firstDate) - histDays * MS_PER_DAY;

    for (const r of ranges) {
        const rs = utcDay(r.start);
        const re = utcDay(r.end);
        const startIdx = Math.max(0, Math.round((rs - baseUtc) / MS_PER_DAY));
        const endIdx = Math.min(totalDays - 1, Math.round((re - baseUtc) / MS_PER_DAY));
        for (let i = startIdx; i <= endIdx; i++) inRange[i] = 1;
    }

    // Slide a 180-wide window across the rendered days.
    const counts = new Int32Array(dayCount);
    let windowSum = 0;
    for (let i = 0; i < histDays; i++) windowSum += inRange[i];
    if (dayCount > 0) {
        windowSum += inRange[histDays]; // include the rendered day itself
        counts[0] = windowSum;
        for (let d = 1; d < dayCount; d++) {
            windowSum -= inRange[d - 1];
            windowSum += inRange[d + histDays];
            counts[d] = windowSum;
        }
    }

    return {
        get(date) {
            const idx = Math.round((utcDay(date) - utcDay(firstDate)) / MS_PER_DAY);
            return counts[idx];
        }
    };
}
