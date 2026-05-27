'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function AuthErrorContent() {
  const params = useSearchParams()
  const message = params.get('message') ?? 'error_desconocido'

  const friendlyMessages: Record<string, string> = {
    missing_code: 'El link de acceso es inválido o expiró.',
    expired: 'El link expiró. Los magic links duran 1 hora.',
    invalid_token: 'Token inválido. Pedí un nuevo link.',
  }

  const display =
    friendlyMessages[message] ??
    'Hubo un problema con el acceso. Intentá de nuevo.'

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="card max-w-sm w-full text-center" style={{ padding: '2rem' }}>
        {/* Error icon */}
        <div className="text-4xl mb-4">⚠️</div>

        <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--t1)' }}>
          Error de acceso
        </h1>

        <p className="text-sm mb-6" style={{ color: 'var(--t2)' }}>
          {display}
        </p>

        <Link href="/login" className="btn-primary w-full justify-center">
          Volver al login
        </Link>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  )
}
