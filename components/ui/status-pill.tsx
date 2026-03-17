type StatusTone = 'urgent' | 'normal' | 'out' | 'soon' | 'done'

type StatusPillProps = {
  tone: StatusTone
  children: string
}

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>
}
