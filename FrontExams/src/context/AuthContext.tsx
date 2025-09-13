import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, isEmailAuthorized } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión inicial
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error obteniendo sesión:', error)
      } else if (session?.user) {
        // Verificar que el email esté autorizado
        if (isEmailAuthorized(session.user.email || '')) {
          setSession(session)
          setUser(session.user)
        } else {
          // Si el email no está autorizado, cerrar sesión
          await supabase.auth.signOut()
        }
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session)
        
        if (session?.user) {
          // Verificar email autorizado en cada cambio de estado
          if (isEmailAuthorized(session.user.email || '')) {
            setSession(session)
            setUser(session.user)
          } else {
            // Email no autorizado, cerrar sesión
            await supabase.auth.signOut()
            setSession(null)
            setUser(null)
          }
        } else {
          setSession(null)
          setUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error cerrando sesión:', error)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
