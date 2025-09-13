# 🚂 Guía de Despliegue en Railway - Backend

## ✅ **Preparación Completada**

1. ✅ Dependencias instaladas: `@supabase/supabase-js`
2. ✅ CORS configurado para producción
3. ✅ Middleware de autenticación creado
4. ✅ Configuración Railway preparada

## 🔧 **Pasos para Desplegar en Railway**

### 1. **Crear Cuenta en Railway**
- Ve a [railway.app](https://railway.app)
- Inicia sesión con GitHub
- Conecta tu repositorio

### 2. **Configurar Variables de Entorno en Railway**

En el dashboard de Railway, ve a **Variables** y añade:

```env
# Base de datos (tu DATABASE_URL actual)
DATABASE_URL=postgresql://tu-database-url-completa

# Supabase (ya tenemos los valores)
SUPABASE_URL=https://hindymhwohevsqumekyv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpbmR5bWh3b2hldnNxdW1la3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3ODc4OTksImV4cCI6MjA2NDM2Mzg5OX0.oHuotC0MjPDrEMQksKt6QJ-Z_Yh0G60ZNRv5Ncy4MUQ
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Configuración del servidor
PORT=8000
NODE_ENV=production

# Se configurará después del despliegue del frontend
FRONTEND_URL=https://tu-frontend.vercel.app
```

### 3. **Despliegue Automático**

Railway detectará automáticamente:
- `package.json` para instalar dependencias
- `railway.json` para configuración 
- Puerto 8000 para el servidor

### 4. **Verificar Despliegue**

Una vez desplegado:
- Railway te dará una URL como: `https://tu-backend.railway.app`
- Verifica que responde en: `https://tu-backend.railway.app/`

## 🔑 **Service Role Key Necesaria**

Para obtener tu `SUPABASE_SERVICE_ROLE_KEY`:

1. Ve a tu [Dashboard de Supabase](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** > **API**
4. Copia la **service_role** key (¡no la compartas públicamente!)

## 📁 **Estructura de Archivos Preparada**

```
BackExams/
├── package.json ✅ (con dependencias)
├── index.js ✅ (CORS configurado)
├── middlewares/auth.middleware.js ✅ (autenticación)
├── railway.json ✅ (configuración Railway)
└── routes/ ✅ (rutas existentes)
```

## 🔄 **Siguiente Paso**

Una vez que tengas:
1. ✅ Backend desplegado en Railway
2. ✅ URL del backend anotada

Procederemos con el frontend en Vercel.

---
*Todo listo para deployment! 🚀*
