namespace GestionBeneficios.Domain.Services;

/// <summary>
/// Puntos = Sueldo × meses completos de 30 días calendario.
/// Periodos preliminares (no múltiplo exacto de 30 días) se registran con 0 puntos.
/// </summary>
public static class PuntosCalculator
{
    public const int DiasPorMes = 30;

    public static int CalcularDiasCalendario(DateOnly inicio, DateOnly fin)
    {
        if (fin < inicio)
            throw new ArgumentException("La fecha fin no puede ser anterior a la fecha inicio.");

        return fin.DayNumber - inicio.DayNumber;
    }

    public static bool EsPeriodoMesesCompletos30Dias(DateOnly inicio, DateOnly fin)
    {
        var dias = CalcularDiasCalendario(inicio, fin);
        return dias >= DiasPorMes && dias % DiasPorMes == 0;
    }

    public static int? TryCalcularMesesCompletos30Dias(DateOnly inicio, DateOnly fin)
    {
        var dias = CalcularDiasCalendario(inicio, fin);
        if (dias < DiasPorMes || dias % DiasPorMes != 0) return null;
        return dias / DiasPorMes;
    }

    /// <summary>Meses estimados para carga preliminar (división entera de días / 30).</summary>
    public static int CalcularMesesPreliminar(DateOnly inicio, DateOnly fin)
    {
        var dias = CalcularDiasCalendario(inicio, fin);
        if (dias <= 0)
            throw new InvalidOperationException("La vigencia debe ser de al menos 1 día calendario.");

        var meses = dias / DiasPorMes;
        return meses > 0 ? meses : 1;
    }

    public static decimal CalcularPuntos(decimal sueldoMensual, DateOnly inicio, DateOnly fin)
    {
        if (sueldoMensual < 0)
            throw new ArgumentException("El sueldo no puede ser negativo.");

        var mesesCompletos = TryCalcularMesesCompletos30Dias(inicio, fin);
        if (mesesCompletos is null) return 0;

        return Math.Round(sueldoMensual * mesesCompletos.Value, 2, MidpointRounding.AwayFromZero);
    }
}
