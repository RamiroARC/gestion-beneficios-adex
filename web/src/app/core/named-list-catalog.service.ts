import { Injectable, WritableSignal, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NamedListCatalogService {
  private readonly stores = new Map<string, WritableSignal<string[]>>();

  list(key: string) {
    return this.ensure(key).asReadonly();
  }

  absorb(key: string, values: Array<string | null | undefined>): void {
    const extra = values.map((v) => (v ?? '').trim()).filter((v) => v.length > 0);
    if (extra.length === 0) return;
    this.merge(key, extra);
  }

  add(key: string, nombre: string): boolean {
    const value = nombre.trim();
    if (!value) return false;
    const exists = this.ensure(key)().some((c) => c.toLocaleLowerCase('es') === value.toLocaleLowerCase('es'));
    if (exists) return false;
    this.merge(key, [value]);
    return true;
  }

  remove(key: string, nombre: string): void {
    const store = this.ensure(key);
    const next = store().filter((c) => c !== nombre);
    store.set(next);
    this.write(key, next);
  }

  private merge(key: string, values: string[]): void {
    const store = this.ensure(key);
    const map = new Map<string, string>();
    for (const item of [...store(), ...values]) {
      const keyName = item.toLocaleLowerCase('es');
      if (!map.has(keyName)) map.set(keyName, item);
    }
    const next = [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
    store.set(next);
    this.write(key, next);
  }

  private ensure(key: string): WritableSignal<string[]> {
    let store = this.stores.get(key);
    if (!store) {
      store = signal(this.read(key));
      this.stores.set(key, store);
    }
    return store;
  }

  private read(key: string): string[] {
    try {
      const raw =
        localStorage.getItem(`adex.catalog.${key}`) ??
        (key === 'carreras' ? localStorage.getItem('adex.carreras') : null);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
    } catch {
      return [];
    }
  }

  private write(key: string, values: string[]): void {
    localStorage.setItem(`adex.catalog.${key}`, JSON.stringify(values));
  }
}
