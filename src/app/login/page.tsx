'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

type State = 'idle' | 'sending' | 'sent' | 'error'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [, startTransition] = useTransition()

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setState('sending')
    setError(null)

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setState('error')
      setError(authError.message)
      return
    }

    setState('sent')

    // Resend cooldown — 60s
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  function handleResend() {
    if (resendCooldown > 0) return
    startTransition(() => {
      setState('idle')
    })
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg)' }}
    >
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Brand mark */}
        <div className="text-center mb-10">
          <span
            style={{
              fontFamily: 'var(--ui)',
              fontWeight: 700,
              fontSize: '28px',
              color: 'var(--t1)',
              letterSpacing: '-0.5px',
            }}
          >
            Man<span style={{ color: 'var(--acc)' }}>IA</span>cos
          </span>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--t3)' }}
          >
            Hub interno del equipo
          </p>
        </div>

        {state === 'sent' ? (
          /* ── Sent state ── */
          <div
            className="card text-center"
            style={{ padding: '2rem' }}
          >
            <div className="text-3xl mb-4">📨</div>
            <h2 className="font-semibold mb-2" style={{ color: 'var(--t1)', fontSize: 'var(--text-lg)' }}>
              Revisá tu email
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>
              Te mandamos el link de acceso a{' '}
              <strong style={{ color: 'var(--t1)' }}>{email}</strong>.
              Válido por 1 hora.
            </p>

            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="text-sm"
              style={{
                color: resendCooldown > 0 ? 'var(--t3)' : 'var(--acc)',
                background: 'none',
                border: 'none',
                cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {resendCooldown > 0
                ? `Reenviar en ${resendCooldown}s`
                : 'Reenviar el link'}
            </button>
          </div>
        ) : (
          /* ── Login form ── */
          <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
            <h2 className="font-semibold mb-6" style={{ color: 'var(--t1)', fontSize: 'var(--text-lg)' }}>
              Acceder al Hub
            </h2>

            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-xs font-medium mb-2"
                style={{ color: 'var(--t2)' }}
              >
                Email del equipo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@maniaco.online"
                required
                autoFocus
                className="input"
                disabled={state === 'sending'}
              />
            </div>

            {error && (
              <p className="text-xs mb-4" style={{ color: 'var(--err)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={state === 'sending' || !email.trim()}
              className="btn-primary w-full justify-center"
              style={{ opacity: state === 'sending' ? 0.7 : 1 }}
            >
              {state === 'sending' ? 'Enviando...' : 'Entrar con magic link'}
            </button>

            <p className="text-xs mt-4 text-center" style={{ color: 'var(--t3)' }}>
              Te llegará un link por email — no necesitás contraseña.
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
