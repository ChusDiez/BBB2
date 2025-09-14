import React, { useState } from 'react'
import { supabase, isEmailAuthorized } from '../lib/supabase'
import '../styles/auth.scss'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isEmailAuthorized(email)) {
      setError('Email no autorizado. Solo administradores pueden acceder.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password
      })

      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🎓 Exámenes IZ Academy</h1>
          <p>Acceso solo para administradores</p>
        </div>

        <form onSubmit={handleSignIn} className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@iz.academy"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Acceso restringido a administradores autorizados</p>
        </div>
      </div>
    </div>
  )
}
