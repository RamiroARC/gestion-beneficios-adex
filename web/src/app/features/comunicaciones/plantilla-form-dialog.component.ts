import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../core/api.service';
import { PlantillaCorreo, UpsertPlantillaRequest } from '../../core/models';
import { apiErrorMessage } from '../../core/http-error';
import { NotifyService } from '../../core/notify.service';

interface Tag {
  nombre: string;
  descripcion: string;
}

/** Catálogo de tags disponibles por código de plantilla (espejo del backend PlantillaRender). */
const TAGS_POR_CODIGO: Record<string, Tag[]> = {
  CANJE_CONFIRMADO: [
    { nombre: 'Codigo', descripcion: 'Código de la plantilla' },
    { nombre: 'Empresa', descripcion: 'Razón social de la empresa' },
    { nombre: 'Beneficio', descripcion: 'Nombre del beneficio canjeado' },
    { nombre: 'Puntos', descripcion: 'Cantidad de puntos usados' },
    { nombre: 'SaldoDisponible', descripcion: 'Saldo de puntos disponible' }
  ],
  PUNTOS_ACUMULADOS: [
    { nombre: 'Codigo', descripcion: 'Código de la plantilla' },
    { nombre: 'Empresa', descripcion: 'Razón social de la empresa' },
    { nombre: 'Puntos', descripcion: 'Puntos acumulados' },
    { nombre: 'FechaVencimiento', descripcion: 'Fecha de vencimiento' },
    { nombre: 'SaldoDisponible', descripcion: 'Saldo de puntos disponible' }
  ],
  PUNTOS_POR_VENCER: [
    { nombre: 'Codigo', descripcion: 'Código de la plantilla' },
    { nombre: 'Empresa', descripcion: 'Razón social de la empresa' },
    { nombre: 'Puntos', descripcion: 'Puntos próximos a vencer' },
    { nombre: 'FechaVencimiento', descripcion: 'Fecha de vencimiento' }
  ],
  INFORMACION_BENEFICIOS: [
    { nombre: 'Codigo', descripcion: 'Código de la plantilla' },
    { nombre: 'Empresa', descripcion: 'Razón social de la empresa' },
    { nombre: 'Beneficios', descripcion: 'Listado de beneficios disponibles' },
    { nombre: 'SaldoDisponible', descripcion: 'Saldo de puntos disponible' }
  ]
};

const TAGS_GENERICOS: Tag[] = [
  { nombre: 'Codigo', descripcion: 'Código de la plantilla' },
  { nombre: 'Empresa', descripcion: 'Razón social de la empresa' },
  { nombre: 'Puntos', descripcion: 'Cantidad de puntos' },
  { nombre: 'SaldoDisponible', descripcion: 'Saldo de puntos disponible' }
];

/** Valores de ejemplo para la vista previa. */
const EJEMPLO: Record<string, string> = {
  Codigo: 'CANJE_CONFIRMADO',
  Empresa: 'Frunature S.A.C.',
  Beneficio: 'Curso Global Learning',
  Puntos: '500.00',
  SaldoDisponible: '3,500.00',
  FechaVencimiento: '2026-12-31',
  Beneficios: '• Curso Global Learning — 500 puntos'
};

@Component({
  selector: 'app-plantilla-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  template: `
    <h2 mat-dialog-title>Editar plantilla de correo</h2>
    <mat-dialog-content>
      <form class="plantilla-form" [formGroup]="form">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Código</mat-label>
          <input matInput formControlName="codigo" />
          <mat-hint>Identificador del evento. No cambiar salvo que sepas lo que haces.</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Asunto</mat-label>
          <input
            matInput
            #asuntoInput
            formControlName="asunto"
            (focus)="campoActivo.set('asunto')"
          />
          <mat-hint>Puedes usar tags, p. ej. {{ '{Codigo} - {Empresa}' }}</mat-hint>
        </mat-form-field>

        <div class="tags">
          <span class="tags__label">Insertar tag:</span>
          @for (t of tags(); track t.nombre) {
            <button
              type="button"
              class="tag-chip"
              [title]="t.descripcion"
              (click)="insertarTag(t.nombre)"
            >
              <mat-icon>add</mat-icon>{{ t.nombre }}
            </button>
          }
        </div>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Cuerpo del correo</mat-label>
          <textarea
            matInput
            #cuerpoInput
            formControlName="cuerpoHtml"
            rows="9"
            (focus)="campoActivo.set('cuerpoHtml')"
          ></textarea>
          <mat-hint>Admite HTML y tags entre llaves, p. ej. {{ '{Empresa}' }}, {{ '{Puntos}' }}.</mat-hint>
        </mat-form-field>

        <mat-slide-toggle formControlName="activo">Plantilla activa</mat-slide-toggle>

        <section class="preview">
          <h3>Vista previa (con datos de ejemplo)</h3>
          <div class="preview__subject"><strong>Asunto:</strong> {{ previewAsunto() }}</div>
          <div class="preview__body" [innerHTML]="previewCuerpo()"></div>
        </section>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cerrar()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="form.invalid || saving()" (click)="guardar()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .plantilla-form {
      display: flex;
      flex-direction: column;
      gap: var(--gb-space-4);
      min-width: min(560px, 82vw);
      padding-top: var(--gb-space-2);
    }
    .plantilla-form > mat-form-field,
    .plantilla-form > mat-slide-toggle { width: 100%; }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--gb-space-2);
      align-items: center;
    }
    .tags__label { font: var(--mat-sys-label-medium); color: var(--adex-text-muted); }
    .tag-chip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 4px 10px 4px 6px;
      border: 1px solid var(--adex-border);
      border-radius: 999px;
      background: var(--adex-blue-tint);
      color: var(--adex-blue);
      font: var(--mat-sys-label-medium);
      font-weight: 600;
      cursor: pointer;
      transition: background 200ms var(--gb-ease), border-color 200ms var(--gb-ease);
    }
    .tag-chip:hover { background: var(--adex-blue-soft); border-color: var(--adex-blue-active); }
    .tag-chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .preview {
      border: 1px solid var(--adex-border-soft);
      border-radius: var(--gb-radius-sm);
      background: var(--adex-surface-2);
      padding: var(--gb-space-4);
    }
    .preview h3 { margin: 0 0 var(--gb-space-2); font: var(--mat-sys-label-large); color: var(--adex-text-muted); }
    .preview__subject { margin-bottom: var(--gb-space-2); font: var(--mat-sys-body-medium); color: var(--adex-text); }
    .preview__body { font: var(--mat-sys-body-medium); color: var(--adex-text); }
    .preview__body :first-child { margin-top: 0; }
    .preview__body :last-child { margin-bottom: 0; }
  `
})
export class PlantillaFormDialogComponent {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject<MatDialogRef<PlantillaFormDialogComponent, boolean>>(MatDialogRef);
  private readonly data = inject<PlantillaCorreo>(MAT_DIALOG_DATA);

  private readonly asuntoInput = viewChild<ElementRef<HTMLInputElement>>('asuntoInput');
  private readonly cuerpoInput = viewChild<ElementRef<HTMLTextAreaElement>>('cuerpoInput');

  saving = signal(false);
  campoActivo = signal<'asunto' | 'cuerpoHtml'>('cuerpoHtml');

  form = this.fb.nonNullable.group({
    codigo: [{ value: this.data.codigo, disabled: true }, Validators.required],
    asunto: [this.data.asunto, Validators.required],
    cuerpoHtml: [this.data.cuerpoHtml, Validators.required],
    activo: [this.data.activo]
  });

  // Señales para la vista previa en vivo.
  private readonly asuntoVal = signal(this.data.asunto);
  private readonly cuerpoVal = signal(this.data.cuerpoHtml);

  tags = computed<Tag[]>(() => TAGS_POR_CODIGO[this.data.codigo] ?? TAGS_GENERICOS);

  previewAsunto = computed(() => this.render(this.asuntoVal()));
  previewCuerpo = computed(() => this.render(this.cuerpoVal()));

  constructor() {
    this.form.controls.asunto.valueChanges.subscribe((v) => this.asuntoVal.set(v ?? ''));
    this.form.controls.cuerpoHtml.valueChanges.subscribe((v) => this.cuerpoVal.set(v ?? ''));
  }

  /** Reemplaza tags {{T}} o {T} por valores de ejemplo para la vista previa. */
  private render(texto: string): string {
    return (texto ?? '').replace(/\{\{?\s*([A-Za-z0-9_.]+)\s*\}?\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(EJEMPLO, name) ? EJEMPLO[name] : match
    );
  }

  /** Inserta el tag {Nombre} en la posición del cursor del campo activo. */
  insertarTag(nombre: string): void {
    const token = `{${nombre}}`;
    const campo = this.campoActivo();
    const el = campo === 'asunto' ? this.asuntoInput()?.nativeElement : this.cuerpoInput()?.nativeElement;
    const ctrl = this.form.controls[campo];
    const actual = ctrl.value ?? '';

    if (el) {
      const start = el.selectionStart ?? actual.length;
      const end = el.selectionEnd ?? actual.length;
      const nuevo = actual.slice(0, start) + token + actual.slice(end);
      ctrl.setValue(nuevo);
      // Reposiciona el cursor después del token insertado.
      queueMicrotask(() => {
        const pos = start + token.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    } else {
      ctrl.setValue(actual + token);
    }
  }

  guardar(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const req: UpsertPlantillaRequest = {
      codigo: this.data.codigo,
      asunto: this.form.controls.asunto.value,
      cuerpoHtml: this.form.controls.cuerpoHtml.value,
      variables: this.data.variables,
      activo: this.form.controls.activo.value
    };
    this.api.updatePlantilla(this.data.plantillaId, req).subscribe({
      next: () => {
        this.notify.success('Plantilla actualizada.');
        this.ref.close(true);
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.error(apiErrorMessage(e, 'No se pudo guardar la plantilla.'));
      }
    });
  }

  cerrar(): void {
    this.ref.close(false);
  }
}
