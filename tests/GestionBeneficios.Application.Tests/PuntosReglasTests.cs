using GestionBeneficios.Domain.Services;

namespace GestionBeneficios.Application.Tests;

/// <summary>Smoke tests for reglas de dominio usadas por Application.</summary>
public class PuntosReglasTests
{
    [Theory]
    [InlineData(1000, 1, 1000)]
    [InlineData(1300, 3, 3900)]
    [InlineData(2500.5, 2, 5001)]
    public void Calculo_Sueldo_Por_Meses(decimal sueldo, int meses, decimal esperado)
    {
        var inicio = new DateOnly(2026, 1, 10);
        var fin = inicio.AddDays(meses * PuntosCalculator.DiasPorMes);
        Assert.Equal(esperado, PuntosCalculator.CalcularPuntos(sueldo, inicio, fin));
    }
}
