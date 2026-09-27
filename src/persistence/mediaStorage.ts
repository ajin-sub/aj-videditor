export interface MediaRecord {
    id: string;
    name: string;
    size: number;
    type: string;
    blob: Blob;
    createdAt: string;
}

const DATABASE_NAME = 'aj-editor';
const STORE_NAME = 'media';
let databasePromise: Promise<IDBDatabase> | null = null;

export function createMediaId(): string {
    return crypto.randomUUID();
}

export function saveMedia(record: MediaRecord): Promise<void> {
    return openDatabase().then(database => new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    }));
}

export function getMedia(id: string): Promise<MediaRecord | undefined> {
    return openDatabase().then(database => new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
        request.onsuccess = () => resolve(request.result as MediaRecord | undefined);
        request.onerror = () => reject(request.error);
    }));
}

function openDatabase(): Promise<IDBDatabase> {
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, 1);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            databasePromise = null;
            reject(request.error);
        };
    });

    return databasePromise;
}