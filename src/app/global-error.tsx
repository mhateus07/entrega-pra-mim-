'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          padding: '1rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Algo deu errado
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              Ocorreu um erro inesperado na aplicação.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.625rem 1.5rem',
                  backgroundColor: '#0891b2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Tentar novamente
              </button>
              <a
                href="/"
                style={{
                  padding: '0.625rem 1.5rem',
                  backgroundColor: '#334155',
                  color: '#e2e8f0',
                  borderRadius: '0.75rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Página inicial
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
