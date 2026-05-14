# ⚡ LumiCharge Pro

Plataforma e-commerce para dropshipping de cargadores inalámbricos premium.

## 🏗️ Estructura del proyecto

```
├── server.ts                 # Backend principal
├── lib/
│   ├── database.ts           # SQLite CRUD
│   ├── logger.ts             # Logger
│   ├── email.ts              # Emails transaccionales
│   └── sentry.ts             # Error tracking
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

---

© 2026 LumiCharge Technologies S.L. Todos los derechos reservados.

Este software es privado y confidencial. Queda prohibida la reproducción, distribución o modificación total o parcial sin autorización expresa del propietario.
