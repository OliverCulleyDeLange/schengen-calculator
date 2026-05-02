// Operations on date ranges. Ranges are { id?, start: Date, end: Date }
// where start <= end and both are local-midnight Dates.

// Two ranges overlap if they share at least one day. Used to merge a
// newly-selected range with any existing ranges it touches so we never
// double-count days when calculating the 180-day window.
export function rangesOverlap(a, b) {
    return a.start.getTime() <= b.end.getTime()
        && a.end.getTime() >= b.start.getTime();
}

// Combine a candidate range with every existing range it overlaps with
// (transitively — absorbing one range can extend the candidate's reach
// to a previously-non-overlapping range). Returns the merged range and
// the ids of every existing range that got swallowed.
export function mergeWithCandidate(existing, candidate) {
    let mergedStart = candidate.start;
    let mergedEnd = candidate.end;
    const absorbed = [];
    const absorbedSet = new Set();

    let changed = true;
    while (changed) {
        changed = false;
        for (const r of existing) {
            if (absorbedSet.has(r.id)) continue;
            if (r.start.getTime() <= mergedEnd.getTime()
                && r.end.getTime() >= mergedStart.getTime()) {
                if (r.start.getTime() < mergedStart.getTime()) mergedStart = r.start;
                if (r.end.getTime() > mergedEnd.getTime()) mergedEnd = r.end;
                absorbed.push(r);
                absorbedSet.add(r.id);
                changed = true;
            }
        }
    }

    return {
        merged: { start: mergedStart, end: mergedEnd },
        absorbed
    };
}
