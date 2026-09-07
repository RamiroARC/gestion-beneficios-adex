import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../core/api.service';
import { CarreraCatalogService } from '../../core/carrera-catalog.service';
import { apiErrorMessage } from '../../core/http-error';
import { Alumno } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { NamedListManageDialogComponent } from '../../shared/named-list-manage-dialog.component';

const DNI_PATTERN = /^\d{8}$/;

export interface AlumnoFormDialogData {
  alumno?: Alumno;
}

@Component({
  selector: 'app-alumno-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Editar alumno</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>Nro. DNI</mat-label>
          <input matInput formControlName="codigoAlumno" maxlength="8" inputmode="numeric" autocomplete="off" />
          <mat-hint>8 dígitos (alta manual)</mat-hint>
          @if (form.controls.codigoAlumno.touched && form.controls.codigoAlumno.invalid) {
            <mat-error>Ingrese un DNI de 8 dígitos.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Nombres</mat-label><input matInput formControlName="nombres" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Apellidos</mat-label><input matInput formControlName="apellidos" /></mat-form-field>
        <div class="carrera-row">
          <mat-form-field appearance="outline">
            <mat-label>Carrera</mat-label>
            <mat-select formControlName="carrera">
              @for (c of carreras.list(); track c) {
                <mat-option [value]="c">{{ c }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="manageCarreras()">Mantener</button>
        </div>
        <mat-form-field appearance="outline"><mat-label>Ciclo</mat-label><input matInput formControlName="ciclo" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Teléfono</mat-label><input matInput formControlName="telefono" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Correo</mat-label><input matInput formControlName="correo" type="email" /></mat-form-field>

        @if (hasCrmData) {
          <h3 class="crm-title">Datos CRM</h3>
          <div class="crm-grid">
            <div><dt>Código CRM</dt><dd>{{ data.alumno?.crmAlumnoCodigo || '—' }}</dd></div>
            <div><dt>DNI CRM</dt><dd>{{ data.alumno?.dni || '—' }}</dd></div>
            <div><dt>Email personal</dt><dd>{{ data.alumno?.emailPersonal || '—' }}</dd></div>
            <div><dt>Modalidad</dt><dd>{{ data.alumno?.modalidad || '—' }}</dd></div>
            <div><dt>Fecha nacimiento</dt><dd>{{ data.alumno?.fechaNacimiento ? (data.alumno!.fechaNacimiento | date: 'mediumDate') : '—' }}</dd></div>
            <div><dt>Denominación</dt><dd>{{ data.alumno?.denominacion || '—' }}</dd></div>
            <div><dt>Última sync</dt><dd>{{ data.alumno?.ultimaSyncUtc ? (data.alumno!.ultimaSyncUtc | date: 'short') : '—' }}</dd></div>
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="form.invalid || saving()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .crm-title {
      margin: 1rem 0 0.5rem;
      font-size: 0.95rem;
      font-weight: 600;
    }
    .crm-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem 1rem;
      margin-bottom: 0.5rem;
    }
    .crm-grid dt {
      font-size: 0.75rem;
      opacity: 0.7;
    }
    .crm-grid dd {
      margin: 0;
      font-size: 0.9rem;
    }
  `
})
export class AlumnoFormDialogComponent {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<AlumnoFormDialogComponent, boolean>);
  readonly data = inject<AlumnoFormDialogData>(MAT_DIALOG_DATA);
  readonly carreras = inject(CarreraCatalogService);

  saving = signal(false);
  isEdit = !!this.data.alumno;
  hasCrmData = !!(this.data.alumno?.crmAlumnoCodigo || this.data.alumno?.ultimaSyncUtc);

  form = this.fb.nonNullable.group({
    codigoAlumno: [
      this.data.alumno?.dni || this.data.alumno?.codigoAlumno || '',
      [Validators.required, Validators.pattern(DNI_PATTERN)]
    ],
    nombres: [this.data.alumno?.nombres ?? '', Validators.required],
    apellidos: [this.data.alumno?.apellidos ?? '', Validators.required],
    carrera: [this.data.alumno?.carrera ?? ''],
    ciclo: [this.data.alumno?.ciclo ?? ''],
    telefono: [this.data.alumno?.telefono ?? ''],
    correo: [this.data.alumno?.correo ?? '']
  });

  constructor() {
    if (this.isEdit) this.form.controls.codigoAlumno.disable();
    if (this.data.alumno?.carrera) this.carreras.add(this.data.alumno.carrera);
  }

  manageCarreras(): void {
    this.dialog.open(NamedListManageDialogComponent, {
      width: '480px',
      data: {
        title: 'Carreras',
        hint: 'Catálogo de selección para el registro de alumnos.',
        addLabel: 'Nueva carrera',
        catalogKey: this.carreras.key
      }
    });
  }

  save(): void {
    if (this.form.invalid || this.saving() || !this.data.alumno) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    if (raw.carrera) this.carreras.add(raw.carrera);

    this.api
      .updateAlumno(this.data.alumno.alumnoId, {
        nombres: raw.nombres,
        apellidos: raw.apellidos,
        carrera: raw.carrera,
        ciclo: raw.ciclo,
        telefono: raw.telefono,
        correo: raw.correo
      })
      .subscribe({
        next: (a) => {
          const label = a.dni || a.codigoAlumno;
          this.notify.success(`Alumno DNI ${label} actualizado.`);
          this.dialogRef.close(true);
        },
        error: (e) => {
          this.saving.set(false);
          this.notify.error(apiErrorMessage(e, 'Error al guardar'));
        }
      });
  }
}
