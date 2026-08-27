import { Injectable, inject } from '@angular/core';
import { NamedListCatalogService } from './named-list-catalog.service';

export const PERFIL_CATALOG_KEY = 'perfiles';

@Injectable({ providedIn: 'root' })
export class PerfilCatalogService {
  private readonly catalog = inject(NamedListCatalogService);
  readonly key = PERFIL_CATALOG_KEY;
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
