export default function MeshBackground({ className = '' }) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-100"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% -10%, rgba(56, 189, 248, 0.12), transparent 50%),
            radial-gradient(ellipse 90% 70% at 90% 10%, rgba(251, 191, 36, 0.08), transparent 45%),
            radial-gradient(ellipse 70% 50% at 50% 100%, rgba(167, 139, 250, 0.06), transparent 50%),
            #050507
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
