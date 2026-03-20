type StatusTone = 'urgent' | 'normal' | 'out' | 'soon' | 'done' | 'without'

type StatusPillProps = {
  tone: StatusTone
  children: string
}

const toneClassName: Record<StatusTone, string> = {
  urgent: 'border border-rose-300/25 bg-rose-400/15 text-rose-100',
  normal: 'border border-white/10 bg-white/8 text-white/80',
  out: 'border border-rose-300/25 bg-rose-400/15 text-rose-100',
  soon: 'border border-amber-300/25 bg-amber-300/15 text-amber-100',
  done: 'border border-emerald-300/25 bg-[var(--color-success-soft)] text-[var(--color-success-text)]',
  without: 'border border-white/10 bg-white/8 text-white/80',
}

export function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${toneClassName[tone]}`}
    >
      {children}
    </span>
  )
}
