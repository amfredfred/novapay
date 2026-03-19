// app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#f7f7f5', margin: 0 }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          textAlign: 'center',
          padding: '24px',
        }}>
          <p style={{ fontSize: '72px', fontWeight: 700, margin: 0, lineHeight: 1, color: '#1a1a18' }}>
            404
          </p>
          <p style={{ fontSize: '16px', color: '#5a5956', margin: 0 }}>
            Page not found
          </p>
          <Link
            href="/"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #e4e3de',
              background: '#fff',
              fontSize: '14px',
              textDecoration: 'none',
              color: '#1a1a18',
            }}
          >
            Go home
          </Link>
        </div>
      </body>
    </html>
  )
}
