import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { Subject, debounceTime, forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Beneficio, Empresa, PuntosResumen } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';
import { matchesText } from '../../core/text-match';
import { StatusChipComponent } from '../../shared/status-chip.component';

@Component({
  selector: 'app-canje-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatTableModule,
    StatusChipComponent
  ],
  template: `
    <h2 mat-dialog-title>Nuevo canje</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
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

        @if (form.controls.empresaId.value) {
          @if (puntosLoading()) {
            <p class="puntos-empresa puntos-empresa--loading">Consultando puntos de la empresa…</p>
          } @else if (puntosResumen(); as p) {
            <div class="puntos-empresa" role="status">
              <span class="puntos-empresa__label">Puntos disponibles para canje</span>
              <strong class="puntos-empresa__value">{{ fmtPuntos(p.disponibles) }}</strong>
              <span class="puntos-empresa__meta">
                Generados {{ fmtPuntos(p.generados) }} · Canjeados {{ fmtPuntos(p.canjeados) }} · Próx. a vencer {{ fmtPuntos(p.proximosAVencer) }}
              </span>
            </div>
          }

          <h3 class="beneficios-title">Beneficios disponibles</h3>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Filtrar beneficio</mat-label>
            <input matInput [formControl]="beneficioFilter" autocomplete="off" />
          </mat-form-field>

          @if (beneficiosFiltrados().length === 0) {
            <p class="beneficios-empty">No hay beneficios activos que coincidan con el filtro.</p>
          } @else {
            <div class="table-wrap beneficios-table">
              <table mat-table [dataSource]="beneficiosFiltrados()">
                <ng-container matColumnDef="nombre">
                  <th mat-header-cell *matHeaderCellDef>Beneficio</th>
                  <td mat-cell *matCellDef="let b">{{ b.nombre }}</td>
                </ng-container>
                <ng-container matColumnDef="tipo">
                  <th mat-header-cell *matHeaderCellDef>Tipo</th>
                  <td mat-cell *matCellDef="let b">{{ b.tipo || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="costo">
                  <th mat-header-cell *matHeaderCellDef>Costo</th>
                  <td mat-cell *matCellDef="let b">{{ fmtPuntos(b.costoPuntos) }} pts</td>
                </ng-container>
                <ng-container matColumnDef="saldo">
                  <th mat-header-cell *matHeaderCellDef>Saldo tras canje</th>
                  <td mat-cell *matCellDef="let b">{{ fmtPuntos(saldoTrasCanje(b.costoPuntos)) }}</td>
                </ng-container>
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let b">
                    <app-status-chip [status]="puedeCanjear(b.costoPuntos) ? 'Canjeable' : 'Saldo insuficiente'" />
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="beneficioCols"></tr>
                <tr
                  mat-row
                  *matRowDef="let row; columns: beneficioCols"
                  class="beneficio-row"
                  [class.beneficio-row--selected]="form.controls.beneficioId.value === row.beneficioId"
                  [class.beneficio-row--disabled]="!puedeCanjear(row.costoPuntos)"
                  (click)="selectBeneficio(row)"
                ></tr>
              </table>
            </div>
          }
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button
        mat-flat-button
        type="button"
        (click)="create()"
        [disabled]="form.invalid || saving() || !beneficioCanjeable()"
      >
        Canjear
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .beneficios-title {
      margin: 0 0 8px;
      font: var(--mat-sys-title-small);
      color: var(--adex-blue);
    }

    .beneficios-empty {
      margin: 0;
      color: var(--gb-text-muted, #5f6368);
      font-size: 0.875rem;
    }

    .beneficios-table {
      max-height: 280px;
      overflow: auto;
    }

    .beneficio-row {
      cursor: pointer;
    }

    .beneficio-row--selected {
      background: color-mix(in srgb, var(--adex-primary, #003b70) 10%, transparent);
    }

    .beneficio-row--disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .puntos-empresa {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 8px 12px;
      margin: 0;
      padding: 12px 14px;
      border-radius: 8px;
      background: color-mix(in srgb, var(--adex-primary, #003b70) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--adex-primary, #003b70) 22%, transparent);
    }

    .puntos-empresa--loading {
      color: var(--gb-text-muted, #5f6368);
      font-size: 0.875rem;
      padding: 8px 0;
      background: none;
      border: none;
    }

    .puntos-empresa__label {
      font-size: 0.875rem;
      color: var(--gb-text-muted, #5f6368);
    }

    .puntos-empresa__value {
      font-size: 1.25rem;
      color: var(--adex-primary, #003b70);
    }

    .puntos-empresa__meta {
      flex-basis: 100%;
      font-size: 0.8125rem;
      color: var(--gb-text-muted, #5f6368);
    }
  `
})
export class CanjeFormDialogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly dialogRef = inject(MatDialogRef<CanjeFormDialogComponent, boolean>);
  private readonly destroyRef = inject(DestroyRef);

  saving = signal(false);
  lookupsReady = signal(false);
  puntosResumen = signal<PuntosResumen | null>(null);
  puntosLoading = signal(false);

  private readonly empresasCatalog = signal<Empresa[]>([]);
  private readonly beneficiosCatalog = signal<Beneficio[]>([]);
  empresaText = signal('');
  private readonly empresaApi$ = new Subject<string>();

  empresaQuery = new FormControl<string | Empresa>('', { nonNullable: true });
  beneficioFilter = new FormControl('', { nonNullable: true });

  beneficioCols = ['nombre', 'tipo', 'costo', 'saldo', 'estado'];

  form = this.fb.nonNullable.group({
    empresaId: [null as number | null, Validators.required],
    beneficioId: [null as number | null, Validators.required]
  });

  filteredEmpresas = computed(() => {
    const q = this.empresaText().trim();
    if (!q) return [];
    return this.empresasCatalog()
      .filter((e) => matchesText(e.razonSocial, q) || matchesText(e.ruc, q))
      .slice(0, 25);
  });

  beneficiosFiltrados = computed(() => {
    const q = this.beneficioFilter.value.trim().toLowerCase();
    return this.beneficiosCatalog()
      .filter((b) => b.activo)
      .filter(
        (b) =>
          !q ||
          matchesText(b.nombre, q) ||
          matchesText(b.tipo ?? '', q) ||
          matchesText(b.descripcion ?? '', q)
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  puntosDisponibles = computed(() => this.puntosResumen()?.disponibles ?? 0);

  empresaHint = computed(() => {
    if (!this.lookupsReady()) return 'Cargando empresas...';
    return this.empresaText().trim()
      ? `Sin coincidencias para “${this.empresaText()}”.`
      : 'Escriba el nombre o RUC para buscar.';
  });

  ngOnInit(): void {
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

  onEmpresaType(text: string): void {
    this.empresaText.set(text);
    const current = this.empresaQuery.value;
    if (typeof current === 'object' && current && this.displayEmpresa(current) === text) return;
    this.form.patchValue({ empresaId: null, beneficioId: null });
    this.puntosResumen.set(null);
    this.empresaApi$.next(text.trim());
  }

  onEmpresaSelected(ev: MatAutocompleteSelectedEvent): void {
    const empresa = ev.option.value as Empresa;
    this.empresaText.set(empresa.razonSocial);
    this.form.patchValue({ empresaId: empresa.empresaId, beneficioId: null });
    this.loadPuntosEmpresa(empresa.empresaId);
  }

  selectBeneficio(b: Beneficio): void {
    if (!this.puedeCanjear(b.costoPuntos)) return;
    this.form.patchValue({ beneficioId: b.beneficioId });
  }

  puedeCanjear(costo: number): boolean {
    return this.puntosDisponibles() >= costo;
  }

  saldoTrasCanje(costo: number): number {
    return Math.max(0, this.puntosDisponibles() - costo);
  }

  beneficioCanjeable(): boolean {
    const id = this.form.controls.beneficioId.value;
    if (id == null) return false;
    const b = this.beneficiosCatalog().find((x) => x.beneficioId === id);
    return !!b && this.puedeCanjear(b.costoPuntos);
  }

  create(): void {
    this.form.markAllAsTouched();
    this.empresaQuery.markAsTouched();
    if (this.form.invalid || !this.beneficioCanjeable()) return;

    const v = this.form.getRawValue();
    if (v.empresaId == null || v.beneficioId == null) return;

    this.saving.set(true);
    this.api
      .createCanje({
        empresaId: v.empresaId,
        beneficioId: v.beneficioId,
        idempotencyKey: crypto.randomUUID()
      })
      .subscribe({
        next: (c) => {
          this.saving.set(false);
          this.notify.success(`Canje procesado correctamente (${c.puntosUsados} pts).`);
          this.dialogRef.close(true);
        },
        error: (e) => {
          this.saving.set(false);
          this.notify.error(apiErrorMessage(e, 'Error en canje'));
        }
      });
  }

  fmtPuntos(value: number): string {
    return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  }

  private loadPuntosEmpresa(empresaId: number): void {
    this.puntosLoading.set(true);
    this.api.puntosResumen(empresaId).subscribe({
      next: (r) => {
        this.puntosResumen.set(r);
        this.puntosLoading.set(false);
      },
      error: () => {
        this.puntosResumen.set(null);
        this.puntosLoading.set(false);
        this.notify.error('No se pudieron cargar los puntos de la empresa.');
      }
    });
  }

  private mergeEmpresas(items: Empresa[]): void {
    const map = new Map(this.empresasCatalog().map((e) => [e.empresaId, e]));
    for (const item of items) map.set(item.empresaId, item);
    this.empresasCatalog.set([...map.values()]);
  }
}
