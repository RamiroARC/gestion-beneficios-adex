namespace GestionBeneficios.Domain.Enums;

public enum EstadoContratacion
{
    Vigente = 1,
    Vencida = 2,
    Anulada = 3
}

public enum TipoPuntoMovimiento
{
    Acumulacion = 1,
    Canje = 2,
    Vencimiento = 3,
    Ajuste = 4
}

public enum EstadoPuntoMovimiento
{
    Disponible = 1,
    Reservado = 2,
    Consumido = 3,
    Vencido = 4
}

public enum EstadoCanje
{
    Procesado = 1,
    Solicitado = 2,
    Aprobado = 3,
    Rechazado = 4
}

public enum EstadoCorreo
{
    Pendiente = 1,
    Enviado = 2,
    Error = 3
}

public enum EstadoCargaMasiva
{
    Validando = 1,
    Previsualizacion = 2,
    Procesando = 3,
    Completada = 4,
    CompletadaConErrores = 5,
    Fallida = 6
}
