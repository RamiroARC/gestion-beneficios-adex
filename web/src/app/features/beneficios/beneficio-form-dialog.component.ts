import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/http-error';
import { Beneficio } from '../../core/models';
import { NotifyService } from '../../core/notify.service';
import { TipoBeneficioCatalogService } from '../../core/tipo-beneficio-catalog.service';
import { NamedListManageDialogComponent } from '../../shared/named-list-manage-dialog.component';

export interface BeneficioFormDialogData {
  beneficio?: Beneficio;
}

@Component({
  selector: 'app-beneficio-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar beneficio' : 'Nuevo beneficio' }}</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" />
        </mat-form-field>
        <div class="carrera-row">
          <mat-form-field appearance="outline">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="tipo">
              @for (t of tipos.list(); track t) {
                <mat-option [value]="t">{{ t }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="manageTipos()">Mantener</button>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="descripcion" rows="3"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Costo puntos</mat-label>
          <input matInput type="number" formControlName="costoPuntos" />
        </mat-form-field>
        <mat-checkbox formControlName="activo">Activo</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="form.invalid || saving()">
        {{ isEdit ? 'Guardar' : 'Registrar' }}
      </button>
    </mat-dialog-actions>
  `
})
export class BeneficioFormDialogComponent {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<BeneficioFormDialogComponent, boolean>);
  private readonly data = inject<BeneficioFormDialogData>(MAT_DIALOG_DATA);
  readonly tipos = inject(TipoBeneficioCatalogService);

  saving = signal(false);
  isEdit = !!this.data.beneficio;

  form = this.fb.nonNullable.group({
    nombre: [this.data.beneficio?.nombre ?? '', Validators.required],
    descripcion: [this.data.beneficio?.descripcion ?? ''],
    tipo: [this.data.beneficio?.tipo ?? ''],
    costoPuntos: [this.data.beneficio?.costoPuntos ?? (null as number | null), Validators.required],
    activo: [this.data.beneficio?.activo ?? true]
  });

  constructor() {
    if (this.data.beneficio?.tipo) this.tipos.add(this.data.beneficio.tipo);
  }

  manageTipos(): void {
    this.dialog.open(NamedListManageDialogComponent, {
      width: '480px',
      data: {
        title: 'Tipos de beneficio',
        hint: 'Catálogo de selección para el registro de beneficios.',
        addLabel: 'Nuevo tipo',
        catalogKey: this.tipos.key
      }
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const body = this.form.getRawValue();
    if (body.tipo) this.tipos.add(body.tipo);
    const req$ = this.isEdit
      ? this.api.updateBeneficio(this.data.beneficio!.beneficioId, body)
      : this.api.createBeneficio(body);

    req$.subscribe({
      next: () => {
        this.notify.success(this.isEdit ? 'Beneficio actualizado.' : 'Beneficio registrado correctamente.');
        this.dialogRef.close(true);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.error(apiErrorMessage(e, this.isEdit ? 'Error al guardar' : 'Error al crear beneficio'));
      }
    });
  }
}
