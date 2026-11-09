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

## 0. Requisitos de software en la laptop nueva

Versiones tomadas del equipo anterior (noviembre 2026). Instalar primero esto, después clonar.

### Comunes a todos los proyectos
| Requisito | Versión de referencia | Nota |
|-----------|-----------------------|------|
| Git | 2.55 o superior | Con sesión iniciada en GitHub (cuenta `RamiroARC`) |
| Node.js | 24.x (v24.21.0) | Todos los proyectos Node y el frontend Angular |
| npm | 11.x | Viene con Node. `gestion-beneficios-adex/web` declara `npm@11.17.0` |
| PowerShell | 5.1 (incluido en Windows) | |

**Política de ejecución de PowerShell.** Por defecto bloquea `npm.ps1` ("la ejecución de scripts está
deshabilitada"). Ejecutar una sola vez:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Alternativa sin cambiar la política: usar `npm.cmd` y `node_modules/.bin/ng.cmd`.

### gestion-beneficios-adex (proyecto principal)
| Requisito | Versión de referencia | Obligatorio | Nota |
|-----------|-----------------------|-------------|------|
| .NET SDK | 10.0.401 | Sí | Incluye el runtime ASP.NET Core 10 |
| Node.js + npm | ver tabla anterior | Sí | Frontend Angular 22 en `web/` |
| Angular CLI | local (no instalar global) | No | Lo trae `npm install` en `web/`; se usa con `node_modules/.bin/ng.cmd` |
| `dotnet-ef` | 10.0.x (`dotnet tool install -g dotnet-ef`) | No | Solo para **crear** migraciones; las existentes se aplican solas al arrancar |
| Cliente de Escritorio Remoto | incluido en Windows | Para desplegar | Acceso RDP al servidor 10.31.1.222 |
| Red/VPN de ADEX | | Para desplegar | Alcance a 10.31.1.222 (IIS) y 10.31.1.220 (SQL Server) |

En la laptop **no** hace falta instalar SQL Server, IIS ni el ASP.NET Core Hosting Bundle: en local la app usa
SQLite (se crea sola con datos de ejemplo) y el CRM va en modo simulado. IIS y el Hosting Bundle .NET 10 son
requisitos del **servidor**, que ya los tiene. Puertos locales libres: 5280 (API) y 4200 (Angular).

Prueba rápida de que todo quedó bien:
```bash
git checkout development
cd web && npm install          # frontend
cd ../src/GestionBeneficios.Api && dotnet run          # API en http://localhost:5280
cd ../../web && node_modules/.bin/ng.cmd serve         # frontend en http://localhost:4200
```

### Otros proyectos
| Proyecto | Stack | Extra necesario |
|----------|-------|-----------------|
| condominios | NestJS 10, TypeScript 5.7, MongoDB | `.env` con MongoDB Atlas (base de desarrollo) |
| condominios-web | Next.js 16, React 19 | `.env.local` y la API de `condominios` en marcha |
| reserva-salas | Express + React/Vite, MongoDB Atlas | `.env`; se publica en Vercel (equipo Dyadra), necesita acceso a esa cuenta para redesplegar |
| Tareo | React 19 + Vite 6, Azure AD y SharePoint | `.env` con los IDs de Azure y SharePoint |

Ninguno requiere Docker ni MongoDB local (usan Atlas en la nube).

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

Lleva también, si los tienes: el acceso al panel de **Mailtrap** (para ver los correos de prueba) y las
credenciales de **GitHub** y **Vercel**.

Para gestion-beneficios-adex, anota los secretos que están configurados en el **IIS del servidor**
(no en la laptop): connection string de SQL, JWT key, credenciales SMTP (`Email__User` / `Email__Password`).
El `CrmEmpresas__CodUser` ya está definido allí; si se recreara el servidor, vuelve a configurarlo.
