'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const from         = searchParams.get('from') || '/lab'
  const [pwd, setPwd]     = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const res = await fetch('/api/lab-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    })

    if (res.ok) {
      router.push(from)
    } else {
      setError(true)
      setPwd('')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Space Mono, monospace',
    }}>
      <div style={{
        width: '320px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '4px',
        padding: '2.5rem',
        background: '#0d1117',
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: '1rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#fff',
          marginBottom: '0.4rem',
        }}>
          AMI <span style={{ color: '#f5c842' }}>Colony</span>
        </div>
        <div style={{
          fontSize: '0.55rem',
          color: 'rgba(200,208,224,0.35)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '2rem',
        }}>
          Accès Mère Nature — 4 colonies
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            placeholder="Mot de passe"
            autoFocus
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${error ? 'rgba(255,59,59,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '2px',
              padding: '0.7rem 1rem',
              color: '#c8d0e0',
              fontFamily: 'Space Mono, monospace',
              fontSize: '0.75rem',
              outline: 'none',
              letterSpacing: '0.2em',
              marginBottom: '1rem',
            }}
          />

          {error && (
            <div style={{
              fontSize: '0.55rem',
              color: '#ff3b3b',
              marginBottom: '1rem',
              letterSpacing: '0.08em',
            }}>
              Accès refusé — mot de passe incorrect
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !pwd}
            style={{
              width: '100%',
              padding: '0.7rem',
              background: loading || !pwd ? 'rgba(245,200,66,0.1)' : 'rgba(245,200,66,0.15)',
              border: '1px solid rgba(245,200,66,0.3)',
              borderRadius: '2px',
              color: pwd ? '#f5c842' : 'rgba(245,200,66,0.3)',
              fontFamily: 'Space Mono, monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: pwd ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Vérification…' : 'Entrer'}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          fontSize: '0.5rem',
          color: 'rgba(200,208,224,0.15)',
          textAlign: 'center',
          letterSpacing: '0.08em',
        }}>
          ← <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Retour à l'observatoire public</a>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
