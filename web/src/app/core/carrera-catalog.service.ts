import { Injectable, inject } from '@angular/core';
import { NamedListCatalogService } from './named-list-catalog.service';

@Injectable({ providedIn: 'root' })
export class CarreraCatalogService {
  private readonly catalog = inject(NamedListCatalogService);
  readonly key = 'carreras';
  readonly list = this.catalog.list(this.key);

  absorb(values: Array<string | null | undefined>): void {
    this.catalog.absorb(this.key, values);
  }

  add(nombre: string): boolean {
    return this.catalog.add(this.key, nombre);
  }

  remove(nombre: string): void {
    this.catalog.remove(this.key, nombre);
  }
}
