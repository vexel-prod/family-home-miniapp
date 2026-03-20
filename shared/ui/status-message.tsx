type StatusMessageProps = {
  text: string
}

function resolveTone(text: string) {
  if (text.startsWith('Ошибка')) {
    return 'error'
  }

  if (text.startsWith('Добавлено')) {
    return 'success'
  }

  return 'idle'
}

const toneClassName = {
  idle: 'border-white/10 bg-white/6 text-white/80',
  success: 'border-emerald-300/25 bg-[var(--color-surface-success)] text-emerald-100',
  error: 'border-rose-300/25 bg-[var(--color-surface-danger)] text-rose-100',
}

export function StatusMessage({ text }: StatusMessageProps) {
  const tone = resolveTone(text)

  return (
    <div
      className={`rounded-md border px-4 py-3.5 text-sm font-medium ${toneClassName[tone]}`}
    >
      {text}
    </div>
  )
}
