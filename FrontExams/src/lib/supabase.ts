import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Emails autorizados para acceder a la aplicación
export const AUTHORIZED_EMAILS = [
  'chus@iz.academy',
  'felix@iz.academy'
]

// Función para verificar si un email está autorizado
export const isEmailAuthorized = (email: string): boolean => {
  return AUTHORIZED_EMAILS.includes(email.toLowerCase())
}
