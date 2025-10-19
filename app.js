// Database name and version
const DB_NAME = 'SchengenCalculatorDB';
const DB_VERSION = 1;
const STORE_NAME = 'dateRanges';

// Global state
let db = null;
let dateRanges = [];
let currentMonth = new Date();
let selectionStart = null;
let selectionEnd = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    await loadDateRanges();
    renderCalendar();
    updateStats();
    setupEventListeners();
});

// IndexedDB functions
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

async function loadDateRanges() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            dateRanges = request.result.map(range => ({
                ...range,
                start: new Date(range.start),
                end: new Date(range.end)
            }));
            renderRangesList();
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

async function saveDateRange(start, end) {
    const range = {
        start: start.toISOString(),
        end: end.toISOString()
    };
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(range);
        
        request.onsuccess = () => {
            dateRanges.push({
                id: request.result,
                start: new Date(range.start),
                end: new Date(range.end)
            });
            renderRangesList();
            updateStats();
            renderCalendar();
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

async function deleteDateRange(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onsuccess = () => {
            dateRanges = dateRanges.filter(range => range.id !== id);
            renderRangesList();
            updateStats();
            renderCalendar();
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

async function clearAllRanges() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        
        request.onsuccess = () => {
            dateRanges = [];
            renderRangesList();
            updateStats();
            renderCalendar();
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

// Event listeners
function setupEventListeners() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });
    
    document.getElementById('clearAllBtn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all date ranges?')) {
            await clearAllRanges();
        }
    });
}

// Calendar rendering
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';
    
    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = 
        `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        calendar.appendChild(header);
    });
    
    // Get first day of month and number of days
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Add previous month days
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthDays = prevMonthLastDay.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const date = new Date(year, month - 1, day);
        addDayElement(calendar, date, true);
    }
    
    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        addDayElement(calendar, date, false);
    }
    
    // Add next month days to fill the grid
    const totalCells = calendar.children.length - 7; // Subtract day headers
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(year, month + 1, day);
        addDayElement(calendar, date, true);
    }
}

function addDayElement(calendar, date, isOtherMonth) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = date.getDate();
    
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }
    
    // Check if today
    const today = new Date();
    if (isSameDay(date, today)) {
        dayElement.classList.add('today');
    }
    
    // Check if in any range
    const inRange = isDateInAnyRange(date);
    if (inRange) {
        dayElement.classList.add('in-range');
    }
    
    // Check if this is the currently selected start date (first click)
    if (selectionStart && !selectionEnd && isSameDay(date, selectionStart)) {
        dayElement.classList.add('selected');
    }
    
    // Check if selected (start or end of a range)
    const isSelected = isDateSelectedBoundary(date);
    if (isSelected) {
        dayElement.classList.add('selected');
    }
    
    // Check if exceeds limit
    if (checkExceedsLimit(date)) {
        dayElement.classList.add('exceeds-limit');
    }
    
    // Add click handler
    dayElement.addEventListener('click', () => handleDayClick(date));
    
    calendar.appendChild(dayElement);
}

function handleDayClick(date) {
    if (!selectionStart) {
        // Start a new selection
        selectionStart = new Date(date);
        selectionEnd = null;
        renderCalendar();
    } else if (!selectionEnd) {
        // Complete the selection
        selectionEnd = new Date(date);
        
        // Ensure start is before end
        if (selectionStart > selectionEnd) {
            [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
        }
        
        // Save the range
        saveDateRange(selectionStart, selectionEnd);
        
        // Reset selection
        selectionStart = null;
        selectionEnd = null;
    }
}

// Date utility functions
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function isDateInAnyRange(date) {
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

function isDateSelectedBoundary(date) {
    return dateRanges.some(range => {
        return isSameDay(date, range.start) || isSameDay(date, range.end);
    });
}

function getDaysBetween(start, end) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((end - start) / msPerDay) + 1;
}

// Schengen calculation functions
function checkExceedsLimit(date) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Create a 180-day window ending on the check date
    const windowStart = new Date(checkDate);
    windowStart.setDate(windowStart.getDate() - 179);
    
    // Count days in this window
    let daysInWindow = 0;
    
    dateRanges.forEach(range => {
        const rangeStart = new Date(range.start);
        const rangeEnd = new Date(range.end);
        rangeStart.setHours(0, 0, 0, 0);
        rangeEnd.setHours(0, 0, 0, 0);
        
        // Find overlap between range and window
        const overlapStart = new Date(Math.max(rangeStart.getTime(), windowStart.getTime()));
        const overlapEnd = new Date(Math.min(rangeEnd.getTime(), checkDate.getTime()));
        
        if (overlapStart <= overlapEnd) {
            daysInWindow += getDaysBetween(overlapStart, overlapEnd);
        }
    });
    
    return daysInWindow > 90;
}

function calculateStats() {
    // Calculate total days across all ranges
    // This gives users a simple count of all days in their planned trips
    let daysUsed = 0;
    
    dateRanges.forEach(range => {
        const rangeStart = new Date(range.start);
        const rangeEnd = new Date(range.end);
        rangeStart.setHours(0, 0, 0, 0);
        rangeEnd.setHours(0, 0, 0, 0);
        
        daysUsed += getDaysBetween(rangeStart, rangeEnd);
    });
    
    return {
        daysUsed: Math.min(daysUsed, 90),
        daysRemaining: Math.max(0, 90 - daysUsed),
        exceeds: daysUsed > 90
    };
}

function updateStats() {
    const stats = calculateStats();
    
    document.getElementById('daysUsed').textContent = stats.daysUsed;
    document.getElementById('daysRemaining').textContent = stats.daysRemaining;
    
    const warningBox = document.getElementById('warningBox');
    const warningText = document.getElementById('warningText');
    
    if (stats.exceeds) {
        warningBox.style.display = 'block';
        warningText.textContent = 'You have exceeded the 90-day limit!';
    } else {
        warningBox.style.display = 'none';
    }
}

// Render date ranges list
function renderRangesList() {
    const rangesList = document.getElementById('rangesList');
    rangesList.innerHTML = '';
    
    if (dateRanges.length === 0) {
        rangesList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No date ranges added yet. Click on dates in the calendar to add ranges.</p>';
        return;
    }
    
    // Sort ranges by start date
    const sortedRanges = [...dateRanges].sort((a, b) => a.start - b.start);
    
    sortedRanges.forEach(range => {
        const rangeItem = document.createElement('div');
        rangeItem.className = 'range-item';
        
        const rangeInfo = document.createElement('div');
        
        const rangeDates = document.createElement('span');
        rangeDates.className = 'range-dates';
        rangeDates.textContent = `${formatDate(range.start)} → ${formatDate(range.end)}`;
        
        const rangeDays = document.createElement('span');
        rangeDays.className = 'range-days';
        const days = getDaysBetween(range.start, range.end);
        rangeDays.textContent = `(${days} day${days !== 1 ? 's' : ''})`;
        
        rangeInfo.appendChild(rangeDates);
        rangeInfo.appendChild(rangeDays);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'range-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteDateRange(range.id));
        
        rangeItem.appendChild(rangeInfo);
        rangeItem.appendChild(deleteBtn);
        rangesList.appendChild(rangeItem);
    });
}

function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
