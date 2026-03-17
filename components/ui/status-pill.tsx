type StatusTone = 'urgent' | 'normal' | 'out' | 'soon' | 'done'

type StatusPillProps = {
  tone: StatusTone
  children: string
}

const toneClassName: Record<StatusTone, string> = {
  urgent: 'bg-rose-100 text-rose-800',
  normal: 'bg-slate-200 text-slate-700',
  out: 'bg-rose-100 text-rose-800',
  soon: 'bg-amber-100 text-amber-800',
  done: 'bg-[var(--color-success-soft)] text-[var(--color-success-text)]',
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
