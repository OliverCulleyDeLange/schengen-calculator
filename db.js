import { dateToYmd, ymdToDate, isValidYmd } from './dateStorage.js';

const DB_NAME = 'SchengenCalculatorDB';
// v1: { id, start, end } where start/end are ISO timestamps (UTC).
// v2: { id, start, end } where start/end are 'YYYY-MM-DD' local-day strings.
//     The v1→v2 upgrade rewrites every existing row.
const DB_VERSION = 2;
const STORE_NAME = 'dateRanges';

let db = null;

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
            const tx = event.target.transaction;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                return;
            }
            // Migrate any pre-v2 rows whose start/end are ISO timestamps.
            if (event.oldVersion < 2) {
                const store = tx.objectStore(STORE_NAME);
                store.openCursor().onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (!cursor) return;
                    const row = cursor.value;
                    let mutated = false;
                    if (row && typeof row.start === 'string' && !isValidYmd(row.start)) {
                        row.start = dateToYmd(ymdToDate(row.start));
                        mutated = true;
                    }
                    if (row && typeof row.end === 'string' && !isValidYmd(row.end)) {
                        row.end = dateToYmd(ymdToDate(row.end));
                        mutated = true;
                    }
                    if (mutated) cursor.update(row);
                    cursor.continue();
                };
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
            const ranges = request.result.map(row => ({
                id: row.id,
                start: ymdToDate(row.start),
                end: ymdToDate(row.end)
            }));
            resolve(ranges);
        };
        request.onerror = () => reject(request.error);
    });
}

async function saveDateRange(start, end) {
    const range = {
        start: dateToYmd(start),
        end: dateToYmd(end)
    };
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(range);
        request.onsuccess = () => {
            resolve({
                id: request.result,
                start: ymdToDate(range.start),
                end: ymdToDate(range.end)
            });
        };
        request.onerror = () => reject(request.error);
    });
}

async function deleteDateRange(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function clearAllRanges() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export {
    initDB,
    loadDateRanges,
    saveDateRange,
    deleteDateRange,
    clearAllRanges
};
