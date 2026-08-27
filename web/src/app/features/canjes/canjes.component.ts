import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { Subject, debounceTime, forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Beneficio, Canje, Empresa } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { matchesText } from '../../core/text-match';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';

@Component({
  selector: 'app-canjes',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatCardModule,
    MatPaginatorModule,
    MatAutocompleteModule,
    PageHeaderComponent,
    StatusChipComponent,
    EmptyStateComponent,
    LoadingStateComponent
  ],
  template: `
    <section class="page">
      <app-page-header title="Canjes" subtitle="Descuento inmediato (sin flujo de aprobación — decisión provisional Fase 0)." />
      @if (canWrite()) {
        <mat-card appearance="outlined">
          <mat-card-content>
            <h2 class="section-title">Nuevo canje</h2>
            <form class="form-grid" [formGroup]="form" (ngSubmit)="create()">
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="form-grid__wide">
                <mat-label>Empresa asociada</mat-label>
                <input
                  matInput
                  [formControl]="empresaQuery"
                  [matAutocomplete]="autoEmpresa"
                  (input)="onEmpresaType($any($event.target).value)"
                  autocomplete="off"
                />
                <mat-autocomplete
                  #autoEmpresa="matAutocomplete"
                  [displayWith]="displayEmpresa"
                  (optionSelected)="onEmpresaSelected($event)"
                >
                  @for (e of filteredEmpresas(); track e.empresaId) {
                    <mat-option [value]="e">
                      <span class="option-dual">
                        {{ e.razonSocial }}
                        <small>RUC {{ e.ruc }}</small>
                      </span>
                    </mat-option>
                  }
                  @if (filteredEmpresas().length === 0) {
                    <mat-option disabled>{{ empresaHint() }}</mat-option>
                  }
                </mat-autocomplete>
                @if (empresaQuery.touched && !form.controls.empresaId.value) {
                  <mat-error>Seleccione una empresa de las coincidencias.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="form-grid__wide">
                <mat-label>Beneficio</mat-label>
                <input
                  matInput
                  [formControl]="beneficioQuery"
                  [matAutocomplete]="autoBeneficio"
                  (input)="onBeneficioType($any($event.target).value)"
                  autocomplete="off"
                />
                <mat-autocomplete
                  #autoBeneficio="matAutocomplete"
                  [displayWith]="displayBeneficio"
                  (optionSelected)="onBeneficioSelected($event)"
                >
                  @for (b of filteredBeneficios(); track b.beneficioId) {
                    <mat-option [value]="b">
                      <span class="option-dual">
                        {{ b.nombre }}
                        <small>{{ b.costoPuntos }} pts · {{ b.tipo || 'Sin tipo' }}</small>
                      </span>
                    </mat-option>
                  }
                  @if (filteredBeneficios().length === 0) {
                    <mat-option disabled>{{ beneficioHint() }}</mat-option>
                  }
                </mat-autocomplete>
                @if (beneficioQuery.touched && !form.controls.beneficioId.value) {
                  <mat-error>Seleccione un beneficio de las coincidencias.</mat-error>
                }
              </mat-form-field>

              <button mat-flat-button type="submit" [disabled]="form.invalid">Canjear</button>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <mat-card appearance="outlined" class="table-card">
        @if (loading()) {
          <app-loading-state />
        } @else if (items().length === 0) {
          <app-empty-state message="No hay canjes." icon="redeem" />
        } @else {
          <div class="table-wrap">
            <table mat-table [dataSource]="items()">
              <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>Id</th><td mat-cell *matCellDef="let c">{{ c.canjeId }}</td></ng-container>
              <ng-container matColumnDef="empresa"><th mat-header-cell *matHeaderCellDef>Empresa</th><td mat-cell *matCellDef="let c">{{ c.empresaId }}</td></ng-container>
              <ng-container matColumnDef="beneficio"><th mat-header-cell *matHeaderCellDef>Beneficio</th><td mat-cell *matCellDef="let c">{{ c.beneficioNombre }}</td></ng-container>
              <ng-container matColumnDef="puntos"><th mat-header-cell *matHeaderCellDef>Puntos</th><td mat-cell *matCellDef="let c">{{ c.puntosUsados }}</td></ng-container>
              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let c"><app-status-chip [status]="c.estado" /></td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>
          </div>
          <mat-paginator [length]="total()" [pageIndex]="page() - 1" [pageSize]="pageSize" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" showFirstLastButtons />
        }
      </mat-card>
    </section>
  `
})
export class CanjesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canWrite = computed(() => this.auth.hasAnyRole(['Administrador', 'Operador']));

  private readonly empresasCatalog = signal<Empresa[]>([]);
  private readonly beneficiosCatalog = signal<Beneficio[]>([]);
  empresaText = signal('');
  beneficioText = signal('');
  lookupsReady = signal(false);
  private readonly empresaApi$ = new Subject<string>();

  empresaQuery = new FormControl<string | Empresa>('', { nonNullable: true });
  beneficioQuery = new FormControl<string | Beneficio>('', { nonNullable: true });

  filteredEmpresas = computed(() => {
    const q = this.empresaText().trim();
    if (!q) return [];
    return this.empresasCatalog()
      .filter((e) => matchesText(e.razonSocial, q) || matchesText(e.ruc, q))
      .slice(0, 25);
  });

  filteredBeneficios = computed(() => {
    const q = this.beneficioText().trim();
    if (!q) return [];
    return this.beneficiosCatalog()
      .filter(
        (b) =>
          matchesText(b.nombre, q) ||
          matchesText(b.tipo ?? '', q) ||
          matchesText(b.descripcion ?? '', q)
      )
      .slice(0, 25);
  });

  empresaHint = computed(() => {
    if (!this.lookupsReady()) return 'Cargando empresas...';
    return this.empresaText().trim()
      ? `Sin coincidencias para “${this.empresaText()}”.`
      : 'Escriba el nombre o RUC para buscar.';
  });

  beneficioHint = computed(() => {
    if (!this.lookupsReady()) return 'Cargando beneficios...';
    return this.beneficioText().trim()
      ? `Sin coincidencias para “${this.beneficioText()}”.`
      : 'Escriba el nombre del beneficio para buscar.';
  });

  items = signal<Canje[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  loading = signal(true);
  cols = ['id', 'empresa', 'beneficio', 'puntos', 'estado'];

  form = this.fb.nonNullable.group({
    empresaId: [null as number | null, Validators.required],
    beneficioId: [null as number | null, Validators.required]
  });

  ngOnInit(): void {
    this.load();

    forkJoin({
      empresas: this.api.empresas('', 1, 200),
      beneficios: this.api.beneficios(true, 1, 200)
    }).subscribe({
      next: ({ empresas, beneficios }) => {
        this.mergeEmpresas(empresas.items ?? []);
        this.beneficiosCatalog.set(beneficios.items ?? []);
        this.lookupsReady.set(true);
      },
      error: (e) => this.notify.error(apiErrorMessage(e, 'No se pudieron cargar empresas o beneficios.'))
    });

    this.empresaApi$.pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      if (!q) return;
      this.api.empresas(q, 1, 50).subscribe({
        next: (r) => this.mergeEmpresas(r.items ?? []),
        error: () => undefined
      });
    });
  }

  displayEmpresa = (value: string | Empresa | null): string =>
    typeof value === 'string' ? value : value?.razonSocial ?? '';

  displayBeneficio = (value: string | Beneficio | null): string =>
    typeof value === 'string' ? value : value?.nombre ?? '';

  onEmpresaType(text: string): void {
    this.empresaText.set(text);
    const current = this.empresaQuery.value;
    if (typeof current === 'object' && current && this.displayEmpresa(current) === text) return;
    this.form.patchValue({ empresaId: null });
    this.empresaApi$.next(text.trim());
  }

  onBeneficioType(text: string): void {
    this.beneficioText.set(text);
    const current = this.beneficioQuery.value;
    if (typeof current === 'object' && current && this.displayBeneficio(current) === text) return;
    this.form.patchValue({ beneficioId: null });
  }

  onEmpresaSelected(ev: MatAutocompleteSelectedEvent): void {
    const empresa = ev.option.value as Empresa;
    this.empresaText.set(empresa.razonSocial);
    this.form.patchValue({ empresaId: empresa.empresaId });
  }

  onBeneficioSelected(ev: MatAutocompleteSelectedEvent): void {
    const beneficio = ev.option.value as Beneficio;
    this.beneficioText.set(beneficio.nombre);
    this.form.patchValue({ beneficioId: beneficio.beneficioId });
  }

  load(): void {
    this.loading.set(true);
    this.api.canjes(undefined, this.page(), this.pageSize).subscribe({
      next: (r) => {
        this.items.set(r.items ?? []);
        this.total.set(r.total ?? 0);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudieron cargar canjes.'));
      }
    });
  }

  onPage(ev: PageEvent): void {
    this.page.set(ev.pageIndex + 1);
    this.pageSize = ev.pageSize;
    this.load();
  }

  create(): void {
    this.form.markAllAsTouched();
    this.empresaQuery.markAsTouched();
    this.beneficioQuery.markAsTouched();
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    if (v.empresaId == null || v.beneficioId == null) return;
    this.api
      .createCanje({
        empresaId: v.empresaId,
        beneficioId: v.beneficioId,
        idempotencyKey: crypto.randomUUID()
      })
      .subscribe({
      next: (c) => {
        this.notify.success(`Canje procesado correctamente (${c.puntosUsados} pts).`);
        this.form.reset({ empresaId: null, beneficioId: null });
        this.empresaQuery.reset('');
        this.beneficioQuery.reset('');
        this.empresaText.set('');
        this.beneficioText.set('');
        this.page.set(1);
        this.load();
      },
      error: (e) => this.notify.error(apiErrorMessage(e, 'Error en canje'))
    });
  }

  private mergeEmpresas(items: Empresa[]): void {
    const map = new Map(this.empresasCatalog().map((e) => [e.empresaId, e]));
    for (const item of items) map.set(item.empresaId, item);
    this.empresasCatalog.set([...map.values()]);
  }
}
