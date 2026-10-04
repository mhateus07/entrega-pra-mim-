'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--surface)',
              color: 'var(--fg)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: '10px',
              fontSize: '14px',
              padding: '10px 14px',
            },
            success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--surface)' } },
            error: { iconTheme: { primary: 'var(--danger)', secondary: 'var(--surface)' } },
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  )
}
