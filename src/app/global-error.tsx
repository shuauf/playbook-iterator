"use client"

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#f4efe6",
          color: "#1c1917",
        }}
      >
        <main style={{ maxWidth: 560, margin: "12vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>This page couldn’t load</h1>
          <p style={{ color: "#57534e", lineHeight: 1.5 }}>
            A server error occurred. Reload to try again.
          </p>
          {error.digest ? (
            <p style={{ color: "#78716c", fontSize: 12 }}>Reference {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 24,
              border: 0,
              borderRadius: 999,
              background: "#1c1917",
              color: "white",
              padding: "10px 18px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
