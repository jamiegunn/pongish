export interface StorageGateway {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
}

export class BrowserStorageGateway implements StorageGateway {
  get(key: string): string | null {
    return window.localStorage.getItem(key);
  }

  set(key: string, value: string): void {
    window.localStorage.setItem(key, value);
  }

  remove(key: string): void {
    window.localStorage.removeItem(key);
  }
}
