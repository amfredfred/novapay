// components/logo.tsx
// Brand mark: a geometric "N" (bars + diagonal) with a small spark accent for "Nova".
// Renders as `<LogoMark>` (icon only) or `<Logo>` (icon + wordmark).

type LogoMarkProps = {
  size?: number
  className?: string
  /** Use "on-primary" when the badge sits on a primary-colored background (would otherwise blend in). */
  tone?: 'default' | 'on-primary'
}

export function LogoMark({ size = 32, className, tone = 'default' }: LogoMarkProps) {
  const bg = tone === 'on-primary' ? 'white' : 'hsl(var(--primary))'
  const fg = tone === 'on-primary' ? 'hsl(var(--primary))' : 'white'
  const spark = tone === 'on-primary' ? 'hsl(var(--primary))' : 'hsl(var(--accent-yellow))'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="NovaPay"
    >
      <rect width="32" height="32" rx="9" fill={bg} />
      <path d="M9 8H13L23 24H19L9 8Z" fill={fg} />
      <rect x="9" y="8" width="4" height="16" rx="1.3" fill={fg} />
      <rect x="19" y="8" width="4" height="16" rx="1.3" fill={fg} />
      <path
        d="M25.5 5.5L26.4 7.6L28.5 8.5L26.4 9.4L25.5 11.5L24.6 9.4L22.5 8.5L24.6 7.6L25.5 5.5Z"
        fill={spark}
        opacity={tone === 'on-primary' ? 0.55 : 1}
      />
    </svg>
  )
}

type LogoProps = {
  size?: number
  className?: string
  wordmarkClassName?: string
  monochrome?: boolean
}

export function Logo({ size = 32, className, wordmarkClassName, monochrome }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark size={size} />
      <span
        className={
          wordmarkClassName ??
          `font-semibold tracking-tight ${monochrome ? '' : 'text-foreground'}`
        }
        style={{ fontSize: size * 0.5625 }}
      >
        NovaPay
      </span>
    </span>
  )
}
