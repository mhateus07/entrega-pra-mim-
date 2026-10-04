'use client'

export default function GlobalError({
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
          backgroundColor: '#f7f7f5',
          color: '#121211',
          fontFamily: 'system-ui, sans-serif',
          padding: '1rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Algo deu errado
            </h2>
            <p style={{ color: '#52514e', marginBottom: '1.5rem' }}>
              Ocorreu um erro inesperado na aplicação.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.625rem 1.5rem',
                  backgroundColor: '#121211',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Tentar novamente
              </button>
              <button
                onClick={() => window.location.assign('/')}
                style={{
                  padding: '0.625rem 1.5rem',
                  backgroundColor: '#ffffff',
                  color: '#121211',
                  border: '1px solid #cfcdc6',
                  cursor: 'pointer',
                  borderRadius: '0.5rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Página inicial
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
