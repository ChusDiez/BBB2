# 🚀 Pasos de Despliegue - Aplicación de Exámenes

## 📋 Checklist Previo al Despliegue

### ✅ Dependencias Frontend
```bash
cd FrontExams
npm install @supabase/supabase-js
```

### ✅ Dependencias Backend  
```bash
cd BackExams
npm install @supabase/supabase-js
```

## 🔐 Configuración de Supabase

### 1. Configurar Autenticación en Dashboard
1. Ve a tu proyecto Supabase
2. Authentication > Settings
3. En "Site URL" añadir: `https://tu-frontend.vercel.app`
4. En "Redirect URLs" añadir: `https://tu-frontend.vercel.app/**`

### 2. Crear Usuarios Autorizados
```sql
-- Ejecutar en SQL Editor de Supabase
INSERT INTO auth.users (
  email, 
  email_confirmed_at,
  created_at,
  updated_at
) VALUES 
('chus@iz.academy', now(), now(), now()),
('felix@iz.academy', now(), now(), now());
```

## 🌐 Despliegue Frontend (Vercel)

### 1. Conectar Repositorio
1. Ve a [vercel.com](https://vercel.com)
2. Import Git Repository
3. Selecciona tu repositorio
4. Root Directory: `FrontExams`

### 2. Variables de Entorno en Vercel
```
REACT_APP_SUPABASE_URL=https://tu-proyecto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu-anon-key-supabase
REACT_APP_API_URL=https://tu-backend.railway.app
```

### 3. Build Settings
- Framework Preset: `Create React App`
- Build Command: `npm run build`
- Output Directory: `build`

## 🖥️ Despliegue Backend (Railway)

### 1. Conectar Repositorio
1. Ve a [railway.app](https://railway.app)
2. New Project > Deploy from GitHub
3. Root Directory: `BackExams`

### 2. Variables de Entorno en Railway
```
DATABASE_URL=tu-database-url-supabase-completa
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-supabase
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
PORT=8000
FRONTEND_URL=https://tu-frontend.vercel.app
NODE_ENV=production
```

### 3. Settings Railway
- Start Command: `npm start`
- Auto-deploy: Enabled
- Health Check Path: `/`

## 🔄 Configuración CORS en Backend

Actualizar `BackExams/index.js`:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3006', 
    'http://localhost:3007',
    process.env.FRONTEND_URL,
    'https://tu-frontend.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

## 🛡️ Proteger Rutas del Backend

Ejemplo de implementación en `routes/admin.route.js`:

```javascript
import { authenticateUser } from '../middlewares/auth.middleware.js';

// Proteger todas las rutas admin
router.use(authenticateUser);

router.get('/dashboard', (req, res) => {
  res.json({ 
    message: 'Dashboard autorizado',
    user: req.user.email 
  });
});
```

## ✅ Verificación Post-Despliegue

### 1. Test de Autenticación
- [ ] Login con `chus@iz.academy` funciona
- [ ] Login con `felix@iz.academy` funciona  
- [ ] Login con email no autorizado es rechazado

### 2. Test de API
- [ ] Frontend puede conectar con backend
- [ ] Rutas protegidas requieren autenticación
- [ ] Base de datos responde correctamente

### 3. Test de Funcionalidad
- [ ] Subida de archivos funciona
- [ ] Generación de exámenes funciona
- [ ] Descarga de archivos funciona

## 🎯 URLs Finales

Una vez desplegado tendrás:

- **Frontend**: `https://tu-app.vercel.app`
- **Backend**: `https://tu-api.railway.app`  
- **Base de Datos**: Tu Supabase existente

## 🚨 Troubleshooting

### Error CORS
- Verificar `FRONTEND_URL` en variables de entorno
- Añadir dominio correcto en `corsOptions`

### Error de Autenticación
- Verificar variables `SUPABASE_*` en ambos servicios
- Confirmar que usuarios existen en Supabase Auth

### Error de Base de Datos
- Verificar `DATABASE_URL` completa en Railway
- Confirmar conectividad desde Railway a Supabase

## 🔄 Actualizaciones Futuras

Con esta configuración:
1. **Git push** → **Despliegue automático**
2. **Sin `npm start` local** → **Acceso desde cualquier lugar**
3. **Solo usuarios autorizados** → **Seguridad garantizada**

---
*¡Tu aplicación estará lista para producción!*
