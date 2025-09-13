# 🚀 Guía de Despliegue - Aplicación de Exámenes

## 📋 Estrategia de Despliegue

### Tecnologías Elegidas
- **Frontend**: Vercel (React)
- **Backend**: Railway/Render (Express.js) 
- **Base de Datos**: Supabase PostgreSQL (ya configurada)
- **Autenticación**: Supabase Auth con emails específicos

### ✅ Ventajas de esta Estrategia
- **Gratuito** en niveles básicos
- **Despliegue automático** con git push
- **Escalable** según demanda
- **Fácil mantenimiento**
- **SSL automático**

## 🔐 Configuración de Autenticación

### Emails Autorizados
- `chus@iz.academy` (Administrador)
- `felix@iz.academy` (Administrador)

### Proceso de Implementación

1. **Configurar Auth en Supabase Dashboard**
2. **Instalar dependencias de autenticación**
3. **Crear middleware de autenticación**
4. **Configurar protección de rutas**
5. **Desplegar en plataformas cloud**

## 🛠️ Pasos Detallados

### Paso 1: Instalar Dependencias
```bash
# En el Frontend
cd FrontExams
npm install @supabase/supabase-js

# En el Backend  
cd BackExams
npm install @supabase/supabase-js jsonwebtoken
```

### Paso 2: Variables de Entorno
Necesitarás configurar estas variables en producción:

**Frontend (.env)**
```
REACT_APP_SUPABASE_URL=tu-url-supabase
REACT_APP_SUPABASE_ANON_KEY=tu-anon-key
REACT_APP_API_URL=https://tu-backend.railway.app
```

**Backend (.env)**
```
DATABASE_URL=tu-database-url-supabase
SUPABASE_URL=tu-url-supabase
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
PORT=8000
```

### Paso 3: Configurar Emails Autorizados en Supabase

En tu proyecto Supabase:
1. Ve a Authentication > Settings
2. Desactiva "Enable email confirmations" (opcional para testing)
3. En "Site URL" pon tu dominio de producción
4. Crear una tabla para administradores autorizados

## 🔧 Implementación de Código

Los archivos se crearán automáticamente en los siguientes pasos...

## 📦 Despliegue

### Frontend (Vercel)
1. Conectar repositorio en Vercel
2. Configurar variables de entorno
3. Build automático en cada push

### Backend (Railway)
1. Conectar repositorio en Railway
2. Configurar variables de entorno
3. Configurar puerto y healthcheck

## 🎯 Resultado Final

Una vez completado:
- ✅ App accesible desde cualquier lugar
- ✅ Solo usuarios autorizados pueden acceder
- ✅ Despliegue automático con git push
- ✅ HTTPS automático
- ✅ Sin necesidad de `npm start` local

## 📞 URLs Finales
- **Frontend**: `https://tu-app.vercel.app`
- **Backend**: `https://tu-api.railway.app`
- **Base de Datos**: Tu Supabase existente

---
*Esta guía implementa una solución completa y segura para tu aplicación de exámenes.*
