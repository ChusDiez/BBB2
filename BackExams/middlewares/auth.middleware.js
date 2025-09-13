import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Crear cliente de Supabase para verificación en backend
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Emails autorizados
const AUTHORIZED_EMAILS = [
  'chus@iz.academy',
  'felix@iz.academy'
];

/**
 * Middleware para verificar autenticación con Supabase
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autorización requerido',
        message: 'Debes incluir un token Bearer en el header Authorization'
      });
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar el token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Token inválido',
        message: 'El token de autenticación no es válido o ha expirado'
      });
    }

    // Verificar que el email esté autorizado
    if (!AUTHORIZED_EMAILS.includes(user.email?.toLowerCase() || '')) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Tu email no está autorizado para acceder a esta aplicación'
      });
    }

    // Añadir información del usuario a la request
    req.user = user;
    next();

  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({
      error: 'Error del servidor',
      message: 'Error interno al verificar autenticación'
    });
  }
};

/**
 * Middleware opcional - solo verifica si hay token presente
 * Útil para rutas que pueden funcionar con o sin autenticación
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user && AUTHORIZED_EMAILS.includes(user.email?.toLowerCase() || '')) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // En caso de error, continuar sin autenticación
    next();
  }
};

/**
 * Función helper para verificar si un usuario está autenticado
 */
export const isAuthenticated = (req) => {
  return req.user && AUTHORIZED_EMAILS.includes(req.user.email?.toLowerCase() || '');
};
