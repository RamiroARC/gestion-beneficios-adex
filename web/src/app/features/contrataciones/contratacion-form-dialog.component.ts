import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject, debounceTime, forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/http-error';
import { Alumno, Empresa } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { PerfilCatalogService } from '../../core/perfil-catalog.service';
import { avisoPeriodoPreliminar, calcularPeriodoContratacion, errorFechasContratacion } from '../../core/contratacion-period';
import { matchesText } from '../../core/text-match';
import { NamedListManageDialogComponent } from '../../shared/named-list-manage-dialog.component';

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
    <h2 mat-dialog-title>Nueva contratación</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" (ngSubmit)="create()">
        <mat-form-field appearance="outline">
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

        <mat-form-field appearance="outline">
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

        <mat-form-field appearance="outline"><mat-label>Año</mat-label><input matInput type="number" formControlName="anio" /></mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Inicio</mat-label>
          <input matInput [matDatepicker]="ini" formControlName="fechaInicio" />
          <mat-datepicker-toggle matIconSuffix [for]="ini" />
          <mat-datepicker #ini />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fin</mat-label>
          <input matInput [matDatepicker]="fin" formControlName="fechaFin" />
          <mat-datepicker-toggle matIconSuffix [for]="fin" />
          <mat-datepicker #fin />
          @if (periodoError()) {
            <mat-error>{{ periodoError() }}</mat-error>
          } @else if (periodoAviso()) {
            <mat-hint class="periodo-aviso">{{ periodoAviso() }}</mat-hint>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Cantidad de días</mat-label>
          <input matInput type="number" formControlName="cantidadDias" readonly />
          <mat-hint>Días calendario entre inicio y fin.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Meses contratación</mat-label>
          <input matInput type="number" formControlName="mesContratacion" readonly />
          <mat-hint>Estimado: periodos de 30 días calendario (puede ser preliminar).</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Sueldo</mat-label><input matInput type="number" formControlName="sueldo" /></mat-form-field>
        <div class="carrera-row">
          <mat-form-field appearance="outline">
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
      <button mat-flat-button type="button" (click)="create()" [disabled]="form.invalid || !!periodoError()">Crear</button>
    </mat-dialog-actions>
  `,
  styles: `
    .periodo-aviso { color: var(--adex-warning); }
  `
})
export class ContratacionFormDialogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<ContratacionFormDialogComponent, boolean>);
  private readonly destroyRef = inject(DestroyRef);
  readonly perfiles = inject(PerfilCatalogService);

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

  form = this.fb.nonNullable.group({
    empresaId: [null as number | null, Validators.required],
    alumnoId: [null as number | null, Validators.required],
    anio: [null as number | null, Validators.required],
    cantidadDias: [null as number | null, Validators.required],
    mesContratacion: [null as number | null, Validators.required],
    fechaInicio: [null as Date | null, Validators.required],
    fechaFin: [null as Date | null, Validators.required],
    sueldo: [null as number | null, Validators.required],
    categoria: [''],
    perfilSolicitado: [''],
    sectoristaId: [null as number | null]
  });

  ngOnInit(): void {
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

  private toIsoDate(value: Date | string | null): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
