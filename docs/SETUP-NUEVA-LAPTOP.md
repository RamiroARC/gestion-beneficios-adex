# Configuración en laptop nueva — Inventario de proyectos y variables de entorno

Guía para reconstruir el entorno de desarrollo tras clonar los repos desde GitHub.
**Este archivo NO contiene secretos**: solo lista qué variables necesita cada proyecto.
Los valores reales (claves, connection strings, contraseñas) debes copiarlos aparte desde los `.env`
de la laptop actual **antes** de cambiar de equipo (los `.env` no están en GitHub).

> Owner GitHub: `RamiroARC`
>
> Este archivo vive en `gestion-beneficios-adex/docs/` (antes estaba suelto en la carpeta raíz
> `ProyectosKiro`, que no es un repositorio y por eso no estaba respaldado en GitHub).

---

## 1. Clonar los repos

```bash
git clone https://github.com/RamiroARC/gestion-beneficios-adex
git clone https://github.com/RamiroARC/condominios
git clone https://github.com/RamiroARC/condominios-web
git clone https://github.com/RamiroARC/reserva-salas
git clone https://github.com/RamiroARC/Tareo
```

Ramas de trabajo: `gestion-beneficios-adex` usa **`development`** (hacer `git checkout development`);
`condominios` y `condominios-web` usan `master`; `reserva-salas` y `Tareo` usan `main`.

Configurar la identidad de git en cada repo (o global), para que los commits no fallen:

```bash
git config user.name  "RamiroARC"
git config user.email "Ramiro.Regalado.Carrillo@gmail.com"
```

Instalar dependencias donde aplique:
- Node (condominios, condominios-web, reserva-salas, Tareo): `npm install` (y en `reserva-salas/server` si corresponde).
- .NET (gestion-beneficios-adex): `dotnet restore` / `dotnet build` (SDK .NET 10).
- Frontend de gestion-beneficios-adex: `npm install` dentro de `web/` (Angular 22).

---

## 2. Archivos de entorno a recrear (NO vienen de GitHub)

| Proyecto | Archivo a crear | Base (plantilla) |
|----------|-----------------|------------------|
| condominios | `.env` | `.env.example` |
| condominios-web | `.env.local` | `.env.example` |
| reserva-salas | `.env` | `.env.example` |
| Tareo | `.env` | `.env.example` |
| gestion-beneficios-adex | *(ninguno)* | usa `appsettings` + variables de entorno de IIS/SO |

En cada proyecto Node: copiar la plantilla y completar valores. Ejemplo:
```bash
cp .env.example .env           # condominios, reserva-salas, Tareo
cp .env.example .env.local     # condominios-web
```

---

## 3. Variables por proyecto (claves, sin valores)

### condominios (`.env`)
```
NODE_ENV=development
PORT=3000
MONGODB_URI=                 # Atlas, base de DESARROLLO (no producción)
JWT_SECRET=                  # secreto largo aleatorio
JWT_REFRESH_SECRET=          # distinto al anterior
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
STORAGE_PROVIDER=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
EMAIL_PROVIDER=
EMAIL_API_KEY=
PUSH_PROVIDER=
PUSH_API_KEY=
THROTTLE_TTL=60
THROTTLE_LIMIT=120
CORS_ORIGINS=http://localhost:3001
```

### condominios-web (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### reserva-salas (`.env`)
```
SUPERADMIN_USER=superadmin
SUPERADMIN_PASSWORD=          # cambiar
MONGODB_URI=                 # Atlas, base de DESARROLLO separada
# PORT=3001                  # opcional
```

### Tareo (`.env`)
```
VITE_AZURE_CLIENT_ID=
VITE_AZURE_TENANT_ID=
VITE_AZURE_REDIRECT_URI=http://localhost:5173
VITE_SHAREPOINT_SITE_ID=
VITE_SHAREPOINT_SITE_URL=
```

### gestion-beneficios-adex
No usa `.env`. En **local** usa `appsettings.json` (SQLite, CRM en mock, JWT de dev, correo en modo
`Logging`: no envía nada, solo registra en log). En **servidor/IIS** los secretos van como variables
de entorno del App Pool `GestionBeneficiosPool` (sitio `GestionBeneficios`, puerto 9020, servidor 10.31.1.222):

```
ASPNETCORE_ENVIRONMENT=PreProduction
ConnectionStrings__Beneficios   # SQL Server (10.31.1.220)
Authentication__DevJwt__Key     # clave JWT
CrmEmpresas__CodUser            # usuario del CRM de Empresas; YA CONFIGURADO en el servidor (valor: usuarioi)

# Correo (ver nota abajo)
Email__Provider                 # Smtp  (o Logging para no enviar)
Email__Host
Email__Port
Email__User                     # secreto
Email__Password                 # secreto
Email__From
Email__FromName
Email__OverrideTo               # si tiene valor, TODOS los correos se redirigen a esa dirección
```

**Nota sobre el correo (estado actual, preproducción):**
- Se usa **Mailtrap Sandbox** (`sandbox.smtp.mailtrap.io`, puerto `2525`) con `Email__OverrideTo` apuntando
  a la dirección de pruebas. Mailtrap Sandbox **solo captura** los correos en su bandeja web; **no entrega**
  a buzones reales. Para verlos hay que entrar al panel de Mailtrap (si no recuerdas el acceso, recupéralo
  en mailtrap.io con "Forgot password").
- No se pudo usar Microsoft 365 como SMTP: el tenant tiene **SMTP AUTH deshabilitado**
  (error `535 5.7.139 SmtpClientAuthentication is disabled`). Para envío real se necesita que ADEX
  habilite un buzón con SMTP autenticado o provea otro servicio de envío (SendGrid, SES, etc.).
- Pasar a SMTP real es **solo cambiar estas variables** (no se recompila). Al hacerlo, **vaciar
  `Email__OverrideTo`** para enviar a los destinatarios reales; mientras tenga valor, nada sale a las empresas.
- `IEmailSender` se registra como singleton y lee la configuración al arrancar: **tras cambiar cualquier
  `Email__*` hay que reiniciar el App Pool** (`Restart-WebAppPool -Name "GestionBeneficiosPool"`).
- Los correos se encolan en BD con el destinatario real y un worker (cada 15 min y al arrancar) los envía;
  el `OverrideTo` se aplica en el envío, así que el listado "Correos enviados" siempre muestra el destinatario real.

---

## 4. Puertos de desarrollo (referencia)

| Proyecto | Puerto |
|----------|--------|
| condominios (API NestJS) | 3000 |
| condominios-web (Next.js) | 3001 |
| reserva-salas (API) | 3001 (configurable) |
| Tareo (Vite) | 5173 |
| gestion-beneficios-adex (API local) | 5280 |
| gestion-beneficios-adex frontend (Angular dev) | 4200 |
| gestion-beneficios-adex en preproducción (IIS) | 9020 |

---

## 5. Antes de apagar la laptop actual — copiar los `.env` reales

Copia estos archivos a un lugar seguro (USB, gestor de contraseñas, etc.). **No** van a GitHub:
- `condominios\.env`
- `condominios-web\.env.local`
- `reserva-salas\.env`
- `Tareo\.env`

Para gestion-beneficios-adex, anota los secretos que están configurados en el **IIS del servidor**
(no en la laptop): connection string de SQL, JWT key, credenciales SMTP (`Email__User` / `Email__Password`).
El `CrmEmpresas__CodUser` ya está definido allí; si se recreara el servidor, vuelve a configurarlo.
