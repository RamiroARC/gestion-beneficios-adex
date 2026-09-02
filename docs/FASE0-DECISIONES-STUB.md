# Fase 0 — Decisiones técnicas temporales (stubs)

> Documento operativo para desbloquear implementación. **No sustituye** las definiciones institucionales definitivas.

## Integraciones (stubs)

| Integración | Enfoque temporal | Reemplazo esperado |
|-------------|------------------|--------------------|
| Login Centros Académico | JWT Bearer de desarrollo (`Authentication:DevJwt`) + roles claim | OIDC/JWT institucional |
| CRM de Empresas | `MockCrmEmpresasClient` con empresas de ejemplo | `CrmEmpresasHttpClient` (API ADEX + JWT) |

## Decisiones de dominio (provisionales, marcadas en código)

| Tema | Decisión temporal | Código |
|------|-------------------|--------|
| Titular del saldo | **Empresa asociada** | `PuntoMovimiento.EmpresaId` |
| Meses de vigencia | Solo **meses calendario enteros** entre inicio y fin; fracciones **rechazadas** hasta definición | `PuntosCalculator` |
| Generación de puntos | Al **confirmar/crear** contratación vigente | `ContratacionService` |
| Vencimiento | `FechaFin` del contrato (fin del día) | Lotes / movimientos |
| Canje | **Descuento inmediato** sin aprobación | `CanjeService` |
| Fuente alumnos | Carga manual / Excel (sin sistema externo) | Módulo Alumnos |

## Roles preliminares (propuesta)

- `Administrador`
- `Operador`
- `Consulta`
- `GestionBeneficios`

## Ubicación del repo

`C:\Users\liton\Projects\gestion-beneficios-adex`
