export const DIAS_POR_MES_CONTRATACION = 30;

export interface ContratacionPeriodoResult {
  dias: number;
  meses: number;
  esPreliminar: boolean;
}

export function diasCalendarioEntre(inicio: Date, fin: Date): number {
  const a = toUtcDay(inicio);
  const b = toUtcDay(fin);
  return Math.round((b - a) / 86_400_000);
}

export function calcularPeriodoContratacion(
  inicio: Date | null | undefined,
  fin: Date | null | undefined
): ContratacionPeriodoResult | null {
  if (!inicio || !fin) return null;

  const dias = diasCalendarioEntre(inicio, fin);
  if (dias <= 0) return null;

  const mesesCompletos = dias >= DIAS_POR_MES_CONTRATACION && dias % DIAS_POR_MES_CONTRATACION === 0;
  const meses = mesesCompletos ? dias / DIAS_POR_MES_CONTRATACION : Math.max(1, Math.floor(dias / DIAS_POR_MES_CONTRATACION));

  return {
    dias,
    meses,
    esPreliminar: !mesesCompletos
  };
}

/** Solo bloquea fechas inválidas (fin anterior al inicio). */
export function errorFechasContratacion(
  inicio: Date | null | undefined,
  fin: Date | null | undefined
): string | null {
  if (!inicio || !fin) return null;
  if (diasCalendarioEntre(inicio, fin) < 0) {
    return 'La fecha fin no puede ser anterior a la fecha inicio.';
  }
  return null;
}

export function avisoPeriodoPreliminar(periodo: ContratacionPeriodoResult | null): string | null {
  if (!periodo?.esPreliminar) return null;
  return `Información preliminar (${periodo.dias} días). Los puntos se calcularán cuando el periodo cierre en meses completos de 30 días.`;
}

function toUtcDay(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}
