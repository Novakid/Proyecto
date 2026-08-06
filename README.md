# Aparicio Gestión

Sistema de gestión de catálogo, tipos, usuarios y notas de pago. El repositorio contiene una API NestJS, una SPA Vue y un contenedor de escritorio Electron.

## Requisitos

- Node.js 20.19 o superior (Node 22 LTS recomendado)
- npm funcional
- MySQL 8
- Windows para generar el instalador NSIS de Electron

## Estructura

- `Backend/`: NestJS, TypeORM, MySQL, JWT y almacenamiento de imágenes.
- `Frontend/`: Vue 3, Vite, Axios y Bootstrap.
- `Desktop/`: Electron; usa Vite en desarrollo y archivos compilados en producción.

El módulo `pedidos` es actualmente un marcador. El Dashboard solo tiene contenido estático y no existe un contrato de datos; no se añadieron reglas de negocio inventadas.

## Variables de entorno

Copie los ejemplos sin versionar los archivos reales:

```powershell
Copy-Item Backend/.env.example Backend/.env
Copy-Item Frontend/.env.example Frontend/.env
Copy-Item Desktop/.env.example Desktop/.env
```

Backend requiere `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `JWT_SECRET` y `CORS_ORIGINS`. En producción, `JWT_SECRET` debe ser aleatorio y `CORS_ORIGINS` debe contener únicamente orígenes permitidos separados por comas.

Frontend usa `VITE_API_URL`. Vite incorpora este valor durante el build, por lo que debe apuntar a la API que utilizará la aplicación instalada. Electron usa `ELECTRON_RENDERER_URL` únicamente en desarrollo.

## Instalación y desarrollo

```powershell
npm install
npm run install:all
npm run dev
```

También se pueden iniciar por separado:

```powershell
npm run dev:backend
npm run dev:frontend
npm run dev:desktop
```

Electron debe iniciarse después de que Vite esté escuchando. El script coordinado mantiene los tres procesos juntos.

## Base de datos y migraciones

Mantenga `synchronize: false`. Para una instalación nueva, cree primero la base vacía indicada por `DB_NAME` y ejecute:

```powershell
npm run migration:run --prefix Backend
```

Otros comandos:

```powershell
npm run migration:show --prefix Backend
npm run migration:generate --prefix Backend -- --name NombreDelCambio
npm run migration:revert --prefix Backend
```

Antes de ejecutar la migración inicial en una base existente, haga un respaldo y compare el esquema. Las tablas se crean con `IF NOT EXISTS`, pero la tabla de historial de migraciones no conoce cambios creados previamente a mano.

## Primer administrador y autenticación

Después de migrar, cree una sola vez el administrador inicial:

```powershell
$body = @{ nombre='Administrador'; email='admin@example.com'; password='cambie-esta-clave-segura' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/bootstrap -ContentType 'application/json' -Body $body
```

El endpoint deja de aceptar altas cuando ya existe un administrador. El login está en `/auth/login`. Las lecturas de productos y tipos son públicas; mutaciones, facturación y usuarios requieren JWT, con borrados críticos limitados a administradores.

Un administrador puede crear credenciales adicionales con `POST /auth/users`, enviando `nombre`, `email`, `password` y opcionalmente `role` (`admin` o `employee`). Los registros de clientes existentes no reciben contraseñas automáticamente.

## Builds, lint y pruebas

```powershell
npm run build
npm run lint
npm run test
```

## Electron en producción

Compile primero el frontend con el `VITE_API_URL` definitivo y luego genere el instalador:

```powershell
npm run build --prefix Frontend
npm run desktop:dist
```

El resultado se guarda en `Desktop/release`. La aplicación empaquetada carga `Frontend/dist` como recurso local y no depende de Vite.

## Uploads

`Backend/uploads` contiene datos operativos y está ignorado para archivos nuevos. Los archivos ya versionados no se borraron. Si algunos son recursos iniciales permanentes, muévalos en un cambio revisado a `Backend/assets` o `Frontend/public` y use una migración/seed explícita para asociarlos.
