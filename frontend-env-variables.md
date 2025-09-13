# 🔧 Variables de Entorno para Frontend

## Variables para Vercel

Cuando despliegues en Vercel, configura estas variables de entorno:

```env
# Supabase - Configuración de autenticación
REACT_APP_SUPABASE_URL=https://hindymhwohevsqumekyv.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpbmR5bWh3b2hldnNxdW1la3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3ODc4OTksImV4cCI6MjA2NDM2Mzg5OX0.oHuotC0MjPDrEMQksKt6QJ-Z_Yh0G60ZNRv5Ncy4MUQ

# Backend API - URL del servidor Railway
REACT_APP_API_URL=https://bbb2-production.up.railway.app
```

## Para Desarrollo Local

Crea un archivo `.env.local` en `FrontExams/` con:

```env
# Supabase
REACT_APP_SUPABASE_URL=https://hindymhwohevsqumekyv.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpbmR5bWh3b2hldnNxdW1la3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3ODc4OTksImV4cCI6MjA2NDM2Mzg5OX0.oHuotC0MjPDrEMQksKt6QJ-Z_Yh0G60ZNRv5Ncy4MUQ

# Para desarrollo local usar el backend local
REACT_APP_API_URL=http://localhost:8000
```

## 📝 Notas Importantes

- ✅ **REACT_APP_SUPABASE_ANON_KEY** es segura para el frontend (es pública por diseño)
- ✅ **REACT_APP_API_URL** apunta a tu backend en Railway
- ⚠️ **Todas las variables deben empezar con `REACT_APP_`** para que React las reconozca
