import type { SavedGamesRepositoryPort } from "@/features/saved-games/application";
import type { SavedGameRecord } from "@/features/saved-games/domain";

const DB_NAME = "pong_local";
const DB_VERSION = 1;
const STORE_NAME = "saved_games";

class MemorySavedGamesRepository implements SavedGamesRepositoryPort {
  private readonly map = new Map<string, SavedGameRecord>();

  async put(record: SavedGameRecord): Promise<void> {
    this.map.set(record.id, record);
  }

  async getById(id: string): Promise<SavedGameRecord | null> {
    return this.map.get(id) ?? null;
  }

  async list(): Promise<SavedGameRecord[]> {
    return Array.from(this.map.values());
  }

  async deleteById(id: string): Promise<void> {
    this.map.delete(id);
  }
}

const asRequestPromise = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB request failed"));
    };
  });
};

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("updatedAtMs", "updatedAtMs", { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });
};

export class IndexedDbSavedGamesRepository implements SavedGamesRepositoryPort {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDatabase(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDatabase();
    }
    return this.dbPromise;
  }

  async put(record: SavedGameRecord): Promise<void> {
    const db = await this.getDatabase();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(record);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Failed to persist saved game"));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Save transaction aborted"));
    });
  }

  async getById(id: string): Promise<SavedGameRecord | null> {
    const db = await this.getDatabase();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const result = await asRequestPromise<SavedGameRecord | undefined>(store.get(id));
    return result ?? null;
  }

  async list(): Promise<SavedGameRecord[]> {
    const db = await this.getDatabase();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const result = await asRequestPromise<SavedGameRecord[]>(store.getAll());
    return result ?? [];
  }

  async deleteById(id: string): Promise<void> {
    const db = await this.getDatabase();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Failed to delete saved game"));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Delete transaction aborted"));
    });
  }
}

export const createSavedGamesRepository = (): SavedGamesRepositoryPort => {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return new MemorySavedGamesRepository();
  }

  return new IndexedDbSavedGamesRepository();
};
