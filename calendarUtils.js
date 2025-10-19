 
function getDaysInWindow(date, dateRanges) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const windowStart = new Date(checkDate);
    windowStart.setDate(windowStart.getDate() - 179);
    let daysInWindow = 0;
    dateRanges.forEach(range => {
        const rangeStart = new Date(range.start);
        const rangeEnd = new Date(range.end);
        rangeStart.setHours(0, 0, 0, 0);
        rangeEnd.setHours(0, 0, 0, 0);
        const overlapStart = new Date(Math.max(rangeStart.getTime(), windowStart.getTime()));
        const overlapEnd = new Date(Math.min(rangeEnd.getTime(), checkDate.getTime()));
        if (overlapStart <= overlapEnd) {
            daysInWindow += getDaysBetween(overlapStart, overlapEnd);
        }
    });
    return daysInWindow;
}

 
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

 
function isDateInAnyRange(date, dateRanges) {
    return dateRanges.some(range => {
        const rangeStart = new Date(range.start);
        const rangeEnd = new Date(range.end);
        rangeStart.setHours(0, 0, 0, 0);
        rangeEnd.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate >= rangeStart && checkDate <= rangeEnd;
    });
}

 
function isDateSelectedBoundary(date, dateRanges) {
    return dateRanges.some(range => {
        return isSameDay(date, new Date(range.start)) || isSameDay(date, new Date(range.end));
    });
}

 
function getDaysBetween(start, end) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((end - start) / msPerDay) + 1;
}

 
function checkExceedsLimit(date, dateRanges) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const windowStart = new Date(checkDate);
    windowStart.setDate(windowStart.getDate() - 179);
    let daysInWindow = 0;
    dateRanges.forEach(range => {
        const rangeStart = new Date(range.start);
        const rangeEnd = new Date(range.end);
        rangeStart.setHours(0, 0, 0, 0);
        rangeEnd.setHours(0, 0, 0, 0);
        const overlapStart = new Date(Math.max(rangeStart.getTime(), windowStart.getTime()));
        const overlapEnd = new Date(Math.min(rangeEnd.getTime(), checkDate.getTime()));
        if (overlapStart <= overlapEnd) {
            daysInWindow += getDaysBetween(overlapStart, overlapEnd);
        }
    });
    return daysInWindow > 90;
}

export {
    isSameDay,
    isDateInAnyRange,
    isDateSelectedBoundary,
    getDaysBetween,
    checkExceedsLimit,
    getDaysInWindow
};
