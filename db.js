const DB_NAME = 'SchengenCalculatorDB';
const DB_VERSION = 1;
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
            resolve(request.result);
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
            resolve({
                id: request.result,
                start: new Date(range.start),
                end: new Date(range.end)
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
