'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.endsWith('@maniaco.online')) {
      setError('Solo correos @maniaco.online')
      return
    }

    startTransition(async () => {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      })

      if (err) {
        setError(`Error enviando código: ${err.message}`)
        return
      }

      setStep('otp')
    })
  }

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (otp.length !== 6) {
      setError('El código tiene 6 dígitos')
      return
    }

    startTransition(async () => {
      const { data, error: err } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      })

      if (err) {
        setError(`Código inválido: ${err.message}`)
        return
      }

      if (data.session) {
        window.location.href = '/dashboard'
      }
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
          <p className="mt-2 text-sm" style={{ color: 'var(--t3)' }}>
            Hub interno del equipo
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="card" style={{ padding: '2rem' }}>
            <h2
              className="font-semibold mb-6"
              style={{ color: 'var(--t1)', fontSize: 'var(--text-lg)' }}
            >
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
                disabled={isPending}
                className="input"
              />
            </div>

            {error && (
              <p className="text-xs mb-4" style={{ color: 'var(--err)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="btn-primary w-full justify-center"
              style={{ opacity: isPending ? 0.7 : 1 }}
            >
              {isPending ? 'Enviando...' : 'Enviar código'}
            </button>

            <p className="text-xs mt-4 text-center" style={{ color: 'var(--t3)' }}>
              Te llegará un código de 6 dígitos por email.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="card" style={{ padding: '2rem' }}>
            <h2
              className="font-semibold mb-2"
              style={{ color: 'var(--t1)', fontSize: 'var(--text-lg)' }}
            >
              Ingresá el código
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>
              Enviado a <strong style={{ color: 'var(--t1)' }}>{email}</strong>
            </p>

            <div className="mb-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                autoFocus
                disabled={isPending}
                className="input text-center"
                style={{
                  fontSize: '24px',
                  letterSpacing: '0.5em',
                  fontFamily: 'var(--mono, monospace)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </div>

            {error && (
              <p className="text-xs mb-4" style={{ color: 'var(--err)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || otp.length !== 6}
              className="btn-primary w-full justify-center"
              style={{ opacity: isPending || otp.length !== 6 ? 0.7 : 1 }}
            >
              {isPending ? 'Verificando...' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              disabled={isPending}
              className="w-full text-sm mt-3"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--t3)',
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              Cambiar email
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
