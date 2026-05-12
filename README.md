# ⚡ LumiCharge Pro

Plataforma e-commerce completa para dropshipping de cargadores inalámbricos premium. Construida con Node.js, TypeScript, SQLite y Vanilla JS.

## 🚀 Stack

| Capa | Tecnología |
|---|---|
| **Backend** | Node.js + Express + TypeScript |
| **Frontend** | HTML + CSS + TypeScript (Vite) |
| **Base de datos** | SQLite (better-sqlite3) |
| **Autenticación** | JWT + bcrypt + CSRF + Session Fingerprint |
| **Pagos** | Stripe (modo test/demo) |
| **PWA** | Service Worker + Manifest |
| **Tests** | Vitest + Supertest |

## 📦 Instalación

```bash
# 1. Clonar
git clone https://github.com/TU_USUARIO/lumicharge.git
cd lumicharge

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus claves

# 4. Inicializar base de datos
npm start
# Los seeds (productos, posts) se crean automáticamente

# 5. Build frontend (producción)
cd frontend
npx vite build
```

## 🖥️ Desarrollo

```bash
# Servidor con hot-reload
npm run dev

# Frontend con HMR (otra terminal)
cd frontend && npx vite
```

## 🧪 Tests

```bash
npm test          # Una vez
npm run test:watch  # En modo watch
npm run typecheck   # Verificar tipos
```

## 📋 URLs

| Ruta | Descripción |
|---|---|
| `/` | Tienda principal |
| `/carrito` | Carrito de compras |
| `/blog` | Blog / guías |
| `/tracking` | Seguimiento de pedidos |
| `/login` | Inicio de sesión clientes |
| `/register` | Registro de clientes |
| `/account` | Panel de cliente |
| `/admin` | Panel de administración |

## 🔒 Seguridad

- **SQL Injection**: Prepared statements en todas las queries
- **CSRF**: Tokens únicos por sesión
- **XSS**: Sanitización de inputs + escape en templates
- **JWT**: httpOnly cookies + refresh token rotation
- **Brute force**: Bloqueo tras 5 intentos fallidos (15 min)
- **Session Hijacking**: Fingerprint (User-Agent + IP) validado
- **Rate limiting**: Global, auth, checkout y APIs
- **Helmet**: Cabeceras HTTP de seguridad

## 🏗️ Estructura

```
├── server.ts                 # Backend principal
├── lib/
│   ├── database.ts           # SQLite CRUD
│   ├── logger.ts             # Pino logger
│   ├── sentry.ts             # Error tracking
│   └── email.ts              # Emails transaccionales
├── frontend/
│   ├── index.html            # Tienda
│   ├── src/
│   │   ├── main.ts           # Entry point
│   │   ├── style.css         # Estilos globales
│   │   ├── components/       # Componentes UI
│   │   ├── lib/              # API + Productos
│   │   └── i18n/             # Traducciones (5 idiomas)
│   └── vite.config.ts
├── public/
│   ├── admin.html            # Panel admin
│   └── sw.js                 # Service Worker
├── tests/
│   ├── api.test.ts           # Tests de integración
│   └── database.test.ts      # Tests de BD
└── .github/workflows/ci.yml  # CI/CD
```

## 📄 Licencia

Uso privado — LumiCharge Technologies S.L.
