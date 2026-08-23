interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache {
  private static store = new Map<string, CacheEntry<any>>();

  public static get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  public static set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  public static delete(key: string): void {
    this.store.delete(key);
  }

  public static clear(): void {
    this.store.clear();
  }
}
