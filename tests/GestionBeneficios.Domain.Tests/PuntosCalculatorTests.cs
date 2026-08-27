using GestionBeneficios.Domain.Services;

namespace GestionBeneficios.Domain.Tests;

public class PuntosCalculatorTests
{
    [Fact]
    public void Ejemplo_Sueldo_1300_Por_3_Meses_Es_3900()
    {
        var inicio = new DateOnly(2026, 1, 15);
        var fin = inicio.AddDays(90);
        var puntos = PuntosCalculator.CalcularPuntos(1300m, inicio, fin);
        Assert.Equal(3900m, puntos);
    }

    [Fact]
    public void FechaFin_Anterior_Lanza()
    {
        Assert.Throws<ArgumentException>(() =>
            PuntosCalculator.CalcularPuntos(1000m, new DateOnly(2026, 5, 1), new DateOnly(2026, 4, 1)));
    }

    [Fact]
    public void Periodo_Preliminar_No_Genera_Puntos()
    {
        var puntos = PuntosCalculator.CalcularPuntos(1000m, new DateOnly(2026, 1, 1), new DateOnly(2026, 2, 15));
        Assert.Equal(0m, puntos);
    }

    [Fact]
    public void Un_Mes_Completo_Son_30_Dias()
    {
        var inicio = new DateOnly(2026, 9, 1);
        var fin = inicio.AddDays(30);
        Assert.Equal(1, PuntosCalculator.TryCalcularMesesCompletos30Dias(inicio, fin));
        Assert.Equal(60, PuntosCalculator.CalcularDiasCalendario(new DateOnly(2026, 9, 1), new DateOnly(2026, 10, 31)));
    }
}
