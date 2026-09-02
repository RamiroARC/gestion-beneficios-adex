## Despliegue y Card (Fases 8–10)

### Despliegue sugerido

| Componente | Destino |
|------------|---------|
| API .NET 10 | Azure App Service / IIS |
| SQL Server 2022 / Azure SQL | Connection string en Key Vault |
| Angular SPA | Static Web Apps / App Service / CDN |
| Jobs | Hosted Service en la API (ya incluido) o Azure Functions Timer |

### Checklist pre-producción

- [ ] Reemplazar Dev JWT por Login Centros Académico
- [ ] Configurar `CrmEmpresas:CodUser` y `UseMock: false` en producción
- [ ] Configurar SMTP / Graph para `IEmailSender`
- [ ] Provider SQL Server + migraciones formales
- [ ] CORS solo orígenes institucionales
- [ ] Rate limiting en canjes/cargas si aplica
- [ ] Retención de auditoría (política pendiente)

### Card institucional

La “Card” de Login Centros **no se inventa** aquí. Cuando exista el contrato (claims, client id, redirect URIs), registrar la aplicación y mapear roles:

- `Administrador`
- `Operador`
- `Consulta`
- `GestionBeneficios`

Hasta entonces, el SPA usa `POST /api/v1/auth/dev-token`.
