import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotifyService {
  constructor(private snackBar: MatSnackBar) {}

  success(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000, panelClass: ['gb-snack-success'] });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 6000, panelClass: ['gb-snack-error'] });
  }

  info(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
