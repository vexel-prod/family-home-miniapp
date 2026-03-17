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

export function StatusMessage({ text }: StatusMessageProps) {
  return <div className={`status-message status-message--${resolveTone(text)}`}>{text}</div>
}
