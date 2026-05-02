import * as calendarUtils from './calendarUtils.js';
import * as db from './db.js';
import { dateToYmd, ymdToDate, parseImportPayload } from './dateStorage.js';
import { mergeWithCandidate } from './rangeUtils.js';
import { appConfirm, appAlert } from './modal.js';

let dateRanges = [];
let calendarHasScrolled = false;
let selectionStart = null;
let selectionEnd = null;

document.addEventListener('DOMContentLoaded', async () => {
    await db.initDB();
    dateRanges = await db.loadDateRanges();
    setupCalendarDelegation();
    renderCalendar();
    setupEventListeners();
});

function handleExport() {
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

async function handleImport() {
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
            await appAlert('Dates imported successfully!', 'Import');
        } catch (err) {
            await appAlert('Failed to import: ' + err.message, 'Import error');
        }
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(() => document.body.removeChild(input), 1000);
}

function setupEventListeners() {
    document.getElementById('exportBtn')?.addEventListener('click', handleExport);
    document.getElementById('importBtn')?.addEventListener('click', handleImport);

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const ok = await appConfirm('Are you sure you want to reset all data?', 'Reset');
            if (ok) {
                await db.clearAllRanges();
                dateRanges = await db.loadDateRanges();
                renderCalendar();
            }
        });
    }

    const infoBtn = document.getElementById('infoBtn');
    const infoPopover = document.getElementById('infoPopover');
    const closeInfo = document.getElementById('closeInfo');

    function openPopover() {
        if (!infoPopover) return;
        infoPopover.hidden = false;
        infoBtn?.setAttribute('aria-expanded', 'true');
        // Move focus into the dialog so screen readers announce it.
        (closeInfo || infoPopover).focus?.();
    }
    function closePopover() {
        if (!infoPopover) return;
        infoPopover.hidden = true;
        infoBtn?.setAttribute('aria-expanded', 'false');
        infoBtn?.focus?.();
    }
    function isPopoverOpen() {
        return infoPopover && !infoPopover.hidden;
    }

    if (infoBtn && infoPopover) {
        infoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isPopoverOpen() ? closePopover() : openPopover();
        });
    }
    if (closeInfo && infoPopover) {
        closeInfo.addEventListener('click', (e) => {
            e.preventDefault();
            closePopover();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPopoverOpen()) {
            e.preventDefault();
            closePopover();
        }
    });
    document.addEventListener('mousedown', (e) => {
        if (isPopoverOpen() && !infoPopover.contains(e.target) && e.target !== infoBtn) {
            closePopover();
        }
    });
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const DAY_LABEL_FMT = (typeof Intl !== 'undefined')
    ? new Intl.DateTimeFormat(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null;

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    // 12 months back, current month, 12 months forward.
    const today = new Date();
    const startMonth = new Date(today.getFullYear(), today.getMonth() - 12, 1);
    const firstDay = new Date(startMonth);
    // Total rendered days: sum of days in each rendered month. We compute
    // this so we can size the precompute buffer correctly.
    let totalDays = 0;
    for (let m = 0; m < 25; m++) {
        const md = new Date(firstDay.getFullYear(), firstDay.getMonth() + m + 1, 0);
        totalDays += md.getDate();
    }

    const counts = calendarUtils.precomputeDaysInWindow(firstDay, totalDays, dateRanges);

    const fragment = document.createDocumentFragment();
    for (let monthOffset = 0; monthOffset < 25; monthOffset++) {
        const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + monthOffset, 1);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const monthContainer = document.createElement('div');
        monthContainer.className = 'month-container';
        if (year === today.getFullYear() && month === today.getMonth()) {
            monthContainer.setAttribute('data-current-month', 'true');
        }

        const monthLabel = document.createElement('div');
        monthLabel.className = 'month-label';
        monthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;
        monthContainer.appendChild(monthLabel);

        const monthGrid = document.createElement('div');
        monthGrid.className = 'month-grid';

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            monthGrid.appendChild(buildDayElement(date, counts.get(date), today));
        }

        monthContainer.appendChild(monthGrid);
        fragment.appendChild(monthContainer);
    }
    calendar.appendChild(fragment);

    if (!calendarHasScrolled) {
        setTimeout(() => {
            const currentMonthEl = calendar.querySelector('[data-current-month="true"]');
            if (currentMonthEl) {
                calendar.scrollTop = currentMonthEl.offsetTop - calendar.offsetTop;
            }
            calendarHasScrolled = true;
        }, 0);
    }
}

function buildDayElement(date, daysInWindow, today) {
    const el = document.createElement('div');
    el.className = 'calendar-day';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.dataset.date = dateToYmd(date);

    const dayNumber = document.createElement('div');
    dayNumber.textContent = date.getDate();
    dayNumber.className = 'calendar-day-number';

    const daysInWindowDiv = document.createElement('div');
    daysInWindowDiv.className = 'calendar-days-in-window';
    daysInWindowDiv.textContent = daysInWindow;

    el.appendChild(dayNumber);
    el.appendChild(daysInWindowDiv);

    if (calendarUtils.isSameDay(date, today)) el.classList.add('today');

    const inRange = calendarUtils.isDateInAnyRange(date, dateRanges);
    if (inRange) {
        el.classList.add(daysInWindow > 90 ? 'schengen-over' : 'in-range');
    }

    if (selectionStart && !selectionEnd && calendarUtils.isSameDay(date, selectionStart)) {
        el.classList.add('selected');
        el.setAttribute('aria-pressed', 'true');
    }

    const label = DAY_LABEL_FMT ? DAY_LABEL_FMT.format(date) : date.toDateString();
    const status = inRange
        ? (daysInWindow > 90 ? `selected, ${daysInWindow} days used (over 90 limit)` : `selected, ${daysInWindow} days used in 180-day window`)
        : `${daysInWindow} days used in 180-day window`;
    el.setAttribute('aria-label', `${label}, ${status}`);

    return el;
}

function setupCalendarDelegation() {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    calendar.addEventListener('click', (e) => {
        const cell = e.target.closest('.calendar-day');
        if (cell && calendar.contains(cell)) handleDayClick(ymdToDate(cell.dataset.date));
    });
    calendar.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const cell = e.target.closest('.calendar-day');
        if (cell && calendar.contains(cell)) {
            e.preventDefault();
            handleDayClick(ymdToDate(cell.dataset.date));
        }
    });
}

async function handleDayClick(date) {
    const clickedDayInRange = dateRanges.find(
        r => date >= r.start && date <= r.end
    );

    if (clickedDayInRange) {
        await splitRange(clickedDayInRange, date);
        selectionStart = null;
        selectionEnd = null;
        renderCalendar();
        return;
    }

    if (!selectionStart) {
        selectionStart = new Date(date);
        selectionEnd = null;
        renderCalendar();
        return;
    }
    if (!selectionEnd) {
        selectionEnd = new Date(date);
        if (selectionStart > selectionEnd) {
            [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
        }
        const { merged, absorbed } = mergeWithCandidate(dateRanges, {
            start: selectionStart,
            end: selectionEnd
        });
        for (const range of absorbed) {
            await db.deleteDateRange(range.id);
            const idx = dateRanges.findIndex(r => r.id === range.id);
            if (idx !== -1) dateRanges.splice(idx, 1);
        }
        const saved = await db.saveDateRange(merged.start, merged.end);
        dateRanges.push(saved);
        selectionStart = null;
        selectionEnd = null;
        renderCalendar();
    }
}

async function splitRange(range, splitDate) {
    await db.deleteDateRange(range.id);
    const idx = dateRanges.findIndex(r => r.id === range.id);
    if (idx !== -1) dateRanges.splice(idx, 1);

    const leftEnd = new Date(splitDate);
    leftEnd.setDate(leftEnd.getDate() - 1);
    if (leftEnd >= range.start) {
        const saved = await db.saveDateRange(range.start, leftEnd);
        dateRanges.push(saved);
    }
    const rightStart = new Date(splitDate);
    rightStart.setDate(rightStart.getDate() + 1);
    if (rightStart <= range.end) {
        const saved = await db.saveDateRange(rightStart, range.end);
        dateRanges.push(saved);
    }
}


