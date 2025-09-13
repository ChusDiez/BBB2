# 🔐 Configuración de Autenticación Backend

## Instalación de Dependencias

```bash
cd BackExams
npm install @supabase/supabase-js
```

## Variables de Entorno

Añadir al archivo `.env` en BackExams:

```env
# Supabase Configuration
SUPABASE_URL=tu-url-supabase
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# URLs permitidas para CORS (actualizar en producción)
FRONTEND_URL=https://tu-frontend.vercel.app
```

## Proteger Rutas

### Ejemplo de uso en rutas:

```javascript
import { authenticateUser } from '../middlewares/auth.middleware.js';

// Ruta protegida que requiere autenticación
router.get('/admin/dashboard', authenticateUser, (req, res) => {
  // Solo usuarios autorizados pueden acceder
  res.json({ 
    message: 'Dashboard de administración',
    user: req.user.email 
  });
});

// Ruta con autenticación opcional
router.get('/public/data', optionalAuth, (req, res) => {
  if (req.user) {
    // Usuario autenticado - mostrar datos completos
    res.json({ data: fullData, user: req.user.email });
  } else {
    // Usuario no autenticado - mostrar datos limitados
    res.json({ data: limitedData });
  }
});
```

## Actualizar CORS

En `index.js`, actualizar la configuración CORS:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3006', 
    'http://localhost:3007',
    process.env.FRONTEND_URL || 'https://tu-frontend.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

## Emails Autorizados

Los siguientes emails tienen acceso completo:
- chus@iz.academy
- felix@iz.academy

Para añadir más emails, modificar el array `AUTHORIZED_EMAILS` en:
- `BackExams/middlewares/auth.middleware.js` 
- `FrontExams/src/lib/supabase.ts`
