import * as calendarUtils from './calendarUtils.js';
import * as db from './db.js';

let dateRanges = [];
let calendarHasScrolled = false;
let selectionStart = null;
let selectionEnd = null;

document.addEventListener('DOMContentLoaded', async () => {
    await db.initDB();
    const ranges = await db.loadDateRanges();
    dateRanges = ranges.map(range => ({
        ...range,
        start: new Date(range.start),
        end: new Date(range.end)
    }));
    renderCalendar();
    setupEventListeners();
});

function setupEventListeners() {
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to reset all data?')) {
                await db.clearAllRanges();
                dateRanges = (await db.loadDateRanges()).map(range => ({
                    ...range,
                    start: new Date(range.start),
                    end: new Date(range.end)
                }));
                renderCalendar();
            }
        });
    }

    // Info button popover logic
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

        // Delete any ranges fully within the new selection
        const rangesToDelete = dateRanges.filter(range => {
            const rangeStart = new Date(range.start);
            const rangeEnd = new Date(range.end);
            return rangeStart >= selectionStart && rangeEnd <= selectionEnd;
        });
        for (const range of rangesToDelete) {
            await db.deleteDateRange(range.id);
        }

        await db.saveDateRange(selectionStart, selectionEnd);
        dateRanges = (await db.loadDateRanges()).map(range => ({
            ...range,
            start: new Date(range.start),
            end: new Date(range.end)
        }));
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
        dateRanges = (await db.loadDateRanges()).map(range => ({
            ...range,
            start: new Date(range.start),
            end: new Date(range.end)
        }));
    }
}


