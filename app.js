import * as calendarUtils from './calendarUtils.js';
import * as db from './db.js';
import { dateToYmd, parseImportPayload } from './dateStorage.js';
import { mergeWithCandidate } from './rangeUtils.js';

let dateRanges = [];
let calendarHasScrolled = false;
let selectionStart = null;
let selectionEnd = null;

document.addEventListener('DOMContentLoaded', async () => {
    await db.initDB();
    dateRanges = await db.loadDateRanges();
    renderCalendar();
    setupEventListeners();
});

function setupEventListeners() {
    window.handleExport = function handleExport() {
        const exportData = dateRanges.map(r => ({
            start: dateToYmd(r.start),
            end: dateToYmd(r.end)
        }));
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schengen.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

    window.handleImport = async function handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.style.display = 'none';
        input.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const sanitized = parseImportPayload(JSON.parse(text));
                await db.clearAllRanges();
                for (const r of sanitized) {
                    await db.saveDateRange(r.start, r.end);
                }
                dateRanges = await db.loadDateRanges();
                renderCalendar();
                alert('Dates imported successfully!');
            } catch (err) {
                alert('Failed to import: ' + err.message);
            }
        });
        document.body.appendChild(input);
        input.click();
        setTimeout(() => document.body.removeChild(input), 1000);
    }
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to reset all data?')) {
                await db.clearAllRanges();
                dateRanges = await db.loadDateRanges();
                renderCalendar();
            }
        });
    }

    const infoBtn = document.getElementById('infoBtn');
    const infoPopover = document.getElementById('infoPopover');
    const closeInfo = document.getElementById('closeInfo');
    if (infoBtn && infoPopover) {
        infoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            infoPopover.style.display = 'block';
        });
    }
    if (closeInfo && infoPopover) {
        closeInfo.addEventListener('click', (e) => {
            e.preventDefault();
            infoPopover.style.display = 'none';
        });
    }
    // Optional: close popover when clicking outside
    document.addEventListener('mousedown', (e) => {
        if (infoPopover && infoPopover.style.display === 'block') {
            if (!infoPopover.contains(e.target) && e.target !== infoBtn) {
                infoPopover.style.display = 'none';
            }
        }
    });

}

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Render 25 months: 12 months back, current month, and 12 months forward
    const today = new Date();
    const startMonth = new Date(today.getFullYear(), today.getMonth() - 12, 1);
    let currentMonthIndex = null;

    for (let monthOffset = 0; monthOffset < 25; monthOffset++) {
        const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + monthOffset, 1);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const monthContainer = document.createElement('div');
        monthContainer.className = 'month-container';
        if (year === today.getFullYear() && month === today.getMonth()) {
            currentMonthIndex = monthOffset;
            monthContainer.setAttribute('data-current-month', 'true');
        }

        const monthGrid = document.createElement('div');
        monthGrid.className = 'month-grid';

        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        const monthLabel = document.createElement('div');
        monthLabel.className = 'month-label';
        monthLabel.textContent = `${monthNames[month]} ${year}`;
        monthContainer.appendChild(monthLabel);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            addDayElement(monthGrid, date);
        }

        monthContainer.appendChild(monthGrid);
        calendar.appendChild(monthContainer);
    }

    // Scroll to current month only on initial load
    if (!calendarHasScrolled) {
        setTimeout(() => {
            const calendarContainer = document.querySelector('#calendar');
            const currentMonthEl = calendar.querySelector('[data-current-month="true"]');
            if (calendarContainer && currentMonthEl) {
                calendarContainer.scrollTop = currentMonthEl.offsetTop - calendarContainer.offsetTop;
            }
            calendarHasScrolled = true;
        }, 0);
    }
}

function addDayElement(calendar, date) {

    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';

    const dayNumber = document.createElement('div');
    dayNumber.textContent = date.getDate();
    dayNumber.className = 'calendar-day-number';

    const daysInWindow = calendarUtils.getDaysInWindow(date, dateRanges);
    const daysInWindowDiv = document.createElement('div');
    daysInWindowDiv.className = 'calendar-days-in-window';
    daysInWindowDiv.textContent = daysInWindow;

    dayElement.appendChild(dayNumber);
    dayElement.appendChild(daysInWindowDiv);

    const today = new Date();
    if (calendarUtils.isSameDay(date, today)) {
        dayElement.classList.add('today');
    }


    const inRange = calendarUtils.isDateInAnyRange(date, dateRanges);
    if (inRange) {
        if (daysInWindow > 90) {
            dayElement.classList.add('schengen-over');
        } else {
            dayElement.classList.add('in-range');
        }
    }

    if (selectionStart && !selectionEnd && calendarUtils.isSameDay(date, selectionStart)) {
        dayElement.classList.add('selected');
    }

    dayElement.addEventListener('click', () => handleDayClick(date));

    calendar.appendChild(dayElement);
}

async function handleDayClick(date) {
    let clickedDayInRange = null;
    for (const range of dateRanges) {
        const rangeStart = new Date(range.start);
        const rangeEnd = new Date(range.end);
        if (date >= rangeStart && date <= rangeEnd) {
            clickedDayInRange = range;
            break;
        }
    }

    if (clickedDayInRange) {
        await splitRange();
        renderCalendar();
        return;
    }

    if (!selectionStart) {
        selectionStart = new Date(date);
        selectionEnd = null;
        renderCalendar();
    } else if (!selectionEnd) {
        selectionEnd = new Date(date);
        if (selectionStart > selectionEnd) {
            [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
        }

        // Merge the new selection with any overlapping existing ranges so
        // we never store overlapping ranges (which would cause days to be
        // double-counted by getDaysInWindow).
        const { merged, absorbed } = mergeWithCandidate(dateRanges, {
            start: selectionStart,
            end: selectionEnd
        });
        for (const range of absorbed) {
            await db.deleteDateRange(range.id);
        }
        await db.saveDateRange(merged.start, merged.end);
        dateRanges = await db.loadDateRanges();
        renderCalendar();
        selectionStart = null;
        selectionEnd = null;
    }

    async function splitRange() {
        const rangeStart = new Date(clickedDayInRange.start);
        const rangeEnd = new Date(clickedDayInRange.end);
        await db.deleteDateRange(clickedDayInRange.id);
        const leftEnd = new Date(date);
        leftEnd.setDate(leftEnd.getDate() - 1);
        if (leftEnd >= rangeStart) {
            await db.saveDateRange(rangeStart, leftEnd);
        }
        const rightStart = new Date(date);
        rightStart.setDate(rightStart.getDate() + 1);
        if (rightStart <= rangeEnd) {
            await db.saveDateRange(rightStart, rangeEnd);
        }
        selectionStart = null;
        selectionEnd = null;
        dateRanges = await db.loadDateRanges();
    }
}


