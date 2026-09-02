import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, debounceTime, forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/http-error';
import { Alumno, Contratacion, Empresa, PuntosResumen } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { PerfilCatalogService } from '../../core/perfil-catalog.service';
import { avisoPeriodoPreliminar, calcularPeriodoContratacion, errorFechasContratacion } from '../../core/contratacion-period';
import { matchesText } from '../../core/text-match';
import { NamedListManageDialogComponent } from '../../shared/named-list-manage-dialog.component';

export interface ContratacionFormDialogData {
  contratacion?: Contratacion;
}

const ESTADOS = ['Vigente', 'Vencida', 'Anulada'] as const;

@Component({
  selector: 'app-contratacion-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar contratación' : 'Nueva contratación' }}</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" (ngSubmit)="save()">
        @if (isEdit) {
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Empresa</mat-label>
            <input matInput [value]="data.contratacion!.empresaRazonSocial" readonly />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Alumno</mat-label>
            <input matInput [value]="data.contratacion!.alumnoNombre" readonly />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Año</mat-label>
            <input matInput type="number" [value]="data.contratacion!.anio" readonly />
          </mat-form-field>
          @if (form.controls.empresaId.value) {
            @if (puntosLoading()) {
              <p class="puntos-empresa puntos-empresa--loading">Consultando puntos de la empresa…</p>
            } @else if (puntosResumen(); as p) {
              <div class="puntos-empresa" role="status">
                <span class="puntos-empresa__label">Puntos disponibles</span>
                <strong class="puntos-empresa__value">{{ fmtPuntos(p.disponibles) }}</strong>
                <span class="puntos-empresa__meta">
                  Generados {{ fmtPuntos(p.generados) }} · Canjeados {{ fmtPuntos(p.canjeados) }}
                </span>
              </div>
            }
          }
        } @else {
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
              <span class="puntos-empresa__label">Puntos disponibles</span>
              <strong class="puntos-empresa__value">{{ fmtPuntos(p.disponibles) }}</strong>
              <span class="puntos-empresa__meta">
                Generados {{ fmtPuntos(p.generados) }} · Canjeados {{ fmtPuntos(p.canjeados) }}
              </span>
            </div>
          }
        }

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Alumno</mat-label>
          <input
            matInput
            [formControl]="alumnoQuery"
            [matAutocomplete]="autoAlumno"
            (input)="onAlumnoType($any($event.target).value)"
            autocomplete="off"
          />
          <mat-autocomplete
            #autoAlumno="matAutocomplete"
            [displayWith]="displayAlumno"
            (optionSelected)="onAlumnoSelected($event)"
          >
            @for (a of filteredAlumnos(); track a.alumnoId) {
              <mat-option [value]="a">
                <span class="option-dual">
                  {{ a.nombres }} {{ a.apellidos }}
                  <small>DNI {{ a.codigoAlumno }}</small>
                </span>
              </mat-option>
            }
            @if (filteredAlumnos().length === 0) {
              <mat-option disabled>{{ alumnoHint() }}</mat-option>
            }
          </mat-autocomplete>
          @if (alumnoQuery.touched && !form.controls.alumnoId.value) {
            <mat-error>Seleccione un alumno de las coincidencias.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Año</mat-label><input matInput type="number" formControlName="anio" /></mat-form-field>
        }
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Inicio</mat-label>
          <input matInput [matDatepicker]="ini" formControlName="fechaInicio" />
          <mat-datepicker-toggle matIconSuffix [for]="ini" />
          <mat-datepicker #ini />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Fin</mat-label>
          <input matInput [matDatepicker]="fin" formControlName="fechaFin" />
          <mat-datepicker-toggle matIconSuffix [for]="fin" />
          <mat-datepicker #fin />
        </mat-form-field>
        @if (periodoError()) {
          <p class="form-alert form-alert--error" role="alert">{{ periodoError() }}</p>
        } @else if (periodoAviso()) {
          <p class="form-alert form-alert--warn" role="status">{{ periodoAviso() }}</p>
        }
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Cantidad de días</mat-label>
          <input matInput type="number" formControlName="cantidadDias" readonly />
          <mat-hint>Días calendario entre inicio y fin.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Meses contratación</mat-label>
          <input matInput type="number" formControlName="mesContratacion" readonly />
          <mat-hint>Estimado: periodos de 30 días calendario (puede ser preliminar).</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Sueldo</mat-label><input matInput type="number" formControlName="sueldo" /></mat-form-field>
        @if (isEdit) {
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="estado">
              @for (e of estados; track e) {
                <mat-option [value]="e">{{ e }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        <div class="carrera-row">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Perfil</mat-label>
            <mat-select formControlName="perfilSolicitado">
              @for (p of perfiles.list(); track p) {
                <mat-option [value]="p">{{ p }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="managePerfiles()">Mantener</button>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="form.invalid || !!periodoError() || saving()">
        {{ isEdit ? 'Guardar' : 'Crear' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host .dialog-form {
      gap: var(--gb-space-3);
    }

    .form-alert {
      margin: 0;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 0.875rem;
      line-height: 1.45;
    }

    .form-alert--warn {
      color: var(--adex-warning);
      background: color-mix(in srgb, var(--adex-warning) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--adex-warning) 35%, transparent);
    }

    .form-alert--error {
      color: var(--adex-error, #b3261e);
      background: color-mix(in srgb, var(--adex-error, #b3261e) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--adex-error, #b3261e) 30%, transparent);
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
    }

    .puntos-empresa__label {
      font-size: 0.875rem;
      color: var(--gb-text-muted, #5f6368);
    }

    .puntos-empresa__value {
      font-size: 1.125rem;
      color: var(--adex-primary, #003b70);
    }

    .puntos-empresa__meta {
      flex-basis: 100%;
      font-size: 0.8125rem;
      color: var(--gb-text-muted, #5f6368);
    }
  `
})
export class ContratacionFormDialogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<ContratacionFormDialogComponent, boolean>);
  private readonly destroyRef = inject(DestroyRef);
  readonly data = inject<ContratacionFormDialogData>(MAT_DIALOG_DATA);
  readonly perfiles = inject(PerfilCatalogService);

  readonly isEdit = !!this.data.contratacion;
  readonly estados = ESTADOS;
  saving = signal(false);

  private readonly empresasCatalog = signal<Empresa[]>([]);
  private readonly alumnosCatalog = signal<Alumno[]>([]);
  empresaText = signal('');
  alumnoText = signal('');
  lookupsReady = signal(false);
  private readonly empresaApi$ = new Subject<string>();
  private readonly alumnoApi$ = new Subject<string>();

  empresaQuery = new FormControl<string | Empresa>('', { nonNullable: true });
  alumnoQuery = new FormControl<string | Alumno>('', { nonNullable: true });

  filteredEmpresas = computed(() => {
    const q = this.empresaText().trim();
    if (!q) return [];
    return this.empresasCatalog()
      .filter((e) => matchesText(e.razonSocial, q) || matchesText(e.ruc, q))
      .slice(0, 25);
  });

  filteredAlumnos = computed(() => {
    const q = this.alumnoText().trim();
    if (!q) return [];
    return this.alumnosCatalog()
      .filter(
        (a) =>
          matchesText(`${a.nombres} ${a.apellidos}`, q) ||
          matchesText(a.nombres, q) ||
          matchesText(a.apellidos, q) ||
          matchesText(a.codigoAlumno, q)
      )
      .slice(0, 25);
  });

  empresaHint = computed(() => {
    if (!this.lookupsReady()) return 'Cargando empresas...';
    return this.empresaText().trim() ? `Sin coincidencias para “${this.empresaText()}”.` : 'Escriba el nombre o RUC para buscar.';
  });

  alumnoHint = computed(() => {
    if (!this.lookupsReady()) return 'Cargando alumnos...';
    return this.alumnoText().trim() ? `Sin coincidencias para “${this.alumnoText()}”.` : 'Escriba el nombre o DNI para buscar.';
  });

  periodoError = signal<string | null>(null);
  periodoAviso = signal<string | null>(null);
  puntosResumen = signal<PuntosResumen | null>(null);
  puntosLoading = signal(false);

  form = this.fb.nonNullable.group({
    empresaId: [this.data.contratacion?.empresaId ?? (null as number | null), Validators.required],
    alumnoId: [this.data.contratacion?.alumnoId ?? (null as number | null), Validators.required],
    anio: [this.data.contratacion?.anio ?? (null as number | null), Validators.required],
    cantidadDias: [null as number | null, Validators.required],
    mesContratacion: [this.data.contratacion?.mesContratacion ?? (null as number | null), Validators.required],
    fechaInicio: [this.parseDate(this.data.contratacion?.fechaInicio) as Date | null, Validators.required],
    fechaFin: [this.parseDate(this.data.contratacion?.fechaFin) as Date | null, Validators.required],
    sueldo: [this.data.contratacion?.sueldo ?? (null as number | null), Validators.required],
    categoria: [this.data.contratacion?.categoria ?? ''],
    perfilSolicitado: [this.data.contratacion?.perfilSolicitado ?? ''],
    sectoristaId: [this.data.contratacion?.sectoristaId ?? (null as number | null)],
    estado: [this.data.contratacion?.estado ?? 'Vigente']
  });

  ngOnInit(): void {
    if (this.data.contratacion?.perfilSolicitado) {
      this.perfiles.add(this.data.contratacion.perfilSolicitado);
    }

    if (this.isEdit) {
      this.form.controls.empresaId.clearValidators();
      this.form.controls.alumnoId.clearValidators();
      this.form.controls.anio.clearValidators();
      this.form.controls.empresaId.updateValueAndValidity();
      this.form.controls.alumnoId.updateValueAndValidity();
      this.form.controls.anio.updateValueAndValidity();
      this.syncMeses();
      this.loadPuntosEmpresa(this.data.contratacion!.empresaId);
    } else {
    forkJoin({
      empresas: this.api.empresas('', 1, 200),
      alumnos: this.api.alumnos('', 1, 200)
    }).subscribe({
      next: ({ empresas, alumnos }) => {
        this.mergeEmpresas(empresas.items ?? []);
        this.mergeAlumnos(alumnos.items ?? []);
        this.lookupsReady.set(true);
      },
      error: (e) => this.notify.error(apiErrorMessage(e, 'No se pudieron cargar empresas o alumnos.'))
    });
    }

    this.empresaApi$.pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      if (!q) return;
      this.api.empresas(q, 1, 50).subscribe({
        next: (r) => this.mergeEmpresas(r.items ?? []),
        error: () => undefined
      });
    });
    this.alumnoApi$.pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      if (!q) return;
      this.api.alumnos(q, 1, 50).subscribe({
        next: (r) => this.mergeAlumnos(r.items ?? []),
        error: () => undefined
      });
    });

    this.form.controls.fechaInicio.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncMeses());
    this.form.controls.fechaFin.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncMeses());
  }

  private syncMeses(): void {
    const inicio = this.form.controls.fechaInicio.value;
    const fin = this.form.controls.fechaFin.value;
    this.periodoError.set(errorFechasContratacion(inicio, fin));

    const periodo = calcularPeriodoContratacion(inicio, fin);
    this.periodoAviso.set(avisoPeriodoPreliminar(periodo));

    this.form.controls.cantidadDias.setValue(periodo?.dias ?? null, { emitEvent: false });
    this.form.controls.mesContratacion.setValue(periodo?.meses ?? null, { emitEvent: false });
    this.form.controls.cantidadDias.updateValueAndValidity({ emitEvent: false });
    this.form.controls.mesContratacion.updateValueAndValidity({ emitEvent: false });
  }

  displayEmpresa = (value: string | Empresa | null): string =>
    typeof value === 'string' ? value : value?.razonSocial ?? '';

  displayAlumno = (value: string | Alumno | null): string =>
    typeof value === 'string' ? value : value ? `${value.nombres} ${value.apellidos}` : '';

  onEmpresaType(text: string): void {
    this.empresaText.set(text);
    const current = this.empresaQuery.value;
    if (typeof current === 'object' && current && this.displayEmpresa(current) === text) return;
    this.form.patchValue({ empresaId: null });
    this.loadPuntosEmpresa(null);
    this.empresaApi$.next(text.trim());
  }

  onAlumnoType(text: string): void {
    this.alumnoText.set(text);
    const current = this.alumnoQuery.value;
    if (typeof current === 'object' && current && this.displayAlumno(current) === text) return;
    this.form.patchValue({ alumnoId: null });
    this.alumnoApi$.next(text.trim());
  }

  onEmpresaSelected(ev: MatAutocompleteSelectedEvent): void {
    const empresa = ev.option.value as Empresa;
    this.empresaText.set(empresa.razonSocial);
    this.form.patchValue({ empresaId: empresa.empresaId });
    this.loadPuntosEmpresa(empresa.empresaId);
  }

  onAlumnoSelected(ev: MatAutocompleteSelectedEvent): void {
    const alumno = ev.option.value as Alumno;
    this.alumnoText.set(`${alumno.nombres} ${alumno.apellidos}`);
    this.form.patchValue({ alumnoId: alumno.alumnoId });
  }

  managePerfiles(): void {
    this.dialog.open(NamedListManageDialogComponent, {
      width: '480px',
      data: {
        title: 'Perfiles',
        hint: 'Catálogo de selección para nuevas contrataciones.',
        addLabel: 'Nuevo perfil',
        catalogKey: this.perfiles.key
      }
    });
  }

  save(): void {
    if (this.isEdit) this.update();
    else this.create();
  }

  create(): void {
    this.syncMeses();
    this.form.markAllAsTouched();
    this.empresaQuery.markAsTouched();
    this.alumnoQuery.markAsTouched();
    if (this.form.invalid || this.periodoError()) return;
    const v = this.form.getRawValue();
    if (v.perfilSolicitado) this.perfiles.add(v.perfilSolicitado);
    const { cantidadDias: _dias, ...payload } = v;
    this.api
      .createContratacion({
        ...payload,
        fechaInicio: this.toIsoDate(v.fechaInicio),
        fechaFin: this.toIsoDate(v.fechaFin)
      })
      .subscribe({
        next: (c) => {
          const msg =
            c.puntosGenerados > 0
              ? `Contratación registrada correctamente. Puntos: ${c.puntosGenerados}`
              : 'Contratación preliminar registrada. Puntos pendientes hasta cerrar meses completos de 30 días.';
          this.notify.success(msg);
          this.dialogRef.close(true);
        },
        error: (e) => this.notify.error(apiErrorMessage(e, 'Error al crear'))
      });
  }

  private update(): void {
    this.syncMeses();
    this.form.markAllAsTouched();
    if (this.form.invalid || this.periodoError()) return;

    const c = this.data.contratacion!;
    const v = this.form.getRawValue();
    if (v.perfilSolicitado) this.perfiles.add(v.perfilSolicitado);

    this.saving.set(true);
    this.api
      .updateContratacion(c.contratacionId, {
        sectoristaId: v.sectoristaId,
        categoria: v.categoria || null,
        perfilSolicitado: v.perfilSolicitado || null,
        fechaInicio: this.toIsoDate(v.fechaInicio),
        fechaFin: this.toIsoDate(v.fechaFin),
        sueldo: v.sueldo,
        estado: v.estado
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.notify.success(`Contratación actualizada. Puntos: ${updated.puntosGenerados}`);
          this.dialogRef.close(true);
        },
        error: (e) => {
          this.saving.set(false);
          this.notify.error(apiErrorMessage(e, 'Error al actualizar'));
        }
      });
  }

  private mergeEmpresas(items: Empresa[]): void {
    const map = new Map(this.empresasCatalog().map((e) => [e.empresaId, e]));
    for (const item of items) map.set(item.empresaId, item);
    this.empresasCatalog.set([...map.values()]);
  }

  private mergeAlumnos(items: Alumno[]): void {
    const map = new Map(this.alumnosCatalog().map((a) => [a.alumnoId, a]));
    for (const item of items) map.set(item.alumnoId, item);
    this.alumnosCatalog.set([...map.values()]);
  }

  private loadPuntosEmpresa(empresaId: number | null): void {
    if (!empresaId) {
      this.puntosResumen.set(null);
      this.puntosLoading.set(false);
      return;
    }

    this.puntosLoading.set(true);
    this.api.puntosResumen(empresaId).subscribe({
      next: (r) => {
        this.puntosResumen.set(r);
        this.puntosLoading.set(false);
      },
      error: () => {
        this.puntosResumen.set(null);
        this.puntosLoading.set(false);
      }
    });
  }

  fmtPuntos(value: number): string {
    return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private toIsoDate(value: Date | string | null): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
