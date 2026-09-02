import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/http-error';
import { Empresa } from '../../core/models';
import { NotifyService } from '../../core/notify.service';

export interface EmpresaFormDialogData {
  empresa: Empresa;
}

@Component({
  selector: 'app-empresa-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Editar empresa</h2>
    <mat-dialog-content>
      <form class="dialog-form" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>RUC</mat-label>
          <input matInput [value]="data.empresa.ruc" readonly />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>ID CRM</mat-label>
          <input matInput [value]="data.empresa.crmEmpresaId" readonly />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Razón social</mat-label>
          <input matInput formControlName="razonSocial" />
          @if (form.controls.razonSocial.touched && form.controls.razonSocial.invalid) {
            <mat-error>La razón social es obligatoria.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Categoría</mat-label>
          <input matInput formControlName="categoria" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Estado</mat-label>
          <mat-select formControlName="activo">
            <mat-option [value]="true">Activo</mat-option>
            <mat-option [value]="false">Inactivo</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Correo (CRM)</mat-label>
          <input matInput [value]="data.empresa.correo || '—'" readonly />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Teléfono (CRM)</mat-label>
          <input matInput [value]="data.empresa.telefono || '—'" readonly />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Promotor (CRM)</mat-label>
          <input matInput [value]="data.empresa.promotor || '—'" readonly />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="form.invalid || saving()">Guardar</button>
    </mat-dialog-actions>
  `
})
export class EmpresaFormDialogComponent {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly dialogRef = inject(MatDialogRef<EmpresaFormDialogComponent, boolean>);
  readonly data = inject<EmpresaFormDialogData>(MAT_DIALOG_DATA);

  saving = signal(false);

  form = this.fb.nonNullable.group({
    razonSocial: [this.data.empresa.razonSocial, Validators.required],
    categoria: [this.data.empresa.categoria ?? ''],
    activo: [this.data.empresa.activo]
  });

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api
      .updateEmpresa(this.data.empresa.empresaId, {
        razonSocial: v.razonSocial.trim(),
        categoria: v.categoria.trim() || null,
        activo: v.activo
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notify.success('Empresa actualizada correctamente.');
          this.dialogRef.close(true);
        },
        error: (e) => {
          this.saving.set(false);
          this.notify.error(apiErrorMessage(e, 'Error al actualizar empresa.'));
        }
      });
  }
}
