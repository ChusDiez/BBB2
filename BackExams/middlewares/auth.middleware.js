import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ---- Helpers de configuración
const getEnvList = (name, defaults = []) => {
  const v = process.env[name];
  if (!v || v.trim() === '') return defaults;
  return v.split(',').map(s => s.trim()).filter(Boolean);
};

const ADMIN_EMAILS = getEnvList('ADMIN_EMAILS', ['chus@iz.academy', 'felix@iz.academy']);
const INTERNAL_ADMIN_SECRET = process.env.INTERNAL_ADMIN_SECRET || '';
const ALLOWED_IPS = new Set(getEnvList('ALLOWED_IPS'));
const ALLOWED_ORIGINS = new Set(getEnvList('ALLOWED_ORIGINS'));

// Lazy init de Supabase client para evitar crashear si faltan envs
let supabaseClient = null;
function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  supabaseClient = createClient(url, key);
  return supabaseClient;
}

function getClientIP(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string') return xf.split(',')[0].trim();
  if (Array.isArray(xf) && xf.length > 0) return xf[0];
  return req.ip || req.socket?.remoteAddress || '';
}

export const ipAllowlist = (req, res, next) => {
  if (ALLOWED_IPS.size === 0) return next();
  const ip = getClientIP(req);
  if (ALLOWED_IPS.has(ip)) return next();
  return res.status(403).json({ error: 'IP no permitida', message: `Acceso denegado desde ${ip}` });
};

export const originAllowlist = (req, res, next) => {
  if (ALLOWED_ORIGINS.size === 0) return next();
  const origin = req.headers.origin || '';
  if (origin && ALLOWED_ORIGINS.has(origin)) return next();
  return res.status(403).json({ error: 'Origen no permitido', message: `Origin ${origin} bloqueado` });
};

export const authenticateUser = async (req, res, next) => {
  try {
    // 1) Token interno opcional (para CI/crons/proxies)
    if (INTERNAL_ADMIN_SECRET && req.headers['x-admin-secret'] === INTERNAL_ADMIN_SECRET) {
      req.user = { email: 'internal@iz.academy', role: 'admin' };
      return next();
    }

    // 2) Autenticación por Supabase
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token requerido',
        message: 'Incluye un token Bearer en Authorization o usa x-admin-secret'
      });
    }

    const token = authHeader.substring(7);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Config inválida', message: 'Supabase no está configurado' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido', message: 'Token no válido o expirado' });
    }

    const email = (user.email || '').toLowerCase();
    if (!ADMIN_EMAILS.includes(email)) {
      return res.status(403).json({ error: 'Acceso denegado', message: 'Email no autorizado' });
    }

    req.user = user;
    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Auth error:', err);
    return res.status(500).json({ error: 'Error del servidor', message: 'Fallo autenticación' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    if (INTERNAL_ADMIN_SECRET && req.headers['x-admin-secret'] === INTERNAL_ADMIN_SECRET) {
      req.user = { email: 'internal@iz.academy', role: 'admin' };
      return next();
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = getSupabase();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser(token);
        const email = (user?.email || '').toLowerCase();
        if (user && ADMIN_EMAILS.includes(email)) req.user = user;
      }
    }
    return next();
  } catch (e) {
    return next();
  }
};

export const isAuthenticated = (req) => !!(req.user && ADMIN_EMAILS.includes((req.user.email || '').toLowerCase()));
