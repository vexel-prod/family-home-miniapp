import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const fieldClassName =
  'w-full rounded-[var(--radius-md)] border border-white/10 bg-[var(--color-panel-field)] px-4 py-4 text-base text-[var(--color-panel-text)] outline-none transition-colors duration-150 placeholder:text-white/45 focus:border-white/30'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={fieldClassName} {...props} />
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={fieldClassName} {...props} />
}

export function TextAreaField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClassName} min-h-28 resize-y`} {...props} />
}
