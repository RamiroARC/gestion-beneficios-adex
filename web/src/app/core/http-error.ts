import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(err: unknown, fallback: string): string {
  const http = err as HttpErrorResponse;
  if (http?.status === 0) return 'No hay conexión con la API. ¿Está en marcha en el puerto 5280?';
  if (http?.status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
  if (http?.status === 403) return 'No tienes permiso para esta operación (requiere Administrador u Operador).';

  const body = http?.error;
  if (typeof body === 'string' && body.trim()) return body;

  const msg = body?.message ?? body?.Message ?? body?.title ?? body?.Title;
  if (typeof msg === 'string' && msg.trim()) return msg;

  const errors = body?.errors ?? body?.Errors;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat().find((x) => typeof x === 'string');
    if (first) return String(first);
  }

  return fallback;
}
